"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, hasAnyModule, type AccessInfo } from "@/lib/access"
import { sendEmail, generateIcs } from "@/lib/mailer"
import {
  buildReminderEmailHtml,
  buildFrequencyLabel,
  type ReminderActionLink,
} from "@/lib/reminder-email"
import { dispatchReminderImmediately } from "@/lib/reminder-engine"

type ActionResult = { success: boolean; error?: string; warning?: string }

const FREQUENCIES = ["ONCE", "DAILY", "WEEKLY", "MONTHLY"] as const
type Frequency = (typeof FREQUENCIES)[number]

/**
 * Malaysia Standard Time is a fixed GMT+8 (no daylight saving).
 * A <input type="datetime-local"> gives a wall-clock string with no timezone;
 * parse it explicitly as Malaysia time so the stored UTC instant is correct
 * regardless of the server's timezone. (Same approach as the Event Calendar.)
 */
const MYT_OFFSET_MIN = 8 * 60

function parseLocalToUtc(raw: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw || "")
  if (!m) return new Date(raw)
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const h = Number(m[4])
  const mi = Number(m[5])
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - MYT_OFFSET_MIN * 60000)
}

async function requireReminderAccess(): Promise<AccessInfo | null> {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["REMINDERS"])) return null
  return access
}

type ParsedReminder = {
  title: string
  description: string | null
  category: string
  frequency: Frequency
  onceAt: Date | null
  timeOfDay: string | null
  daysOfWeek: number[]
  dayOfMonth: number | null
  enabled: boolean
  targetSelf: boolean
  targetUnitId: string | null
  targetModules: string[]
  actionLinks: ReminderActionLink[]
  recipientIds: string[]
}

function parseReminderForm(data: FormData): { ok: true; values: ParsedReminder } | { ok: false; error: string } {
  const title = ((data.get("title") as string) || "").trim()
  if (!title) return { ok: false, error: "Tajuk peringatan diperlukan." }
  if (title.length > 150) return { ok: false, error: "Tajuk terlalu panjang (maks 150 aksara)." }

  const description = ((data.get("description") as string) || "").trim() || null
  const category = ((data.get("category") as string) || "general").trim() || "general"

  const frequencyRaw = (data.get("frequency") as string) || "ONCE"
  if (!FREQUENCIES.includes(frequencyRaw as Frequency)) {
    return { ok: false, error: "Kekerapan tidak sah." }
  }
  const frequency = frequencyRaw as Frequency

  let onceAt: Date | null = null
  let timeOfDay: string | null = null
  let daysOfWeek: number[] = []
  let dayOfMonth: number | null = null

  if (frequency === "ONCE") {
    const raw = (data.get("onceAt") as string) || ""
    if (!raw) return { ok: false, error: "Sila pilih tarikh & masa peringatan." }
    onceAt = parseLocalToUtc(raw)
    if (isNaN(onceAt.getTime())) return { ok: false, error: "Tarikh & masa tidak sah." }
    if (onceAt.getTime() <= Date.now()) {
      return { ok: false, error: "Masa peringatan mesti pada masa hadapan." }
    }
  } else {
    const raw = (data.get("timeOfDay") as string) || ""
    if (!/^\d{2}:\d{2}$/.test(raw)) return { ok: false, error: "Sila pilih masa peringatan (HH:MM)." }
    timeOfDay = raw

    if (frequency === "WEEKLY") {
      daysOfWeek = (data.getAll("daysOfWeek") as string[])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
      daysOfWeek = Array.from(new Set(daysOfWeek)).sort()
      if (!daysOfWeek.length) return { ok: false, error: "Pilih sekurang-kurangnya satu hari dalam minggu." }
    }

    if (frequency === "MONTHLY") {
      const dom = Number(data.get("dayOfMonth"))
      if (!Number.isInteger(dom) || dom < 1 || dom > 31) {
        return { ok: false, error: "Hari dalam bulan mesti antara 1 hingga 31." }
      }
      dayOfMonth = dom
    }
  }

  const enabled = data.get("enabled") !== "false"
  const targetSelf = data.get("targetSelf") === "true"
  const targetUnitId = ((data.get("targetUnitId") as string) || "").trim() || null
  const targetModules = (data.getAll("targetModules") as string[])
    .map((m) => m.trim())
    .filter(Boolean)
  const recipientIds = Array.from(new Set((data.getAll("recipientIds") as string[]).filter(Boolean)))

  if (!targetSelf && !targetUnitId && !targetModules.length && !recipientIds.length) {
    return { ok: false, error: "Pilih sekurang-kurangnya satu penerima." }
  }

  let actionLinks: ReminderActionLink[] = []
  const linksRaw = (data.get("actionLinks") as string) || ""
  if (linksRaw) {
    try {
      const parsed = JSON.parse(linksRaw)
      if (!Array.isArray(parsed)) throw new Error()
      for (const link of parsed) {
        const label = String(link?.label || "").trim()
        const url = String(link?.url || "").trim()
        if (!label && !url) continue
        if (!label || label.length > 60) return { ok: false, error: "Label pautan mesti 1-60 aksara." }
        if (!url.startsWith("/") && !url.startsWith("https://")) {
          return { ok: false, error: 'Pautan mesti bermula dengan "/" atau "https://".' }
        }
        actionLinks.push({ label, url })
      }
      if (actionLinks.length > 8) return { ok: false, error: "Maksimum 8 pautan tindakan." }
    } catch {
      return { ok: false, error: "Format pautan tindakan tidak sah." }
    }
  }

  return {
    ok: true,
    values: {
      title,
      description,
      category,
      frequency,
      onceAt,
      timeOfDay,
      daysOfWeek,
      dayOfMonth,
      enabled,
      targetSelf,
      targetUnitId,
      targetModules,
      actionLinks,
      recipientIds,
    },
  }
}

function toReminderData(values: ParsedReminder) {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    frequency: values.frequency,
    onceAt: values.onceAt,
    timeOfDay: values.timeOfDay,
    daysOfWeek: values.daysOfWeek,
    dayOfMonth: values.dayOfMonth,
    enabled: values.enabled,
    targetSelf: values.targetSelf,
    targetUnitId: values.targetUnitId,
    targetModules: values.targetModules,
    actionLinks: values.actionLinks as unknown as object,
  }
}

export async function createReminder(data: FormData): Promise<ActionResult> {
  const access = await requireReminderAccess()
  if (!access) return { success: false, error: "Unauthorized" }

  const parsed = parseReminderForm(data)
  if (!parsed.ok) return { success: false, error: parsed.error }

  try {
    const newReminder = await prisma.reminder.create({
      data: {
        ...toReminderData(parsed.values),
        createdById: access.userId,
        recipients: parsed.values.recipientIds.length
          ? { create: parsed.values.recipientIds.map((userId) => ({ userId })) }
          : undefined,
      },
    })
    
    // Blast an immediate first email/calendar invite regardless of the schedule
    dispatchReminderImmediately(newReminder.id).catch((err) => {
      console.error("Failed to dispatch immediate reminder:", err)
    })

    revalidatePath("/reminders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal mencipta peringatan." }
  }
}

export async function updateReminder(id: string, data: FormData): Promise<ActionResult> {
  const access = await requireReminderAccess()
  if (!access) return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "ID peringatan tiada." }

  const existing = await prisma.reminder.findUnique({
    where: { id },
    select: { createdById: true },
  })
  if (!existing) return { success: false, error: "Peringatan tidak dijumpai." }
  if (existing.createdById !== access.userId && !access.isSuperAdmin) {
    return { success: false, error: "Hanya pencipta peringatan boleh mengubahnya." }
  }

  const parsed = parseReminderForm(data)
  if (!parsed.ok) return { success: false, error: parsed.error }

  try {
    const current = await prisma.reminderRecipient.findMany({
      where: { reminderId: id },
      select: { userId: true },
    })
    const currentIds = current.map((r) => r.userId)
    const nextIds = parsed.values.recipientIds
    const toAdd = nextIds.filter((uid) => !currentIds.includes(uid))
    const toRemove = currentIds.filter((uid) => !nextIds.includes(uid))

    await prisma.$transaction([
      prisma.reminder.update({ where: { id }, data: toReminderData(parsed.values) }),
      ...(toRemove.length
        ? [prisma.reminderRecipient.deleteMany({ where: { reminderId: id, userId: { in: toRemove } } })]
        : []),
      ...(toAdd.length
        ? [
            prisma.reminderRecipient.createMany({
              data: toAdd.map((userId) => ({ reminderId: id, userId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ])

    revalidatePath("/reminders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal mengemas kini peringatan." }
  }
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  const access = await requireReminderAccess()
  if (!access) return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "ID peringatan tiada." }

  const existing = await prisma.reminder.findUnique({ where: { id }, select: { createdById: true } })
  if (!existing) return { success: false, error: "Peringatan tidak dijumpai." }
  if (existing.createdById !== access.userId && !access.isSuperAdmin) {
    return { success: false, error: "Hanya pencipta peringatan boleh memadamnya." }
  }

  try {
    await prisma.reminder.delete({ where: { id } })
    revalidatePath("/reminders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal memadam peringatan." }
  }
}

export async function toggleReminder(id: string, enabled: boolean): Promise<ActionResult> {
  const access = await requireReminderAccess()
  if (!access) return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "ID peringatan tiada." }

  const existing = await prisma.reminder.findUnique({ where: { id }, select: { createdById: true } })
  if (!existing) return { success: false, error: "Peringatan tidak dijumpai." }
  if (existing.createdById !== access.userId && !access.isSuperAdmin) {
    return { success: false, error: "Hanya pencipta peringatan boleh mengubahnya." }
  }

  try {
    await prisma.reminder.update({ where: { id }, data: { enabled } })
    revalidatePath("/reminders")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal menukar status peringatan." }
  }
}

/** Sends the real reminder email, but only to the CURRENT user's inbox. */
export async function sendTestReminder(id: string): Promise<ActionResult> {
  const access = await requireReminderAccess()
  if (!access) return { success: false, error: "Unauthorized" }
  if (!id) return { success: false, error: "ID peringatan tiada." }

  try {
    const reminder = await prisma.reminder.findUnique({ where: { id } })
    if (!reminder) return { success: false, error: "Peringatan tidak dijumpai." }

    const me = await prisma.user.findUnique({
      where: { id: access.userId },
      select: { email: true },
    })
    if (!me?.email) return { success: false, error: "Akaun anda tiada alamat e-mel." }

    const mytNow = new Date(Date.now() + MYT_OFFSET_MIN * 60000)
    const html = buildReminderEmailHtml({
      title: reminder.title,
      description: reminder.description,
      actionLinks: (reminder.actionLinks as unknown as ReminderActionLink[]) || [],
      mytHour: mytNow.getUTCHours(),
      frequencyLabel: buildFrequencyLabel(
        reminder.frequency,
        reminder.timeOfDay,
        reminder.onceAt ? new Date(reminder.onceAt.getTime() + MYT_OFFSET_MIN * 60000) : null
      ),
    })

    const nowUtc = new Date()
    const icsContent = generateIcs({
      title: `[UJIAN] Peringatan: ${reminder.title}`,
      description: reminder.description || "Peringatan automatik sistem.",
      startDateTime: nowUtc,
      endDateTime: new Date(nowUtc.getTime() + 30 * 60000), // 30 mins block
      attendees: [me.email],
    }) || undefined

    const ok = await sendEmail({
      to: [me.email],
      subject: `⏰ [UJIAN] Peringatan: ${reminder.title}`,
      html,
      icsContent,
    })
    if (!ok) return { success: false, error: "SMTP gagal menghantar e-mel. Semak konfigurasi SMTP." }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal menghantar e-mel ujian." }
  }
}

const MAINTENANCE_SEEDS = [
  { seedKey: "MAINT_DAILY_0800", title: "Peringatan Borang Penyelenggaraan (Pagi)", timeOfDay: "08:00" },
  { seedKey: "MAINT_DAILY_1200", title: "Peringatan Borang Penyelenggaraan (Tengah Hari)", timeOfDay: "12:00" },
  { seedKey: "MAINT_DAILY_1600", title: "Peringatan Borang Penyelenggaraan (Petang)", timeOfDay: "16:00" },
]

const MAINTENANCE_ACTION_LINKS: ReminderActionLink[] = [
  { label: "Lighting Inspection", url: "/forms/maintenance/lighting" },
  { label: "Floor Cleaning Checklist", url: "/forms/maintenance/cleaning" },
  { label: "Waste Disposal Area", url: "/forms/maintenance/waste-disposal" },
  { label: "Chemical Control Log", url: "/forms/maintenance/chemical-control" },
]

/**
 * Idempotently creates the 3 daily maintenance reminders (8am / 12pm / 4pm MYT).
 * upsert with an empty update means re-running never clobbers UI edits.
 */
export async function seedMaintenanceReminders(): Promise<ActionResult> {
  const access = await getAccessInfo()
  if (!access?.isSuperAdmin) return { success: false, error: "Unauthorized" }

  try {
    const maintenanceUnit = await prisma.unit.findFirst({
      where: { name: { contains: "Maintenance", mode: "insensitive" } },
      select: { id: true },
    })

    for (const seed of MAINTENANCE_SEEDS) {
      await prisma.reminder.upsert({
        where: { seedKey: seed.seedKey },
        update: {},
        create: {
          seedKey: seed.seedKey,
          title: seed.title,
          description:
            "Sila pastikan semua borang rekod pemeriksaan dan penyelenggaraan harian telah diisi dan dihantar dengan lengkap.",
          category: "maintenance",
          frequency: "DAILY",
          timeOfDay: seed.timeOfDay,
          enabled: true,
          targetSelf: false,
          targetUnitId: maintenanceUnit?.id || null,
          targetModules: ["MAINTENANCE_FORMS", "MAINTENANCE_DASHBOARD", "MAINTENANCE_REPORTS", "MAINTENANCE_SUMMARY"],
          actionLinks: MAINTENANCE_ACTION_LINKS as unknown as object,
          createdById: access.userId,
        },
      })
    }

    revalidatePath("/reminders")
    return {
      success: true,
      warning: maintenanceUnit
        ? undefined
        : 'Unit "Maintenance" tidak dijumpai — peringatan disasarkan kepada pemegang modul MAINTENANCE_* sahaja.',
    }
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal menyediakan peringatan maintenance." }
  }
}

import { prisma } from "@/lib/prisma"
import { sendEmail, generateIcs } from "@/lib/mailer"
import { buildReminderEmailHtml, buildFrequencyLabel, type ReminderActionLink } from "@/lib/reminder-email"

/**
 * Malaysia Standard Time is a fixed GMT+8 (no daylight saving), so all
 * "wall clock" math can be done by shifting the UTC instant by 8 hours and
 * reading it back with getUTC*() accessors.
 */
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000
const CATCHUP_WINDOW_MS = 2 * 60 * 60 * 1000
const MAX_RECIPIENTS = 100
const SEND_CHUNK_SIZE = 20

export interface CandidateSlot {
  /** MYT calendar date, e.g. "2026-07-15" */
  mytDateStr: string
  /** MYT hour 0-23 */
  hour: number
  /** MYT day of week, 0=Sun..6=Sat */
  dow: number
  /** MYT day of month 1-31 */
  dom: number
  daysInMonth: number
}

export interface DispatchSummary {
  checked: number
  due: number
  sent: number
  skipped: number
  failed: number
}

type ReminderRow = {
  id: string
  title: string
  description: string | null
  frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY"
  onceAt: Date | null
  timeOfDay: string | null
  daysOfWeek: number[]
  dayOfMonth: number | null
  targetSelf: boolean
  targetUnitId: string | null
  targetModules: string[]
  actionLinks: unknown
  createdById: string
  recipients: { userId: string }[]
}

function toMyt(utc: Date): Date {
  return new Date(utc.getTime() + MYT_OFFSET_MS)
}

function slotFromMyt(myt: Date): CandidateSlot {
  const y = myt.getUTCFullYear()
  const mo = myt.getUTCMonth()
  return {
    mytDateStr: `${y}-${String(mo + 1).padStart(2, "0")}-${String(myt.getUTCDate()).padStart(2, "0")}`,
    hour: myt.getUTCHours(),
    dow: myt.getUTCDay(),
    dom: myt.getUTCDate(),
    daysInMonth: new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(),
  }
}

/** Current MYT hour + previous MYT hour (catch-up for a late/missed trigger). */
export function getCandidateSlots(nowUtc: Date): CandidateSlot[] {
  const current = slotFromMyt(toMyt(nowUtc))
  const previous = slotFromMyt(toMyt(new Date(nowUtc.getTime() - 60 * 60 * 1000)))
  return [current, previous]
}

/**
 * Returns the occurrenceKey when the reminder is due in the slot, else null.
 * ONCE reminders match on the UTC instant window instead of the slot.
 */
export function isDueInSlot(reminder: ReminderRow, slot: CandidateSlot, nowUtc: Date): string | null {
  if (reminder.frequency === "ONCE") {
    if (!reminder.onceAt) return null
    const t = reminder.onceAt.getTime()
    if (t <= nowUtc.getTime() && t > nowUtc.getTime() - CATCHUP_WINDOW_MS) {
      return reminder.onceAt.toISOString()
    }
    return null
  }

  if (!reminder.timeOfDay) return null
  const hour = Number(reminder.timeOfDay.slice(0, 2))
  if (Number.isNaN(hour) || hour !== slot.hour) return null

  if (reminder.frequency === "WEEKLY" && !reminder.daysOfWeek.includes(slot.dow)) return null
  if (reminder.frequency === "MONTHLY") {
    if (!reminder.dayOfMonth) return null
    // Clamp so day 31 fires on the last day of shorter months.
    if (slot.dom !== Math.min(reminder.dayOfMonth, slot.daysInMonth)) return null
  }

  return `${slot.mytDateStr}T${reminder.timeOfDay}`
}

/** Prisma where-clause resolving every targeting rule of a reminder. */
export function resolveRecipientWhere(reminder: ReminderRow) {
  const or: Record<string, unknown>[] = []
  if (reminder.targetSelf) or.push({ id: reminder.createdById })
  const explicitIds = reminder.recipients.map((r) => r.userId)
  if (explicitIds.length) or.push({ id: { in: explicitIds } })
  if (reminder.targetUnitId) or.push({ unitId: reminder.targetUnitId })
  if (reminder.targetModules.length) or.push({ modules: { hasSome: reminder.targetModules } })
  return or.length ? { OR: or } : null
}

function parseActionLinks(raw: unknown): ReminderActionLink[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((l): l is { label: string; url: string } =>
      !!l && typeof l === "object" && typeof (l as any).label === "string" && typeof (l as any).url === "string"
    )
    .map((l) => ({ label: l.label, url: l.url }))
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Hourly dispatch: find due reminders, claim each occurrence via the unique
 * (reminderId, occurrenceKey) delivery row (concurrent-safe), resolve
 * recipients, send chunked emails and record the outcome.
 */
export async function runReminderDispatch(nowUtc: Date): Promise<DispatchSummary> {
  const summary: DispatchSummary = { checked: 0, due: 0, sent: 0, skipped: 0, failed: 0 }

  const reminders = (await prisma.reminder.findMany({
    where: { enabled: true },
    include: { recipients: { select: { userId: true } } },
  })) as unknown as ReminderRow[]

  summary.checked = reminders.length
  if (!reminders.length) return summary

  const slots = getCandidateSlots(nowUtc)
  const mytNowHour = toMyt(nowUtc).getUTCHours()

  for (const reminder of reminders) {
    // First matching slot wins (slots are newest-first).
    let occurrenceKey: string | null = null
    for (const slot of slots) {
      occurrenceKey = isDueInSlot(reminder, slot, nowUtc)
      if (occurrenceKey) break
    }
    if (!occurrenceKey) continue
    summary.due++

    // Claim-first idempotency: unique constraint rejects a second claim.
    let deliveryId: string
    try {
      const delivery = await prisma.reminderDelivery.create({
        data: { reminderId: reminder.id, occurrenceKey, status: "SENDING" },
      })
      deliveryId = delivery.id
    } catch (e: any) {
      if (e?.code === "P2002") {
        summary.skipped++
        continue
      }
      throw e
    }

    try {
      const where = resolveRecipientWhere(reminder)
      const users = where
        ? await prisma.user.findMany({ where, select: { email: true } })
        : []

      const seen = new Set<string>()
      const emails: string[] = []
      for (const u of users) {
        const email = (u.email || "").trim()
        const key = email.toLowerCase()
        if (!email || seen.has(key)) continue
        seen.add(key)
        emails.push(email)
        if (emails.length >= MAX_RECIPIENTS) break
      }

      if (!emails.length) {
        await prisma.reminderDelivery.update({
          where: { id: deliveryId },
          data: { status: "SKIPPED_EMPTY", detail: "No valid recipient emails resolved." },
        })
        summary.skipped++
        continue
      }

      const html = buildReminderEmailHtml({
        title: reminder.title,
        description: reminder.description,
        actionLinks: parseActionLinks(reminder.actionLinks),
        mytHour: mytNowHour,
        frequencyLabel: buildFrequencyLabel(
          reminder.frequency,
          reminder.timeOfDay,
          reminder.onceAt ? toMyt(reminder.onceAt) : null
        ),
      })

      const icsContent = generateIcs({
        title: `Peringatan: ${reminder.title}`,
        description: reminder.description || "Peringatan automatik sistem.",
        startDateTime: nowUtc,
        endDateTime: new Date(nowUtc.getTime() + 30 * 60000), // 30 mins block
        attendees: emails,
      }) || undefined

      let okChunks = 0
      let failChunks = 0
      for (const group of chunk(emails, SEND_CHUNK_SIZE)) {
        const ok = await sendEmail({
          to: group,
          subject: `⏰ Peringatan: ${reminder.title}`,
          html,
          icsContent,
        })
        if (ok) okChunks++
        else failChunks++
      }

      const status = failChunks === 0 ? "SENT" : okChunks === 0 ? "FAILED" : "PARTIAL"
      await prisma.reminderDelivery.update({
        where: { id: deliveryId },
        data: {
          status,
          recipientCount: emails.length,
          detail: failChunks ? `${failChunks} chunk(s) failed to send via SMTP.` : null,
        },
      })

      // A ONCE reminder is spent after its send attempt.
      if (reminder.frequency === "ONCE") {
        await prisma.reminder.update({ where: { id: reminder.id }, data: { enabled: false } })
      }

      if (status === "FAILED") summary.failed++
      else summary.sent++
    } catch (e: any) {
      summary.failed++
      await prisma.reminderDelivery
        .update({
          where: { id: deliveryId },
          data: { status: "FAILED", detail: e?.message || "Unexpected dispatch error." },
        })
        .catch(() => {})
    }
  }

  return summary
}

/**
 * Dispatches a specific reminder immediately, ignoring its schedule.
 * Used when a user first creates a reminder and wants an instant initial blast.
 */
export async function dispatchReminderImmediately(reminderId: string, nowUtc: Date = new Date()): Promise<void> {
  const reminder = (await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: { recipients: { select: { userId: true } } },
  })) as unknown as ReminderRow | null

  if (!reminder || !reminder.enabled) return

  const occurrenceKey = `IMMEDIATE_${nowUtc.toISOString()}`
  let deliveryId: string
  try {
    const delivery = await prisma.reminderDelivery.create({
      data: { reminderId: reminder.id, occurrenceKey, status: "SENDING" },
    })
    deliveryId = delivery.id
  } catch (e) {
    return // Already sent an immediate blast for this exact millisecond? Unlikely, but skip.
  }

  try {
    const where = resolveRecipientWhere(reminder)
    const users = where ? await prisma.user.findMany({ where, select: { email: true } }) : []

    const seen = new Set<string>()
    const emails: string[] = []
    for (const u of users) {
      const email = (u.email || "").trim()
      const key = email.toLowerCase()
      if (!email || seen.has(key)) continue
      seen.add(key)
      emails.push(email)
      if (emails.length >= MAX_RECIPIENTS) break
    }

    if (!emails.length) {
      await prisma.reminderDelivery.update({
        where: { id: deliveryId },
        data: { status: "SKIPPED_EMPTY", detail: "No valid recipient emails resolved." },
      })
      return
    }

    const mytNowHour = toMyt(nowUtc).getUTCHours()
    const html = buildReminderEmailHtml({
      title: reminder.title,
      description: reminder.description,
      actionLinks: parseActionLinks(reminder.actionLinks),
      mytHour: mytNowHour,
      frequencyLabel: buildFrequencyLabel(
        reminder.frequency,
        reminder.timeOfDay,
        reminder.onceAt ? toMyt(reminder.onceAt) : null
      ),
    })

    const icsContent = generateIcs({
      title: `Peringatan: ${reminder.title}`,
      description: reminder.description || "Peringatan automatik sistem.",
      startDateTime: nowUtc,
      endDateTime: new Date(nowUtc.getTime() + 30 * 60000), // 30 mins block
      attendees: emails,
    }) || undefined

    let okChunks = 0
    let failChunks = 0
    for (const group of chunk(emails, SEND_CHUNK_SIZE)) {
      const ok = await sendEmail({
        to: group,
        subject: `⏰ Peringatan: ${reminder.title}`,
        html,
        icsContent,
      })
      if (ok) okChunks++
      else failChunks++
    }

    const status = failChunks === 0 ? "SENT" : okChunks === 0 ? "FAILED" : "PARTIAL"
    await prisma.reminderDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        recipientCount: emails.length,
        detail: failChunks ? `${failChunks} chunk(s) failed to send via SMTP.` : null,
      },
    })
  } catch (e: any) {
    await prisma.reminderDelivery
      .update({
        where: { id: deliveryId },
        data: { status: "FAILED", detail: e?.message || "Unexpected dispatch error." },
      })
      .catch(() => {})
  }
}

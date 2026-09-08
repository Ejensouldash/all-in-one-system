"use server"

import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { revalidatePath } from "next/cache"
import { parsePMWorkbook, suggestGroups } from "@/lib/reminders/pm-import"
import { addDays, canCompletePM, mytDate, validDate, validRule, validateCompletion, type PMGroup, type PMInput, type PMSourceRow } from "@/lib/reminders/pm-core"
import { lockPM, materializePM, pmVisibleWhere, type PMTransaction } from "@/lib/reminders/pm-store"
import { sendEmailWithDetails } from "@/lib/mailer"
import { generatePMTaskCalendarInvite } from "@/lib/fuv-calendar"
import { buildPMSingleTaskEmailHtml } from "@/lib/reminders/pm-dispatch"
import type { Prisma } from "@prisma/client"

async function accessPM(admin = false) {
  const access = await getAccessInfo()
  if (!access || !hasAnyModule(access, ["REMINDERS"]) || (admin && !access.isSuperAdmin)) throw new Error("Tiada akses Reminders.")
  return access
}
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
async function usersPM() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, modules: true, unit: { select: { name: true } } }, orderBy: { name: "asc" } })
  return users.map(u => ({ id: u.id, name: u.name, email: u.email, eligible: u.role === "SUPERADMIN" || u.unit?.name === "Information Technology" || u.modules.includes("REMINDERS") }))
}
function cleanPM(input: PMInput): PMInput {
  if (!input || !validRule(input) || typeof input.equipment !== "string" || !input.equipment.trim() || input.equipment.length > 200) throw new Error("Equipment/tarikh/kekerapan tidak sah.")
  if (input.srs !== null && (typeof input.srs !== "string" || input.srs.length > 120)) throw new Error("SRS tidak sah.")
  if (!Array.isArray(input.checklist) || !input.checklist.length || input.checklist.length > 30 || input.checklist.some(t => typeof t !== "string" || !t.trim() || t.length > 1000)) throw new Error("Masukkan 1–30 arahan kerja yang sah.")
  if (!Array.isArray(input.picIds) || input.picIds.length > 30 || input.picIds.some(id => typeof id !== "string")) throw new Error("Senarai PIC tidak sah.")
  return { equipment: input.equipment.trim(), srs: input.srs?.trim() || null, checklist: [...new Set(input.checklist.map(t => t.trim()))], picIds: [...new Set(input.picIds)], startDate: input.startDate, intervalUnit: input.intervalUnit, intervalCount: input.intervalCount }
}
async function validatePics(inputs: PMInput[]) {
  const users = await usersPM()
  const eligible = new Set(users.filter(u => u.eligible && u.email).map(u => u.id))
  if (inputs.some(i => i.picIds.some(id => !eligible.has(id)))) throw new Error("Semua PIC mesti mempunyai akaun, e-mel dan akses Reminders. Semak padanan PIC.")
}

export async function getPMData(from: string, to: string, occurrenceId?: string) {
  const access = await accessPM()
  const today = mytDate()
  if (!validDate(from) || !validDate(to) || from > to || to > addDays(today, 730) || (Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw new Error("Pilih julat maksimum setahun, sehingga dua tahun ke hadapan.")
  const schedules = await prisma.reminderPMSchedule.findMany({ where: pmVisibleWhere(access), orderBy: { equipment: "asc" } })
  if (schedules.length > 0) {
    await prisma.$transaction(async tx => { await lockPM(tx); await materializePM(tx, to > today ? to : today, schedules.map(s => s.id)) }, { timeout: 30000 })
  }
  const occurrences = await prisma.reminderPMOccurrence.findMany({
    where: {
      scheduleId: { in: schedules.map(s => s.id) },
      ...(access.isSuperAdmin ? {} : { OR: [{ picIds: { has: access.userId } }, { schedule: { createdById: access.userId } }] }),
      AND: [{ OR: [{ dueDate: { gte: from, lte: to } }, { dueDate: { lt: today }, completedAt: null }, ...(occurrenceId ? [{ id: occurrenceId }] : [])] }],
    },
    include: {
      schedule: { select: { id: true, activationDate: true, archivedAt: true, intervalUnit: true, intervalCount: true, startDate: true } },
    },
    orderBy: { dueDate: "asc" },
  })
  const deliveries = await prisma.reminderPMDelivery.findMany({ where: access.isSuperAdmin ? {} : { userId: access.userId }, orderBy: { digestDate: "desc" }, take: 50 })
  const imports = access.isSuperAdmin ? await prisma.reminderPMImport.findMany({ select: { id: true, fileName: true, createdAt: true, confirmedAt: true }, orderBy: { createdAt: "desc" }, take: 20 }) : []
  return { today, userId: access.userId, isSuperAdmin: access.isSuperAdmin, schedules, occurrences, users: await usersPM(), deliveries, imports }
}

export async function previewPMImport(data: FormData) {
  const access = await accessPM(true)
  const file = data.get("file")
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size > 5 * 1024 * 1024) throw new Error("Pilih fail .xlsx sehingga 5 MB.")
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileHash = createHash("sha256").update(buffer).digest("hex")
  const existing = await prisma.reminderPMImport.findUnique({ where: { fileHash } })
  if (existing?.confirmedAt) throw new Error("Fail ini sudah diimport. Gunakan Jadual PM untuk mengubah jadual sedia ada.")
  const rows = await parsePMWorkbook(buffer)
  const record = await prisma.reminderPMImport.upsert({ where: { fileHash }, update: {}, create: { fileHash, fileName: file.name, rows: json(rows), createdById: access.userId } })
  const schedules = await prisma.reminderPMSchedule.findMany({ where: { sourceKey: { not: null } } })
  const groups = suggestGroups(rows).map(group => ({ ...group, targetId: schedules.find(s => s.sourceKey === group.sourceKey)?.id }))
  return { id: record.id, fileName: record.fileName, rowCount: rows.length, groups }
}

async function replaceFuture(tx: PMTransaction, id: string, input: PMInput, today: string) {
  const current = await tx.reminderPMSchedule.findUniqueOrThrow({ where: { id } })
  if (current.archivedAt) throw new Error("Jadual ini telah diarkibkan.")
  // Capture today's and overdue work before changing the rule/PIC snapshots.
  await materializePM(tx, today, [id])
  await tx.reminderPMOccurrence.deleteMany({ where: { scheduleId: id, dueDate: { gt: today }, completedAt: null } })
  await tx.reminderPMSchedule.update({ where: { id }, data: { ...input, generationFrom: current.activationDate > today ? current.activationDate : addDays(today, 1) } })
}

export async function confirmPMImport(importId: string, rawGroups: PMGroup[], activationDate: string) {
  const access = await accessPM(true)
  const today = mytDate()
  if (!validDate(activationDate) || activationDate < today || activationDate > addDays(today, 730)) throw new Error("Tarikh pengaktifan mesti hari ini atau masa hadapan (maksimum dua tahun).")
  if (!Array.isArray(rawGroups) || !rawGroups.length || rawGroups.length > 250 || rawGroups.some(g => g.reviewed !== true)) throw new Error("Sahkan setiap kumpulan kerja sebelum aktif.")
  const inputs = rawGroups.map(cleanPM)
  await validatePics(inputs)
  await prisma.$transaction(async tx => {
    await lockPM(tx)
    const record = await tx.reminderPMImport.findUniqueOrThrow({ where: { id: importId } })
    if (record.confirmedAt) throw new Error("Import ini sudah diaktifkan.")
    const rows = record.rows as unknown as PMSourceRow[]
    const baseGroups = suggestGroups(rows)
    const sourceByKey = new Map(baseGroups.map(g => [g.sourceKey, g]))
    const usedRows = new Set<string>()
    const usedKeys = new Set<string>()
    const usedTargets = new Set<string>()
    for (let index = 0; index < rawGroups.length; index++) {
      const group = rawGroups[index]
      const baseKey = group.sourceKey.split(":")[0]
      const base = sourceByKey.get(baseKey)
      if (!base || usedKeys.has(group.sourceKey) || group.sourceKey.length > 160 || !Array.isArray(group.sourceRows) || !group.sourceRows.length) throw new Error("Kumpulan import tidak sah/bertindih.")
      usedKeys.add(group.sourceKey)
      const actualRows: PMSourceRow[] = []
      for (const row of group.sourceRows) {
        const key = `${row.sheet}:${row.row}`
        const original = base.sourceRows.find(r => r.sheet === row.sheet && r.row === row.row)
        if (!original || usedRows.has(key)) throw new Error("Baris sumber tidak sah/bertindih.")
        usedRows.add(key); actualRows.push(original)
      }
      const matched = group.targetId ? await tx.reminderPMSchedule.findUniqueOrThrow({ where: { id: group.targetId } }) : await tx.reminderPMSchedule.findUnique({ where: { sourceKey: group.sourceKey } })
      if (matched) {
        if (usedTargets.has(matched.id)) throw new Error("Dua kumpulan tidak boleh menimpa jadual yang sama.")
        usedTargets.add(matched.id)
        await replaceFuture(tx, matched.id, inputs[index], today)
        await tx.reminderPMSchedule.update({ where: { id: matched.id }, data: { importId, sourceRows: json(actualRows) } })
      } else {
        await tx.reminderPMSchedule.create({ data: { ...inputs[index], sourceKey: group.sourceKey, importId, sourceRows: json(actualRows), activationDate, generationFrom: activationDate, createdById: access.userId } })
      }
    }
    if (usedRows.size !== rows.length) throw new Error("Semua baris sumber mesti termasuk dalam semakan.")
    await tx.reminderPMImport.update({ where: { id: importId }, data: { confirmedAt: new Date(), review: json(rawGroups) } })
  }, { timeout: 30000 })
  revalidatePath("/reminders")
  return { success: true }
}

export async function savePMSchedule(id: string | null, raw: PMInput, activationDate: string) {
  const access = await accessPM()
  const input = cleanPM(raw)
  await validatePics([input])
  const today = mytDate()
  if (!id && (!validDate(activationDate) || activationDate < today || activationDate > addDays(today, 730))) throw new Error("Tarikh pengaktifan tidak sah.")
  await prisma.$transaction(async tx => {
    await lockPM(tx)
    if (id) {
      const schedule = await tx.reminderPMSchedule.findUniqueOrThrow({ where: { id } })
      if (!access.isSuperAdmin && schedule.createdById !== access.userId) throw new Error("Hanya pencipta/Superadmin boleh mengubah jadual.")
      await replaceFuture(tx, id, input, today)
    } else await tx.reminderPMSchedule.create({ data: { ...input, activationDate, generationFrom: activationDate, createdById: access.userId } })
  }, { timeout: 30000 })
  revalidatePath("/reminders")
}

export async function archivePMSchedule(id: string) {
  const access = await accessPM()
  await prisma.$transaction(async tx => {
    await lockPM(tx)
    const schedule = await tx.reminderPMSchedule.findUniqueOrThrow({ where: { id } })
    if (!access.isSuperAdmin && schedule.createdById !== access.userId) throw new Error("Tiada kebenaran mengarkib.")
    await materializePM(tx, mytDate(), [id])
    await tx.reminderPMOccurrence.deleteMany({ where: { scheduleId: id, dueDate: { gt: mytDate() }, completedAt: null } })
    await tx.reminderPMSchedule.update({ where: { id }, data: { archivedAt: new Date() } })
  }, { timeout: 30000 })
  revalidatePath("/reminders")
}

export async function completePMOccurrence(id: string, result: string, notes: string, inspectedDate: string) {
  const access = await accessPM()
  await prisma.$transaction(async tx => {
    await lockPM(tx)
    const task = await tx.reminderPMOccurrence.findUniqueOrThrow({ where: { id }, include: { schedule: true } })
    if (!canCompletePM(access, task.picIds)) throw new Error("Hanya PIC/Superadmin boleh merekod pemeriksaan ini.")
    if (task.completedAt) throw new Error("Pemeriksaan ini sudah selesai.")
    validateCompletion(result, notes, inspectedDate, mytDate(), task.schedule.activationDate)
    await tx.reminderPMOccurrence.update({ where: { id }, data: { result, notes: notes.trim() || null, inspectedDate, completedById: access.userId, completedAt: new Date() } })
  })
  revalidatePath("/reminders")
}

export async function assignPMOccurrence(id: string, picIds: string[]) {
  const access = await accessPM()
  if (!Array.isArray(picIds) || picIds.length > 30 || picIds.some(id => typeof id !== "string")) throw new Error("Pilih PIC yang sah.")
  await validatePics([{ picIds } as PMInput])
  await prisma.$transaction(async tx => {
    await lockPM(tx)
    const task = await tx.reminderPMOccurrence.findUniqueOrThrow({ where: { id }, include: { schedule: true } })
    if (!access.isSuperAdmin && task.schedule.createdById !== access.userId) throw new Error("Tiada kebenaran mengubah PIC.")
    if (task.completedAt || task.dueDate < mytDate()) throw new Error("PIC sejarah tidak boleh diubah.")
    await tx.reminderPMOccurrence.update({ where: { id }, data: { picIds: [...new Set(picIds)] } })
  })
  revalidatePath("/reminders")
}

export async function getPMImportHistory(id: string) {
  await accessPM(true)
  return prisma.reminderPMImport.findUniqueOrThrow({ where: { id }, select: { fileName: true, rows: true, review: true, confirmedAt: true } })
}

/**
 * SuperAdmin-only action to simulate and test real email and Google Calendar dispatch for a specific PM task.
 */
export async function simulatePMTaskReminderAction(occurrenceId: string) {
  const access = await accessPM(true) // Strictly SuperAdmin only
  const today = mytDate()

  const task = await prisma.reminderPMOccurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { schedule: true },
  })

  // Find PIC users assigned to this task
  const picUsers = await prisma.user.findMany({
    where: { id: { in: task.picIds } },
    select: { id: true, name: true, email: true },
  })

  // Find the SuperAdmin user who initiated the simulation
  const adminUser = await prisma.user.findUnique({
    where: { id: access.userId },
    select: { id: true, name: true, email: true },
  })

  // Combine recipients: Admin + Assigned PICs
  const targetEmails = Array.from(
    new Set(
      [
        adminUser?.email,
        ...picUsers.map((u) => u.email),
      ].filter((e): e is string => Boolean(e && e.includes("@")))
    )
  )

  if (targetEmails.length === 0) {
    return {
      success: false,
      error: "Tiada alamat emel yang sah untuk dihantar. Sila pastikan akaun anda mempunyai emel berdaftar.",
    }
  }

  const picNames = picUsers.map((u) => u.name).join(", ") || "Tiada Ditugaskan (Ujian SuperAdmin)"
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "https://bubbleso2-aio.vercel.app"
  ).replace(/\/$/, "")

  const formUrl = `${baseUrl}/reminders?tab=pm&occurrence=${encodeURIComponent(task.id)}`

  const statusLabel =
    task.dueDate < today ? "Tertunggak (Overdue)" : task.dueDate === today ? "Hari Ini (Today)" : "Akan Datang (Upcoming)"

  // 1. Generate Google Calendar invite (.ics) & 1-Click URL
  const { icsContent, googleCalendarUrl } = generatePMTaskCalendarInvite({
    equipment: task.equipment,
    dueDateStr: task.dueDate,
    srs: task.srs,
    checklist: task.checklist,
    formUrl,
    attendees: targetEmails,
  })

  // 2. Generate HTML email
  const { subject, html } = buildPMSingleTaskEmailHtml({
    equipment: task.equipment,
    srs: task.srs,
    dueDate: task.dueDate,
    statusLabel,
    checklist: task.checklist,
    picNames,
    formUrl,
    googleCalendarUrl,
  })

  // 3. Send via dynamic mailer (Resend or Gmail SMTP)
  const emailRes = await sendEmailWithDetails({
    to: targetEmails,
    subject: `🧪 [SIMULASI SUPERADMIN] ${subject}`,
    html,
    icsContent: icsContent || undefined,
  })

  if (!emailRes.success) {
    return {
      success: false,
      error: emailRes.error || "Gagal menghantar emel simulasi PM task.",
    }
  }

  return {
    success: true,
    recipients: targetEmails,
    equipment: task.equipment,
    dueDate: task.dueDate,
  }
}

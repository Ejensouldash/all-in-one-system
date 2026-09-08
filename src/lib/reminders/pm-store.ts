import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { datesBetween, mytDate } from "./pm-core"

export type PMTransaction = Prisma.TransactionClient
// Serialize materialization with edits/completion so an old schedule can never
// recreate deleted future occurrences after an edit commits.
export async function lockPM(tx: PMTransaction) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(73032026)`
}
export async function materializePM(tx: PMTransaction, through: string, scheduleIds?: string[]) {
  const schedules = await tx.reminderPMSchedule.findMany({ where: { archivedAt: null, ...(scheduleIds ? { id: { in: scheduleIds } } : {}) } })
  for (const schedule of schedules) {
    const from = schedule.generationFrom > schedule.activationDate ? schedule.generationFrom : schedule.activationDate
    if (from > through) continue
    const dates = datesBetween(schedule, from, through)
    if (dates.length) await tx.reminderPMOccurrence.createMany({
      data: dates.map(dueDate => ({ scheduleId: schedule.id, dueDate, equipment: schedule.equipment, srs: schedule.srs, checklist: schedule.checklist, picIds: schedule.picIds })),
      skipDuplicates: true,
    })
  }
}
export async function ensurePMThrough(through: string) {
  await prisma.$transaction(async tx => { await lockPM(tx); await materializePM(tx, through) }, { timeout: 30000 })
}
export function pmVisibleWhere(access: { isSuperAdmin: boolean; userId: string }) {
  return access.isSuperAdmin ? {} : { OR: [{ createdById: access.userId }, { picIds: { has: access.userId } }, { occurrences: { some: { picIds: { has: access.userId } } } }] }
}
export const pmToday = mytDate

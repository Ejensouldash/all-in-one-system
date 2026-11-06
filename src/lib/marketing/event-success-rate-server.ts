import { prisma } from "@/lib/prisma"
import {
  buildEventScoreBreakdown,
  isScoreLocked,
  parseImpactItems,
  parseScoreBreakdown,
  type EventScoreBreakdown,
} from "./event-success-rate"

/**
 * Recomputes the weighted score from the database and stores the snapshot on the report.
 * Locked reports (SUBMITTED / APPROVED) keep their stored snapshot unless `force` is used —
 * the force path is reserved for authorised budget-cap revisions.
 */
export async function recomputeEventScore(
  requisitionId: string,
  options?: { force?: boolean }
): Promise<EventScoreBreakdown | null> {
  const requisition = await prisma.marketingEventRequisition.findUnique({
    where: { id: requisitionId },
    include: {
      feedbacks: { select: { satisfaction: true, aiSentiment: true } },
      postEventReport: true,
    },
  })

  if (!requisition?.postEventReport) return null

  const report = requisition.postEventReport
  const storedBreakdown = parseScoreBreakdown(report.scoreBreakdown)

  if (!options?.force && isScoreLocked(report.status) && storedBreakdown) return storedBreakdown

  const breakdown = buildEventScoreBreakdown({
    feedbacks: requisition.feedbacks,
    budgetCap: requisition.budgetCap,
    impactItems: parseImpactItems(report.impactDistribution),
    totalClaimAmount: report.totalClaimAmount,
  })

  await prisma.marketingPostEventReport.update({
    where: { requisitionId },
    data: {
      eventSuccessRate: breakdown.total,
      scoreBreakdown: JSON.stringify(breakdown),
      scoreComputedAt: new Date(),
      scoreFlags: JSON.stringify(breakdown.flags),
    },
  })

  return breakdown
}

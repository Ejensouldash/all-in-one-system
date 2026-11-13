"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import { getAccessInfo, canSetMarketingEventBudget } from "@/lib/access"
import { logUserAction } from "./audit"
import fs from "fs"
import path from "path"
import {
  SATISFACTION_WEIGHTS,
  DEFAULT_SATISFACTION_WEIGHT,
  buildEventScoreBreakdown,
  getScoreMissingRequirements,
  isScoreLocked,
  parseCategoryBudgets,
  parseImpactItems,
  parseScoreBreakdown,
  parseStaffInvolved,
  DEFAULT_STAFF_DEPARTMENTS,
  round2,
  sanitizeImpactItems,
  type EventCategoryBudgets,
  type ImpactItem,
  type StaffInvolvedEntry,
} from "@/lib/marketing/event-success-rate"
import { recomputeEventScore } from "@/lib/marketing/event-success-rate-server"

export interface VipEntry {
  name: string
  title: string
}

export interface PlannedFlowItem {
  id: string
  dayLabel: string
  imageUrl: string
  caption?: string
}

export interface ActivationItem {
  id: string
  title: string
  description?: string
}

export interface ActivationImageItem {
  id: string
  title: string
  imageUrl: string
}

export interface ClaimItemDetail {
  id: string
  description: string
  category:
    | "PETROL"
    | "TNG"
    | "ACCOMMODATION"
    | "MEALS"
    | "BOOTH_ITEMS"
    | "ICE"
    | "LOGISTICS"
    | "OTHER"
    | "TRANSPORTATION"
    | "MISCELLANEOUS"
    | "PETTY CASH"
    | (string & {})
  vehiclePlate?: string
  amount: number
  receiptUrl?: string
  receiptName?: string
}

export interface ClaimantGroup {
  id: string
  claimantName: string
  items: ClaimItemDetail[]
  subtotal: number
}

export interface MediaLinkItem {
  id: string
  platform: "TikTok" | "Facebook" | "Instagram" | "Website" | "Other"
  url: string
  description?: string
}

export interface PostEventReportFormData {
  id?: string
  requisitionId: string
  documentNo: string
  issueNo: string
  reportDate: string
  reportPreparedBy: string

  attendeesCount: string
  typeOfInvolvement: string
  vipsList: VipEntry[]
  staffInvolved: StaffInvolvedEntry[]

  aims: string
  benefits: string
  expectedImpact: string
  impactDistribution: ImpactItem[]

  flowType: "DAILY" | "STAGES"
  plannedFlowText: string
  plannedFlowImages: PlannedFlowItem[]
  executedFlowText: string

  activationsList: ActivationItem[]
  activationImages: ActivationImageItem[]

  claimBreakdown: ClaimantGroup[]
  totalClaimAmount: number

  futureImprovementOrg: string
  futureImprovementPart: string
  futureConsideration: boolean
  eventSuccessRate: number

  mediaLinks: MediaLinkItem[]

  status: "DRAFT" | "SUBMITTED" | "APPROVED"
  approvedBy?: string | null
  approvedAt?: string | null
  approvalSignatureUrl?: string | null
}

interface FeedbackRecord {
  id: string
  respondentName: string
  likedMost: string
  likedLeast: string
  satisfaction: string
  wellOrganized: boolean
  comments: string
  createdAt: Date
  source: string
  aiSentiment: string | null
  aiReason: string | null
  aiConfidence: number | null
}

/**
 * Builds the feedback statistics shown in section 11 and the participant list used by the
 * Gemini classification panel. All responses are returned (capped at 100) so the modal can
 * preview the weighted score without another round-trip.
 */
function buildFeedbackAnalytics(feedbacks: FeedbackRecord[]) {
  const totalFeedbacks = feedbacks.length

  const satisfactionCounts = {
    EXTREMELY_SATISFIED: 0,
    VERY_SATISFIED: 0,
    SOMEWHAT_SATISFIED: 0,
    NOT_SO_SATISFIED: 0,
    NOT_AT_ALL_SATISFIED: 0,
  }

  const sentimentCounts = { GOOD: 0, NEUTRAL: 0, BAD: 0 }

  let weightSum = 0
  let positiveCount = 0
  let aiAnalyzed = 0

  feedbacks.forEach((feedback) => {
    if (feedback.satisfaction in satisfactionCounts) {
      satisfactionCounts[feedback.satisfaction as keyof typeof satisfactionCounts]++
    }
    weightSum += SATISFACTION_WEIGHTS[feedback.satisfaction] ?? DEFAULT_SATISFACTION_WEIGHT

    if (feedback.satisfaction === "EXTREMELY_SATISFIED" || feedback.satisfaction === "VERY_SATISFIED") {
      positiveCount++
    }

    if (feedback.aiSentiment === "GOOD" || feedback.aiSentiment === "NEUTRAL" || feedback.aiSentiment === "BAD") {
      sentimentCounts[feedback.aiSentiment]++
      aiAnalyzed++
    }
  })

  const satisfactionIndex = totalFeedbacks > 0 ? round2(weightSum / totalFeedbacks) : 0
  const positiveRate = totalFeedbacks > 0 ? round2((positiveCount / totalFeedbacks) * 100) : 0

  return {
    totalFeedbacks,
    satisfactionCounts,
    satisfactionIndex,
    positiveRate,
    // Legacy field kept for backwards compatibility with older UI code.
    satisfactionRate: positiveRate,
    sentimentCounts,
    aiAnalyzed,
    feedbacks: feedbacks.slice(0, 100).map((feedback) => ({
      id: feedback.id,
      respondentName: feedback.respondentName,
      likedMost: feedback.likedMost,
      likedLeast: feedback.likedLeast,
      comments: feedback.comments,
      satisfaction: feedback.satisfaction,
      wellOrganized: feedback.wellOrganized,
      aiSentiment: feedback.aiSentiment,
      aiReason: feedback.aiReason,
      aiConfidence: feedback.aiConfidence,
      createdAt: feedback.createdAt,
      source: feedback.source,
    })),
  }
}

/**
 * Fetches the post-event report for an event requisition.
 * If report does not exist yet, prepares default prefilled data from the requisition.
 */
export async function getPostEventReport(requisitionId: string) {
  try {
    const requisition = await prisma.marketingEventRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        postEventReport: true,
        feedbacks: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!requisition) {
      return { success: false, error: "Event requisition not found" }
    }

    const feedbackStats = buildFeedbackAnalytics(requisition.feedbacks)

    const requisitionInfo = {
      id: requisition.id,
      requestNumber: requisition.requestNumber,
      eventName: requisition.eventName,
      eventType: requisition.eventType,
      organizer: requisition.organizer,
      eventDateFrom: requisition.eventDateFrom,
      eventDateTo: requisition.eventDateTo,
      name: requisition.name,
      department: requisition.department,
      budgetCap: requisition.budgetCap,
      categoryBudgets: parseCategoryBudgets(requisition.categoryBudgets, requisition.budgetCap),
      budgetSetBy: requisition.budgetSetBy,
      budgetSetAt: requisition.budgetSetAt?.toISOString() || null,
    }

    if (requisition.postEventReport) {
      const rep = requisition.postEventReport
      const storedBreakdown = parseScoreBreakdown(rep.scoreBreakdown)
      const scoreLocked = isScoreLocked(rep.status)

      let claimsList: unknown = []
      try {
        claimsList = JSON.parse(rep.claimBreakdown || "[]")
      } catch {
        claimsList = []
      }

      const computedBreakdown = buildEventScoreBreakdown({
        feedbacks: requisition.feedbacks,
        budgetCap: requisition.budgetCap,
        categoryBudgets: requisition.categoryBudgets,
        claimBreakdown: claimsList,
        hasBudgetBeenSet: Boolean(requisition.budgetSetBy || requisition.budgetCap !== null),
        impactItems: parseImpactItems(rep.impactDistribution),
        totalClaimAmount: rep.totalClaimAmount,
      })
      const breakdown = scoreLocked && storedBreakdown ? storedBreakdown : computedBreakdown

      return {
        success: true,
        isNew: false,
        requisition: requisitionInfo,
        report: {
          id: rep.id,
          requisitionId: rep.requisitionId,
          documentNo: rep.documentNo,
          issueNo: rep.issueNo,
          reportDate: rep.reportDate.toISOString().split("T")[0],
          reportPreparedBy: rep.reportPreparedBy,
          attendeesCount: rep.attendeesCount || "",
          typeOfInvolvement: rep.typeOfInvolvement,
          vipsList: JSON.parse(rep.vipsList || "[]") as VipEntry[],
          staffInvolved: parseStaffInvolved(rep.staffInvolved),
          aims: rep.aims || "",
          benefits: rep.benefits || "",
          expectedImpact: rep.expectedImpact || "",
          impactDistribution: parseImpactItems(rep.impactDistribution),
          flowType: (rep.flowType || "DAILY") as "DAILY" | "STAGES",
          plannedFlowText: rep.plannedFlowText || "",
          plannedFlowImages: JSON.parse(rep.plannedFlowImages || "[]") as PlannedFlowItem[],
          executedFlowText: rep.executedFlowText || "",
          activationsList: JSON.parse(rep.activationsList || "[]") as ActivationItem[],
          activationImages: JSON.parse(rep.activationImages || "[]") as ActivationImageItem[],
          claimBreakdown: JSON.parse(rep.claimBreakdown || "[]") as ClaimantGroup[],
          totalClaimAmount: rep.totalClaimAmount,
          futureImprovementOrg: rep.futureImprovementOrg || "",
          futureImprovementPart: rep.futureImprovementPart || "",
          futureConsideration: rep.futureConsideration,
          eventSuccessRate: scoreLocked && storedBreakdown ? storedBreakdown.total : computedBreakdown.total,
          mediaLinks: JSON.parse(rep.mediaLinks || "[]") as MediaLinkItem[],
          status: rep.status as "DRAFT" | "SUBMITTED" | "APPROVED",
          approvedBy: rep.approvedBy,
          approvedAt: rep.approvedAt?.toISOString() || null,
          approvalSignatureUrl: rep.approvalSignatureUrl,
        },
        feedbackStats,
        scoreBreakdown: breakdown,
        scoreLocked,
        missingRequirements: getScoreMissingRequirements(breakdown.flags),
      }
    }

    // Generate fresh report template with prefilled data
    const count = await prisma.marketingPostEventReport.count()
    const autoDocNumber = `BOMSB/ADMN/MKT/EVT/${270010 + count}`

    const initialBreakdown = buildEventScoreBreakdown({
      feedbacks: requisition.feedbacks,
      budgetCap: requisition.budgetCap,
      categoryBudgets: requisition.categoryBudgets,
      claimBreakdown: [],
      hasBudgetBeenSet: Boolean(requisition.budgetSetBy || requisition.budgetCap !== null),
      impactItems: [],
      totalClaimAmount: 0,
    })

    const initialReport: PostEventReportFormData = {
      requisitionId: requisition.id,
      documentNo: autoDocNumber,
      issueNo: "02",
      reportDate: new Date().toISOString().split("T")[0],
      reportPreparedBy: requisition.name || "MUHAMMAD PUTRA SHAZWAN",
      attendeesCount: "",
      typeOfInvolvement: requisition.eventType || "Sponsorship",
      vipsList: [
        { name: "Dato Arifin Marzuki", title: "Chairman Bubbles O2" },
        { name: "Pn Ain Azizah", title: "Managing Director Bubbles O2" },
        { name: "Dr Norhazana", title: "Chief Operating Officer Bubbles O2" },
      ],
      staffInvolved: requisition.name
        ? [{ name: requisition.name, department: "MARKETING" }]
        : [{ name: "", department: "MARKETING" }],
      aims: `To strengthen Bubbles O2's brand awareness, visibility and strategic market reach during ${requisition.eventName}.`,
      benefits: `Enhanced brand credibility, established direct consumer interactions and unlocked new commercial opportunities.`,
      expectedImpact: "425mlx24 = 1000ctn\n800mlx12 = 50ctn",
      impactDistribution: [],
      flowType: "DAILY",
      plannedFlowText: requisition.tentative || "",
      plannedFlowImages: [],
      executedFlowText: "Event executed successfully in accordance with planned tentative.",
      activationsList: [
        { id: "act-1", title: "Snap, Share & Win", description: "Social media engagement booth activation." },
        { id: "act-2", title: "Product Sampling & Sale", description: "Direct retail sales and hydration sampling." },
      ],
      activationImages: [],
      claimBreakdown: [],
      totalClaimAmount: 0,
      futureImprovementOrg: "Enhance briefing coordination with venue safety and logistics contractors.",
      futureImprovementPart: "Introduce more interactive games and express hydration checkpoints.",
      futureConsideration: true,
      eventSuccessRate: initialBreakdown.total,
      mediaLinks: [
        { id: "ml-1", platform: "TikTok", url: "https://vt.tiktok.com/BubblesO2HQ/" },
        { id: "ml-2", platform: "Facebook", url: "https://www.facebook.com/BubblesO2HQ/" },
      ],
      status: "DRAFT",
    }

    return {
      success: true,
      isNew: true,
      requisition: requisitionInfo,
      report: initialReport,
      feedbackStats,
      scoreBreakdown: initialBreakdown,
      scoreLocked: false,
      missingRequirements: getScoreMissingRequirements(initialBreakdown.flags),
    }
  } catch (error: any) {
    console.error("Error in getPostEventReport:", error)
    return { success: false, error: error.message || "Failed to load post-event report" }
  }
}

/**
 * Saves or updates a Post-Event Report draft.
 * The weighted success rate is always recalculated on the server; any client-supplied value is ignored.
 */
export async function savePostEventReport(formData: PostEventReportFormData) {
  try {
    let sessionName = "Staff"
    try {
      const session = await auth()
      if (session?.user?.name) sessionName = session.user.name
    } catch {
      // Outside request context
    }

    // Recalculate claims total strictly on the server to prevent arithmetic bugs
    let grandTotal = 0
    const sanitizedClaims = formData.claimBreakdown.map((group) => {
      let groupSubtotal = 0
      const items = (group.items || []).map((it) => {
        const amt = typeof it.amount === "number" && !isNaN(it.amount) ? Math.max(0, it.amount) : 0
        groupSubtotal += amt
        return {
          id: it.id || `claim-${Date.now()}-${Math.random()}`,
          description: it.description?.trim() || "Item expense",
          category: it.category || "OTHER",
          vehiclePlate: it.vehiclePlate?.trim() || "",
          amount: amt,
          receiptUrl: it.receiptUrl || "",
          receiptName: it.receiptName || "",
        }
      })
      grandTotal += groupSubtotal
      return {
        id: group.id || `grp-${Date.now()}-${Math.random()}`,
        claimantName: group.claimantName?.trim() || "Staff",
        items,
        subtotal: Math.round(groupSubtotal * 100) / 100,
      }
    })

    const sanitizedImpactItems = sanitizeImpactItems(formData.impactDistribution)

    const requisition = await prisma.marketingEventRequisition.findUnique({
      where: { id: formData.requisitionId },
      select: {
        budgetCap: true,
        categoryBudgets: true,
        budgetSetBy: true,
        postEventReport: {
          select: {
            status: true,
            eventSuccessRate: true,
            scoreBreakdown: true,
            scoreFlags: true,
            scoreComputedAt: true,
          },
        },
      },
    })

    const existingReport = requisition?.postEventReport ?? null
    const lockedReport =
      existingReport && isScoreLocked(existingReport.status) ? existingReport : null
    const lockedBreakdown = lockedReport ? parseScoreBreakdown(lockedReport.scoreBreakdown) : null

    const feedbacks = await prisma.marketingEventFeedback.findMany({
      where: { requisitionId: formData.requisitionId },
      select: { satisfaction: true, aiSentiment: true },
    })

    const breakdown = buildEventScoreBreakdown({
      feedbacks,
      budgetCap: requisition?.budgetCap ?? null,
      categoryBudgets: requisition?.categoryBudgets,
      claimBreakdown: sanitizedClaims,
      hasBudgetBeenSet: Boolean(requisition?.budgetSetBy || requisition?.budgetCap !== null),
      impactItems: sanitizedImpactItems,
      totalClaimAmount: round2(grandTotal),
    })

    const effectiveBreakdown = lockedBreakdown ?? breakdown

    const scoreFields = lockedReport
      ? {
          eventSuccessRate: lockedReport.eventSuccessRate,
          scoreBreakdown: lockedReport.scoreBreakdown,
          scoreComputedAt: lockedReport.scoreComputedAt ?? new Date(),
          scoreFlags: lockedReport.scoreFlags,
        }
      : {
          eventSuccessRate: breakdown.total,
          scoreBreakdown: JSON.stringify(breakdown),
          scoreComputedAt: new Date(),
          scoreFlags: JSON.stringify(breakdown.flags),
        }

    const payload = {
      documentNo: formData.documentNo.trim(),
      issueNo: formData.issueNo || "02",
      reportDate: formData.reportDate ? new Date(formData.reportDate) : new Date(),
      reportPreparedBy: formData.reportPreparedBy?.trim() || sessionName || "Staff",
      attendeesCount: formData.attendeesCount?.trim() || "",
      typeOfInvolvement: formData.typeOfInvolvement?.trim() || "Sponsorship",
      vipsList: JSON.stringify(formData.vipsList || []),
      staffInvolved: JSON.stringify(formData.staffInvolved || []),
      aims: formData.aims?.trim() || "",
      benefits: formData.benefits?.trim() || "",
      expectedImpact: formData.expectedImpact?.trim() || "",
      impactDistribution: JSON.stringify(sanitizedImpactItems),
      flowType: formData.flowType || "DAILY",
      plannedFlowText: formData.plannedFlowText?.trim() || "",
      plannedFlowImages: JSON.stringify(formData.plannedFlowImages || []),
      executedFlowText: formData.executedFlowText?.trim() || "",
      activationsList: JSON.stringify(formData.activationsList || []),
      activationImages: JSON.stringify(formData.activationImages || []),
      claimBreakdown: JSON.stringify(sanitizedClaims),
      totalClaimAmount: Math.round(grandTotal * 100) / 100,
      futureImprovementOrg: formData.futureImprovementOrg?.trim() || "",
      futureImprovementPart: formData.futureImprovementPart?.trim() || "",
      futureConsideration: formData.futureConsideration ?? true,
      mediaLinks: JSON.stringify(formData.mediaLinks || []),
      status: lockedReport ? lockedReport.status : formData.status || "DRAFT",
      ...scoreFields,
    }

    const saved = await prisma.marketingPostEventReport.upsert({
      where: { requisitionId: formData.requisitionId },
      update: payload,
      create: {
        requisitionId: formData.requisitionId,
        ...payload,
      },
    })

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback outside request scope
    }
    return {
      success: true,
      report: saved,
      breakdown: effectiveBreakdown,
      missingRequirements: getScoreMissingRequirements(effectiveBreakdown.flags),
    }
  } catch (error: any) {
    console.error("Error in savePostEventReport:", error)
    return { success: false, error: error.message || "Failed to save post-event report" }
  }
}

/**
 * Submits the report for approval. The weighted score is recomputed as a snapshot and the
 * submission is blocked while any scoring component is incomplete.
 */
export async function submitPostEventReport(requisitionId: string) {
  try {
    const requisition = await prisma.marketingEventRequisition.findUnique({
      where: { id: requisitionId },
      include: {
        postEventReport: true,
        feedbacks: { select: { satisfaction: true, aiSentiment: true } },
      },
    })

    if (!requisition?.postEventReport) {
      return { success: false, error: "Report not found" }
    }

    const report = requisition.postEventReport

    if (isScoreLocked(report.status)) {
      return {
        success: false,
        error: "This report has already been submitted and its success rate snapshot is locked.",
      }
    }

    const breakdown = buildEventScoreBreakdown({
      feedbacks: requisition.feedbacks,
      budgetCap: requisition.budgetCap,
      impactItems: parseImpactItems(report.impactDistribution),
      totalClaimAmount: report.totalClaimAmount,
    })

    const missingRequirements = getScoreMissingRequirements(breakdown.flags)
    if (missingRequirements.length > 0) {
      return {
        success: false,
        error: `Report cannot be submitted until the success rate is complete. ${missingRequirements.join(" ")}`,
        missingRequirements,
        breakdown,
      }
    }

    const updated = await prisma.marketingPostEventReport.update({
      where: { requisitionId },
      data: {
        status: "SUBMITTED",
        eventSuccessRate: breakdown.total,
        scoreBreakdown: JSON.stringify(breakdown),
        scoreComputedAt: new Date(),
        scoreFlags: JSON.stringify(breakdown.flags),
      },
    })

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback outside request scope
    }
    return { success: true, report: updated, breakdown }
  } catch (error: any) {
    console.error("Error in submitPostEventReport:", error)
    return { success: false, error: error.message || "Failed to submit report" }
  }
}

/**
 * Sets or clears the maximum approved budget used by the 15% budget component.
 * Requires the dedicated MARKETING_EVENTS_BUDGET permission (granted by a superadmin).
 * Authorised budget users may also revise the cap after the report is locked; the success-rate
 * snapshot is then recalculated and the revision is recorded in the audit log.
 */
export async function setEventBudgetCap(requisitionId: string, budgetCap: number | null) {
  try {
    const access = await getAccessInfo()
    if (!canSetMarketingEventBudget(access)) {
      return {
        success: false,
        error:
          "You do not have permission to set the event budget. Ask a superadmin to grant the Post-Event Budget Cap module.",
      }
    }

    const normalized = budgetCap === null ? null : Number(budgetCap)
    if (normalized !== null && (!Number.isFinite(normalized) || normalized < 0)) {
      return { success: false, error: "Budget cap must be a positive amount." }
    }

    const existingReport = await prisma.marketingPostEventReport.findUnique({
      where: { requisitionId },
      select: { status: true },
    })

    let actor = "Staff"
    try {
      const session = await auth()
      if (session?.user?.name) actor = session.user.name
    } catch {
      // Outside request context
    }

    const updated = await prisma.marketingEventRequisition.update({
      where: { id: requisitionId },
      data: {
        budgetCap: normalized,
        budgetSetBy: normalized === null ? null : actor,
        budgetSetAt: normalized === null ? null : new Date(),
      },
    })

    const breakdown = await recomputeEventScore(requisitionId, { force: true })
    const wasLocked = Boolean(existingReport && isScoreLocked(existingReport.status))

    try {
      await logUserAction(
        "Updated Event Budget Cap",
        `${updated.requestNumber} (${updated.eventName}) budget cap set to ${
          normalized === null ? "none" : `RM ${normalized.toFixed(2)}`
        }.${wasLocked ? ` Report was already ${existingReport?.status}; success rate snapshot recalculated.` : ""}`
      )
    } catch {
      // audit log failure should not block operation
    }

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback outside request scope
    }

    return {
      success: true,
      budgetCap: updated.budgetCap,
      budgetSetBy: updated.budgetSetBy,
      budgetSetAt: updated.budgetSetAt?.toISOString() || null,
      breakdown,
      wasLocked,
    }
  } catch (error: any) {
    console.error("Error in setEventBudgetCap:", error)
    return { success: false, error: error.message || "Failed to update the event budget cap" }
  }
}

/**
 * Sets approved budget allocations for the 5 categories (Finance action).
 * Requires the MARKETING_EVENTS_BUDGET permission.
 */
export async function setEventCategoryBudgets(
  requisitionId: string,
  categoryBudgets: EventCategoryBudgets
) {
  try {
    const access = await getAccessInfo()
    if (!canSetMarketingEventBudget(access)) {
      return {
        success: false,
        error:
          "You do not have permission to set the event budget. Ask a superadmin to grant the Post-Event Budget Cap module.",
      }
    }

    const sanitized: EventCategoryBudgets = {
      meals: Math.max(0, round2(Number(categoryBudgets?.meals) || 0)),
      accommodation: Math.max(0, round2(Number(categoryBudgets?.accommodation) || 0)),
      transportation: Math.max(0, round2(Number(categoryBudgets?.transportation) || 0)),
      miscellaneous: Math.max(0, round2(Number(categoryBudgets?.miscellaneous) || 0)),
      pettyCash: Math.max(0, round2(Number(categoryBudgets?.pettyCash) || 0)),
    }

    const totalApproved = round2(
      sanitized.meals +
      sanitized.accommodation +
      sanitized.transportation +
      sanitized.miscellaneous +
      sanitized.pettyCash
    )

    const existingReport = await prisma.marketingPostEventReport.findUnique({
      where: { requisitionId },
      select: { status: true },
    })

    let actor = "Staff"
    try {
      const session = await auth()
      if (session?.user?.name) actor = session.user.name
    } catch {
      // Outside request context
    }

    const updated = await prisma.marketingEventRequisition.update({
      where: { id: requisitionId },
      data: {
        categoryBudgets: JSON.stringify(sanitized),
        budgetCap: totalApproved,
        budgetSetBy: actor,
        budgetSetAt: new Date(),
      },
    })

    const breakdown = await recomputeEventScore(requisitionId, { force: true })
    const wasLocked = Boolean(existingReport && isScoreLocked(existingReport.status))

    try {
      await logUserAction(
        "Updated Event Category Budgets",
        `${updated.requestNumber} (${updated.eventName}) category budgets set: Total RM ${totalApproved.toFixed(2)} (Meals: RM ${sanitized.meals.toFixed(2)}, Accom: RM ${sanitized.accommodation.toFixed(2)}, Transport: RM ${sanitized.transportation.toFixed(2)}, Misc: RM ${sanitized.miscellaneous.toFixed(2)}, Petty Cash: RM ${sanitized.pettyCash.toFixed(2)}).${
          wasLocked ? ` Report was already ${existingReport?.status}; success rate snapshot recalculated.` : ""
        }`
      )
    } catch {
      // safe fallback
    }

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback
    }

    return {
      success: true,
      categoryBudgets: sanitized,
      budgetCap: updated.budgetCap,
      budgetSetBy: updated.budgetSetBy,
      budgetSetAt: updated.budgetSetAt?.toISOString() || null,
      breakdown,
      wasLocked,
    }
  } catch (error: any) {
    console.error("Error in setEventCategoryBudgets:", error)
    return { success: false, error: error.message || "Failed to update category budget allocations" }
  }
}

/**
 * Approves the report (HOD action).
 */
export async function approvePostEventReport(
  requisitionId: string,
  approverName: string,
  approvalSignatureUrl?: string
) {
  try {
    const report = await prisma.marketingPostEventReport.findUnique({
      where: { requisitionId },
    })

    if (!report) {
      return { success: false, error: "Report not found" }
    }

    const updated = await prisma.marketingPostEventReport.update({
      where: { requisitionId },
      data: {
        status: "APPROVED",
        approvedBy: approverName.trim(),
        approvedAt: new Date(),
        approvalSignatureUrl: approvalSignatureUrl || null,
      },
    })

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback outside request scope
    }
    return { success: true, report: updated }
  } catch (error: any) {
    console.error("Error in approvePostEventReport:", error)
    return { success: false, error: error.message || "Failed to approve report" }
  }
}

/**
 * Helper to upload image files (Flow screenshots, Activations, Receipts)
 */
export async function uploadPostEventFile(formData: FormData) {
  try {
    const file = formData.get("file") as File | null
    const subfolder = (formData.get("subfolder") as string) || "receipts"

    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" }
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Try Cloudflare R2 first
    try {
      const { url } = await uploadMarketingPhotoToR2(
        buffer,
        file.name,
        file.type || "image/jpeg",
        "events"
      )
      return { success: true, url, name: file.name }
    } catch (r2Err) {
      console.warn("R2 upload failed, falling back to local file:", r2Err)
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "marketing", "events", subfolder)
        await fs.promises.mkdir(uploadDir, { recursive: true })

        const ext = path.extname(file.name) || ".jpg"
        const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
        const uniqueName = `${subfolder}-${Date.now()}-${Math.floor(Math.random() * 1000)}-${cleanBase}${ext}`
        const filePath = path.join(uploadDir, uniqueName)

        await fs.promises.writeFile(filePath, buffer)
        const localUrl = `/uploads/marketing/events/${subfolder}/${uniqueName}`
        return { success: true, url: localUrl, name: file.name }
      } catch (localErr) {
        console.warn("Local storage write failed, falling back to data URI:", localErr)
        const base64 = buffer.toString("base64")
        const mime = file.type || "image/jpeg"
        const dataUri = `data:${mime};base64,${base64}`
        return { success: true, url: dataUri, name: file.name }
      }
    }
  } catch (error: any) {
    console.error("Error in uploadPostEventFile:", error)
    return { success: false, error: error.message || "Failed to upload file" }
  }
}

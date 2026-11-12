import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { getMarketingPhotoFromR2, type MarketingCategory } from "@/lib/marketing-r2"
import {
  PostEventIsoReportDocument,
  type PostEventReportPdfData,
  type PostEventVip,
  type PostEventFlowImage,
  type PostEventActivation,
  type PostEventActivationImage,
  type PostEventClaimantGroup,
  type PostEventMediaLink,
} from "./pdf/PostEventIsoReportDocument"
import {
  buildEventScoreBreakdown,
  isScoreLocked,
  parseImpactItems,
  parseScoreBreakdown,
  parseStaffInvolved,
} from "./marketing/event-success-rate"

async function resolveImageToDataUri(urlOrPath: string): Promise<string | null> {
  if (!urlOrPath) return null
  const trimmed = urlOrPath.trim()

  if (trimmed.startsWith("data:image/")) {
    return trimmed
  }

  // 1. Marketing public image API endpoint from Cloudflare R2
  if (trimmed.includes("/api/public/marketing/image/")) {
    try {
      const sub = trimmed.split("/api/public/marketing/image/")[1]
      const parts = sub.split("/")
      const category = (parts.length > 1 ? parts[0] : "events") as MarketingCategory
      const filename = parts.length > 1 ? parts.slice(1).join("/") : parts[0]

      const photo = await getMarketingPhotoFromR2(category, filename)
      if (photo) {
        return `data:${photo.contentType};base64,${photo.buffer.toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed fetching R2 photo for ${trimmed}:`, err)
    }
  }

  // 2. Direct R2 key: marketing/events/...
  if (trimmed.startsWith("marketing/")) {
    try {
      const parts = trimmed.split("/")
      const category = (parts[1] || "events") as MarketingCategory
      const filename = parts.slice(2).join("/")
      const photo = await getMarketingPhotoFromR2(category, filename)
      if (photo) {
        return `data:${photo.contentType};base64,${photo.buffer.toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed fetching R2 key ${trimmed}:`, err)
    }
  }

  // 3. Local uploads path: /uploads/...
  if (trimmed.startsWith("/uploads/")) {
    try {
      const localDiskPath = path.join(process.cwd(), "public", trimmed.replace(/^\//, ""))
      const fileBuf = await readFile(localDiskPath)
      const ext = path.extname(localDiskPath).toLowerCase().replace(".", "") || "jpeg"
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
      return `data:${mime};base64,${fileBuf.toString("base64")}`
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed reading local file ${trimmed}:`, err)
    }
  }

  // 4. Remote HTTP or HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(trimmed, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        const mime = res.headers.get("content-type") || "image/jpeg"
        return `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed fetching remote image ${trimmed}:`, err)
    }
  }

  return null
}

function formatDateDisplay(d: Date | string | null | undefined): string {
  if (!d) return "N/A"
  const dateObj = typeof d === "string" ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return "N/A"
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export async function generatePostEventIsoPdfBuffer(
  requisitionId: string
): Promise<{ buffer: Buffer; fileName: string }> {
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
    throw new Error(`Event requisition not found for ID: ${requisitionId}`)
  }

  const report = requisition.postEventReport
  if (!report) {
    throw new Error(`Post-event report has not been initialized for this event yet.`)
  }

  // Resolve logo
  let logoDataUri: string | null = null
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`
  } catch (err) {
    console.warn("Bubbles O2 logo not found, generating PDF without logo:", err)
  }

  // Parse flow images and resolve to data URIs
  const rawFlowImages: PostEventFlowImage[] = JSON.parse(report.plannedFlowImages || "[]")
  const resolvedFlowImages: PostEventFlowImage[] = []
  for (const img of rawFlowImages) {
    const dataUri = await resolveImageToDataUri(img.imageUrl)
    resolvedFlowImages.push({
      ...img,
      imageUrl: dataUri || img.imageUrl,
    })
  }

  // Parse activation images and resolve to data URIs
  const rawActivationImages: PostEventActivationImage[] = JSON.parse(report.activationImages || "[]")
  const resolvedActivationImages: PostEventActivationImage[] = []
  for (const act of rawActivationImages) {
    const dataUri = await resolveImageToDataUri(act.imageUrl)
    resolvedActivationImages.push({
      ...act,
      imageUrl: dataUri || act.imageUrl,
    })
  }

  // Parse claims and resolve receipt URLs
  const rawClaims: PostEventClaimantGroup[] = JSON.parse(report.claimBreakdown || "[]")
  const resolvedClaims: PostEventClaimantGroup[] = []
  for (const grp of rawClaims) {
    const resolvedItems = []
    for (const item of grp.items) {
      let resolvedReceiptUrl = item.receiptUrl
      if (item.receiptUrl) {
        const dataUri = await resolveImageToDataUri(item.receiptUrl)
        if (dataUri) resolvedReceiptUrl = dataUri
      }
      resolvedItems.push({
        ...item,
        receiptUrl: resolvedReceiptUrl,
      })
    }
    resolvedClaims.push({
      ...grp,
      items: resolvedItems,
    })
  }

  // Resolve approval signature if any
  let resolvedSignature: string | null = null
  if (report.approvalSignatureUrl) {
    resolvedSignature = await resolveImageToDataUri(report.approvalSignatureUrl)
  }

  // Feedback calculation
  const totalFeedbacks = requisition.feedbacks.length
  const satisfactionCounts = {
    EXTREMELY_SATISFIED: 0,
    VERY_SATISFIED: 0,
    SOMEWHAT_SATISFIED: 0,
    NOT_SO_SATISFIED: 0,
    NOT_AT_ALL_SATISFIED: 0,
  }

  requisition.feedbacks.forEach((fb) => {
    if (fb.satisfaction in satisfactionCounts) {
      satisfactionCounts[fb.satisfaction as keyof typeof satisfactionCounts]++
    }
  })

  const positiveSatisfactionCount = satisfactionCounts.EXTREMELY_SATISFIED + satisfactionCounts.VERY_SATISFIED
  const satisfactionRate =
    totalFeedbacks > 0 ? Math.round((positiveSatisfactionCount / totalFeedbacks) * 100) : 0

  const storedBreakdown = parseScoreBreakdown(report.scoreBreakdown)
  const computedBreakdown = buildEventScoreBreakdown({
    feedbacks: requisition.feedbacks,
    budgetCap: requisition.budgetCap,
    categoryBudgets: requisition.categoryBudgets,
    claimBreakdown: rawClaims,
    hasBudgetBeenSet: Boolean(requisition.budgetSetBy || requisition.budgetCap !== null),
    impactItems: parseImpactItems(report.impactDistribution),
    totalClaimAmount: report.totalClaimAmount,
  })
  const scoreBreakdown =
    isScoreLocked(report.status) && storedBreakdown ? storedBreakdown : computedBreakdown

  const dateFromStr = formatDateDisplay(requisition.eventDateFrom)
  const dateToStr = formatDateDisplay(requisition.eventDateTo)
  const eventDates = dateFromStr === dateToStr ? dateFromStr : `${dateFromStr} – ${dateToStr}`

  const pdfData: PostEventReportPdfData = {
    documentNo: report.documentNo,
    issueNo: report.issueNo,
    reportDate: formatDateDisplay(report.reportDate),
    reportPreparedBy: report.reportPreparedBy,

    eventName: requisition.eventName,
    organizer: requisition.organizer,
    eventDates,
    attendeesCount: report.attendeesCount || "N/A",
    typeOfInvolvement: report.typeOfInvolvement,
    vipsList: JSON.parse(report.vipsList || "[]") as PostEventVip[],
    staffInvolved: parseStaffInvolved(report.staffInvolved),

    aims: report.aims || "",
    benefits: report.benefits || "",
    expectedImpact: report.expectedImpact || "",
    impactDistribution: parseImpactItems(report.impactDistribution),

    flowType: (report.flowType || "DAILY") as "DAILY" | "STAGES",
    plannedFlowText: report.plannedFlowText || "",
    plannedFlowImages: resolvedFlowImages,
    executedFlowText: report.executedFlowText || "",

    activationsList: JSON.parse(report.activationsList || "[]") as PostEventActivation[],
    activationImages: resolvedActivationImages,

    claimBreakdown: resolvedClaims,
    totalClaimAmount: report.totalClaimAmount,

    satisfactionCounts,
    totalFeedbacks,
    satisfactionRate,
    sampleFeedbacks: requisition.feedbacks.slice(0, 4).map((f) => ({
      respondentName: f.respondentName,
      comments: f.comments,
      satisfaction: f.satisfaction,
    })),

    futureImprovementOrg: report.futureImprovementOrg || "",
    futureImprovementPart: report.futureImprovementPart || "",
    futureConsideration: report.futureConsideration,
    eventSuccessRate: scoreBreakdown.total,
    scoreBreakdown,

    mediaLinks: JSON.parse(report.mediaLinks || "[]") as PostEventMediaLink[],

    status: report.status,
    approvedBy: report.approvedBy,
    approvedAt: report.approvedAt ? report.approvedAt.toISOString() : null,
    approvalSignatureUrl: resolvedSignature,
    logoDataUri,
  }

  const doc = React.createElement(PostEventIsoReportDocument, { data: pdfData })
  const buffer = await renderToBuffer(doc as any)

  const sanitizedDocNo = report.documentNo.replace(/[^a-zA-Z0-9_-]/g, "_")
  const fileName = `BubblesO2_PostEventReport_${sanitizedDocNo}.pdf`

  return {
    buffer,
    fileName,
  }
}

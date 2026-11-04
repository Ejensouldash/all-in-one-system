"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import fs from "fs"
import path from "path"

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
  category: "PETROL" | "TNG" | "ACCOMMODATION" | "MEALS" | "BOOTH_ITEMS" | "ICE" | "LOGISTICS" | "OTHER"
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
  staffInvolved: string[]

  aims: string
  benefits: string
  expectedImpact: string

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

const DEFAULT_STAFF_DEPARTMENTS = [
  "MARKETING",
  "LOGISTIC",
  "HUMAN RESOURCES",
  "IT",
  "FINANCE",
  "PRODUCTION (RANTAU)",
  "PRODUCTION (PEDAS)",
  "ONLINE SALES",
  "CORPORATE",
  "BRAND DEVELOPMENT",
]

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

    // Calculate feedback stats from built-in feedbacks
    const totalFeedbacks = requisition.feedbacks.length
    let satCounts = {
      EXTREMELY_SATISFIED: 0,
      VERY_SATISFIED: 0,
      SOMEWHAT_SATISFIED: 0,
      NOT_SO_SATISFIED: 0,
      NOT_AT_ALL_SATISFIED: 0,
    }

    requisition.feedbacks.forEach((fb) => {
      if (fb.satisfaction in satCounts) {
        satCounts[fb.satisfaction as keyof typeof satCounts]++
      }
    })

    const positiveCount = satCounts.EXTREMELY_SATISFIED + satCounts.VERY_SATISFIED
    const satisfactionRate = totalFeedbacks > 0 ? Math.round((positiveCount / totalFeedbacks) * 100) : 99

    if (requisition.postEventReport) {
      const rep = requisition.postEventReport
      return {
        success: true,
        isNew: false,
        requisition: {
          id: requisition.id,
          requestNumber: requisition.requestNumber,
          eventName: requisition.eventName,
          eventType: requisition.eventType,
          organizer: requisition.organizer,
          eventDateFrom: requisition.eventDateFrom,
          eventDateTo: requisition.eventDateTo,
          name: requisition.name,
          department: requisition.department,
        },
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
          staffInvolved: JSON.parse(rep.staffInvolved || "[]") as string[],
          aims: rep.aims || "",
          benefits: rep.benefits || "",
          expectedImpact: rep.expectedImpact || "",
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
          eventSuccessRate: rep.eventSuccessRate,
          mediaLinks: JSON.parse(rep.mediaLinks || "[]") as MediaLinkItem[],
          status: rep.status as "DRAFT" | "SUBMITTED" | "APPROVED",
          approvedBy: rep.approvedBy,
          approvedAt: rep.approvedAt?.toISOString() || null,
          approvalSignatureUrl: rep.approvalSignatureUrl,
        },
        feedbackStats: {
          totalFeedbacks,
          satisfactionCounts: satCounts,
          satisfactionRate,
          sampleFeedbacks: requisition.feedbacks.slice(0, 5),
        },
      }
    }

    // Generate fresh report template with prefilled data
    const count = await prisma.marketingPostEventReport.count()
    const autoDocNumber = `BOMSB/ADMN/MKT/EVT/${270010 + count}`

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
      staffInvolved: DEFAULT_STAFF_DEPARTMENTS,
      aims: `To strengthen Bubbles O2's brand awareness, visibility and strategic market reach during ${requisition.eventName}.`,
      benefits: `Enhanced brand credibility, established direct consumer interactions and unlocked new commercial opportunities.`,
      expectedImpact: "425mlx24 = 1000ctn\n800mlx12 = 50ctn",
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
      eventSuccessRate: satisfactionRate || 99,
      mediaLinks: [
        { id: "ml-1", platform: "TikTok", url: "https://vt.tiktok.com/BubblesO2HQ/" },
        { id: "ml-2", platform: "Facebook", url: "https://www.facebook.com/BubblesO2HQ/" },
      ],
      status: "DRAFT",
    }

    return {
      success: true,
      isNew: true,
      requisition: {
        id: requisition.id,
        requestNumber: requisition.requestNumber,
        eventName: requisition.eventName,
        eventType: requisition.eventType,
        organizer: requisition.organizer,
        eventDateFrom: requisition.eventDateFrom,
        eventDateTo: requisition.eventDateTo,
        name: requisition.name,
        department: requisition.department,
      },
      report: initialReport,
      feedbackStats: {
        totalFeedbacks,
        satisfactionCounts: satCounts,
        satisfactionRate,
        sampleFeedbacks: requisition.feedbacks.slice(0, 5),
      },
    }
  } catch (error: any) {
    console.error("Error in getPostEventReport:", error)
    return { success: false, error: error.message || "Failed to load post-event report" }
  }
}

/**
 * Saves or updates a Post-Event Report draft.
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

    const payload = {
      documentNo: formData.documentNo.trim(),
      issueNo: formData.issueNo || "02",
      reportDate: formData.reportDate ? new Date(formData.reportDate) : new Date(),
      reportPreparedBy: formData.reportPreparedBy?.trim() || session?.user?.name || "Staff",
      attendeesCount: formData.attendeesCount?.trim() || "",
      typeOfInvolvement: formData.typeOfInvolvement?.trim() || "Sponsorship",
      vipsList: JSON.stringify(formData.vipsList || []),
      staffInvolved: JSON.stringify(formData.staffInvolved || []),
      aims: formData.aims?.trim() || "",
      benefits: formData.benefits?.trim() || "",
      expectedImpact: formData.expectedImpact?.trim() || "",
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
      eventSuccessRate: formData.eventSuccessRate ?? 99,
      mediaLinks: JSON.stringify(formData.mediaLinks || []),
      status: formData.status || "DRAFT",
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
    return { success: true, report: saved }
  } catch (error: any) {
    console.error("Error in savePostEventReport:", error)
    return { success: false, error: error.message || "Failed to save post-event report" }
  }
}

/**
 * Submits the report for approval.
 */
export async function submitPostEventReport(requisitionId: string) {
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
        status: "SUBMITTED",
      },
    })

    try {
      revalidatePath("/marketing/events")
    } catch {
      // safe fallback outside request scope
    }
    return { success: true, report: updated }
  } catch (error: any) {
    console.error("Error in submitPostEventReport:", error)
    return { success: false, error: error.message || "Failed to submit report" }
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

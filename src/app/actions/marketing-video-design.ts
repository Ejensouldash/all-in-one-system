"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, canAccessMarketing } from "@/lib/access"
import { logUserAction } from "./audit"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import {
  queueMarketingEmailNotification,
  generateMarketingVideoDesignRequisitionAdminEmail,
} from "@/lib/marketing/marketing-outbox"
import fs from "fs"
import path from "path"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file

export interface CreativeAttachmentInfo {
  name: string
  url: string
  size: number
  type: string
  r2Key?: string
}

export interface VideoDesignRequisitionRecord {
  id: string
  requestNumber: string
  type: "VIDEO" | "DESIGN" | string
  name: string
  staffId: string
  department: string
  needBy: Date | string
  phoneNumber: string
  videoType?: string | null
  format?: string | null
  videoDetails?: string | null
  videoContentFocus?: string | null
  requiredShots?: string | null
  designType?: string | null
  designDetails?: string | null
  designSize?: string | null
  designContent?: string | null
  needPrinting?: boolean | null
  referenceLinks?: string | null
  attachments?: string | null
  status: string
  remarks?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

// Generate sequential request number VD-MKT-YYYY-XXXX
async function getNextVideoDesignRequestNumber(year: number): Promise<string> {
  const prefix = `VD-MKT-${year}-`
  try {
    const last = await prisma.marketingVideoDesignRequisition.findFirst({
      where: { requestNumber: { startsWith: prefix } },
      orderBy: { requestNumber: "desc" },
      select: { requestNumber: true },
    })

    let seq = 0
    if (last?.requestNumber) {
      const parsed = parseInt(last.requestNumber.split("-").pop() || "", 10)
      if (!isNaN(parsed)) seq = parsed
    }
    return `${prefix}${String(seq + 1).padStart(4, "0")}`
  } catch {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}${randomSuffix}`
  }
}

// Save uploaded attachment to Cloudflare R2 (marketing/creative/) with local fallback if R2 credentials missing
async function saveAttachmentToR2(file: File): Promise<CreativeAttachmentInfo> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const { key, url } = await uploadMarketingPhotoToR2(
      buffer,
      file.name,
      file.type || "application/octet-stream",
      "creative"
    )
    return {
      name: file.name,
      url,
      size: file.size,
      type: file.type || "application/octet-stream",
      r2Key: key,
    }
  } catch (r2Err) {
    console.warn("Failed to upload creative attachment to Cloudflare R2, falling back to local storage:", r2Err)
    const uploadDir = path.join(process.cwd(), "public", "uploads", "marketing", "creative")
    await fs.promises.mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || ""
    const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${cleanBase}${ext}`
    const filePath = path.join(uploadDir, uniqueName)

    await fs.promises.writeFile(filePath, buffer)

    return {
      name: file.name,
      url: `/uploads/marketing/creative/${uniqueName}`,
      size: file.size,
      type: file.type || "application/octet-stream",
    }
  }
}

/**
 * Public Submission of Video & Design Requisition
 */
export async function submitVideoDesignRequisition(formData: FormData) {
  try {
    const type = (formData.get("type") as string || "VIDEO").trim().toUpperCase() // "VIDEO" | "DESIGN"
    const name = (formData.get("name") as string || "").trim()
    const staffId = (formData.get("staffId") as string || "").trim()
    const department = (formData.get("department") as string || "").trim()
    const needByRaw = (formData.get("needBy") as string || "").trim()
    const phoneNumber = (formData.get("phoneNumber") as string || "").trim()

    if (!name || !staffId || !department || !needByRaw || !phoneNumber) {
      return {
        success: false,
        error: "Please fill in all required requester fields (Name, Staff ID, Department, Need By date, and Phone Number).",
      }
    }

    const needBy = new Date(needByRaw)
    if (isNaN(needBy.getTime())) {
      return {
        success: false,
        error: "Invalid Need By date format.",
      }
    }

    // Video Specific Fields
    const videoType = (formData.get("videoType") as string || "").trim()
    const format = (formData.get("format") as string || "").trim()
    const videoDetails = (formData.get("videoDetails") as string || "").trim()
    const videoContentFocus = (formData.get("videoContentFocus") as string || "").trim()
    const requiredShots = (formData.get("requiredShots") as string || "").trim()

    // Design Specific Fields
    let designType = (formData.get("designType") as string || "").trim()
    const customDesignType = (formData.get("customDesignType") as string || "").trim()
    if (designType.toLowerCase() === "others" && customDesignType) {
      designType = `Others: ${customDesignType}`
    }
    const designDetails = (formData.get("designDetails") as string || "").trim()
    const designSize = (formData.get("designSize") as string || "").trim()
    const designContent = (formData.get("designContent") as string || "").trim()
    const needPrintingRaw = formData.get("needPrinting") as string
    const needPrinting = needPrintingRaw === "true" || needPrintingRaw === "yes"

    // Reference and links
    const referenceLinks = (formData.get("referenceLinks") as string || "").trim()

    // Specific validation based on type
    if (type === "VIDEO") {
      if (!videoType) {
        return { success: false, error: "Please select a Video Type (Corporate / Social Media)." }
      }
      if (!format) {
        return { success: false, error: "Please select a Format (Portrait / Landscape)." }
      }
      if (!videoDetails && !videoContentFocus) {
        return { success: false, error: "Please describe the Video Details / Content Focus." }
      }
    } else {
      if (!designType) {
        return { success: false, error: "Please select a Design Type (Poster, Sticker, T-Shirt, Others)." }
      }
      if (!designDetails && !designContent) {
        return { success: false, error: "Please provide Design Details or Content on design." }
      }
    }

    // Process attachments to Cloudflare R2
    const attachments: CreativeAttachmentInfo[] = []
    const files = formData.getAll("files") as File[]

    for (const file of files) {
      if (file && file.size > 0) {
        if (file.size > MAX_FILE_SIZE) {
          return {
            success: false,
            error: `File "${file.name}" exceeds the maximum 50MB size limit.`,
          }
        }
        const uploaded = await saveAttachmentToR2(file)
        attachments.push(uploaded)
      }
    }

    const currentYear = new Date().getFullYear()
    const requestNumber = await getNextVideoDesignRequestNumber(currentYear)

    // Save to Database
    const requisition = await prisma.marketingVideoDesignRequisition.create({
      data: {
        requestNumber,
        type: type === "DESIGN" ? "DESIGN" : "VIDEO",
        name,
        staffId,
        department,
        needBy,
        phoneNumber,
        videoType: type === "VIDEO" ? videoType : null,
        format: type === "VIDEO" ? format : null,
        videoDetails: type === "VIDEO" ? videoDetails : null,
        videoContentFocus: type === "VIDEO" ? videoContentFocus : null,
        requiredShots: type === "VIDEO" ? requiredShots : null,
        designType: type === "DESIGN" ? designType : null,
        designDetails: type === "DESIGN" ? designDetails : null,
        designSize: type === "DESIGN" ? designSize : null,
        designContent: type === "DESIGN" ? designContent : null,
        needPrinting: type === "DESIGN" ? needPrinting : false,
        referenceLinks: referenceLinks || null,
        attachments: JSON.stringify(attachments),
        status: "PENDING",
      },
    })

    // Log user action in audit trail
    await logUserAction(
      `SUBMIT_CREATIVE_REQUISITION: ${requestNumber}`,
      JSON.stringify({
        requestNumber,
        type,
        name,
        staffId,
        department,
        attachmentCount: attachments.length,
      })
    )

    // Email notifications to marketing admin recipients
    try {
      const recipients = await prisma.marketingNotificationRecipient.findMany({
        where: {
          isEnabled: true,
          OR: [
            { category: null },
            { category: "ALL" },
            { category: "CREATIVE" },
            { category: "VIDEO_DESIGN" },
          ],
        },
      })

      const detailsSummary = type === "VIDEO"
        ? `Video Type: ${videoType}\nFormat: ${format}\nContent Focus: ${videoContentFocus || "-"}\nRequired Shots: ${requiredShots || "-"}\nDetails: ${videoDetails || "-"}`
        : `Design Type: ${designType}\nSize: ${designSize || "-"}\nNeed Printing: ${needPrinting ? "YES" : "NO"}\nContent: ${designContent || "-"}\nDetails: ${designDetails || "-"}`

      for (const recipient of recipients) {
        const html = generateMarketingVideoDesignRequisitionAdminEmail({
          requestNumber,
          type,
          name,
          staffId,
          department,
          phoneNumber,
          needBy: needBy.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          details: detailsSummary,
        })

        await queueMarketingEmailNotification({
          referenceId: requestNumber,
          category: "CREATIVE",
          to: recipient.email,
          subject: `[Marketing] New ${type} Requisition: ${requestNumber} (${name} - ${department})`,
          html,
        })
      }
    } catch (notifErr) {
      console.warn("Could not send marketing notification email for creative requisition:", notifErr)
    }

    revalidatePath("/marketing/video-design")
    revalidatePath("/public/marketing/request")

    return {
      success: true,
      data: {
        id: requisition.id,
        requestNumber: requisition.requestNumber,
        type: requisition.type,
        name: requisition.name,
        staffId: requisition.staffId,
        department: requisition.department,
        needBy: requisition.needBy.toISOString(),
        phoneNumber: requisition.phoneNumber,
        attachments,
      },
    }
  } catch (error: any) {
    console.error("Failed to submit video & design requisition:", error)
    return {
      success: false,
      error: error?.message || "An unexpected error occurred while submitting your requisition.",
    }
  }
}

/**
 * Fetch all Video & Design Requisitions for Admin Dashboard
 */
export async function getVideoDesignRequisitions(): Promise<VideoDesignRequisitionRecord[]> {
  const access = await getAccessInfo()
  if (!access || !canAccessMarketing(access)) {
    throw new Error("Unauthorized to access marketing requisitions.")
  }

  const records = await prisma.marketingVideoDesignRequisition.findMany({
    orderBy: { createdAt: "desc" },
  })

  return records.map(r => ({
    id: r.id,
    requestNumber: r.requestNumber,
    type: r.type,
    name: r.name,
    staffId: r.staffId,
    department: r.department,
    needBy: r.needBy,
    phoneNumber: r.phoneNumber,
    videoType: r.videoType,
    format: r.format,
    videoDetails: r.videoDetails,
    videoContentFocus: r.videoContentFocus,
    requiredShots: r.requiredShots,
    designType: r.designType,
    designDetails: r.designDetails,
    designSize: r.designSize,
    designContent: r.designContent,
    needPrinting: r.needPrinting,
    referenceLinks: r.referenceLinks,
    attachments: r.attachments,
    status: r.status,
    remarks: r.remarks,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}

/**
 * Update Requisition Status (PENDING -> APPROVED / IN_PROGRESS / REJECTED / COMPLETED)
 */
export async function updateVideoDesignRequisitionStatus(
  id: string,
  status: string,
  remarks?: string
) {
  const access = await getAccessInfo()
  if (!access || !canAccessMarketing(access)) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const updated = await prisma.marketingVideoDesignRequisition.update({
      where: { id },
      data: {
        status,
        remarks: remarks !== undefined ? remarks : undefined,
      },
    })

    await logUserAction(
      `UPDATE_CREATIVE_STATUS: ${updated.requestNumber}`,
      JSON.stringify({
        requestNumber: updated.requestNumber,
        newStatus: status,
        remarks,
      })
    )

    revalidatePath("/marketing/video-design")
    return { success: true, requisition: updated }
  } catch (error: any) {
    console.error("Failed to update video design requisition status:", error)
    return { success: false, error: error?.message || "Failed to update requisition status." }
  }
}

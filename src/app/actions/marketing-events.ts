"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, canAccessMarketingEvents } from "@/lib/access"
import { logUserAction } from "./audit"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import { queueMarketingEmailNotification, generateMarketingEventRequisitionAdminEmail } from "@/lib/marketing/marketing-outbox"
import fs from "fs"
import path from "path"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface AttachmentInfo {
  name: string
  url: string
  size: number
  type: string
}

export interface MarketingEventPayload {
  name: string
  staffId: string
  email: string
  department: string
  eventName: string
  eventType: string
  organizer: string
  eventDateFrom?: string
  eventDateTo?: string
  picContactName: string
  picContactNumber: string
  tentative: string
  requirements: string
  attachments?: AttachmentInfo[]
}

// Generate sequential event request number EV-MKT-YYYY-XXXX
async function getNextEventRequestNumber(year: number): Promise<string> {
  const prefix = `EV-MKT-${year}-`
  try {
    const last = await prisma.marketingEventRequisition.findFirst({
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

// Save uploaded attachment to Cloudflare R2 (marketing/events/) with fallback to public/uploads/marketing/events/
async function saveAttachmentFile(file: File): Promise<AttachmentInfo> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const { url } = await uploadMarketingPhotoToR2(
      buffer,
      file.name,
      file.type || "application/octet-stream",
      "events"
    )
    return {
      name: file.name,
      url,
      size: file.size,
      type: file.type || "application/octet-stream",
    }
  } catch (r2Err) {
    console.warn("Failed to upload event attachment to R2, falling back to local storage:", r2Err)
    const uploadDir = path.join(process.cwd(), "public", "uploads", "marketing", "events")
    await fs.promises.mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || ""
    const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${cleanBase}${ext}`
    const filePath = path.join(uploadDir, uniqueName)

    await fs.promises.writeFile(filePath, buffer)

    return {
      name: file.name,
      url: `/uploads/marketing/events/${uniqueName}`,
      size: file.size,
      type: file.type || "application/octet-stream",
    }
  }
}

// Submit Event Requisition from Public QR Portal
export async function submitEventRequisition(payload: FormData | MarketingEventPayload) {
  try {
    let name = ""
    let staffId = ""
    let email = ""
    let department = ""
    let eventName = ""
    let eventType = ""
    let organizer = ""
    let eventDateFrom = ""
    let eventDateTo = ""
    let picContactName = ""
    let picContactNumber = ""
    let tentative = ""
    let requirements = ""
    let savedAttachments: AttachmentInfo[] = []

    if (payload instanceof FormData) {
      name = (payload.get("name") as string) || ""
      staffId = (payload.get("staffId") as string) || ""
      email = (payload.get("email") as string) || ""
      department = (payload.get("department") as string) || ""
      eventName = (payload.get("eventName") as string) || ""
      eventType = (payload.get("eventType") as string) || ""
      organizer = (payload.get("organizer") as string) || ""
      eventDateFrom = (payload.get("eventDateFrom") as string) || ""
      eventDateTo = (payload.get("eventDateTo") as string) || ""
      picContactName = (payload.get("picContactName") as string) || ""
      picContactNumber = (payload.get("picContactNumber") as string) || ""
      tentative = (payload.get("tentative") as string) || ""
      requirements = (payload.get("requirements") as string) || ""

      // Process uploaded files
      const rawFiles = payload.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0)
      
      for (const file of rawFiles) {
        if (file.size > MAX_FILE_SIZE) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
          return {
            success: false,
            error: `File "${file.name}" exceeds the 10MB limit (${sizeMB} MB). Please choose files under 10MB.`,
          }
        }
      }

      for (const file of rawFiles) {
        try {
          const info = await saveAttachmentFile(file)
          savedAttachments.push(info)
        } catch (uploadErr) {
          console.error("Failed to save attachment file:", uploadErr)
        }
      }
    } else {
      name = payload.name || ""
      staffId = payload.staffId || ""
      email = payload.email || ""
      department = payload.department || ""
      eventName = payload.eventName || ""
      eventType = payload.eventType || ""
      organizer = payload.organizer || ""
      eventDateFrom = payload.eventDateFrom || ""
      eventDateTo = payload.eventDateTo || ""
      picContactName = payload.picContactName || ""
      picContactNumber = payload.picContactNumber || ""
      tentative = payload.tentative || ""
      requirements = payload.requirements || ""
      savedAttachments = payload.attachments || []
    }

    if (!name?.trim()) return { success: false, error: "Requester name is required." }
    if (!staffId?.trim()) return { success: false, error: "Staff ID is required." }
    if (!email?.trim()) return { success: false, error: "Email address is required." }
    if (!department?.trim()) return { success: false, error: "Department is required." }
    if (!eventName?.trim()) return { success: false, error: "Event name is required." }
    if (!eventType?.trim()) return { success: false, error: "Event type is required." }
    if (!organizer?.trim()) return { success: false, error: "Organizer is required." }
    if (!eventDateFrom?.trim()) return { success: false, error: "Event start date (From) is required." }
    if (!eventDateTo?.trim()) return { success: false, error: "Event end date (To) is required." }
    if (eventDateFrom && eventDateTo && eventDateTo < eventDateFrom) {
      return { success: false, error: "Event End Date (To) cannot be earlier than Event Start Date (From)." }
    }
    if (!picContactName?.trim()) return { success: false, error: "PIC contact name is required." }
    if (!picContactNumber?.trim()) return { success: false, error: "PIC phone number is required." }
    if (!tentative?.trim()) return { success: false, error: "Tentative date / timeline is required." }
    if (!requirements?.trim()) return { success: false, error: "Requirements (Activation, Media, Logistic) are required." }

    const year = new Date().getFullYear()
    const requestNumber = await getNextEventRequestNumber(year)

    let createdId = ""

    try {
      const record = await prisma.marketingEventRequisition.create({
        data: {
          requestNumber,
          name: name.trim(),
          staffId: staffId.trim(),
          email: email.trim().toLowerCase(),
          department: department.trim(),
          eventName: eventName.trim(),
          eventType: eventType.trim(),
          organizer: organizer.trim(),
          eventDateFrom: eventDateFrom ? new Date(eventDateFrom) : null,
          eventDateTo: eventDateTo ? new Date(eventDateTo) : null,
          picContactName: picContactName.trim(),
          picContactNumber: picContactNumber.trim(),
          tentative: tentative.trim(),
          requirements: requirements.trim(),
          attachments: JSON.stringify(savedAttachments),
          status: "PENDING",
        },
      })
      createdId = record.id
    } catch (dbError: unknown) {
      const errMsg = dbError instanceof Error ? dbError.message : String(dbError)
      console.warn("Database table may not be migrated yet on remote DB, proceeding with local requestNumber:", errMsg)
    }

    // Trigger Marketing Event Notification
    try {
      const activeRecipients = await prisma.marketingNotificationRecipient.findMany({
        where: {
          isEnabled: true,
          category: { in: ["ALL", "EVENT"] },
        },
      })

      if (activeRecipients.length > 0) {
        const html = generateMarketingEventRequisitionAdminEmail({
          requestNumber,
          requesterName: name.trim(),
          staffId: staffId.trim(),
          email: email.trim(),
          department: department.trim(),
          eventName: eventName.trim(),
          eventType: eventType.trim(),
          organizer: organizer.trim(),
          eventDateFrom: eventDateFrom || null,
          eventDateTo: eventDateTo || null,
          picContactName: picContactName.trim(),
          picContactNumber: picContactNumber.trim(),
          tentative: tentative.trim(),
          requirements: requirements.trim(),
        })

        const subject = `[Marketing Alert] New Event Requisition: ${requestNumber} - ${eventName.trim()}`
        const uniqueEmails = Array.from(new Set(activeRecipients.map((r) => r.email.trim().toLowerCase())))

        for (const recipientEmail of uniqueEmails) {
          await queueMarketingEmailNotification({
            referenceId: requestNumber,
            category: "EVENT",
            to: recipientEmail,
            subject,
            html,
          })
        }
      }
    } catch (notifErr) {
      console.error("Non-blocking event notification error:", notifErr)
    }

    try {
      revalidatePath("/marketing/events")
      revalidatePath("/marketing/forms")
      revalidatePath("/marketing")
    } catch (revErr) {
      console.warn("Revalidation warning in submitEventRequisition:", revErr)
    }

    return {
      success: true,
      requestNumber,
      id: createdId,
      requesterName: name.trim(),
      eventName: eventName.trim(),
      eventDateFrom: eventDateFrom || "",
      eventDateTo: eventDateTo || "",
      tentative: tentative.trim(),
      requirements: requirements.trim(),
      attachmentCount: savedAttachments.length,
      attachments: savedAttachments,
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to submit event requisition."
    console.error("Failed to submit event requisition:", errMsg)
    return { success: false, error: errMsg }
  }
}

// Fetch all event requisitions
export async function getMarketingEventRequisitions() {
  try {
    const list = await prisma.marketingEventRequisition.findMany({
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: list }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to fetch event requisitions."
    console.error("Failed to fetch event requisitions:", errMsg)
    return { success: false, error: errMsg, data: [] }
  }
}

// Update Event Requisition Status (Approve or Reject)
export async function updateEventRequisitionStatus(
  id: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
  remarks?: string
) {
  try {
    const access = await getAccessInfo()
    if (!canAccessMarketingEvents(access)) {
      return { success: false, error: "Unauthorized access to marketing management." }
    }

    const updated = await prisma.marketingEventRequisition.update({
      where: { id },
      data: {
        status,
        remarks: remarks?.trim() || null,
        updatedAt: new Date(),
      },
    })

    try {
      await logUserAction(
        status === "APPROVED" ? "Approved Event Requisition" : "Rejected Event Requisition",
        `${status} Requisition ${updated.requestNumber} for ${updated.eventName}. Remarks: ${remarks || "None"}`
      )
    } catch {
      // audit log failure should not block operation
    }

    revalidatePath("/marketing/events")
    revalidatePath("/marketing/forms")

    return { success: true, data: updated }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to update event requisition status."
    console.error("Failed to update event requisition status:", errMsg)
    return { success: false, error: errMsg }
  }
}

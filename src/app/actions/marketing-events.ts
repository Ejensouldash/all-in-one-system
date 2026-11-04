"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getAccessInfo, canAccessMarketingEvents, canEditMarketingEvents } from "@/lib/access"
import { logUserAction } from "./audit"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import { queueMarketingEmailNotification, generateMarketingEventRequisitionAdminEmail } from "@/lib/marketing/marketing-outbox"
import fs from "fs"
import path from "path"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ATTACHMENTS_COUNT = 5

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
}

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
  phone?: string
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
  hp_website?: string
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
  const mime = (file.type || "").toLowerCase().trim()
  const safeExt = ALLOWED_MIME_EXTENSIONS[mime]
  if (!safeExt) {
    throw new Error(`Unsupported attachment MIME type: ${file.type || "unknown"}`)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const { url } = await uploadMarketingPhotoToR2(
      buffer,
      file.name,
      mime,
      "events"
    )
    return {
      name: file.name,
      url,
      size: file.size,
      type: mime,
    }
  } catch (r2Err) {
    console.warn("Failed to upload event attachment to R2, attempting local storage fallback:", r2Err)
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "marketing", "events")
      await fs.promises.mkdir(uploadDir, { recursive: true })

      const cleanBase = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)
      const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1000)}-${cleanBase}${safeExt}`
      const filePath = path.join(uploadDir, uniqueName)

      await fs.promises.writeFile(filePath, buffer)

      return {
        name: file.name,
        url: `/uploads/marketing/events/${uniqueName}`,
        size: file.size,
        type: mime,
      }
    } catch (localErr) {
      console.error("Local storage fallback also failed:", localErr)
      throw new Error("File upload failed. Cloud storage is temporarily unreachable.")
    }
  }
}

// Submit Event Requisition from Public QR Portal
export async function submitEventRequisition(payload: FormData | MarketingEventPayload) {
  try {
    let name = ""
    let staffId = ""
    let email = ""
    let phone = ""
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
    let rawFiles: File[] = []
    let presetAttachments: AttachmentInfo[] = []

    if (payload instanceof FormData) {
      // Honeypot bot protection
      const honeypot = (payload.get("hp_website") as string) || (payload.get("company_website_url") as string) || ""
      if (honeypot) {
        return {
          success: true,
          requestNumber: "EV-MKT-RECEIVED",
          id: "fake-id",
          requesterName: "User",
          requesterPhone: "-",
          eventName: "-",
          eventDateFrom: "",
          eventDateTo: "",
          tentative: "-",
          requirements: "-",
          attachmentCount: 0,
          attachments: [] as AttachmentInfo[],
          message: "Event requisition submitted successfully.",
        }
      }

      name = (payload.get("name") as string) || ""
      staffId = (payload.get("staffId") as string) || ""
      email = (payload.get("email") as string) || ""
      phone = (payload.get("phone") as string) || ""
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
      rawFiles = payload.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0)
    } else {
      if (payload.hp_website) {
        return {
          success: true,
          requestNumber: "EV-MKT-RECEIVED",
          id: "fake-id",
          requesterName: "User",
          requesterPhone: "-",
          eventName: "-",
          eventDateFrom: "",
          eventDateTo: "",
          tentative: "-",
          requirements: "-",
          attachmentCount: 0,
          attachments: [] as AttachmentInfo[],
          message: "Event requisition submitted successfully.",
        }
      }

      name = payload.name || ""
      staffId = payload.staffId || ""
      email = payload.email || ""
      phone = payload.phone || ""
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
      presetAttachments = payload.attachments || []
    }

    // Step 1: Validate all text fields BEFORE processing any file uploads
    if (!name?.trim()) return { success: false, error: "Requester name is required." }
    if (!staffId?.trim()) return { success: false, error: "Staff ID is required." }
    if (!email?.trim()) return { success: false, error: "Email address is required." }
    if (!phone?.trim()) return { success: false, error: "Requester phone number is required." }
    if (!department?.trim()) return { success: false, error: "Department is required." }
    if (!eventName?.trim()) return { success: false, error: "Event name is required." }
    if (!eventType?.trim()) return { success: false, error: "Event type is required." }
    if (!organizer?.trim()) return { success: false, error: "Organizer is required." }
    if (!picContactName?.trim()) return { success: false, error: "PIC contact name is required." }
    if (!picContactNumber?.trim()) return { success: false, error: "PIC contact number is required." }
    if (!tentative?.trim()) return { success: false, error: "Tentative schedule is required." }
    if (!requirements?.trim()) return { success: false, error: "Event requirements are required." }

    // Input length limits to prevent payload bloat
    if (
      name.length > 100 ||
      staffId.length > 50 ||
      email.length > 100 ||
      phone.length > 30 ||
      department.length > 100 ||
      eventName.length > 200 ||
      eventType.length > 100 ||
      organizer.length > 200 ||
      picContactName.length > 100 ||
      picContactNumber.length > 30 ||
      requirements.length > 10000 ||
      tentative.length > 10000
    ) {
      return { success: false, error: "One or more input fields exceed the maximum allowable character limit." }
    }

    // Validate dates
    const dateFrom = eventDateFrom ? new Date(eventDateFrom) : null
    const dateTo = eventDateTo ? new Date(eventDateTo) : null
    if ((dateFrom && isNaN(dateFrom.getTime())) || (dateTo && isNaN(dateTo.getTime()))) {
      return { success: false, error: "Invalid event date format." }
    }
    if (dateFrom && dateTo && dateTo < dateFrom) {
      return { success: false, error: "Event end date cannot be earlier than start date." }
    }

    // Step 2: Validate file count and types BEFORE uploading
    if (rawFiles.length > MAX_ATTACHMENTS_COUNT) {
      return {
        success: false,
        error: `You can upload a maximum of ${MAX_ATTACHMENTS_COUNT} attachments per submission.`,
      }
    }

    for (const file of rawFiles) {
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        return {
          success: false,
          error: `File "${file.name}" exceeds the 10MB limit (${sizeMB} MB). Please choose files under 10MB.`,
        }
      }
      const mime = (file.type || "").toLowerCase().trim()
      if (!ALLOWED_MIME_EXTENSIONS[mime]) {
        return {
          success: false,
          error: `File "${file.name}" format (${file.type || "unknown"}) is not supported. Please upload JPEG, PNG, WebP, GIF, or PDF documents.`,
        }
      }
    }

    // Step 3: All validations passed, proceed to upload files
    const savedAttachments: AttachmentInfo[] = [...presetAttachments]
    for (const file of rawFiles) {
      try {
        const info = await saveAttachmentFile(file)
        savedAttachments.push(info)
      } catch (uploadErr) {
        console.error("Failed to save attachment file:", uploadErr)
        return {
          success: false,
          error: uploadErr instanceof Error ? uploadErr.message : "Failed to upload attachments.",
        }
      }
    }

    const currentYear = new Date().getFullYear()
    const requestNumber = await getNextEventRequestNumber(currentYear)

    // Create Marketing Event Requisition record
    const requisition = await prisma.marketingEventRequisition.create({
      data: {
        requestNumber,
        name: name.trim(),
        staffId: staffId.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        department: department.trim(),
        eventName: eventName.trim(),
        eventType: eventType.trim(),
        organizer: organizer.trim(),
        eventDateFrom: dateFrom,
        eventDateTo: dateTo,
        picContactName: picContactName.trim(),
        picContactNumber: picContactNumber.trim(),
        tentative: tentative.trim(),
        requirements: requirements.trim(),
        attachments: JSON.stringify(savedAttachments),
        status: "PENDING",
      },
    })

    // Queue email notifications for Marketing Admins
    try {
      const activeRecipients = await prisma.marketingNotificationRecipient.findMany({
        where: {
          isEnabled: true,
          category: { in: ["ALL", "EVENT"] },
        },
      })

      if (activeRecipients.length > 0) {
        const html = generateMarketingEventRequisitionAdminEmail({
          requestNumber: requisition.requestNumber,
          requesterName: requisition.name,
          requesterPhone: requisition.phone,
          staffId: requisition.staffId,
          email: requisition.email,
          department: requisition.department,
          eventName: requisition.eventName,
          eventType: requisition.eventType,
          organizer: requisition.organizer,
          eventDateFrom: requisition.eventDateFrom ? requisition.eventDateFrom.toISOString().split("T")[0] : null,
          eventDateTo: requisition.eventDateTo ? requisition.eventDateTo.toISOString().split("T")[0] : null,
          picContactName: requisition.picContactName,
          picContactNumber: requisition.picContactNumber,
          tentative: requisition.tentative,
          requirements: requisition.requirements,
        })

        for (const recipient of activeRecipients) {
          await queueMarketingEmailNotification({
            referenceId: requisition.requestNumber,
            category: "EVENT",
            to: recipient.email,
            subject: `[Marketing] New Event Requisition: ${requisition.requestNumber} (${requisition.eventName} - ${requisition.department})`,
            html,
          })
        }
      }
    } catch (notifErr) {
      console.warn("Could not queue marketing email notification for event requisition:", notifErr)
    }

    try {
      await logUserAction(
        "Public Event Requisition Submitted",
        `Submitted ${requestNumber} for ${eventName} by ${name} (${department})`
      )
    } catch {
      // audit log failure should not block user submission
    }

    revalidatePath("/marketing/events")
    revalidatePath("/marketing/forms")

    return {
      success: true as const,
      requestNumber: requisition.requestNumber,
      id: requisition.id,
      requesterName: requisition.name,
      requesterPhone: requisition.phone || "-",
      eventName: requisition.eventName,
      eventDateFrom: requisition.eventDateFrom ? requisition.eventDateFrom.toISOString().split("T")[0] : "",
      eventDateTo: requisition.eventDateTo ? requisition.eventDateTo.toISOString().split("T")[0] : "",
      tentative: requisition.tentative,
      requirements: requisition.requirements,
      attachmentCount: savedAttachments.length,
      attachments: savedAttachments,
      message: "Event requisition submitted successfully.",
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to submit event requisition."
    console.error("Failed to submit event requisition:", errMsg)
    return { success: false, error: errMsg }
  }
}

export interface GetMarketingEventOptions {
  take?: number
  skip?: number
  status?: string
}

export async function getMarketingEventRequisitions(options?: GetMarketingEventOptions) {
  const access = await getAccessInfo()
  if (!canAccessMarketingEvents(access)) {
    return { success: false, error: "Unauthorized", data: [] }
  }

  try {
    const { take, skip, status } = options || {}
    const list = await prisma.marketingEventRequisition.findMany({
      where: status ? { status: status as any } : undefined,
      take: typeof take === "number" ? take : undefined,
      skip: typeof skip === "number" ? skip : undefined,
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

    // Sync approved event with system calendar table (and clean up if rejected)
    if (status === "APPROVED" && access?.userId) {
      try {
        const start = updated.eventDateFrom ? new Date(updated.eventDateFrom) : new Date()
        const end = updated.eventDateTo ? new Date(updated.eventDateTo) : start

        const eventDescription = [
          `Requisition: ${updated.requestNumber}`,
          `Department: ${updated.department}`,
          `Organizer: ${updated.organizer}`,
          `PIC: ${updated.picContactName} (${updated.picContactNumber})`,
          `Requirements: ${updated.requirements}`,
          updated.tentative ? `Tentative: ${updated.tentative}` : null,
          remarks ? `Approval Remarks: ${remarks}` : null,
        ]
          .filter(Boolean)
          .join("\n")

        const existingEvent = await prisma.event.findFirst({
          where: { description: { contains: updated.requestNumber } },
        })

        if (existingEvent) {
          await prisma.event.update({
            where: { id: existingEvent.id },
            data: {
              title: `[Marketing] ${updated.eventName}`,
              description: eventDescription,
              startDateTime: start,
              endDateTime: end,
            },
          })
        } else {
          await prisma.event.create({
            data: {
              title: `[Marketing] ${updated.eventName}`,
              description: eventDescription,
              startDateTime: start,
              endDateTime: end,
              createdById: access.userId,
            },
          })
        }
        revalidatePath("/calendar")
      } catch (calErr) {
        console.warn("Could not sync approved event with system calendar:", calErr)
      }
    } else if (status === "REJECTED") {
      try {
        const existingEvent = await prisma.event.findFirst({
          where: { description: { contains: updated.requestNumber } },
        })
        if (existingEvent) {
          await prisma.event.delete({ where: { id: existingEvent.id } })
          revalidatePath("/calendar")
        }
      } catch (calErr) {
        console.warn("Could not remove rejected event from system calendar:", calErr)
      }
    }

    return { success: true, data: updated }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to update event requisition status."
    console.error("Failed to update event requisition status:", errMsg)
    return { success: false, error: errMsg }
  }
}

export interface UpdateMarketingEventPayload {
  eventName: string
  eventType: string
  organizer: string
  eventDateFrom?: string | null
  eventDateTo?: string | null
  picContactName: string
  picContactNumber: string
  tentative: string
  requirements: string
  name: string
  staffId: string
  email: string
  phone: string
  department: string
  remarks?: string | null
}

// Update Event Requisition Details (Admin / Permitted User)
export async function updateMarketingEventRequisition(
  id: string,
  payload: UpdateMarketingEventPayload
) {
  try {
    const access = await getAccessInfo()
    if (!canEditMarketingEvents(access)) {
      return { success: false, error: "Unauthorized: You do not have permission to edit marketing event requisitions." }
    }

    if (!payload.eventName?.trim()) return { success: false, error: "Event name is required." }
    if (!payload.eventType?.trim()) return { success: false, error: "Event type is required." }
    if (!payload.organizer?.trim()) return { success: false, error: "Organizer is required." }
    if (!payload.picContactName?.trim()) return { success: false, error: "PIC contact name is required." }
    if (!payload.picContactNumber?.trim()) return { success: false, error: "PIC contact number is required." }
    if (!payload.tentative?.trim()) return { success: false, error: "Tentative schedule is required." }
    if (!payload.requirements?.trim()) return { success: false, error: "Requirements are required." }
    if (!payload.name?.trim()) return { success: false, error: "Requester name is required." }
    if (!payload.staffId?.trim()) return { success: false, error: "Requester staff ID is required." }
    if (!payload.email?.trim()) return { success: false, error: "Requester email is required." }
    if (!payload.phone?.trim()) return { success: false, error: "Requester phone number is required." }
    if (!payload.department?.trim()) return { success: false, error: "Department is required." }

    const updated = await prisma.marketingEventRequisition.update({
      where: { id },
      data: {
        eventName: payload.eventName.trim(),
        eventType: payload.eventType.trim(),
        organizer: payload.organizer.trim(),
        eventDateFrom: payload.eventDateFrom ? new Date(payload.eventDateFrom) : null,
        eventDateTo: payload.eventDateTo ? new Date(payload.eventDateTo) : null,
        picContactName: payload.picContactName.trim(),
        picContactNumber: payload.picContactNumber.trim(),
        tentative: payload.tentative.trim(),
        requirements: payload.requirements.trim(),
        name: payload.name.trim(),
        staffId: payload.staffId.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        department: payload.department.trim(),
        remarks: payload.remarks !== undefined ? (payload.remarks?.trim() || null) : undefined,
        updatedAt: new Date(),
      },
    })

    // If event is APPROVED, sync changes to System Calendar Event
    if (updated.status === "APPROVED" && access?.userId) {
      try {
        const start = updated.eventDateFrom ? new Date(updated.eventDateFrom) : new Date()
        const end = updated.eventDateTo ? new Date(updated.eventDateTo) : start

        const eventDescription = [
          `Requisition: ${updated.requestNumber}`,
          `Department: ${updated.department}`,
          `Organizer: ${updated.organizer}`,
          `PIC: ${updated.picContactName} (${updated.picContactNumber})`,
          `Requester: ${updated.name} (${updated.phone || "-"})`,
          `Requirements: ${updated.requirements}`,
          updated.tentative ? `Tentative: ${updated.tentative}` : null,
          updated.remarks ? `Approval Remarks: ${updated.remarks}` : null,
        ]
          .filter(Boolean)
          .join("\n")

        const existingEvent = await prisma.event.findFirst({
          where: { description: { contains: updated.requestNumber } },
        })

        if (existingEvent) {
          await prisma.event.update({
            where: { id: existingEvent.id },
            data: {
              title: `[Marketing] ${updated.eventName}`,
              description: eventDescription,
              startDateTime: start,
              endDateTime: end,
            },
          })
        } else {
          await prisma.event.create({
            data: {
              title: `[Marketing] ${updated.eventName}`,
              description: eventDescription,
              startDateTime: start,
              endDateTime: end,
              createdById: access.userId,
            },
          })
        }
        revalidatePath("/calendar")
      } catch (calErr) {
        console.warn("Could not sync updated event to system calendar:", calErr)
      }
    }

    try {
      await logUserAction(
        "Edited Event Requisition",
        `Updated requisition details for ${updated.requestNumber} (${updated.eventName}) by user ${access?.name || access?.userId}`
      )
    } catch {
      // Non-blocking audit error
    }

    revalidatePath("/marketing/events")
    revalidatePath("/marketing/forms")

    return { success: true, data: updated }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Failed to update event requisition."
    console.error("Failed to update event requisition:", errMsg)
    return { success: false, error: errMsg }
  }
}

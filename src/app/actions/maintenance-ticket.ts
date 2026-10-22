"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { 
  queueMaintenanceEmailNotification,
  generateTicketCreatedEmailEn,
  generateTicketRequesterCreatedEmailEn,
  generateTechnicianAssignedEmailEn,
  generateTicketAcknowledgedEmailEn,
  generateTicketWorkCompletedEmailEn
} from "@/lib/maintenance-outbox"
import { 
  uploadMaintenancePhotoToR2,
  uploadMaintenancePdfToR2
} from "@/lib/maintenance-r2"
import { extractMaintenanceFromPdf, type ExtractedMaintenanceData } from "@/lib/maintenance-ai"
import { generateAndSaveMaintenanceJobSheet } from "@/lib/maintenance-pdf"
import { 
  MaintenanceCostCategory, 
  MaintenancePhotoCategory, 
  MaintenanceTicketPriority, 
  MaintenanceTicketStatus, 
  MaintenanceTicketType 
} from "@prisma/client"
import { getActiveMaintenanceNotificationEmails } from "./maintenance-notifications"
import crypto from "node:crypto"

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "")
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return "https://bubbleso2-aio.vercel.app"
}

/**
 * Server Action: AI Extraction from uploaded PDF maintenance document
 */
export async function extractMaintenancePdfAction(formData: FormData): Promise<{
  success: boolean
  data?: ExtractedMaintenanceData
  pdfUrl?: string
  pdfName?: string
  pdfSize?: number
  error?: string
}> {
  try {
    const file = formData.get("pdfFile") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No PDF file provided." }
    }

    if (file.size > 15 * 1024 * 1024) {
      return { success: false, error: "File exceeds 15MB limit." }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to private R2 storage
    const { url: pdfUrl } = await uploadMaintenancePdfToR2(buffer, file.name)

    // Call Gemini AI
    const data = await extractMaintenanceFromPdf(buffer)

    return {
      success: true,
      data,
      pdfUrl,
      pdfName: file.name,
      pdfSize: file.size,
    }
  } catch (err: any) {
    console.error("extractMaintenancePdfAction error:", err)
    return {
      success: false,
      error: err.message || "Failed to extract maintenance request from PDF.",
    }
  }
}

/**
 * Public work request submission (QR01 Portal)
 */
export async function publicCreateMaintenanceTicket(formData: FormData) {
  const title = (formData.get("title") as string)?.trim()
  const reasonOfWork = (formData.get("reasonOfWork") as string)?.trim() || null
  const ticketType = ((formData.get("ticketType") as string) || "MECHANICAL") as MaintenanceTicketType
  const priority = ((formData.get("priority") as string) || "MEDIUM") as MaintenanceTicketPriority
  const location = (formData.get("location") as string)?.trim()
  const specificArea = (formData.get("specificArea") as string)?.trim() || null
  const requesterName = (formData.get("requesterName") as string)?.trim()
  const requesterPhone = (formData.get("requesterPhone") as string)?.trim()
  const requesterEmail = (formData.get("requesterEmail") as string)?.trim().toLowerCase() || null

  if (!title || !location || !requesterName || !requesterPhone) {
    return { success: false, error: "Please fill in all required fields (Name, Phone, Location, and Work Description)." }
  }

  // Secure token for private requester status & acceptance
  const requesterToken = crypto.randomBytes(16).toString("hex")

  // Handle PDF Attachment (from AI Scan or manual upload)
  let requestPdfUrl = (formData.get("requestPdfUrl") as string)?.trim() || null
  let requestPdfName = (formData.get("requestPdfName") as string)?.trim() || null

  const pdfFile = formData.get("pdfFile") as File | null
  if (pdfFile && pdfFile instanceof File && pdfFile.size > 0 && !requestPdfUrl) {
    if (pdfFile.size <= 15 * 1024 * 1024) {
      try {
        const buffer = Buffer.from(await pdfFile.arrayBuffer())
        const uploaded = await uploadMaintenancePdfToR2(buffer, pdfFile.name)
        requestPdfUrl = uploaded.url
        requestPdfName = pdfFile.name
      } catch (e: any) {
        console.error("Failed to upload request PDF to R2:", e)
      }
    }
  }

  // Handle Photo Uploads (Support multiple images)
  let photoUrl: string | null = null
  const photoUploadInfos: { key: string; url: string; size: number; name: string }[] = []
  
  const rawPhotos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)
  const singlePhoto = formData.get("photo") as File | null
  if (rawPhotos.length === 0 && singlePhoto && singlePhoto.size > 0) {
    rawPhotos.push(singlePhoto)
  }

  for (const photoFile of rawPhotos) {
    if (photoFile.size <= 10 * 1024 * 1024) {
      try {
        const buffer = Buffer.from(await photoFile.arrayBuffer())
        const { key, url } = await uploadMaintenancePhotoToR2(
          buffer,
          photoFile.name,
          photoFile.type || "image/jpeg"
        )
        if (!photoUrl) photoUrl = url
        photoUploadInfos.push({ key, url, size: photoFile.size, name: photoFile.name })
      } catch (e: any) {
        console.error("Failed to upload photo to R2:", e)
      }
    }
  }

  try {
    const ticket = await prisma.maintenanceTicket.create({
      data: {
        title,
        reasonOfWork,
        ticketType,
        priority,
        location,
        specificArea,
        requesterName,
        requesterPhone,
        requesterEmail,
        requesterToken,
        createdById: null, // Public anonymous guest
        photoUrl,
        requestPdfUrl,
        requestPdfName,
        status: MaintenanceTicketStatus.OPEN,
        activityLogs: {
          create: {
            actorName: requesterName,
            actorRole: "REQUESTER",
            action: "REQUEST_LOGGED",
            details: requestPdfName
              ? `Work request submitted via Public QR01 intake form with attached document (${requestPdfName}). Category: ${ticketType}, Priority: ${priority}.`
              : `Work request submitted via Public QR01 intake form. Category: ${ticketType}, Priority: ${priority}.`,
            isPublic: true,
          },
        },
        photos: photoUploadInfos.length > 0 ? {
          create: photoUploadInfos.map((info, idx) => ({
            category: MaintenancePhotoCategory.INITIAL_COMPLAINT,
            objectKey: info.key,
            fileUrl: info.url,
            fileName: info.name,
            fileSize: info.size,
            uploadedByName: requesterName,
            caption: `Initial complaint photo ${idx + 1}`,
          })),
        } : undefined,
      },
    })

    const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
    const baseUrl = getBaseUrl()
    const ticketUrl = `${baseUrl}/forms/maintenance/tickets/${ticket.id}`
    const trackUrl = `${baseUrl}/public/maintenance/track/${ticket.id}?token=${requesterToken}`

    // Queue email to category PICs
    try {
      const alertEmails = await getActiveMaintenanceNotificationEmails(ticketType)
      const picEmailHtml = generateTicketCreatedEmailEn({
        logNumber: formattedLog,
        title,
        ticketType,
        priority,
        location,
        specificArea,
        requesterName,
        ticketUrl,
        trackUrl,
        pdfUrl: requestPdfUrl,
        pdfName: requestPdfName,
      })

      for (const email of alertEmails) {
        await queueMaintenanceEmailNotification({
          ticketId: ticket.id,
          to: email,
          subject: `[Work Request Logged] ${formattedLog} (${ticketType}): ${title}`,
          html: picEmailHtml,
        })
      }

      // Confirmation to Requester (Strictly without workspace login button)
      if (requesterEmail) {
        const requesterEmailHtml = generateTicketRequesterCreatedEmailEn({
          logNumber: formattedLog,
          title,
          ticketType,
          priority,
          location,
          specificArea,
          requesterName,
          trackUrl,
          pdfUrl: requestPdfUrl,
          pdfName: requestPdfName,
        })
        await queueMaintenanceEmailNotification({
          ticketId: ticket.id,
          to: requesterEmail,
          subject: `[Work Request Received] ${formattedLog}: ${title}`,
          html: requesterEmailHtml,
        })
      }
    } catch (notifErr) {
      console.error("Public maintenance notification error:", notifErr)
    }

    revalidatePath("/forms/maintenance/tickets")
    return {
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      logNumber: formattedLog,
      requesterToken,
    }
  } catch (err: any) {
    console.error("publicCreateMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to submit work request." }
  }
}

/**
 * Authenticated staff work request submission
 */
export async function createMaintenanceTicket(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized. Please log in." }

  const title = (formData.get("title") as string)?.trim()
  const reasonOfWork = (formData.get("reasonOfWork") as string)?.trim() || null
  const ticketType = ((formData.get("ticketType") as string) || "MECHANICAL") as MaintenanceTicketType
  const priority = ((formData.get("priority") as string) || "MEDIUM") as MaintenanceTicketPriority
  const location = (formData.get("location") as string)?.trim()
  const specificArea = (formData.get("specificArea") as string)?.trim() || null
  const requesterName = (formData.get("requesterName") as string)?.trim() || session.user.name || "Staff"
  const requesterPhone = (formData.get("requesterPhone") as string)?.trim() || "-"
  const requesterEmail = (formData.get("requesterEmail") as string)?.trim().toLowerCase() || session.user.email?.toLowerCase() || null

  if (!title || !location) {
    return { success: false, error: "Work description and location are required." }
  }

  const requesterToken = crypto.randomBytes(16).toString("hex")

  // Handle PDF Attachment (from AI Scan or manual upload)
  let requestPdfUrl = (formData.get("requestPdfUrl") as string)?.trim() || null
  let requestPdfName = (formData.get("requestPdfName") as string)?.trim() || null

  const pdfFile = formData.get("pdfFile") as File | null
  if (pdfFile && pdfFile instanceof File && pdfFile.size > 0 && !requestPdfUrl) {
    if (pdfFile.size <= 15 * 1024 * 1024) {
      try {
        const buffer = Buffer.from(await pdfFile.arrayBuffer())
        const uploaded = await uploadMaintenancePdfToR2(buffer, pdfFile.name)
        requestPdfUrl = uploaded.url
        requestPdfName = pdfFile.name
      } catch (e: any) {
        console.error("Failed to upload request PDF to R2:", e)
      }
    }
  }

  // Handle Photo Uploads (Support multiple images)
  let photoUrl: string | null = null
  const photoUploadInfos: { key: string; url: string; size: number; name: string }[] = []
  
  const rawPhotos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0)
  const singlePhoto = formData.get("photo") as File | null
  if (rawPhotos.length === 0 && singlePhoto && singlePhoto.size > 0) {
    rawPhotos.push(singlePhoto)
  }

  for (const photoFile of rawPhotos) {
    if (photoFile.size <= 10 * 1024 * 1024) {
      try {
        const buffer = Buffer.from(await photoFile.arrayBuffer())
        const { key, url } = await uploadMaintenancePhotoToR2(
          buffer,
          photoFile.name,
          photoFile.type || "image/jpeg"
        )
        if (!photoUrl) photoUrl = url
        photoUploadInfos.push({ key, url, size: photoFile.size, name: photoFile.name })
      } catch (e: any) {
        console.error("Failed to upload photo to R2:", e)
      }
    }
  }

  try {
    const ticket = await prisma.maintenanceTicket.create({
      data: {
        title,
        reasonOfWork,
        ticketType,
        priority,
        location,
        specificArea,
        requesterName,
        requesterPhone,
        requesterEmail,
        requesterToken,
        createdById: session.user.id,
        photoUrl,
        requestPdfUrl,
        requestPdfName,
        status: MaintenanceTicketStatus.OPEN,
        activityLogs: {
          create: {
            actorName: session.user.name || "Staff",
            actorRole: "STAFF",
            action: "REQUEST_LOGGED",
            details: requestPdfName
              ? `Internal work request submitted with attached document (${requestPdfName}). Category: ${ticketType}, Priority: ${priority}.`
              : `Internal work request submitted. Category: ${ticketType}, Priority: ${priority}.`,
            isPublic: true,
          },
        },
        photos: photoUploadInfos.length > 0 ? {
          create: photoUploadInfos.map((info, idx) => ({
            category: MaintenancePhotoCategory.INITIAL_COMPLAINT,
            objectKey: info.key,
            fileUrl: info.url,
            fileName: info.name,
            fileSize: info.size,
            uploadedByName: session.user.name || "Staff",
            caption: `Initial complaint photo ${idx + 1}`,
          })),
        } : undefined,
      },
    })

    const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
    const baseUrl = getBaseUrl()
    const ticketUrl = `${baseUrl}/forms/maintenance/tickets/${ticket.id}`
    const trackUrl = `${baseUrl}/public/maintenance/track/${ticket.id}?token=${requesterToken}`

    try {
      const alertEmails = await getActiveMaintenanceNotificationEmails(ticketType)
      const picEmailHtml = generateTicketCreatedEmailEn({
        logNumber: formattedLog,
        title,
        ticketType,
        priority,
        location,
        specificArea,
        requesterName,
        ticketUrl,
        trackUrl,
        pdfUrl: requestPdfUrl,
        pdfName: requestPdfName,
      })

      for (const email of alertEmails) {
        await queueMaintenanceEmailNotification({
          ticketId: ticket.id,
          to: email,
          subject: `[Work Request Logged] ${formattedLog} (${ticketType}): ${title}`,
          html: picEmailHtml,
        })
      }

      // Confirmation to Requester (Track Request Status only)
      if (requesterEmail) {
        const requesterEmailHtml = generateTicketRequesterCreatedEmailEn({
          logNumber: formattedLog,
          title,
          ticketType,
          priority,
          location,
          specificArea,
          requesterName,
          trackUrl,
          pdfUrl: requestPdfUrl,
          pdfName: requestPdfName,
        })
        await queueMaintenanceEmailNotification({
          ticketId: ticket.id,
          to: requesterEmail,
          subject: `[Work Request Received] ${formattedLog}: ${title}`,
          html: requesterEmailHtml,
        })
      }
    } catch (notifErr) {
      console.error("Maintenance notification error:", notifErr)
    }

    revalidatePath("/forms/maintenance/tickets")
    revalidatePath("/forms/maintenance/dashboard")
    return { success: true, ticketId: ticket.id, ticketNumber: ticket.ticketNumber, logNumber: formattedLog }
  } catch (err: any) {
    console.error("createMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to submit work request." }
  }
}

/**
 * PIC Acknowledgment Action:
 * Explicitly acknowledges the ticket, starts the SLA clock, and sets target dateline.
 */
export async function acknowledgeMaintenanceTicket(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. MAINTENANCE_TICKETS_MANAGE permission required." }
  }

  const agree = formData.get("agree") === "true" || formData.get("agree") === "on"
  if (!agree) {
    return { success: false, error: "You must check the agreement box to formally acknowledge accountability." }
  }

  const customDeadlineStr = (formData.get("targetDateline") as string)?.trim() || null
  const rawPriority = (formData.get("priority") as string)?.toUpperCase()
  const rawTicketType = (formData.get("ticketType") as string)?.toUpperCase()

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
  })

  if (!ticket) return { success: false, error: "Ticket not found." }
  if (ticket.status !== "OPEN") {
    return { success: false, error: `Ticket cannot be acknowledged from current status: ${ticket.status}` }
  }

  const validPriorities: MaintenanceTicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]
  const validTicketTypes: MaintenanceTicketType[] = ["MECHANICAL", "CIVIL", "ELECTRICAL", "OTHERS"]

  const priorityToUse = validPriorities.includes(rawPriority as any)
    ? (rawPriority as MaintenanceTicketPriority)
    : ticket.priority

  const ticketTypeToUse = validTicketTypes.includes(rawTicketType as any)
    ? (rawTicketType as MaintenanceTicketType)
    : ticket.ticketType

  const now = new Date()
  const responseMinutes = Math.max(0, Math.round((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60)))

  // Calculate default target dateline based on priority:
  // URGENT: +24h (1d), HIGH: +72h (3d), MEDIUM: +5d, LOW: +7d
  let targetEnd: Date
  if (customDeadlineStr) {
    targetEnd = new Date(customDeadlineStr)
  } else {
    targetEnd = new Date(now)
    if (priorityToUse === "URGENT") {
      targetEnd.setHours(targetEnd.getHours() + 24)
    } else if (priorityToUse === "HIGH") {
      targetEnd.setDate(targetEnd.getDate() + 3)
    } else if (priorityToUse === "MEDIUM") {
      targetEnd.setDate(targetEnd.getDate() + 5)
    } else {
      targetEnd.setDate(targetEnd.getDate() + 7)
    }
  }

  try {
    const updated = await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status: MaintenanceTicketStatus.ACKNOWLEDGED,
        ticketType: ticketTypeToUse,
        priority: priorityToUse,
        acknowledgedById: session.user.id,
        acknowledgedAt: now,
        picAgreement: true,
        kpiResponseMins: responseMinutes,
        targetStartDate: now,
        targetDateline: targetEnd,
        activityLogs: {
          create: {
            actorName: session.user.name || "PIC",
            actorRole: "PIC",
            action: "ACKNOWLEDGED",
            details: `Ticket formally acknowledged by ${session.user.name || 'PIC'}. Category: ${ticketTypeToUse}, Priority: ${priorityToUse}. Response time: ${responseMinutes} minutes. Target deadline set to ${targetEnd.toLocaleString('en-GB')}.`,
            isPublic: true,
          },
        },
      },
    })

    const formattedLog = `BO2-MT-${updated.ticketNumber.toString().padStart(4, "0")}`
    const baseUrl = getBaseUrl()
    const trackUrl = `${baseUrl}/public/maintenance/track/${updated.id}?token=${updated.requesterToken}`

    // Notify Requester
    if (updated.requesterEmail) {
      const emailHtml = generateTicketAcknowledgedEmailEn({
        logNumber: formattedLog,
        title: updated.title,
        requesterName: updated.requesterName,
        picName: session.user.name || "Maintenance Lead",
        targetDateline: targetEnd,
        trackUrl,
      })
      await queueMaintenanceEmailNotification({
        ticketId: updated.id,
        to: updated.requesterEmail,
        subject: `[Acknowledged] ${formattedLog}: ${updated.title}`,
        html: emailHtml,
      })
    }

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath("/forms/maintenance/tickets")
    return { success: true }
  } catch (err: any) {
    console.error("acknowledgeMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to acknowledge ticket." }
  }
}

/**
 * Update Maintenance Ticket Classification (Category and/or Priority)
 */
export async function updateMaintenanceTicketClassification(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. MAINTENANCE_TICKETS_MANAGE permission required." }
  }

  const rawTicketType = (formData.get("ticketType") as string)?.toUpperCase()
  const rawPriority = (formData.get("priority") as string)?.toUpperCase()

  const validTypes: MaintenanceTicketType[] = ["MECHANICAL", "CIVIL", "ELECTRICAL", "OTHERS"]
  const validPriorities: MaintenanceTicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]

  const ticketType = validTypes.includes(rawTicketType as any) ? (rawTicketType as MaintenanceTicketType) : undefined
  const priority = validPriorities.includes(rawPriority as any) ? (rawPriority as MaintenanceTicketPriority) : undefined

  if (!ticketType && !priority) {
    return { success: false, error: "No valid category or priority provided." }
  }

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
  })

  if (!ticket) return { success: false, error: "Ticket not found." }

  try {
    const updated = await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        ...(ticketType ? { ticketType } : {}),
        ...(priority ? { priority } : {}),
        activityLogs: {
          create: {
            actorName: session.user.name || "Staff",
            actorRole: "PIC",
            action: "CLASSIFICATION_UPDATED",
            details: `Ticket classification updated by ${session.user.name || 'PIC'}: Category -> ${ticketType || ticket.ticketType}, Priority -> ${priority || ticket.priority}.`,
            isPublic: true,
          },
        },
      },
    })

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath("/forms/maintenance/tickets")
    return { success: true, ticket: { ticketType: updated.ticketType, priority: updated.priority } }
  } catch (err: any) {
    console.error("updateMaintenanceTicketClassification error:", err)
    return { success: false, error: err.message || "Failed to update classification." }
  }
}

/**
 * Assign Technician or External Contractor
 */
export async function assignMaintenanceTicket(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  const assigneeType = formData.get("assigneeType") as string // "INTERNAL" or "CONTRACTOR"
  const assigneeId = (formData.get("assigneeId") as string)?.trim() || null
  const assigneeName = (formData.get("assigneeName") as string)?.trim() || null
  const contractorPhone = (formData.get("contractorPhone") as string)?.trim() || null
  const contractorEmail = (formData.get("contractorEmail") as string)?.trim() || null
  const reassignmentReason = (formData.get("reassignmentReason") as string)?.trim() || null

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  })

  if (!ticket) return { success: false, error: "Ticket not found." }

  let contractorToken = ticket.contractorToken
  if (assigneeType === "CONTRACTOR" && !contractorToken) {
    contractorToken = crypto.randomBytes(16).toString("hex")
  }

  let finalAssigneeId = assigneeId
  let finalAssigneeName = assigneeName
  let assignedTargetEmail: string | null = null

  if (assigneeType === "INTERNAL") {
    if (!assigneeId) return { success: false, error: "Please select an internal technician." }
    const assignedUser = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { name: true, email: true },
    })
    finalAssigneeName = assignedUser?.name || null
    assignedTargetEmail = assignedUser?.email || null
  } else {
    if (!assigneeName) return { success: false, error: "Please provide the external contractor/vendor name." }
    finalAssigneeId = null
    assignedTargetEmail = contractorEmail
  }

  try {
    await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        assigneeId: finalAssigneeId,
        assigneeName: finalAssigneeName,
        contractorPhone: assigneeType === "CONTRACTOR" ? contractorPhone : null,
        contractorEmail: assigneeType === "CONTRACTOR" ? contractorEmail : null,
        contractorToken,
        status: ticket.status === "OPEN" || ticket.status === "ACKNOWLEDGED" 
          ? MaintenanceTicketStatus.IN_PROGRESS 
          : ticket.status,
        activityLogs: {
          create: {
            actorName: session.user.name || "PIC",
            actorRole: "PIC",
            action: "ASSIGNED",
            details: `Assigned to ${assigneeType === "INTERNAL" ? 'Technician' : 'Contractor'}: ${finalAssigneeName}.${reassignmentReason ? ` Reassignment note: ${reassignmentReason}` : ''}`,
            isPublic: true,
          },
        },
      },
    })

    // Notify assigned technician/contractor via email if email address is available
    if (assignedTargetEmail) {
      try {
        const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
        const baseUrl = getBaseUrl()
        const workSheetUrl = `${baseUrl}/maintenance/work/${ticket.id}?token=${contractorToken || ''}`
        const techEmailHtml = generateTechnicianAssignedEmailEn({
          logNumber: formattedLog,
          title: ticket.title,
          ticketType: ticket.ticketType,
          priority: ticket.priority,
          location: ticket.location,
          specificArea: ticket.specificArea,
          technicianName: finalAssigneeName || "Technician",
          assignedByName: session.user.name || "PIC / Supervisor",
          reassignmentReason,
          targetDateline: ticket.targetDateline,
          workSheetUrl,
        })
        await queueMaintenanceEmailNotification({
          ticketId: ticket.id,
          to: assignedTargetEmail,
          subject: `[Work Order Assignment] ${formattedLog}: ${ticket.title}`,
          html: techEmailHtml,
        })
      } catch (mailErr) {
        console.warn("Technician assignment email notification error:", mailErr)
      }
    }

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath("/forms/maintenance/tickets")
    return { success: true }
  } catch (err: any) {
    console.error("assignMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to assign ticket." }
  }
}

/**
 * Resend Work Order Assignment Notification to Assigned Technician / Contractor
 */
export async function resendTechnicianNotification(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: { assignee: { select: { email: true, name: true } } },
  })
  if (!ticket) return { success: false, error: "Ticket not found." }

  const targetEmail = ticket.contractorEmail || ticket.assignee?.email
  if (!targetEmail) {
    return { success: false, error: "No email address found for the assigned technician or contractor." }
  }

  try {
    const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
    const baseUrl = getBaseUrl()
    const workSheetUrl = `${baseUrl}/maintenance/work/${ticket.id}?token=${ticket.contractorToken || ''}`
    const emailHtml = generateTechnicianAssignedEmailEn({
      logNumber: formattedLog,
      title: ticket.title,
      ticketType: ticket.ticketType,
      priority: ticket.priority,
      location: ticket.location,
      specificArea: ticket.specificArea,
      technicianName: ticket.assignee?.name || ticket.assigneeName || "Technician",
      assignedByName: session.user.name || "Supervisor / PIC",
      targetDateline: ticket.targetDateline,
      workSheetUrl,
    })

    await queueMaintenanceEmailNotification({
      ticketId: ticket.id,
      to: targetEmail,
      subject: `[Work Order Assignment] ${formattedLog}: ${ticket.title}`,
      html: emailHtml,
    })

    return { success: true }
  } catch (err: any) {
    console.error("resendTechnicianNotification error:", err)
    return { success: false, error: err.message || "Failed to resend notification." }
  }
}

/**
 * Mobile Technician / Contractor Action: Start Work
 */
export async function technicianStartWork(id: string, contractorToken?: string) {
  const session = await auth()
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } })
  if (!ticket) return { success: false, error: "Ticket not found." }

  // Verify access: internal user or contractor token
  if (!session?.user?.id && (!contractorToken || ticket.contractorToken !== contractorToken)) {
    return { success: false, error: "Unauthorized access." }
  }

  const actorName = session?.user?.name || ticket.assigneeName || "Technician"

  try {
    await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        startedAt: ticket.startedAt || new Date(),
        status: MaintenanceTicketStatus.IN_PROGRESS,
        activityLogs: {
          create: {
            actorName,
            actorRole: session?.user?.id ? "TECHNICIAN" : "CONTRACTOR",
            action: "WORK_STARTED",
            details: `Repair work commenced on-site by ${actorName}.`,
            isPublic: true,
          },
        },
      },
    })

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath(`/maintenance/work/${id}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to start work." }
  }
}

/**
 * Mobile Technician / Contractor Action: Upload Evidence Photo
 */
export async function uploadTechnicianPhoto(
  ticketId: string,
  category: "BEFORE" | "PROGRESS" | "AFTER",
  formData: FormData,
  contractorToken?: string
) {
  const session = await auth()
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) return { success: false, error: "Ticket not found." }

  if (!session?.user?.id && (!contractorToken || ticket.contractorToken !== contractorToken)) {
    return { success: false, error: "Unauthorized access." }
  }

  const file = formData.get("photo") as File | null
  const caption = (formData.get("caption") as string)?.trim() || null

  if (!file || file.size === 0) return { success: false, error: "No photo selected." }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: "File exceeds 10MB limit." }

  const actorName = session?.user?.name || ticket.assigneeName || "Technician"

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { key, url } = await uploadMaintenancePhotoToR2(buffer, file.name, file.type || "image/jpeg")

    const photo = await prisma.maintenanceTicketPhoto.create({
      data: {
        ticketId,
        category: category as MaintenancePhotoCategory,
        objectKey: key,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "image/jpeg",
        caption,
        uploadedByName: actorName,
      },
    })

    await prisma.maintenanceActivityLog.create({
      data: {
        ticketId,
        actorName,
        actorRole: session?.user?.id ? "TECHNICIAN" : "CONTRACTOR",
        action: "PHOTO_UPLOADED",
        details: `Uploaded ${category} evidence photo: ${file.name}`,
        isPublic: true,
      },
    })

    revalidatePath(`/forms/maintenance/tickets/${ticketId}`)
    revalidatePath(`/maintenance/work/${ticketId}`)
    return { success: true, photo }
  } catch (err: any) {
    console.error("uploadTechnicianPhoto error:", err)
    return { success: false, error: err.message || "Failed to upload photo." }
  }
}

/**
 * Mobile Technician / Contractor Action: Submit Completed Work
 */
export async function technicianSubmitWork(id: string, formData: FormData, contractorToken?: string) {
  const session = await auth()
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { photos: true },
  })

  if (!ticket) return { success: false, error: "Ticket not found." }

  if (!session?.user?.id && (!contractorToken || ticket.contractorToken !== contractorToken)) {
    return { success: false, error: "Unauthorized access." }
  }

  const rootCause = (formData.get("rootCause") as string)?.trim() || null
  const resolution = (formData.get("resolution") as string)?.trim()
  const signature = (formData.get("signature") as string)?.trim() || null

  if (!resolution) {
    return { success: false, error: "Technical resolution summary is mandatory." }
  }

  // Validate Photo Evidence: Must have BEFORE and AFTER photos
  const hasBefore = ticket.photos.some((p) => p.category === "BEFORE")
  const hasAfter = ticket.photos.some((p) => p.category === "AFTER")

  if (!hasBefore || !hasAfter) {
    return {
      success: false,
      error: "Mandatory photographic evidence missing. You must upload at least one BEFORE photo and one AFTER photo before submitting completion.",
    }
  }

  const now = new Date()
  const actorName = session?.user?.name || ticket.assigneeName || "Technician"

  // SLA Calculation (Clock started at acknowledgment)
  const startTime = ticket.acknowledgedAt || ticket.createdAt
  const repairHours = Math.round(((now.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * 10) / 10

  let kpiStatus = "On Time"
  if (ticket.targetDateline && now.getTime() > ticket.targetDateline.getTime()) {
    kpiStatus = "Delay"
  }

  try {
    const updated = await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        rootCause,
        resolution,
        noPhotoReason: null,
        technicianSignature: signature || ticket.technicianSignature,
        workCompletedAt: now,
        completedAt: now,
        kpiRepairHours: repairHours,
        kpiStatus,
        status: MaintenanceTicketStatus.AWAITING_VERIFICATION,
        activityLogs: {
          create: {
            actorName,
            actorRole: session?.user?.id ? "TECHNICIAN" : "CONTRACTOR",
            action: "WORK_COMPLETED",
            details: `Repair work submitted as completed by ${actorName}. Resolution: ${resolution}. Total repair time: ${repairHours} hours (KPI: ${kpiStatus}).`,
            isPublic: true,
          },
        },
      },
    })

    const formattedLog = `BO2-MT-${updated.ticketNumber.toString().padStart(4, "0")}`
    const baseUrl = getBaseUrl()
    const trackUrl = `${baseUrl}/public/maintenance/track/${updated.id}?token=${updated.requesterToken}`

    // Notify Requester to verify work
    if (updated.requesterEmail) {
      const emailHtml = generateTicketWorkCompletedEmailEn({
        logNumber: formattedLog,
        title: updated.title,
        requesterName: updated.requesterName,
        resolution,
        trackUrl,
      })
      await queueMaintenanceEmailNotification({
        ticketId: updated.id,
        to: updated.requesterEmail,
        subject: `[Work Completed - Verification Needed] ${formattedLog}: ${updated.title}`,
        html: emailHtml,
      })
    }

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath(`/maintenance/work/${id}`)
    revalidatePath(`/public/maintenance/track/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error("technicianSubmitWork error:", err)
    return { success: false, error: err.message || "Failed to submit completed work." }
  }
}

/**
 * Requester Verification Action (from public tracking page or authenticated workspace)
 */
export async function verifyMaintenanceWork(
  id: string,
  token: string,
  satisfied: boolean,
  feedback?: string,
  signature?: string
) {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id } })
  if (!ticket) return { success: false, error: "Ticket not found." }

  if (ticket.requesterToken !== token) {
    return { success: false, error: "Invalid or expired verification token." }
  }

  const now = new Date()

  try {
    if (satisfied) {
      await prisma.maintenanceTicket.update({
        where: { id },
        data: {
          verifiedByRequester: true,
          requesterVerifiedAt: now,
          requesterFeedback: feedback?.trim() || "Work confirmed satisfactory.",
          requesterSignature: signature || ticket.requesterSignature,
          status: MaintenanceTicketStatus.AWAITING_COSTING,
          activityLogs: {
            create: {
              actorName: ticket.requesterName,
              actorRole: "REQUESTER",
              action: "VERIFIED_SATISFACTORY",
              details: `Requester confirmed work is satisfactory.${feedback ? ` Feedback: ${feedback}` : ''}`,
              isPublic: true,
            },
          },
        },
      })
    } else {
      // Rework requested
      await prisma.maintenanceTicket.update({
        where: { id },
        data: {
          status: MaintenanceTicketStatus.IN_PROGRESS,
          requesterFeedback: feedback?.trim() || "Rework requested by requester.",
          activityLogs: {
            create: {
              actorName: ticket.requesterName,
              actorRole: "REQUESTER",
              action: "REWORK_REQUESTED",
              details: `Requester requested rework: ${feedback || 'Not satisfied with repair.'}`,
              isPublic: true,
            },
          },
        },
      })
    }

    revalidatePath(`/public/maintenance/track/${id}`)
    revalidatePath(`/forms/maintenance/tickets/${id}`)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to record verification." }
  }
}

/**
 * Atomic Cost Finalization (Materials & Labour)
 */
export async function updateMaintenanceCosts(id: string, costsData: any[]) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  try {
    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id },
      select: { id: true, ticketNumber: true, title: true },
    })
    if (!ticket) return { success: false, error: "Ticket not found." }

    const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

    await prisma.$transaction(async (tx) => {
      // 1. Revert any previously deducted spare parts from FMS Inventory for this ticket
      const previousCosts = await tx.maintenanceTicketCost.findMany({
        where: { ticketId: id },
      })

      for (const prev of previousCosts) {
        if (prev.itemId && prev.category === "SPARE_PART") {
          const qtyToRestore = Math.max(1, Math.round(prev.quantity))
          try {
            await tx.maintenanceItem.update({
              where: { id: prev.itemId },
              data: { quantity: { increment: qtyToRestore } },
            })
          } catch (e) {
            console.warn(`Could not restore stock for item ${prev.itemId}:`, e)
          }
        }
      }

      // 2. Clear existing costs
      await tx.maintenanceTicketCost.deleteMany({ where: { ticketId: id } })

      let rows: any[] = []
      if (Array.isArray(costsData) && costsData.length > 0) {
        rows = costsData.map((c: any) => {
          const qty = parseFloat(c.quantity) || 1
          const unitPrice = parseFloat(c.unitPrice) || 0
          const amount = parseFloat(c.amount) || qty * unitPrice
          return {
            ticketId: id,
            category: (c.category || "SPARE_PART") as MaintenanceCostCategory,
            itemId: c.itemId || null,
            itemName: String(c.itemName || "Item").trim(),
            quantity: qty,
            unit: String(c.unit || "PCS").trim().toUpperCase(),
            unitPrice,
            amount,
            remarks: c.remarks ? String(c.remarks).trim() : null,
          }
        })

        await tx.maintenanceTicketCost.createMany({ data: rows })

        // 3. Deduct stock from FMS Inventory and create MaintenanceStockLog for spare parts
        for (const row of rows) {
          if (row.itemId && row.category === "SPARE_PART") {
            const qtyInt = Math.max(1, Math.round(row.quantity))
            const item = await tx.maintenanceItem.findUnique({ where: { id: row.itemId } })
            if (item) {
              await tx.maintenanceItem.update({
                where: { id: item.id },
                data: { quantity: { decrement: qtyInt } },
              })

              const logTotal = Number(((item.pricePerUnit || row.unitPrice || 0) * qtyInt).toFixed(2))
              await tx.maintenanceStockLog.create({
                data: {
                  itemId: item.id,
                  type: "OUT",
                  quantity: qtyInt,
                  pricePerUnit: item.pricePerUnit || row.unitPrice || 0,
                  totalPrice: logTotal,
                  handledBy: session.user.name || "Maintenance PIC",
                  remarks: `Used for FMS Work Order ${formattedLog}: ${ticket.title.substring(0, 50)}`,
                },
              })
            }
          }
        }
      }

      await tx.maintenanceActivityLog.create({
        data: {
          ticketId: id,
          actorName: session.user.name || "PIC",
          actorRole: "PIC",
          action: "COSTS_FINALIZED",
          details: `Updated ${rows.length} cost rows. Total: RM ${rows.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0).toFixed(2)}. Inventory stock deducted accordingly.`,
          isPublic: false,
        },
      })
    })

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath("/forms/maintenance/dashboard")
    return { success: true }
  } catch (err: any) {
    console.error("updateMaintenanceCosts error:", err)
    return { success: false, error: err.message || "Failed to update costs." }
  }
}

/**
 * Administrative Closure & Combined Job Sheet / Billing Memo PDF Generation
 */
export async function closeMaintenanceTicket(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  const closingRemarks = (formData.get("closingRemarks") as string)?.trim() || null
  const signature = (formData.get("signature") as string)?.trim() || null

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { costs: true },
  })

  if (!ticket) return { success: false, error: "Ticket not found." }

  const now = new Date()
  const jobSheetNumber = `BO2-MJS-${ticket.ticketNumber.toString().padStart(4, "0")}`

  try {
    // 1. Mark ticket CLOSED in DB
    await prisma.maintenanceTicket.update({
      where: { id },
      data: {
        status: MaintenanceTicketStatus.CLOSED,
        closedById: session.user.id,
        closedAt: now,
        internalNotes: closingRemarks ? `${ticket.internalNotes ? ticket.internalNotes + "\n" : ""}[Closure Remark]: ${closingRemarks}` : ticket.internalNotes,
        jobSheetNumber,
        picSignature: signature || ticket.picSignature,
        activityLogs: {
          create: {
            actorName: session.user.name || "Supervisor / HOD",
            actorRole: "HOD",
            action: "TICKET_CLOSED",
            details: `Ticket formally approved and closed by ${session.user.name}. Job Sheet & Billing Memo generated (${jobSheetNumber}).`,
            isPublic: true,
          },
        },
      },
    })

    // 2. Generate and upload Job Sheet PDF to R2
    let pdfUrl: string | null = null
    try {
      const { url } = await generateAndSaveMaintenanceJobSheet(id)
      pdfUrl = url
    } catch (pdfErr) {
      console.error("Failed to generate job sheet PDF:", pdfErr)
    }

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath("/forms/maintenance/tickets")
    revalidatePath("/forms/maintenance/dashboard")
    return { success: true, jobSheetNumber, pdfUrl }
  } catch (err: any) {
    console.error("closeMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to close ticket." }
  }
}

/**
 * Fetch workspace data with safe selects (excluding password hashes)
 */
export async function getMaintenanceWorkspaceData(ticketId: string) {
  const session = await auth()
  if (!session) return null

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, unit: { select: { name: true } } },
      },
      assignee: {
        select: { id: true, name: true, email: true, unit: { select: { name: true } } },
      },
      acknowledgedBy: {
        select: { id: true, name: true, email: true },
      },
      closedBy: {
        select: { id: true, name: true, email: true },
      },
      costs: {
        orderBy: { createdAt: "asc" },
      },
      photos: {
        orderBy: { createdAt: "asc" },
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
      },
      purchaseRequests: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!ticket) return null

  // Fetch list of technicians (scoped to users with MAINTENANCE_TECHNICIAN module or Superadmin)
  let staffList = await prisma.user.findMany({
    where: {
      OR: [
        { modules: { has: "MAINTENANCE_TECHNICIAN" } },
        { role: "SUPERADMIN" },
      ],
    },
    select: { id: true, name: true, email: true, unit: { select: { name: true } } },
    orderBy: { name: "asc" },
  })

  // Fallback: If no users have the module yet, include users with MAINTENANCE_TICKETS_MANAGE or Maintenance unit
  if (staffList.length === 0) {
    staffList = await prisma.user.findMany({
      where: {
        OR: [
          { modules: { has: "MAINTENANCE_TICKETS_MANAGE" } },
          { unit: { name: { contains: "Maintenance", mode: "insensitive" } } },
          { role: "SUPERADMIN" },
        ],
      },
      select: { id: true, name: true, email: true, unit: { select: { name: true } } },
      orderBy: { name: "asc" },
    })
  }

  // Fetch spare parts catalog items (exclude NRHO)
  const catalogItems = await prisma.maintenanceItem.findMany({
    where: {
      OR: [
        { department: { in: ["BOS", "BOM"] } },
        { department: null },
      ],
    },
    select: { id: true, name: true, location: true, quantity: true, unit: true, pricePerUnit: true },
    orderBy: { name: "asc" },
  })

  return {
    ticket,
    staffList,
    catalogItems,
  }
}

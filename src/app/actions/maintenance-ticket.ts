"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { 
  sendEmailNotification, 
  generateMaintenanceTicketCreatedEmail, 
  generateMaintenanceTicketStatusUpdateEmail 
} from "@/lib/email"
import { uploadMaintenancePhotoToR2 } from "@/lib/maintenance-r2"
import { MaintenanceTicketPriority, MaintenanceTicketStatus, MaintenanceTicketType } from "@prisma/client"

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
  const requesterEmail = (formData.get("requesterEmail") as string)?.trim() || session.user.email || null

  if (!title || !location) {
    return { success: false, error: "Work description and location are required." }
  }

  // Handle Photo Upload if present
  let photoUrl: string | null = null
  const photoFile = formData.get("photo") as File | null
  if (photoFile && photoFile.size > 0 && photoFile.size <= 10 * 1024 * 1024) {
    try {
      const buffer = Buffer.from(await photoFile.arrayBuffer())
      const { url } = await uploadMaintenancePhotoToR2(
        buffer,
        photoFile.name,
        photoFile.type || "image/jpeg"
      )
      photoUrl = url
    } catch (e: any) {
      console.error("Failed to upload photo to R2:", e)
      // Continue without photo rather than hard failing
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
        createdById: session.user.id,
        photoUrl,
        status: MaintenanceTicketStatus.OPEN,
      },
    })

    const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

    // Send email notification
    if (requesterEmail) {
      const emailHtml = generateMaintenanceTicketCreatedEmail(
        requesterName,
        formattedLog,
        title,
        location,
        ticketType,
        priority
      )
      sendEmailNotification({
        from: "BubblesO2 Maintenance <maintenance-noreply@bubbleso2.com>",
        to: requesterEmail,
        subject: `[Work Request Received] ${formattedLog}: ${title}`,
        html: emailHtml,
      })
    }

    revalidatePath("/forms/maintenance/tickets")
    revalidatePath("/forms/maintenance/dashboard")
    return { success: true, ticketId: ticket.id, ticketNumber: ticket.ticketNumber, logNumber: formattedLog }
  } catch (err: any) {
    console.error("createMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to submit work request." }
  }
}

export async function publicCreateMaintenanceTicket(formData: FormData) {
  const title = (formData.get("title") as string)?.trim()
  const reasonOfWork = (formData.get("reasonOfWork") as string)?.trim() || null
  const ticketType = ((formData.get("ticketType") as string) || "MECHANICAL") as MaintenanceTicketType
  const priority = ((formData.get("priority") as string) || "MEDIUM") as MaintenanceTicketPriority
  const location = (formData.get("location") as string)?.trim()
  const specificArea = (formData.get("specificArea") as string)?.trim() || null
  const requesterName = (formData.get("requesterName") as string)?.trim()
  const requesterPhone = (formData.get("requesterPhone") as string)?.trim()
  const requesterEmail = (formData.get("requesterEmail") as string)?.trim() || null

  if (!title || !location || !requesterName || !requesterPhone) {
    return { success: false, error: "Please fill in all required fields (Name, Phone, Location, and Work Description)." }
  }

  // Handle Photo Upload if present
  let photoUrl: string | null = null
  const photoFile = formData.get("photo") as File | null
  if (photoFile && photoFile.size > 0 && photoFile.size <= 10 * 1024 * 1024) {
    try {
      const buffer = Buffer.from(await photoFile.arrayBuffer())
      const { url } = await uploadMaintenancePhotoToR2(
        buffer,
        photoFile.name,
        photoFile.type || "image/jpeg"
      )
      photoUrl = url
    } catch (e: any) {
      console.error("Failed to upload photo to R2:", e)
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
        createdById: null, // anonymous guest/public submission
        photoUrl,
        status: MaintenanceTicketStatus.OPEN,
      },
    })

    const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

    // Send email notification to requester if provided
    if (requesterEmail) {
      const emailHtml = generateMaintenanceTicketCreatedEmail(
        requesterName,
        formattedLog,
        title,
        location,
        ticketType,
        priority
      )
      sendEmailNotification({
        from: "BubblesO2 Maintenance <maintenance-noreply@bubbleso2.com>",
        to: requesterEmail,
        subject: `[Work Request Received] ${formattedLog}: ${title}`,
        html: emailHtml,
      })
    }

    revalidatePath("/forms/maintenance/tickets")
    return { 
      success: true, 
      ticketId: ticket.id, 
      ticketNumber: ticket.ticketNumber, 
      logNumber: formattedLog 
    }
  } catch (err: any) {
    console.error("publicCreateMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to submit work request." }
  }
}

export async function updateMaintenanceTicket(id: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized: MAINTENANCE_TICKETS_MANAGE module permission required." }
  }

  const status = formData.get("status") as MaintenanceTicketStatus | null
  const priority = formData.get("priority") as MaintenanceTicketPriority | null
  const ticketType = formData.get("ticketType") as MaintenanceTicketType | null
  const assigneeId = formData.get("assigneeId") as string | null
  const assigneeName = formData.get("assigneeName") as string | null
  
  const targetStartDateStr = formData.get("targetStartDate") as string | null
  const targetDatelineStr = formData.get("targetDateline") as string | null
  const completedAtStr = formData.get("completedAt") as string | null
  
  const rootCause = formData.get("rootCause") as string | null
  const resolution = formData.get("resolution") as string | null
  const internalNotes = formData.get("internalNotes") as string | null
  const verifiedBy = formData.get("verifiedBy") as string | null
  const handover = formData.get("handover") as string | null
  const costsDataStr = formData.get("costsData") as string | null

  try {
    const data: any = {}
    if (status) data.status = status
    if (priority) data.priority = priority
    if (ticketType) data.ticketType = ticketType

    if (assigneeId !== undefined) {
      data.assigneeId = assigneeId && assigneeId !== "" ? assigneeId : null
    }
    if (assigneeName !== undefined) {
      data.assigneeName = assigneeName?.trim() || null
    }

    let targetStart: Date | null = null
    let targetEnd: Date | null = null

    if (targetStartDateStr) {
      targetStart = new Date(targetStartDateStr)
      data.targetStartDate = targetStart
    } else if (targetStartDateStr === "") {
      data.targetStartDate = null
    }

    if (targetDatelineStr) {
      targetEnd = new Date(targetDatelineStr)
      data.targetDateline = targetEnd
    } else if (targetDatelineStr === "") {
      data.targetDateline = null
    }

    // Auto-calculate estimated days if both target dates present
    if (targetStart && targetEnd) {
      const diffMs = targetEnd.getTime() - targetStart.getTime()
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
      data.estimatedDays = days
    }

    let compDate: Date | null = null
    if (completedAtStr) {
      compDate = new Date(completedAtStr)
      data.completedAt = compDate
    } else if (status === MaintenanceTicketStatus.COMPLETED) {
      compDate = new Date()
      data.completedAt = compDate
    } else if (completedAtStr === "") {
      data.completedAt = null
    }

    // Calculate KPI Status
    if (compDate && targetEnd) {
      const diffDays = Math.round((compDate.getTime() - targetEnd.getTime()) / (1000 * 60 * 60 * 24))
      data.kpiDays = diffDays
      data.kpiStatus = diffDays > 0 ? "Delay" : "On Time"
    } else if (status === MaintenanceTicketStatus.IN_PROGRESS) {
      data.kpiStatus = "In progress"
    } else if (status === MaintenanceTicketStatus.COMPLETED && !data.kpiStatus) {
      data.kpiStatus = "On Time"
    }

    if (rootCause !== null) data.rootCause = rootCause?.trim() || null
    if (resolution !== null) data.resolution = resolution?.trim() || null
    if (internalNotes !== null) data.internalNotes = internalNotes?.trim() || null
    if (verifiedBy !== null) data.verifiedBy = verifiedBy?.trim() || null
    if (handover !== null) data.handover = handover?.trim() || null

    const updatedTicket = await prisma.maintenanceTicket.update({
      where: { id },
      data,
      include: { createdBy: true, assignee: true },
    })

    // Handle Costs
    if (costsDataStr) {
      const costsData = JSON.parse(costsDataStr)
      await prisma.maintenanceTicketCost.deleteMany({ where: { ticketId: id } })
      if (Array.isArray(costsData) && costsData.length > 0) {
        await prisma.maintenanceTicketCost.createMany({
          data: costsData.map((c: any) => ({
            ticketId: id,
            itemName: c.itemName,
            amount: parseFloat(c.amount) || 0,
          })),
        })
      }
    }

    // Send email notification on status change or completion
    const recipientEmail = updatedTicket.requesterEmail || updatedTicket.createdBy?.email
    if ((status || resolution) && recipientEmail) {
      const formattedLog = `BO2-MT-${updatedTicket.ticketNumber.toString().padStart(4, "0")}`
      const emailHtml = generateMaintenanceTicketStatusUpdateEmail(
        updatedTicket.requesterName,
        formattedLog,
        updatedTicket.title,
        updatedTicket.status,
        resolution
      )
      sendEmailNotification({
        from: "BubblesO2 Maintenance <maintenance-noreply@bubbleso2.com>",
        to: recipientEmail,
        subject: `[Status Update] ${formattedLog}: ${updatedTicket.title}`,
        html: emailHtml,
      })
    }

    revalidatePath(`/forms/maintenance/tickets/${id}`)
    revalidatePath("/forms/maintenance/tickets")
    revalidatePath("/forms/maintenance/dashboard")
    return { success: true }
  } catch (err: any) {
    console.error("updateMaintenanceTicket error:", err)
    return { success: false, error: err.message || "Failed to update ticket." }
  }
}

export async function getMaintenanceWorkspaceData(ticketId: string) {
  const session = await auth()
  if (!session) return null

  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: true,
      assignee: true,
      costs: true,
    },
  })

  if (!ticket) return null

  // Fetch list of technicians / potential assignees (Maintenance staff or all active users)
  const staffList = await prisma.user.findMany({
    select: { id: true, name: true, email: true, unit: { select: { name: true } } },
    orderBy: { name: "asc" },
  })

  // Fetch spare parts / inventory catalog items for cost linking
  const catalogItems = await prisma.maintenanceItem.findMany({
    select: { id: true, name: true, location: true, quantity: true, unit: true },
    orderBy: { name: "asc" },
  })

  return {
    ticket,
    staffList,
    catalogItems,
  }
}

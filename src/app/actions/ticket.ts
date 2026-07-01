"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { sendEmailNotification, generateTicketCreatedEmail, generateTicketStatusUpdateEmail } from "@/lib/email"

function calculateSLA(priority: string) {
  const now = new Date()
  if (priority === "Urgent") return new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
  if (priority === "High") return new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4 hours
  if (priority === "Medium") return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
  return new Date(now.getTime() + 48 * 60 * 60 * 1000) // Low = 48 hours
}

export async function createTicket(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const requesterName = formData.get("requesterName") as string
  const phone = formData.get("phone") as string
  const assetType = formData.get("assetType") as string
  const assetNumber = formData.get("assetNumber") as string
  const unitId = formData.get("unitId") as string
  const location = formData.get("location") as string
  const priority = (formData.get("priority") as string) || "Low"

  if (!title || !description || !requesterName) {
    return { success: false, error: "Please fill in all required fields." }
  }

  try {
    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority, // Dynamic priority
        slaDeadline: calculateSLA(priority),
        requesterName,
        phone,
        assetType,
        assetNumber,
        unitId,
        location,
        createdById: session.user.id
      }
    })
    
    // Send Email Notification
    if (session.user.email) {
      const formattedLog = `BO2-IT-${ticket.ticketNumber.toString().padStart(4, '0')}`
      const emailHtml = generateTicketCreatedEmail(requesterName, formattedLog, title)
      // We don't await this so it doesn't block UI response
      sendEmailNotification({
        to: session.user.email,
        subject: `Ticket Received: ${formattedLog}`,
        html: emailHtml
      })
    }

    revalidatePath("/tickets")
    revalidatePath("/dashboard")
    return { success: true, ticketId: ticket.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateTicket(id: string, formData: FormData) {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") return { success: false, error: "Unauthorized" }

  const status = formData.get("status") as any
  const priority = formData.get("priority") as string
  const rootCause = formData.get("rootCause") as string
  const resolution = formData.get("resolution") as string
  const internalNotes = formData.get("internalNotes") as string
  const assigneeId = formData.get("assigneeId") as string
  const type = formData.get("type") as string
  const typeOthers = formData.get("typeOthers") as string
  const costsDataStr = formData.get("costsData") as string

  try {
    const data: any = {}
    if (status) data.status = status
    if (priority) {
      data.priority = priority
      data.slaDeadline = calculateSLA(priority)
      data.slaBreached = false // Reset breach status if priority updated
    }
    if (rootCause !== null) data.rootCause = rootCause
    if (resolution !== null) data.resolution = resolution
    if (internalNotes !== null) data.internalNotes = internalNotes
    if (assigneeId !== null) data.assigneeId = assigneeId || null
    if (type !== null) data.type = type || null
    if (typeOthers !== null) data.typeOthers = typeOthers || null

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data,
      include: { createdBy: true }
    })
    
    if (costsDataStr) {
      const costsData = JSON.parse(costsDataStr)
      // Replace all costs
      await prisma.ticketCost.deleteMany({ where: { ticketId: id } })
      if (costsData.length > 0) {
        await prisma.ticketCost.createMany({
          data: costsData.map((c: any) => ({
            ticketId: id,
            itemName: c.itemName,
            amount: parseFloat(c.amount)
          }))
        })
      }
    }
    
    // Send Email Notification if status or resolution changed
    if ((status || resolution) && updatedTicket.createdBy?.email) {
      const formattedLog = `BO2-IT-${updatedTicket.ticketNumber.toString().padStart(4, '0')}`
      const emailHtml = generateTicketStatusUpdateEmail(
        updatedTicket.requesterName || updatedTicket.createdBy.name,
        formattedLog,
        updatedTicket.status,
        resolution
      )
      sendEmailNotification({
        to: updatedTicket.createdBy.email,
        subject: `Ticket Update: ${formattedLog}`,
        html: emailHtml
      })
    }

    revalidatePath(`/tickets/${id}`)
    revalidatePath("/tickets")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getTicketModalData() {
  const session = await auth()
  if (!session) return null
  
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { unit: true } })
  const branches = await prisma.branch.findMany({ include: { units: true }, orderBy: { name: 'asc' } })
  
  return { user, branches }
}

export async function getAssetByTag(tag: string) {
  if (!tag) return null
  
  const asset = await prisma.asset.findFirst({
    where: {
      OR: [
        { barcode: tag },
        { serialNumber: tag }
      ],
      status: "ACTIVE"
    },
    select: {
      id: true,
      category: true,
      brand: true,
      model: true,
      barcode: true,
      serialNumber: true
    }
  })
  
  return asset
}

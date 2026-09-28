"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { MaintenanceTicketType } from "@prisma/client"

export async function getMaintenanceNotificationRecipients() {
  const session = await auth()
  if (!session) return []

  let recipients = await prisma.maintenanceNotificationRecipient.findMany({
    orderBy: { createdAt: "asc" },
  })

  // Auto-seed initial default recipients if empty
  if (recipients.length === 0) {
    try {
      await prisma.maintenanceNotificationRecipient.createMany({
        data: [
          {
            name: "Akmal (Maintenance Lead)",
            email: "akmal@bubbleso2.com",
            ticketType: null,
            isEnabled: true,
          },
          {
            name: "Iskandar",
            email: "iskandar23113@gmail.com",
            ticketType: null,
            isEnabled: true,
          },
        ],
      })
      recipients = await prisma.maintenanceNotificationRecipient.findMany({
        orderBy: { createdAt: "asc" },
      })
    } catch (e) {
      console.error("Auto-seed maintenance recipients error:", e)
    }
  }

  return recipients
}

export async function getActiveMaintenanceNotificationEmails(
  ticketType: MaintenanceTicketType
): Promise<string[]> {
  try {
    let recipients = await prisma.maintenanceNotificationRecipient.findMany({
      where: {
        isEnabled: true,
        OR: [
          { ticketType: null },
          { ticketType: ticketType },
        ],
      },
    })

    // If table is still empty, fallback to default seed
    if (recipients.length === 0) {
      const all = await prisma.maintenanceNotificationRecipient.count()
      if (all === 0) {
        return ["akmal@bubbleso2.com", "iskandar23113@gmail.com"]
      }
    }

    return Array.from(new Set(recipients.map((r) => r.email.trim().toLowerCase())))
  } catch (err) {
    console.error("getActiveMaintenanceNotificationEmails error:", err)
    return ["akmal@bubbleso2.com", "iskandar23113@gmail.com"]
  }
}

export async function createMaintenanceNotificationRecipient(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const ticketTypeRaw = (formData.get("ticketType") as string)?.trim()
  const isEnabled = formData.get("isEnabled") === "true" || formData.get("isEnabled") === "on"

  if (!name || !email) {
    return { success: false, error: "Name and Email are required." }
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format." }
  }

  const ticketType = ticketTypeRaw && ticketTypeRaw !== "ALL"
    ? (ticketTypeRaw as MaintenanceTicketType)
    : null

  try {
    const recipient = await prisma.maintenanceNotificationRecipient.create({
      data: {
        name,
        email,
        ticketType,
        isEnabled,
      },
    })

    revalidatePath("/forms/maintenance/tickets/notifications")
    return { success: true, recipient }
  } catch (err: any) {
    console.error("createMaintenanceNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to create recipient." }
  }
}

export async function updateMaintenanceNotificationRecipient(id: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const ticketTypeRaw = (formData.get("ticketType") as string)?.trim()
  const isEnabled = formData.get("isEnabled") === "true" || formData.get("isEnabled") === "on"

  if (!name || !email) {
    return { success: false, error: "Name and Email are required." }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: "Invalid email format." }
  }

  const ticketType = ticketTypeRaw && ticketTypeRaw !== "ALL"
    ? (ticketTypeRaw as MaintenanceTicketType)
    : null

  try {
    const recipient = await prisma.maintenanceNotificationRecipient.update({
      where: { id },
      data: {
        name,
        email,
        ticketType,
        isEnabled,
      },
    })

    revalidatePath("/forms/maintenance/tickets/notifications")
    return { success: true, recipient }
  } catch (err: any) {
    console.error("updateMaintenanceNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to update recipient." }
  }
}

export async function toggleMaintenanceNotificationRecipient(id: string, isEnabled: boolean) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  try {
    const recipient = await prisma.maintenanceNotificationRecipient.update({
      where: { id },
      data: { isEnabled },
    })

    revalidatePath("/forms/maintenance/tickets/notifications")
    return { success: true, recipient }
  } catch (err: any) {
    console.error("toggleMaintenanceNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to toggle status." }
  }
}

export async function deleteMaintenanceNotificationRecipient(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    return { success: false, error: "Unauthorized. Insufficient permissions." }
  }

  try {
    await prisma.maintenanceNotificationRecipient.delete({
      where: { id },
    })

    revalidatePath("/forms/maintenance/tickets/notifications")
    return { success: true }
  } catch (err: any) {
    console.error("deleteMaintenanceNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to delete recipient." }
  }
}

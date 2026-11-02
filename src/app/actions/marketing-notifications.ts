"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getAccessInfo, canAccessMarketing } from "@/lib/access"
import { 
  queueMarketingEmailNotification, 
  retryMarketingOutboxNotification,
  generateMarketingTestEmail 
} from "@/lib/marketing/marketing-outbox"
import { sendEmailNotification } from "@/lib/email"

export type MarketingCategoryType = "ALL" | "ASSET" | "MERCHANDISE" | "EVENT"

/**
 * Fetch all configured marketing notification recipients.
 */
export async function getMarketingNotificationRecipients() {
  const session = await auth()
  if (!session) return []

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) return []

  const recipients = await prisma.marketingNotificationRecipient.findMany({
    orderBy: { createdAt: "asc" },
  })

  return recipients
}

/**
 * Resolves active notification recipients for a given marketing category.
 */
export async function getActiveMarketingNotificationEmails(
  category: "ASSET" | "MERCHANDISE" | "EVENT"
): Promise<string[]> {
  try {
    const recipients = await prisma.marketingNotificationRecipient.findMany({
      where: {
        isEnabled: true,
        OR: [
          { category: null },
          { category: "ALL" },
          { category: category },
        ],
      },
    })

    if (recipients.length === 0) {
      return []
    }

    return Array.from(new Set(recipients.map((r) => r.email.trim().toLowerCase())))
  } catch (err) {
    console.error("getActiveMarketingNotificationEmails error:", err)
    return []
  }
}

/**
 * Create a new marketing notification recipient.
 */
export async function createMarketingNotificationRecipient(formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized access." }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) {
    return { success: false, error: "Insufficient permissions. Only Marketing staff can manage notifications." }
  }

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const categoryRaw = (formData.get("category") as string)?.trim() || "ALL"
  const isEnabled = formData.get("isEnabled") === "true" || formData.get("isEnabled") === "on"

  if (!name || !email) {
    return { success: false, error: "Name and Email are required fields." }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  const validCategories = ["ALL", "ASSET", "MERCHANDISE", "EVENT"]
  const category = validCategories.includes(categoryRaw) ? categoryRaw : "ALL"

  try {
    const recipient = await prisma.marketingNotificationRecipient.create({
      data: {
        name,
        email,
        category,
        isEnabled,
      },
    })

    revalidatePath("/marketing/notifications")
    return { success: true, recipient }
  } catch (err: any) {
    console.error("createMarketingNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to create recipient." }
  }
}

/**
 * Update an existing marketing notification recipient.
 */
export async function updateMarketingNotificationRecipient(id: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized access." }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) {
    return { success: false, error: "Insufficient permissions. Only Marketing staff can manage notifications." }
  }

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const categoryRaw = (formData.get("category") as string)?.trim() || "ALL"
  const isEnabled = formData.get("isEnabled") === "true" || formData.get("isEnabled") === "on"

  if (!name || !email) {
    return { success: false, error: "Name and Email are required fields." }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  const validCategories = ["ALL", "ASSET", "MERCHANDISE", "EVENT"]
  const category = validCategories.includes(categoryRaw) ? categoryRaw : "ALL"

  try {
    const recipient = await prisma.marketingNotificationRecipient.update({
      where: { id },
      data: {
        name,
        email,
        category,
        isEnabled,
      },
    })

    revalidatePath("/marketing/notifications")
    return { success: true, recipient }
  } catch (err: any) {
    console.error("updateMarketingNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to update recipient." }
  }
}

/**
 * Toggle recipient enable/disable status.
 */
export async function toggleMarketingNotificationRecipient(id: string, isEnabled: boolean) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized access." }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) {
    return { success: false, error: "Insufficient permissions. Only Marketing staff can manage notifications." }
  }

  try {
    const recipient = await prisma.marketingNotificationRecipient.update({
      where: { id },
      data: { isEnabled },
    })

    revalidatePath("/marketing/notifications")
    return { success: true, recipient }
  } catch (err: any) {
    console.error("toggleMarketingNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to toggle recipient status." }
  }
}

/**
 * Delete a marketing notification recipient.
 */
export async function deleteMarketingNotificationRecipient(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized access." }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) {
    return { success: false, error: "Insufficient permissions. Only Marketing staff can manage notifications." }
  }

  try {
    await prisma.marketingNotificationRecipient.delete({
      where: { id },
    })

    revalidatePath("/marketing/notifications")
    return { success: true }
  } catch (err: any) {
    console.error("deleteMarketingNotificationRecipient error:", err)
    return { success: false, error: err.message || "Failed to delete recipient." }
  }
}

/**
 * Fetch paginated outbox notification logs.
 */
export async function getMarketingOutboxPaginated(page: number = 1, pageSize: number = 10) {
  const session = await auth()
  if (!session) return { items: [], totalCount: 0, totalPages: 1, currentPage: 1 }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) return { items: [], totalCount: 0, totalPages: 1, currentPage: 1 }

  try {
    const skip = Math.max(0, (page - 1) * pageSize)
    const [items, totalCount] = await Promise.all([
      prisma.marketingNotificationOutbox.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketingNotificationOutbox.count(),
    ])

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    return {
      items,
      totalCount,
      totalPages,
      currentPage: page,
    }
  } catch (err: any) {
    console.error("getMarketingOutboxPaginated error:", err)
    return { items: [], totalCount: 0, totalPages: 1, currentPage: 1 }
  }
}

/**
 * Retry delivery of a failed email notification from the outbox.
 */
export async function retryMarketingOutboxEmailAction(outboxId: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized access." }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) {
    return { success: false, error: "Insufficient permissions. Only Marketing staff can manage notifications." }
  }

  const result = await retryMarketingOutboxNotification(outboxId)
  if (result.success) {
    revalidatePath("/marketing/notifications")
  }
  return result
}

/**
 * Send a verification test email via Resend directly from the setup tab.
 */
export async function sendMarketingTestEmailAction(email: string, name?: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized access." }

  const access = await getAccessInfo()
  if (!canAccessMarketing(access)) {
    return { success: false, error: "Insufficient permissions. Only Marketing staff can manage notifications." }
  }

  const targetEmail = email?.trim().toLowerCase()
  if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
    return { success: false, error: "Please provide a valid destination email address." }
  }

  const recipientName = name?.trim() || "Marketing PIC"
  const html = generateMarketingTestEmail(recipientName, targetEmail)
  const subject = `[Test Verification] BubblesO2 Marketing Email Notifications`

  try {
    const res = await sendEmailNotification({
      to: targetEmail,
      subject,
      html,
    })

    if (!res.success) {
      return { success: false, error: res.error ? JSON.stringify(res.error) : "Resend delivery failed. Check API key." }
    }

    // Also record in outbox for audit tracking
    await prisma.marketingNotificationOutbox.create({
      data: {
        category: "ALL",
        to: targetEmail,
        subject,
        html,
        status: "SENT",
        sentAt: new Date(),
        attempts: 1,
      },
    })

    revalidatePath("/marketing/notifications")
    return { success: true, message: `Test email sent successfully to ${targetEmail} via Resend.` }
  } catch (err: any) {
    console.error("sendMarketingTestEmailAction error:", err)
    return { success: false, error: err.message || "Failed to dispatch test email." }
  }
}

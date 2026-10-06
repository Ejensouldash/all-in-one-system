"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { uploadMaintenancePhotoToR2 } from "@/lib/maintenance-r2"
import { queueMaintenanceEmailNotification } from "@/lib/maintenance-outbox"
import { 
  generatePrDeliveryUpdateEmailEn, 
  generatePrDamageReportEmailEn,
  generatePrApprovalNeededEmailEn 
} from "@/lib/email-pr-templates"
import { getActiveMaintenanceNotificationEmails } from "./maintenance-notifications"

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "")
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return "https://bubbleso2-aio.vercel.app"
}

/**
 * Generate sequential PR document number in PR-YYYY-XXXX format.
 */
export async function generateNextPrNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `PR-${currentYear}-`

  const latestPr = await prisma.maintenancePurchaseRequest.findFirst({
    where: {
      prNumber: { startsWith: prefix }
    },
    orderBy: { prNumber: "desc" },
    select: { prNumber: true }
  })

  let nextSequence = 1
  if (latestPr?.prNumber) {
    const parts = latestPr.prNumber.split("-")
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1
    }
  }

  return `${prefix}${nextSequence.toString().padStart(4, "0")}`
}

export type CreatePrLineItemInput = {
  itemId?: string | null
  itemRequested: string
  brand?: string | null
  stockBalance: number
  quantityRequest: number
  projectMachine: string
}

export type CreatePrInput = {
  company?: string
  department: string
  dateRequired: string
  ticketId?: string | null
  requesterName: string
  requesterDepartment?: string
  requesterSignature?: string | null
  items: CreatePrLineItemInput[]
}

/**
 * Create a new Purchase Requisition (PR).
 * Auto-capitalizes all operational text fields while preserving user name casing.
 */
export async function createMaintenancePurchaseRequest(input: CreatePrInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: "Authentication required to submit Purchase Requisitions." }
  }

  if (!input.items || input.items.length === 0) {
    return { success: false, error: "At least one item is required in the Purchase Requisition." }
  }

  const requesterName = input.requesterName.trim()
  if (!requesterName) {
    return { success: false, error: "Requester name is required." }
  }

  const prNumber = await generateNextPrNumber()
  const dateReq = new Date(input.dateRequired)

  // Standardize text fields to UPPERCASE
  const company = (input.company || "BUBBLES O2 SDN BHD").trim().toUpperCase()
  const department = (input.department || "MAINTENANCE / ENGINEERING").trim().toUpperCase()
  const requesterDepartment = (input.requesterDepartment || "MAINTENANCE").trim().toUpperCase()

  try {
    const pr = await prisma.$transaction(async (tx) => {
      const createdPr = await tx.maintenancePurchaseRequest.create({
        data: {
          prNumber,
          company,
          department,
          dateRequired: dateReq,
          status: "PENDING_APPROVAL",
          ticketId: input.ticketId || null,
          requesterName,
          requesterDepartment,
          requesterSignature: input.requesterSignature || null,
          requesterSignedAt: new Date(),
          items: {
            create: input.items.map((item) => ({
              itemId: item.itemId || null,
              itemRequested: item.itemRequested.trim().toUpperCase(),
              brand: item.brand ? item.brand.trim().toUpperCase() : null,
              stockBalance: Math.max(0, item.stockBalance || 0),
              quantityRequest: Math.max(1, item.quantityRequest || 1),
              projectMachine: (item.projectMachine || "-").trim().toUpperCase(),
            })),
          },
          activityLogs: {
            create: {
              action: "CREATED",
              actorName: requesterName,
              details: `Purchase Requisition ${prNumber} created with ${input.items.length} line item(s).`,
            },
          },
        },
        include: {
          items: true,
        },
      })

      return createdPr
    })

    // Email notification to Approvers / PICs
    try {
      const baseUrl = getBaseUrl()
      const prUrl = `${baseUrl}/forms/maintenance/purchase-requests?pr=${pr.prNumber}`
      const activeEmails = await getActiveMaintenanceNotificationEmails("MECHANICAL")
      
      for (const email of activeEmails) {
        const html = generatePrApprovalNeededEmailEn({
          prNumber: pr.prNumber,
          requesterName: pr.requesterName,
          department: pr.department,
          itemCount: pr.items.length,
          prUrl,
        })
        await queueMaintenanceEmailNotification({
          to: email,
          subject: `[PR Approval Needed] ${pr.prNumber} (${pr.items.length} items)`,
          html,
        })
      }
    } catch (emailErr) {
      console.warn("Failed to queue PR approval notification email:", emailErr)
    }

    revalidatePath("/forms/maintenance/purchase-requests")
    if (input.ticketId) {
      revalidatePath(`/forms/maintenance/tickets/${input.ticketId}`)
    }

    return { success: true, data: pr }
  } catch (error: any) {
    console.error("createMaintenancePurchaseRequest error:", error)
    return { success: false, error: error.message || "Failed to create Purchase Requisition." }
  }
}

/**
 * Approve a Purchase Requisition (Requires MAINTENANCE_PR_APPROVE or SuperAdmin).
 */
export async function approveMaintenancePurchaseRequest(
  id: string,
  data: { remarks?: string; signature?: string }
) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_PR_APPROVE"]))) {
    return { success: false, error: "Unauthorized. Purchase Requisition Approval permission required." }
  }

  const approverName = session.user.name || access.name || "Authorized Approver"
  const approverDept = (access.unitName || "MANAGEMENT").toUpperCase()

  try {
    const updated = await prisma.maintenancePurchaseRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedByName: approverName,
        approverDepartment: approverDept,
        approverSignature: data.signature || access.signatureUrl || null,
        approvedAt: new Date(),
        approvalRemarks: data.remarks?.trim().toUpperCase() || null,
        activityLogs: {
          create: {
            action: "APPROVED",
            actorName: approverName,
            details: `Purchase Requisition approved by ${approverName}.${data.remarks ? ` Remarks: ${data.remarks}` : ""}`,
          },
        },
      },
    })

    revalidatePath("/forms/maintenance/purchase-requests")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("approveMaintenancePurchaseRequest error:", error)
    return { success: false, error: error.message || "Failed to approve PR." }
  }
}

/**
 * Reject a Purchase Requisition (Requires MAINTENANCE_PR_APPROVE or SuperAdmin).
 */
export async function rejectMaintenancePurchaseRequest(id: string, reason: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_PR_APPROVE"]))) {
    return { success: false, error: "Unauthorized. Purchase Requisition Approval permission required." }
  }

  if (!reason.trim()) {
    return { success: false, error: "A reason is mandatory when rejecting a Purchase Requisition." }
  }

  const approverName = session.user.name || access.name || "Authorized Approver"

  try {
    const updated = await prisma.maintenancePurchaseRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedByName: approverName,
        approvedAt: new Date(),
        approvalRemarks: reason.trim().toUpperCase(),
        activityLogs: {
          create: {
            action: "REJECTED",
            actorName: approverName,
            details: `Purchase Requisition rejected by ${approverName}. Reason: ${reason.trim()}`,
          },
        },
      },
    })

    revalidatePath("/forms/maintenance/purchase-requests")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("rejectMaintenancePurchaseRequest error:", error)
    return { success: false, error: error.message || "Failed to reject PR." }
  }
}

/**
 * Update Estimated Delivery Date & Remark (Requirement 1 & 2).
 * Triggers automated email notification to Requester and Engineering PIC.
 */
export async function updatePrEstimatedDelivery(
  id: string,
  data: {
    estimatedDeliveryDate: string
    deliveryRemarks?: string
  }
) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  if (!data.estimatedDeliveryDate) {
    return { success: false, error: "Estimated delivery date is required." }
  }

  const actorName = session.user.name || "Purchasing Coordinator"
  const estDate = new Date(data.estimatedDeliveryDate)
  const remarksUpper = data.deliveryRemarks?.trim().toUpperCase() || null

  try {
    const pr = await prisma.maintenancePurchaseRequest.findUnique({
      where: { id },
      include: { ticket: true },
    })

    if (!pr) return { success: false, error: "Purchase Requisition not found." }

    const nextStatus = pr.status === "APPROVED" ? "ORDERED" : pr.status

    const updated = await prisma.maintenancePurchaseRequest.update({
      where: { id },
      data: {
        status: nextStatus,
        estimatedDeliveryDate: estDate,
        deliveryRemarks: remarksUpper,
        deliveryUpdatedByName: actorName,
        deliveryUpdatedAt: new Date(),
        activityLogs: {
          create: {
            action: "ETA_UPDATED",
            actorName,
            details: `Estimated delivery updated to ${estDate.toLocaleDateString("en-GB")}.${remarksUpper ? ` Remarks: ${remarksUpper}` : ""}`,
          },
        },
      },
    })

    // Automated Email Dispatch (Requirement 2)
    const baseUrl = getBaseUrl()
    const prUrl = `${baseUrl}/forms/maintenance/purchase-requests?pr=${pr.prNumber}`
    const dateFormatted = estDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })

    const emailHtml = generatePrDeliveryUpdateEmailEn({
      prNumber: pr.prNumber,
      requesterName: pr.requesterName,
      estDate: dateFormatted,
      remarks: remarksUpper,
      prUrl,
    })

    // 1. Notify Requester if ticket or email available
    const recipientEmails = new Set<string>()
    if (pr.ticket?.requesterEmail) {
      recipientEmails.add(pr.ticket.requesterEmail.trim().toLowerCase())
    }

    // 2. Notify Category PICs / Maintenance leads
    const activeEmails = await getActiveMaintenanceNotificationEmails("MECHANICAL")
    activeEmails.forEach((e) => recipientEmails.add(e.trim().toLowerCase()))

    for (const toEmail of Array.from(recipientEmails)) {
      await queueMaintenanceEmailNotification({
        ticketId: pr.ticketId || undefined,
        to: toEmail,
        subject: `[ETA Update] ${pr.prNumber}: Estimated Delivery ${dateFormatted}`,
        html: emailHtml,
      })
    }

    revalidatePath("/forms/maintenance/purchase-requests")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("updatePrEstimatedDelivery error:", error)
    return { success: false, error: error.message || "Failed to update delivery estimate." }
  }
}

/**
 * Receive PR Items OR Report Damaged/Wrong Item (Requirement 8 & 9).
 * - If goods in good condition: Uploads photo proof, updates status to RECEIVED,
 *   auto-increments FMS Inventory quantity, and writes MaintenanceStockLog (IN).
 * - If damaged/wrong item: Uploads proof photo, updates status to DAMAGED_OR_WRONG_ITEM,
 *   logs damage description, does NOT increment stock, and alerts PIC via email.
 */
export async function receiveMaintenancePurchaseRequest(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const id = formData.get("id") as string
  const receiverName = ((formData.get("receiverName") as string) || session.user.name || "Receiver").trim()
  const receiverDepartment = ((formData.get("receiverDepartment") as string) || "MAINTENANCE").trim().toUpperCase()
  const receiverSignature = formData.get("receiverSignature") as string | null
  const isDamaged = formData.get("isDamaged") === "true"
  const damageReason = (formData.get("damageReason") as string)?.trim().toUpperCase() || null
  const photoFile = formData.get("photo") as File | null

  if (!id) return { success: false, error: "PR ID is required." }
  if (isDamaged && !damageReason) {
    return { success: false, error: "Please provide discrepancy/damage details." }
  }

  // Mandatory photo proof
  if (!photoFile || photoFile.size === 0) {
    return { success: false, error: "A receipt/evidence photo is mandatory." }
  }

  try {
    const pr = await prisma.maintenancePurchaseRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: { item: true },
        },
      },
    })

    if (!pr) return { success: false, error: "Purchase Requisition not found." }

    // Upload photo to R2
    const photoBuffer = Buffer.from(await photoFile.arrayBuffer())
    const uploadRes = await uploadMaintenancePhotoToR2(
      photoBuffer,
      photoFile.name,
      photoFile.type || "image/jpeg"
    )

    const now = new Date()

    if (isDamaged) {
      // Branch A: Damaged or Wrong Item Reported
      const updated = await prisma.maintenancePurchaseRequest.update({
        where: { id },
        data: {
          status: "DAMAGED_OR_WRONG_ITEM",
          damageReportReason: damageReason,
          damageReportPhotoUrl: uploadRes.url,
          damageReportedByName: receiverName,
          damageReportedAt: now,
          activityLogs: {
            create: {
              action: "DAMAGE_REPORTED",
              actorName: receiverName,
              details: `Discrepancy / damage reported by ${receiverName}. Reason: ${damageReason}`,
            },
          },
        },
      })

      // Send alert email to PIC
      try {
        const baseUrl = getBaseUrl()
        const prUrl = `${baseUrl}/forms/maintenance/purchase-requests?pr=${pr.prNumber}`
        const alertHtml = generatePrDamageReportEmailEn({
          prNumber: pr.prNumber,
          reporterName: receiverName,
          damageReason: damageReason || "Goods damaged or specification incorrect.",
          photoUrl: uploadRes.url,
          prUrl,
        })

        const activeEmails = await getActiveMaintenanceNotificationEmails("MECHANICAL")
        for (const email of activeEmails) {
          await queueMaintenanceEmailNotification({
            ticketId: pr.ticketId || undefined,
            to: email,
            subject: `[URGENT] Damaged / Wrong Items Reported for ${pr.prNumber}`,
            html: alertHtml,
          })
        }
      } catch (emailErr) {
        console.warn("Failed to dispatch damage alert email:", emailErr)
      }

      revalidatePath("/forms/maintenance/purchase-requests")
      return { success: true, data: updated, isDamaged: true }
    } else {
      // Branch B: Goods Received in Good Condition -> Auto-increment inventory!
      const updated = await prisma.$transaction(async (tx) => {
        const prUpdated = await tx.maintenancePurchaseRequest.update({
          where: { id },
          data: {
            status: "RECEIVED",
            receivedByName: receiverName,
            receiverDepartment,
            receiverSignature: receiverSignature || null,
            receivedAt: now,
            receivedPhotoUrl: uploadRes.url,
            activityLogs: {
              create: {
                action: "RECEIVED",
                actorName: receiverName,
                details: `All items received in good order by ${receiverName} with photographic verification.`,
              },
            },
          },
        })

        // Auto-increment inventory or auto-register new item into FMS Inventory / FMS Asset
        const entityDept = pr.company?.includes("NRHO") 
          ? "NRHO" 
          : pr.company?.includes("BOM") 
            ? "BOM" 
            : "BOS"

        for (const line of pr.items) {
          let targetItemId = line.itemId

          if (targetItemId) {
            // Existing item in inventory: update quantity and brand
            await tx.maintenanceItem.update({
              where: { id: targetItemId },
              data: {
                quantity: { increment: line.quantityRequest },
                ...(line.brand ? { brand: line.brand } : {}),
              },
            })

            // Create Stock Log (IN)
            await tx.maintenanceStockLog.create({
              data: {
                itemId: targetItemId,
                type: "IN",
                quantity: line.quantityRequest,
                handledBy: receiverName,
                department: entityDept,
                remarks: `RESTOCKED VIA PR ${pr.prNumber} (${line.projectMachine})`,
              },
            })
          } else {
            // New item not previously linked to inventory: check if item with same name exists
            const existingByName = await tx.maintenanceItem.findFirst({
              where: {
                name: { equals: line.itemRequested.trim(), mode: "insensitive" },
                department: entityDept,
              },
            })

            if (existingByName) {
              targetItemId = existingByName.id
              await tx.maintenanceItem.update({
                where: { id: targetItemId },
                data: {
                  quantity: { increment: line.quantityRequest },
                  ...(line.brand ? { brand: line.brand } : {}),
                },
              })
              await tx.maintenancePurchaseRequestItem.update({
                where: { id: line.id },
                data: { itemId: targetItemId },
              })
            } else {
              // Create brand new MaintenanceItem in selected entity (BOS/BOM for Inventory, NRHO for Asset)
              const newItem = await tx.maintenanceItem.create({
                data: {
                  name: line.itemRequested.trim().toUpperCase(),
                  brand: line.brand ? line.brand.trim().toUpperCase() : null,
                  location: "Pedas",
                  department: entityDept,
                  quantity: line.quantityRequest,
                  unit: "pcs",
                  pricePerUnit: 0,
                },
              })
              targetItemId = newItem.id
              await tx.maintenancePurchaseRequestItem.update({
                where: { id: line.id },
                data: { itemId: newItem.id },
              })
            }

            // Create Stock Log (IN)
            await tx.maintenanceStockLog.create({
              data: {
                itemId: targetItemId,
                type: "IN",
                quantity: line.quantityRequest,
                handledBy: receiverName,
                department: entityDept,
                remarks: `NEW ITEM RECEIVED VIA PR ${pr.prNumber} (${line.projectMachine})`,
              },
            })
          }
        }

        return prUpdated
      })

      revalidatePath("/forms/maintenance/purchase-requests")
      revalidatePath("/forms/maintenance/dashboard")
      revalidatePath("/forms/maintenance/assets")
      return { success: true, data: updated, isDamaged: false }
    }
  } catch (error: any) {
    console.error("receiveMaintenancePurchaseRequest error:", error)
    return { success: false, error: error.message || "Failed to process receipt." }
  }
}

/**
 * Get paginated or filtered list of Purchase Requisitions.
 */
export async function getMaintenancePurchaseRequests(filters?: {
  status?: string
  search?: string
}) {
  try {
    const where: any = {}

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim()
      where.OR = [
        { prNumber: { contains: q, mode: "insensitive" } },
        { requesterName: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { items: { some: { itemRequested: { contains: q, mode: "insensitive" } } } },
        { items: { some: { projectMachine: { contains: q, mode: "insensitive" } } } },
        { items: { some: { brand: { contains: q, mode: "insensitive" } } } },
      ]
    }

    const prs = await prisma.maintenancePurchaseRequest.findMany({
      where,
      include: {
        items: {
          include: { item: true },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, data: prs }
  } catch (error: any) {
    console.error("getMaintenancePurchaseRequests error:", error)
    return { success: false, error: error.message || "Failed to fetch PR list." }
  }
}

/**
 * Get a single Purchase Requisition by ID or Number.
 */
export async function getMaintenancePurchaseRequestById(idOrNumber: string) {
  try {
    const pr = await prisma.maintenancePurchaseRequest.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { prNumber: idOrNumber }],
      },
      include: {
        items: {
          include: { item: true },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
        },
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            location: true,
            specificArea: true,
          },
        },
      },
    })

    if (!pr) return { success: false, error: "PR not found." }
    return { success: true, data: pr }
  } catch (error: any) {
    console.error("getMaintenancePurchaseRequestById error:", error)
    return { success: false, error: error.message }
  }
}

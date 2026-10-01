"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canViewCustomerCare, canManageCustomerCare } from "@/lib/access"
import { revalidatePath } from "next/cache"
import { ManualComplaintPriority, ManualComplaintStatus } from "@prisma/client"

export type CreateManualComplaintInput = {
  customerName: string
  customerNumber: string
  customerSocials?: string
  customerPlatform: string
  mainComplaint: string
  priority?: ManualComplaintPriority
  status?: ManualComplaintStatus
  picHandling: string
  resolutionNotes?: string
}

export type ManualComplaintFilterParams = {
  search?: string
  status?: string
  priority?: string
  customerPlatform?: string
  picHandling?: string
  page?: number
  pageSize?: number
}

/**
 * Generate a sequential, collision-free Complaint ID: CMP-YYYYMM-XXXX
 */
async function generateComplaintNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const prefix = `CMP-${yearMonth}-`

  let complaintNumber = ""
  let attempts = 0

  while (attempts < 10) {
    attempts++
    const countThisMonth = await prisma.manualComplaintLog.count({
      where: { complaintNumber: { startsWith: prefix } },
    })
    const nextSeq = String(countThisMonth + attempts).padStart(4, "0")
    const candidate = `${prefix}${nextSeq}`

    const exists = await prisma.manualComplaintLog.findUnique({
      where: { complaintNumber: candidate },
      select: { id: true },
    })

    if (!exists) {
      complaintNumber = candidate
      break
    }
  }

  if (!complaintNumber) {
    complaintNumber = `${prefix}${Date.now().toString().slice(-4)}`
  }

  return complaintNumber
}

export async function createManualComplaint(input: CreateManualComplaintInput) {
  const session = await auth()
  const access = await getAccessInfo()

  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  const cleanName = input.customerName?.trim()
  const cleanNumber = input.customerNumber?.trim()
  const cleanComplaint = input.mainComplaint?.trim()

  if (!cleanName || !cleanNumber || !cleanComplaint) {
    return { success: false, error: "Customer Name, Customer Number, and Main Complaint are required." }
  }

  try {
    const complaintNumber = await generateComplaintNumber()

    const newRecord = await prisma.manualComplaintLog.create({
      data: {
        complaintNumber,
        customerName: cleanName,
        customerNumber: cleanNumber,
        customerSocials: input.customerSocials?.trim() || null,
        customerPlatform: input.customerPlatform?.trim() || "Customer Careline",
        mainComplaint: cleanComplaint,
        priority: input.priority || ManualComplaintPriority.YELLOW,
        status: input.status || ManualComplaintStatus.OPEN,
        picHandling: input.picHandling?.trim() || "Zara - Customer Careline",
        resolutionNotes: input.resolutionNotes?.trim() || null,
        createdById: session?.user?.id || null,
        resolvedAt: input.status === ManualComplaintStatus.CLOSED ? new Date() : null,
      },
    })

    revalidatePath("/business-development/customer-care")
    return { success: true, data: newRecord }
  } catch (error: any) {
    console.error("[Manual Complaint Log] Create error:", error)
    return { success: false, error: error.message || "Failed to create manual complaint log." }
  }
}

export async function getManualComplaints(params: ManualComplaintFilterParams = {}) {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care access required", data: [], total: 0 }
  }

  try {
    const {
      search,
      status,
      priority,
      customerPlatform,
      picHandling,
      page = 1,
      pageSize = 50,
    } = params

    const where: any = {}

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { complaintNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerNumber: { contains: q, mode: "insensitive" } },
        { customerSocials: { contains: q, mode: "insensitive" } },
        { mainComplaint: { contains: q, mode: "insensitive" } },
      ]
    }

    if (status && status !== "ALL") {
      where.status = status as ManualComplaintStatus
    }

    if (priority && priority !== "ALL") {
      where.priority = priority as ManualComplaintPriority
    }

    if (customerPlatform && customerPlatform !== "ALL") {
      where.customerPlatform = customerPlatform
    }

    if (picHandling && picHandling !== "ALL") {
      where.picHandling = picHandling
    }

    const [total, records] = await Promise.all([
      prisma.manualComplaintLog.count({ where }),
      prisma.manualComplaintLog.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  } catch (error: any) {
    console.error("[Manual Complaint Log] Fetch error:", error)
    return { success: false, error: error.message || "Failed to load complaints.", data: [], total: 0 }
  }
}

export async function updateManualComplaint(
  id: string,
  data: {
    status?: ManualComplaintStatus
    priority?: ManualComplaintPriority
    picHandling?: string
    resolutionNotes?: string
    mainComplaint?: string
    customerSocials?: string
    customerPlatform?: string
  }
) {
  const access = await getAccessInfo()
  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  try {
    const existing = await prisma.manualComplaintLog.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: "Complaint record not found." }
    }

    const isNowClosing = data.status === ManualComplaintStatus.CLOSED
    const wasClosed = existing.status === ManualComplaintStatus.CLOSED

    const updated = await prisma.manualComplaintLog.update({
      where: { id },
      data: {
        status: data.status !== undefined ? data.status : existing.status,
        priority: data.priority !== undefined ? data.priority : existing.priority,
        picHandling: data.picHandling !== undefined ? data.picHandling : existing.picHandling,
        customerPlatform: data.customerPlatform !== undefined ? data.customerPlatform : existing.customerPlatform,
        resolutionNotes: data.resolutionNotes !== undefined ? data.resolutionNotes : existing.resolutionNotes,
        mainComplaint: data.mainComplaint !== undefined ? data.mainComplaint : existing.mainComplaint,
        customerSocials: data.customerSocials !== undefined ? data.customerSocials : existing.customerSocials,
        resolvedAt: isNowClosing && !wasClosed ? new Date() : !isNowClosing ? null : existing.resolvedAt,
      },
    })

    revalidatePath("/business-development/customer-care")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("[Manual Complaint Log] Update error:", error)
    return { success: false, error: error.message || "Failed to update complaint record." }
  }
}

export async function deleteManualComplaint(id: string) {
  const access = await getAccessInfo()
  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  try {
    await prisma.manualComplaintLog.delete({ where: { id } })
    revalidatePath("/business-development/customer-care")
    return { success: true }
  } catch (error: any) {
    console.error("[Manual Complaint Log] Delete error:", error)
    return { success: false, error: error.message || "Failed to delete complaint record." }
  }
}

export async function exportManualComplaintsCsv() {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care access required", csv: "" }
  }

  try {
    const records = await prisma.manualComplaintLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
    })

    const headers = [
      "Complaint ID",
      "Date Logged",
      "Customer Name",
      "Customer Number",
      "Customer Socials",
      "Platform",
      "Priority",
      "Status",
      "PIC Handling",
      "Main Complaint",
      "Resolution Notes",
      "Resolved At",
    ]

    const rows = records.map((r) => [
      `"${r.complaintNumber}"`,
      `"${new Date(r.createdAt).toLocaleDateString("en-GB")}"`,
      `"${(r.customerName || "").replace(/"/g, '""')}"`,
      `"${(r.customerNumber || "").replace(/"/g, '""')}"`,
      `"${(r.customerSocials || "").replace(/"/g, '""')}"`,
      `"${(r.customerPlatform || "").replace(/"/g, '""')}"`,
      `"${r.priority}"`,
      `"${r.status.replace("_", " ")}"`,
      `"${(r.picHandling || "").replace(/"/g, '""')}"`,
      `"${(r.mainComplaint || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${(r.resolutionNotes || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      r.resolvedAt ? `"${new Date(r.resolvedAt).toLocaleDateString("en-GB")}"` : '""',
    ])

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n")
    return { success: true, csv: csvContent }
  } catch (error: any) {
    console.error("[Manual Complaint Log] CSV export error:", error)
    return { success: false, error: error.message || "Failed to export CSV", csv: "" }
  }
}

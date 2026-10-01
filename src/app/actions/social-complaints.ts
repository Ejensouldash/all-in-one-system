"use server"

import { prisma } from "@/lib/prisma"
import { getAccessInfo, canViewCustomerCare, canManageCustomerCare } from "@/lib/access"
import { revalidatePath } from "next/cache"

export type SocialComplaintFilterParams = {
  search?: string
  priority?: string
  status?: string
  picHandling?: string
  symptom?: string
  onlyWithBatch?: boolean
  page?: number
  pageSize?: number
}

export async function getSocialComplaints(params: SocialComplaintFilterParams = {}) {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return { success: false, error: "Customer Care access required", data: [], total: 0 }
  }

  try {
    const {
      search,
      priority,
      status,
      picHandling,
      symptom,
      onlyWithBatch,
      page = 1,
      pageSize = 100,
    } = params

    const where: any = {}

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { complaintId: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { mainComplaint: { contains: q, mode: "insensitive" } },
        { detectedBatchNo: { contains: q, mode: "insensitive" } },
      ]
    }

    if (priority && priority !== "ALL") {
      where.priority = priority
    }

    if (status && status !== "ALL") {
      where.status = status
    }

    if (picHandling && picHandling !== "ALL") {
      where.picHandling = picHandling
    }

    if (symptom && symptom !== "ALL") {
      where.symptoms = { has: symptom }
    }

    if (onlyWithBatch) {
      where.detectedBatchNo = { not: null }
    }

    const [total, records] = await Promise.all([
      prisma.socialMediaComplaint.count({ where }),
      prisma.socialMediaComplaint.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: records.map((r) => ({
        ...r,
        takenAt: r.takenAt ? Number(r.takenAt) : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  } catch (error: any) {
    console.error("[Social Complaints] Fetch error:", error)
    return { success: false, error: error.message || "Failed to load social complaints.", data: [], total: 0 }
  }
}

export async function updateSocialComplaint(
  id: string,
  data: {
    status?: string
    picHandling?: string
    priority?: string
  }
) {
  const access = await getAccessInfo()
  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  try {
    const updated = await prisma.socialMediaComplaint.update({
      where: { id },
      data: {
        status: data.status !== undefined ? data.status : undefined,
        picHandling: data.picHandling !== undefined ? data.picHandling : undefined,
        priority: data.priority !== undefined ? data.priority : undefined,
      },
    })

    revalidatePath("/business-development/customer-care")
    return {
      success: true,
      data: {
        ...updated,
        takenAt: updated.takenAt ? Number(updated.takenAt) : null,
      },
    }
  } catch (error: any) {
    console.error("[Social Complaints] Update error:", error)
    return { success: false, error: error.message || "Failed to update complaint." }
  }
}

export async function exportSocialComplaintsCsv() {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return { success: false, error: "Customer Care access required", csv: "" }
  }

  try {
    const records = await prisma.socialMediaComplaint.findMany({
      orderBy: { complaintId: "asc" },
      take: 2000,
    })

    const headers = [
      "COMPLAINT ID",
      "DATE",
      "CUSTOMER & NUMBER",
      "PLATFORM & SOCIALS",
      "MAIN COMPLAINT",
      "PRIORITY",
      "STATUS",
      "PIC HANDLING",
    ]

    const rows = records.map((r) => {
      const d = new Date(r.date)
      const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      const usernameStr = `@${r.username}${r.fullName ? ` (${r.fullName})` : ""}`
      const platformStr = `Threads - ${r.postUrl || ""}`

      return [
        `"${r.complaintId}"`,
        `"${dateStr}"`,
        `"${usernameStr.replace(/"/g, '""')}"`,
        `"${platformStr.replace(/"/g, '""')}"`,
        `"${(r.mainComplaint || "").replace(/"/g, '""').replace(/\r?\n|\r/g, " ")}"`,
        `"${r.priority}"`,
        `"${r.status}"`,
        `"${r.picHandling}"`,
      ]
    })

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n")
    return { success: true, csv: csvContent }
  } catch (error: any) {
    console.error("[Social Complaints] CSV export error:", error)
    return { success: false, error: error.message || "Failed to export CSV", csv: "" }
  }
}

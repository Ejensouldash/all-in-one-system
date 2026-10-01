"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canViewCustomerCare, canManageCustomerCare } from "@/lib/access"
import { lookupProductionBatches, MatchedProductionRecord } from "@/lib/customer-care/batch-lookup"
import { revalidatePath } from "next/cache"
import { ComplaintCategory, ComplaintStatus, BatchMatchStatus } from "@prisma/client"

export type CreateComplaintInput = {
  companyName: string
  outletName?: string
  contactName: string
  contactPhone: string
  state: string
  goodsLocationAddress: string
  categories: ComplaintCategory[]
  otherIssueDescription?: string
  picDepartment: string
  internalNotes?: string
  affectedQty425ml?: number
  batchNo425ml?: string
  affectedQty800ml?: number
  batchNo800ml?: string
}

export type ComplaintFilterParams = {
  search?: string
  status?: string
  state?: string
  picDepartment?: string
  matchStatus?: string
  page?: number
  pageSize?: number
}

/**
 * Generate a collision-free Case Number: CC-YYYYMM-XXXX
 */
async function generateCaseNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
  const prefix = `CC-${yearMonth}-`

  let caseNumber = ""
  let attempts = 0

  while (attempts < 10) {
    attempts++
    const countThisMonth = await prisma.customerComplaint.count({
      where: { caseNumber: { startsWith: prefix } },
    })
    const nextSeq = String(countThisMonth + attempts).padStart(4, "0")
    const candidate = `${prefix}${nextSeq}`

    const exists = await prisma.customerComplaint.findUnique({
      where: { caseNumber: candidate },
      select: { id: true },
    })

    if (!exists) {
      caseNumber = candidate
      break
    }
  }

  if (!caseNumber) {
    caseNumber = `${prefix}${Date.now().toString().slice(-4)}`
  }

  return caseNumber
}

export async function createComplaintCase(input: CreateComplaintInput) {
  const session = await auth()
  const access = await getAccessInfo()
  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  try {
    const cleanCompany = input.companyName?.trim()
    const cleanContact = input.contactName?.trim()
    const cleanPhone = input.contactPhone?.trim()

    if (!cleanCompany || !cleanContact || !cleanPhone) {
      return { success: false, error: "Company name, contact name, and phone number are required." }
    }

    if (!input.categories || input.categories.length === 0) {
      return { success: false, error: "Please select at least one defect category." }
    }

    const caseNumber = await generateCaseNumber()

    // Run batch lookups for 425ml and 800ml items
    const lookup425 = await lookupProductionBatches(input.batchNo425ml, "425ml")
    const lookup800 = await lookupProductionBatches(input.batchNo800ml, "800ml")

    const itemsToCreate = []

    // 425ml item
    const qty425 = Number(input.affectedQty425ml) || 0
    if (qty425 > 0 || (input.batchNo425ml && input.batchNo425ml.trim().length > 0)) {
      itemsToCreate.push({
        productSize: "425ml",
        reportedQtyBottles: qty425,
        reportedBatchNo: input.batchNo425ml?.trim() || null,
        cleanBatchNo: lookup425.cleanBatchNo,
        matchStatus: lookup425.matchStatus as BatchMatchStatus,
        matchedProductionId: lookup425.matches.length === 1 ? lookup425.matches[0].batchId : null,
        matchRemarks: lookup425.remarks,
      })
    }

    // 800ml item
    const qty800 = Number(input.affectedQty800ml) || 0
    if (qty800 > 0 || (input.batchNo800ml && input.batchNo800ml.trim().length > 0)) {
      itemsToCreate.push({
        productSize: "800ml",
        reportedQtyBottles: qty800,
        reportedBatchNo: input.batchNo800ml?.trim() || null,
        cleanBatchNo: lookup800.cleanBatchNo,
        matchStatus: lookup800.matchStatus as BatchMatchStatus,
        matchedProductionId: lookup800.matches.length === 1 ? lookup800.matches[0].batchId : null,
        matchRemarks: lookup800.remarks,
      })
    }

    const complaint = await prisma.customerComplaint.create({
      data: {
        caseNumber,
        companyName: cleanCompany,
        outletName: input.outletName?.trim() || null,
        contactName: cleanContact,
        contactPhone: cleanPhone,
        state: input.state?.trim() || "",
        goodsLocationAddress: input.goodsLocationAddress?.trim() || "",
        categories: input.categories,
        otherIssueDescription: input.otherIssueDescription?.trim() || null,
        picDepartment: input.picDepartment || "Customer Care",
        internalNotes: input.internalNotes?.trim() || null,
        status: ComplaintStatus.NEW,
        createdById: session?.user?.id || null,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        items: true,
      },
    })

    revalidatePath("/business-development/customer-care")
    return { success: true, data: complaint }
  } catch (error: any) {
    console.error("[Customer Care] Failed to create complaint case:", error)
    return { success: false, error: error.message || "Failed to create complaint case." }
  }
}

export async function getComplaintCases(params: ComplaintFilterParams = {}) {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care access required", data: [], total: 0 }
  }

  try {
    const { search, status, state, picDepartment, matchStatus, page = 1, pageSize = 20 } = params

    const where: any = {}

    if (status && status !== "ALL") {
      where.status = status as ComplaintStatus
    }

    if (state && state !== "ALL") {
      where.state = state
    }

    if (picDepartment && picDepartment !== "ALL") {
      where.picDepartment = picDepartment
    }

    if (matchStatus && matchStatus !== "ALL") {
      where.items = {
        some: {
          matchStatus: matchStatus as BatchMatchStatus,
        },
      }
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { caseNumber: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { outletName: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { contactPhone: { contains: q, mode: "insensitive" } },
        { items: { some: { cleanBatchNo: { contains: q, mode: "insensitive" } } } },
        { items: { some: { reportedBatchNo: { contains: q, mode: "insensitive" } } } },
      ]
    }

    const [total, cases] = await Promise.all([
      prisma.customerComplaint.count({ where }),
      prisma.customerComplaint.findMany({
        where,
        include: {
          items: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: cases,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error: any) {
    console.error("[Customer Care] Failed to fetch complaint cases:", error)
    return { success: false, error: error.message, data: [], total: 0 }
  }
}

export async function getComplaintCaseById(id: string) {
  const access = await getAccessInfo()
  if (!canViewCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care access required", data: null }
  }

  try {
    const complaint = await prisma.customerComplaint.findUnique({
      where: { id },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!complaint) {
      return { success: false, error: "Complaint case not found.", data: null }
    }

    // Enrich items with fresh live production batch lookup details
    const enrichedItems = await Promise.all(
      complaint.items.map(async (item) => {
        let productionMatches: MatchedProductionRecord[] = []
        if (item.cleanBatchNo) {
          const lookup = await lookupProductionBatches(
            item.cleanBatchNo,
            item.productSize as "425ml" | "800ml"
          )
          productionMatches = lookup.matches
        }
        return {
          ...item,
          productionMatches,
        }
      })
    )

    return {
      success: true,
      data: {
        ...complaint,
        items: enrichedItems,
      },
    }
  } catch (error: any) {
    console.error("[Customer Care] Failed to fetch case by id:", error)
    return { success: false, error: error.message, data: null }
  }
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  internalNotes?: string
) {
  const access = await getAccessInfo()
  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  try {
    const updateData: any = { status }
    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes
    }

    const updated = await prisma.customerComplaint.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/business-development/customer-care")
    revalidatePath(`/business-development/customer-care/${id}`)
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("[Customer Care] Failed to update complaint status:", error)
    return { success: false, error: error.message }
  }
}

export async function manuallyRelinkBatch(
  complaintItemId: string,
  productionBatchId: string,
  remarks?: string
) {
  const access = await getAccessInfo()
  if (!canManageCustomerCare(access)) {
    return { success: false, error: "Unauthorized: Customer Care Management access required" }
  }

  try {
    const productionBatch = await prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      include: {
        productionOutput: { include: { report: true } },
      },
    })

    if (!productionBatch) {
      return { success: false, error: "Production batch record not found." }
    }

    const updated = await prisma.complaintItem.update({
      where: { id: complaintItemId },
      data: {
        matchedProductionId: productionBatchId,
        matchStatus: BatchMatchStatus.MANUAL_OVERRIDE,
        cleanBatchNo: productionBatch.batchNo,
        matchRemarks: remarks || `Manually linked to Daily Report on ${productionBatch.productionOutput.report.date.toISOString().slice(0, 10)}.`,
      },
    })

    revalidatePath(`/business-development/customer-care/${updated.complaintId}`)
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("[Customer Care] Failed to relink batch:", error)
    return { success: false, error: error.message }
  }
}

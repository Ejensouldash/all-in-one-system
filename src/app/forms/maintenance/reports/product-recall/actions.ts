"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getAccessInfo } from "@/lib/access"
import type { ProductRecallDTO, ProductRecallFilterParams } from "../../product-recall/types"

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}

export async function getProductRecallReport(params: ProductRecallFilterParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized access. Please sign in.", data: [], summary: null }
    }

    const access = await getAccessInfo()
    if (!access) {
      return { success: false, error: "Access verification failed.", data: [], summary: null }
    }

    const { month, year, search } = params

    const whereClause: Prisma.ProductRecallWhereInput = {}

    // Month & Year filtering in Asia/Kuala_Lumpur (UTC+8)
    if (year && month) {
      const startOfMonthMyt = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0, 0))
      const lastDay = new Date(year, month, 0).getDate()
      const endOfMonthMyt = new Date(Date.UTC(year, month - 1, lastDay, 15, 59, 59, 999))

      whereClause.recallDate = {
        gte: startOfMonthMyt,
        lte: endOfMonthMyt,
      }
    } else if (year) {
      const startOfYear = new Date(Date.UTC(year, 0, 1, -8, 0, 0, 0))
      const endOfYear = new Date(Date.UTC(year, 11, 31, 15, 59, 59, 999))
      whereClause.recallDate = {
        gte: startOfYear,
        lte: endOfYear,
      }
    }

    // Text search
    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { recallNo: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
        { preparedByName: { contains: q, mode: "insensitive" } },
        {
          items: {
            some: {
              OR: [
                { customer: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { batchNumber: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ]
    }

    const records = await prisma.productRecall.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: {
        recallDate: "desc",
      },
    })

    const formattedData: ProductRecallDTO[] = records.map((r) => ({
      id: r.id,
      recallNo: r.recallNo,
      recallDate: r.recallDate.toISOString(),
      reason: r.reason,
      remarks: r.remarks,
      preparedById: r.preparedById,
      preparedByName: r.preparedByName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      items: r.items.map((i) => ({
        id: i.id,
        recallId: i.recallId,
        customer: i.customer,
        sku: i.sku,
        batchNumber: i.batchNumber,
        quantity: i.quantity,
        remarks: i.remarks,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
    }))

    // Calculate aggregated metrics
    const totalRecalls = formattedData.length
    let totalItems = 0
    let totalQuantity = 0
    const customersSet = new Set<string>()
    const batchesSet = new Set<string>()

    formattedData.forEach((r) => {
      totalItems += r.items.length
      r.items.forEach((item) => {
        totalQuantity += item.quantity
        if (item.customer) customersSet.add(item.customer.trim().toLowerCase())
        if (item.batchNumber) batchesSet.add(item.batchNumber.trim().toUpperCase())
      })
    })

    const summary = {
      totalRecalls,
      totalItems,
      totalQuantity,
      uniqueCustomersCount: customersSet.size,
      uniqueBatchesCount: batchesSet.size,
    }

    const canManage =
      access.isSuperAdmin ||
      access.modules.includes("GMP_FORMS") ||
      access.modules.includes("MAINTENANCE_FORMS") ||
      access.modules.includes("GMP_REPORTS") ||
      access.modules.includes("MAINTENANCE_REPORTS")

    return {
      success: true,
      canManage,
      data: formattedData,
      summary,
    }
  } catch (error: unknown) {
    console.error("Failed to load product recall report:", error)
    return {
      success: false,
      error: getErrorMessage(error, "Failed to load Product Recall report."),
      data: [],
      summary: null,
    }
  }
}

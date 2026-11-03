"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { BatchEvaluation } from "./types"

export async function createSEF(data: {
  date: Date
  batches: BatchEvaluation[]
  remarks?: string
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await (prisma as any).maintenanceSEF.create({
      data: {
        date: data.date,
        batches: data.batches,
        remarks: data.remarks || null,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature || null,
      },
    })

    revalidatePath("/forms/maintenance/sef")
    revalidatePath("/forms/maintenance/reports/sef")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceSEF:", error)
    return { success: false, error: error.message || "Failed to create record." }
  }
}

export async function getSEFRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const records = await (prisma as any).maintenanceSEF.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    })

    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching MaintenanceSEF records:", error)
    return { success: false, error: error.message || "Failed to fetch records." }
  }
}

export async function verifySEFRecord(
  id: string,
  verifiedBy: string,
  verifiedSignature: string
) {
  try {
    const record = await (prisma as any).maintenanceSEF.update({
      where: { id },
      data: {
        verifiedBy,
        verifiedSignature,
        verifiedAt: new Date(),
      },
    })

    revalidatePath("/forms/maintenance/reports/sef")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error verifying MaintenanceSEF record:", error)
    return { success: false, error: error.message || "Failed to verify record." }
  }
}

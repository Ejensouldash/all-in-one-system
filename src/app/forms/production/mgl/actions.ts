"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMonthlyGlassLog(data: {
  inspectionMonth: string
  inspectionArea: string
  conditionOfGlass: string
  remarks?: string
  checkedBy: string
  verifiedBy?: string
  performedSignature?: string
  verifiedSignature?: string
}) {
  try {
    const record = await prisma.productionGlassLog.create({
      data,
    })

    revalidatePath("/forms/production")
    revalidatePath("/forms/production/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create ProductionGlassLog:", error)
    return { success: false, error: error.message }
  }
}

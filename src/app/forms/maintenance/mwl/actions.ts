"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMonthlyWoodLog(data: {
  inspectionMonth: string
  inspectionArea: string
  conditionOfWood: string
  remarks?: string
  checkedBy: string
  verifiedBy?: string
  performedSignature?: string
  verifiedSignature?: string
}) {
  try {
    const record = await prisma.productionWoodLog.create({
      data,
    })

    revalidatePath("/forms/maintenance")
    revalidatePath("/forms/maintenance/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create ProductionWoodLog:", error)
    return { success: false, error: error.message }
  }
}

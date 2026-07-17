"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMonthlyWoodBreakage(data: {
  inspectionMonth: string
  areaOfInterest: string
  causedBy: string
  nextCourseOfAction?: string
  remarks?: string
  checkedBy: string
  verifiedBy?: string
  performedSignature?: string
  verifiedSignature?: string
}) {
  try {
    const record = await prisma.productionWoodBreakage.create({
      data,
    })

    revalidatePath("/forms/production")
    revalidatePath("/forms/production/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create ProductionWoodBreakage:", error)
    return { success: false, error: error.message }
  }
}

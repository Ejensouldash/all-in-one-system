"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMonthlyGlassBreakage(data: {
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
    const record = await prisma.productionGlassBreakage.create({
      data,
    })

    revalidatePath("/forms/production")
    revalidatePath("/forms/production/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create ProductionGlassBreakage:", error)
    return { success: false, error: error.message }
  }
}

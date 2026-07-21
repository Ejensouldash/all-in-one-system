"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMonthlyPlasticBreakage(data: {
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
    const record = await prisma.productionPlasticBreakage.create({
      data,
    })

    revalidatePath("/forms/maintenance")
    revalidatePath("/forms/maintenance/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create ProductionPlasticBreakage:", error)
    return { success: false, error: error.message }
  }
}

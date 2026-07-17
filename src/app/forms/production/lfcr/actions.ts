"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createLightingFixtureRecord(data: {
  date: Date
  cleaningLocation: string
  activityPerformed: string
  condition: string
  nextCourseOfAction?: string
  supervisedBy: string
  checkedBy: string
  verifiedBy?: string
  performedSignature?: string
  verifiedSignature?: string
}) {
  try {
    const record = await prisma.productionLightingFixture.create({
      data,
    })

    revalidatePath("/forms/production")
    revalidatePath("/forms/production/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create ProductionLightingFixture:", error)
    return { success: false, error: error.message }
  }
}

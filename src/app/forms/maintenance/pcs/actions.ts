"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createPestControlSchedule(data: {
  date: Date
  companyName: string
  servicedBy: string
  verifiedBy?: string
  remark?: string
  performedSignature?: string
  verifiedSignature?: string
}) {
  try {
    const record = await prisma.maintenancePestControlSchedule.create({ data })
    revalidatePath("/forms/maintenance")
    revalidatePath("/forms/maintenance/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create MaintenancePestControlSchedule:", error)
    return { success: false, error: error.message }
  }
}

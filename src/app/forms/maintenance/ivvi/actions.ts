"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createIVVI(data: {
  date: Date
  vehicleNo: string
  companyName: string
  purpose: string
  product: string
  visualInspection: boolean
  reason?: string
  furtherAction?: string
  checkedBy: string
  verifiedBy?: string
  performedSignature?: string
  verifiedSignature?: string
}) {
  try {
    const record = await prisma.securityIncomingVehicle.create({
      data,
    })

    revalidatePath("/forms/maintenance")
    revalidatePath("/forms/maintenance/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create SecurityIncomingVehicle:", error)
    return { success: false, error: error.message }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createVCHIF(data: {
  date: Date
  companyName: string
  vehicleNo: string
  vehicleType: string
  driverName: string
  inspectorName: string
  extClean: boolean
  intClean: boolean
  noTrash: boolean
  seatsClean: boolean
  floorClean: boolean
  noOdor: boolean
  windowsClean: boolean
  noSpills: boolean
  wasteBinEmpty: boolean
  noPests: boolean
  noChemicals: boolean
  suitableCondition: boolean
  noHazardous: boolean
  noIllegal: boolean
  issues?: string
  correctiveAction?: string
  driverSignature?: string
  inspectorSignature?: string
}) {
  try {
    const record = await prisma.securityVehicleHygiene.create({
      data,
    })

    revalidatePath("/forms/maintenance")
    revalidatePath("/forms/maintenance/reports")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Failed to create SecurityVehicleHygiene:", error)
    return { success: false, error: error.message }
  }
}

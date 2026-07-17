"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createPreventiveMaintenanceInspection(data: {
  date: Date
  time: string
  autoScrambler: boolean
  threeInOne: boolean
  blower: boolean
  label: boolean
  printer: boolean
  steamGenerator: boolean
  weighing: boolean
  sealer: boolean
  roboticArm: boolean
  wrapping: boolean
  sandFilter: boolean
  carbonFilter: boolean
  hollowMembrane: boolean
  uvMachine: boolean
  airCompressor: boolean
  rawWaterPump: boolean
  rawTank: boolean
  filteredTank: boolean
  well: boolean
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenancePreventiveInspection.create({
      data
    })

    revalidatePath("/forms/maintenance/pmir")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenancePreventiveInspection:", error)
    return { success: false, error: error.message }
  }
}

export async function getPreventiveMaintenanceInspections(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const records = await prisma.maintenancePreventiveInspection.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [
        { date: "asc" },
        { time: "asc" }
      ]
    })
    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching MaintenancePreventiveInspection:", error)
    return { success: false, error: error.message }
  }
}

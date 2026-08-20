"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createPreventiveMaintenanceRecord(data: {
  date: Date
  line: string
  autoScrambler: boolean
  threeInOne: boolean
  blower: boolean
  label: boolean
  laserPrinting: boolean
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
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenancePreventiveRecord.create({
      data
    })

    revalidatePath("/forms/maintenance/pmr")
    revalidatePath("/forms/maintenance/reports/pmr")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenancePreventiveRecord:", error)
    return { success: false, error: error.message }
  }
}

export async function getPreventiveMaintenanceRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)
    
    const records = await prisma.maintenancePreventiveRecord.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [
        { date: "asc" },
        { line: "desc" } // "800ML" then "425ML" ideally
      ]
    })
    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching MaintenancePreventiveRecord:", error)
    return { success: false, error: error.message }
  }
}

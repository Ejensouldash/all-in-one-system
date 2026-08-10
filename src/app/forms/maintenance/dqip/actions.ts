"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type DQIPCondition = "OKAY" | "NOT_OKAY"
export type DQIPAvailability = "AVAILABLE" | "NOT_AVAILABLE"

export type DQIPRow = {
  line: string
  item: string
  time: string
  weightQty: string
  condition: DQIPCondition
  batchNumber: DQIPAvailability
  status: DQIPCondition
}

export type DQIPEntries = {
  rows?: DQIPRow[]
  remarks?: string
  // Legacy fields preserved for existing database records reading
  cap1881?: any[]
  emptyBottle425?: any[]
  emptyBottle800?: any[]
  filledBottle425?: any[]
  filledBottle800?: any[]
  taste?: any[]
  smell?: any[]
  particle?: any[]
}

export async function createDQIP(data: {
  date: Date
  rows: DQIPRow[]
  remarks?: string
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const payload: DQIPEntries = {
      rows: data.rows,
      remarks: data.remarks,
    }

    const record = await prisma.maintenanceDQIP.create({
      data: {
        date: data.date,
        entries: payload as any,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature,
      }
    })

    revalidatePath("/forms/maintenance/dqip")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceDQIP:", error)
    return { success: false, error: error.message }
  }
}

export async function getDQIPRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const records = await prisma.maintenanceDQIP.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" }
    })
    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching MaintenanceDQIP:", error)
    return { success: false, error: error.message }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// pH and TDS are read twice per sample: before and after filtration.
export type WQTRRow = {
  time: string
  phUnfiltered: string
  phFiltered: string
  tdsUnfiltered?: string
  tdsFiltered?: string
  turbidity: string
  colour: string
}

export async function createWQTR(data: {
  date: Date
  rows: WQTRRow[]
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenanceWQTR.create({
      data: {
        date: data.date,
        rows: data.rows,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature,
      }
    })

    revalidatePath("/forms/maintenance/wqtr")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceWQTR:", error)
    return { success: false, error: error.message }
  }
}

export async function getWQTRRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const records = await prisma.maintenanceWQTR.findMany({
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
    console.error("Error fetching MaintenanceWQTR:", error)
    return { success: false, error: error.message }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// On the printed form BOX SEALING, BATCH NUMBER and PALLET all sit under a
// CONDITIONS header — they are tick-box judgements, not free text.
export type FPIRCondition = "OKAY" | "NOT_OKAY"
export type FPIRAvailability = "AVAILABLE" | "NOT_AVAILABLE"

export type FPIRRow = {
  line: string
  sku: string
  time: string
  weightKg: string
  boxSealing: FPIRCondition
  batchNumber: FPIRAvailability
  pallet: FPIRCondition
}

export async function createFPIR(data: {
  date: Date
  rows: FPIRRow[]
  remarks?: string
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenanceFPIR.create({
      data: {
        date: data.date,
        rows: data.rows,
        remarks: data.remarks,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature,
      }
    })

    revalidatePath("/forms/maintenance/fpir")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceFPIR:", error)
    return { success: false, error: error.message }
  }
}

export async function getFPIRRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const records = await prisma.maintenanceFPIR.findMany({
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
    console.error("Error fetching MaintenanceFPIR:", error)
    return { success: false, error: error.message }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type DQIPCondition = "OKAY" | "NOT_OKAY"
export type DQIPAvailability = "AVAILABLE" | "NOT_AVAILABLE"

export type DQIPMaterialRow = {
  time: string
  quantity: string
  batchNumber: DQIPAvailability
  samples: { weight: string; condition: DQIPCondition }[]
}

export type DQIPSensoryRow = {
  sku: string
  quantity: string
  samples: { time: string; condition: DQIPCondition }[]
}

export type DQIPEntries = {
  cap1881: DQIPMaterialRow[]
  emptyBottle425: DQIPMaterialRow[]
  emptyBottle800: DQIPMaterialRow[]
  filledBottle425: DQIPMaterialRow[]
  filledBottle800: DQIPMaterialRow[]
  taste: DQIPSensoryRow[]
  smell: DQIPSensoryRow[]
  particle: DQIPSensoryRow[]
  remarks?: string
}

export async function createDQIP(data: {
  date: Date
  entries: DQIPEntries
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenanceDQIP.create({
      data: {
        date: data.date,
        entries: data.entries as any,
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

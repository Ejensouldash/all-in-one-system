"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export type QCDRRow = {
  description: string
  results: string
  conclusion: string
  correctiveAction: string
}

export async function createQCDR(data: {
  date: Date
  rows: QCDRRow[]
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenanceQCDR.create({
      data: {
        date: data.date,
        rows: data.rows,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature,
      }
    })

    revalidatePath("/forms/maintenance/qcdr")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceQCDR:", error)
    return { success: false, error: error.message }
  }
}

export async function getQCDRRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const records = await prisma.maintenanceQCDR.findMany({
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
    console.error("Error fetching MaintenanceQCDR:", error)
    return { success: false, error: error.message }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createMaintenanceEquipmentRecord(data: {
  date: Date
  activities: any
  checkedBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenanceEquipmentRecord.create({
      data: {
        date: data.date,
        activities: data.activities,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature,
      }
    })

    revalidatePath("/forms/maintenance/maintenance-record")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceEquipmentRecord:", error)
    return { success: false, error: error.message }
  }
}

export async function getMaintenanceEquipmentRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const records = await prisma.maintenanceEquipmentRecord.findMany({
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
    console.error("Error fetching MaintenanceEquipmentRecord:", error)
    return { success: false, error: error.message }
  }
}

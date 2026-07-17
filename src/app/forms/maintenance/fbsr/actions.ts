"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createFiltrationBackwashRecord(data: {
  date: Date
  quartzStart?: string
  quartzStop?: string
  carbonStart?: string
  carbonStop?: string
  membraneStart?: string
  membraneStop?: string
  doneBy: string
  performedSignature?: string
}) {
  try {
    const record = await prisma.maintenanceFiltrationBackwash.create({
      data
    })

    revalidatePath("/forms/maintenance/fbsr")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error creating MaintenanceFiltrationBackwash:", error)
    return { success: false, error: error.message }
  }
}

export async function getFiltrationBackwashRecords(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const records = await prisma.maintenanceFiltrationBackwash.findMany({
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
    console.error("Error fetching MaintenanceFiltrationBackwash:", error)
    return { success: false, error: error.message }
  }
}

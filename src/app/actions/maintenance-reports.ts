"use server"

import { prisma } from "@/lib/prisma"

export async function getMonthlyMaintenanceReport(formType: string, month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const dateQuery = {
      date: {
        gte: startDate,
        lte: endDate,
      }
    }

    let data: any[] = []

    switch (formType) {
      case "lighting":
        data = await prisma.maintenanceLighting.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "finished-goods":
        data = await prisma.maintenanceFinishedGoods.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "waste-management":
        data = await prisma.maintenanceWasteManagement.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "waste-disposal":
        data = await prisma.maintenanceWasteDisposal.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "food-handler":
        data = await prisma.maintenanceFoodHandler.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "chemical-control":
        data = await prisma.maintenanceChemical.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      default:
        return { success: false, error: "Invalid form type" }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error("Error generating monthly maintenance report:", error)
    return { success: false, error: error.message || "Failed to load report data." }
  }
}

"use server"

import { prisma } from "@/lib/prisma"

function getShiftRank(shift?: string | null): number {
  const s = (shift || "").trim().toLowerCase()
  if (s === "pagi" || s === "am" || s === "morning" || s === "siang") return 1
  if (s === "malam" || s === "pm" || s === "night") return 2
  return 3
}

function getLineRank(line?: string | null): number {
  const l = (line || "").trim().toUpperCase()
  if (l.includes("800")) return 1
  if (l.includes("425")) return 2
  return 3
}

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
      case "waste-management": {
        const rawData = await prisma.maintenanceWasteManagement.findMany({
          where: dateQuery,
          orderBy: [{ date: "asc" }, { createdAt: "asc" }]
        })
        data = rawData.sort((a, b) => {
          const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (dateDiff !== 0) return dateDiff

          const shiftDiff = getShiftRank(a.shift) - getShiftRank(b.shift)
          if (shiftDiff !== 0) return shiftDiff

          const lineDiff = getLineRank(a.line) - getLineRank(b.line)
          if (lineDiff !== 0) return lineDiff

          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
        break
      }
      case "waste-disposal":
        data = await prisma.maintenanceWasteDisposal.findMany({
          where: dateQuery,
          orderBy: [{ date: "asc" }, { line: "desc" }, { inspectionTime: "asc" }]
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
      case "cleaning":
        data = await prisma.maintenanceCleaning.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "pcdm":
        data = await prisma.maintenancePestControlDaily.findMany({
          where: dateQuery,
          orderBy: { date: "asc" }
        })
        break
      case "ftdm":
        data = await prisma.maintenanceFlyTrapDaily.findMany({
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

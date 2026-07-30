"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const itemSchema = z.object({
  section: z.string(),
  sku: z.string(),
  unit: z.string(),
  batchNo: z.string().min(1, "Batch number is required"),
  balanceInWarehouse: z.number().min(0),
  quantityStockIn: z.number().min(0),
  quantityStockOut: z.number().min(0),
  remarks: z.string().optional()
})

const reportSchema = z.object({
  date: z.string(),
  time: z.string(),
  shift: z.string(),
  preparedBy: z.string(),
  createdById: z.string(),
  remarks: z.string().optional(),
  items: z.array(itemSchema)
})

export async function saveDailyRawMaterialReport(formData: any) {
  try {
    const data = reportSchema.parse(formData)
    
    const result = await prisma.warehouseDailyRawMaterial.create({
      data: {
        date: new Date(data.date),
        time: data.time,
        shift: data.shift,
        preparedBy: data.preparedBy,
        createdById: data.createdById,
        remarks: data.remarks,
        items: {
          create: data.items.map(item => ({
            ...item,
            balanceCarryForward: (item.balanceInWarehouse + item.quantityStockIn) - item.quantityStockOut
          }))
        }
      }
    })
    
    revalidatePath("/forms/warehouse/reports/daily-raw-material")
    return { success: true, id: result.id }
  } catch (error) {
    console.error("Failed to save Daily Raw Material Report:", error)
    return { success: false, error: "Failed to save the report. Please try again." }
  }
}

export async function getLatestCarryForward() {
  try {
    const latestReport = await prisma.warehouseDailyRawMaterial.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        items: true
      }
    })

    if (!latestReport) return []

    // Only carry forward items that have balanceCarryForward > 0
    return latestReport.items
      .filter((item: any) => item.balanceCarryForward > 0)
      .map((item: any) => ({
        section: item.section,
        sku: item.sku,
        unit: item.unit,
        batchNo: item.batchNo,
        balanceInWarehouse: item.balanceCarryForward,
        quantityStockIn: 0,
        quantityStockOut: 0,
        remarks: ""
      }))
  } catch (error) {
    console.error("Failed to get latest carry forward:", error)
    return []
  }
}

export async function getDailyRawMaterialReports(page = 1, pageSize = 20) {
  try {
    const [reports, total] = await Promise.all([
      prisma.warehouseDailyRawMaterial.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          items: true
        }
      }),
      prisma.warehouseDailyRawMaterial.count()
    ])

    return { success: true, data: reports, total }
  } catch (error) {
    console.error("Failed to fetch reports:", error)
    return { success: false, error: "Failed to fetch reports", data: [], total: 0 }
  }
}

export async function getDailyRawMaterialReportById(id: string) {
  try {
    const report = await prisma.warehouseDailyRawMaterial.findUnique({
      where: { id },
      include: { items: true }
    })
    return { success: true, data: report }
  } catch (error) {
    console.error("Failed to fetch report:", error)
    return { success: false, error: "Failed to fetch report" }
  }
}

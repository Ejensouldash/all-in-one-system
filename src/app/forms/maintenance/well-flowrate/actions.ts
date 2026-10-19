"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export interface SubmitWellFlowrateResult {
  success: boolean
  error?: string
  id?: string
}

export async function submitWellFlowrate(formData: FormData): Promise<SubmitWellFlowrateResult> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please log in first." }
    }

    const dateTimeStr = formData.get("dateTime") as string
    const picName = (formData.get("picName") as string)?.trim()
    const well2 = (formData.get("well2") as string)?.trim() || null
    const well3 = (formData.get("well3") as string)?.trim() || null
    const well4 = (formData.get("well4") as string)?.trim() || null
    const well7 = (formData.get("well7") as string)?.trim() || null
    const well8 = (formData.get("well8") as string)?.trim() || null
    const well12 = (formData.get("well12") as string)?.trim() || null
    const remarks = (formData.get("remarks") as string)?.trim() || null
    const performedSignature = formData.get("performedSignature") as string | null

    if (!dateTimeStr) {
      return { success: false, error: "Please select Date & Time." }
    }

    if (!picName) {
      return { success: false, error: "PIC Name is required." }
    }

    if (!performedSignature) {
      return { success: false, error: "Please provide your digital signature before submitting." }
    }

    const parsedDate = new Date(dateTimeStr)
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Invalid Date & Time value provided." }
    }

    const record = await prisma.productionWellFlowrate.create({
      data: {
        dateTime: parsedDate,
        picName,
        well2,
        well3,
        well4,
        well7,
        well8,
        well12,
        remarks,
        performedSignature,
      },
    })

    revalidatePath("/forms/maintenance/reports/well-flowrate")
    revalidatePath("/forms/maintenance")

    return { success: true, id: record.id }
  } catch (error: any) {
    console.error("Error submitting Well Flowrate record:", error)
    return { success: false, error: error.message || "Failed to submit Well Flowrate record." }
  }
}

export interface WellFlowrateFilterParams {
  month?: number
  year?: number
  startDate?: string
  endDate?: string
  search?: string
}

export async function getWellFlowrateRecords(params: WellFlowrateFilterParams = {}) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: [] }
    }

    const where: any = {}

    if (params.startDate || params.endDate) {
      where.dateTime = {}
      if (params.startDate) {
        where.dateTime.gte = new Date(`${params.startDate}T00:00:00.000Z`)
      }
      if (params.endDate) {
        where.dateTime.lte = new Date(`${params.endDate}T23:59:59.999Z`)
      }
    } else if (params.month && params.year) {
      const start = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0))
      const lastDay = new Date(params.year, params.month, 0).getDate()
      const end = new Date(Date.UTC(params.year, params.month - 1, lastDay, 23, 59, 59, 999))
      where.dateTime = {
        gte: start,
        lte: end,
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim()
      where.OR = [
        { picName: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
        { well2: { contains: q, mode: "insensitive" } },
        { well3: { contains: q, mode: "insensitive" } },
        { well4: { contains: q, mode: "insensitive" } },
        { well7: { contains: q, mode: "insensitive" } },
        { well8: { contains: q, mode: "insensitive" } },
        { well12: { contains: q, mode: "insensitive" } },
      ]
    }

    const records = await prisma.productionWellFlowrate.findMany({
      where,
      orderBy: { dateTime: "desc" },
    })

    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching Well Flowrate records:", error)
    return { success: false, error: error.message || "Failed to fetch records.", data: [] }
  }
}

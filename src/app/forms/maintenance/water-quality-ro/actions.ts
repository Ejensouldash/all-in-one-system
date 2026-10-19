"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export interface SubmitWaterQualityROResult {
  success: boolean
  error?: string
  id?: string
}

export async function submitWaterQualityRO(formData: FormData): Promise<SubmitWaterQualityROResult> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please log in first." }
    }

    const dateTimeStr = formData.get("dateTime") as string
    const picName = (formData.get("picName") as string)?.trim()
    const phSelection = (formData.get("phSelection") as string)?.trim()
    const phCustom = (formData.get("phCustom") as string)?.trim()
    const turbidity = (formData.get("turbidity") as string)?.trim() || "No"
    const colour = (formData.get("colour") as string)?.trim() || "Clear"
    const smell = (formData.get("smell") as string)?.trim() || "Okay"

    const condBeforeStr = formData.get("condBefore") as string
    const condAfterStr = formData.get("condAfter") as string
    const uvIntensity = (formData.get("uvIntensity") as string)?.trim() || null
    const uvOperatingHours = (formData.get("uvOperatingHours") as string)?.trim() || null
    const uvRunningDays = (formData.get("uvRunningDays") as string)?.trim() || null
    const remarks = (formData.get("remarks") as string)?.trim() || null
    const performedSignature = formData.get("performedSignature") as string | null

    if (!dateTimeStr) {
      return { success: false, error: "Please select Date & Time." }
    }

    if (!picName) {
      return { success: false, error: "PIC Name is required." }
    }

    // Resolve pH value
    let finalPh = phSelection
    if (phSelection === "Others") {
      if (!phCustom) {
        return { success: false, error: "Please specify custom pH value." }
      }
      finalPh = phCustom
    }

    if (!finalPh) {
      return { success: false, error: "Please select or enter pH value." }
    }

    if (!performedSignature) {
      return { success: false, error: "Please provide your digital signature before submitting." }
    }

    const parsedDate = new Date(dateTimeStr)
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Invalid Date & Time value provided." }
    }

    // Parse Conductivity values & compute performance %
    const condBefore = condBeforeStr && !isNaN(Number(condBeforeStr)) ? parseFloat(condBeforeStr) : null
    const condAfter = condAfterStr && !isNaN(Number(condAfterStr)) ? parseFloat(condAfterStr) : null

    let condPerformance: number | null = null
    if (condBefore !== null && condAfter !== null && condBefore > 0) {
      // Formula: ((Before - After) / Before) * 100
      const computed = ((condBefore - condAfter) / condBefore) * 100
      condPerformance = Math.round(computed * 100) / 100
    }

    const record = await prisma.productionWaterQualityRO.create({
      data: {
        dateTime: parsedDate,
        picName,
        ph: finalPh,
        turbidity,
        colour,
        smell,
        condBefore,
        condAfter,
        condPerformance,
        uvIntensity,
        uvOperatingHours,
        uvRunningDays,
        remarks,
        performedSignature,
      },
    })

    revalidatePath("/forms/maintenance/reports/water-quality-ro")
    revalidatePath("/forms/maintenance")

    return { success: true, id: record.id }
  } catch (error: any) {
    console.error("Error submitting Water Quality RO record:", error)
    return { success: false, error: error.message || "Failed to submit Water Quality RO record." }
  }
}

export interface WaterQualityROFilterParams {
  month?: number
  year?: number
  startDate?: string
  endDate?: string
  search?: string
}

export async function getWaterQualityRORecords(params: WaterQualityROFilterParams = {}) {
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
        { ph: { contains: q, mode: "insensitive" } },
        { colour: { contains: q, mode: "insensitive" } },
        { smell: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
        { uvIntensity: { contains: q, mode: "insensitive" } },
      ]
    }

    const records = await prisma.productionWaterQualityRO.findMany({
      where,
      orderBy: { dateTime: "desc" },
    })

    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching Water Quality RO records:", error)
    return { success: false, error: error.message || "Failed to fetch records.", data: [] }
  }
}

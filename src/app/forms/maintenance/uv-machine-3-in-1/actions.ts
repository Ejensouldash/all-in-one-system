"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export interface UVMachineFormData {
  id?: string
  date: string // "YYYY-MM-DD"

  // LINE 1 (800ML)
  line1Intensity?: string | null
  line1OperatingHours?: string | null
  line1RunningDays?: string | null
  line1Time?: string | null
  line1Pic?: string | null
  line1Signature?: string | null
  line1Remarks?: string | null

  // LINE 2 (425ML)
  line2MachineStatus?: string | null // "Green Light" | "Red Light"
  line2Time?: string | null
  line2Pic?: string | null
  line2Signature?: string | null
  line2Remarks?: string | null

  submissionType?: "ALL" | "LINE1" | "LINE2"
}

export interface SaveUVMachineResult {
  success: boolean
  error?: string
  id?: string
  message?: string
}

export async function getUVMachineRecordByDate(dateStr: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please log in first." }
    }

    if (!dateStr) {
      return { success: false, error: "Date parameter is required." }
    }

    const start = new Date(`${dateStr}T00:00:00.000Z`)
    const end = new Date(`${dateStr}T23:59:59.999Z`)

    const record = await prisma.productionUVMachineChecklist.findFirst({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    })

    if (!record) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        ...record,
        date: record.date.toISOString().split("T")[0],
      },
    }
  } catch (error: any) {
    console.error("Error fetching UV Machine record by date:", error)
    return { success: false, error: error.message || "Failed to fetch UV Machine record." }
  }
}

export async function saveUVMachineRecord(data: UVMachineFormData): Promise<SaveUVMachineResult> {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized. Please log in first." }
    }

    if (!data.date) {
      return { success: false, error: "Inspection Date is required." }
    }

    const start = new Date(`${data.date}T00:00:00.000Z`)
    const end = new Date(`${data.date}T23:59:59.999Z`)

    // Check if a record already exists for this date
    let existing = null
    if (data.id) {
      existing = await prisma.productionUVMachineChecklist.findUnique({
        where: { id: data.id },
      })
    }
    if (!existing) {
      existing = await prisma.productionUVMachineChecklist.findFirst({
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
      })
    }

    const recordDate = new Date(`${data.date}T00:00:00.000Z`)

    if (existing) {
      // Build update payload based on submissionType
      const updateData: any = {}

      if (data.submissionType === "LINE1") {
        updateData.line1Intensity = data.line1Intensity?.trim() || null
        updateData.line1OperatingHours = data.line1OperatingHours?.trim() || null
        updateData.line1RunningDays = data.line1RunningDays?.trim() || null
        updateData.line1Time = data.line1Time?.trim() || null
        updateData.line1Pic = data.line1Pic?.trim() || null
        if (data.line1Signature) updateData.line1Signature = data.line1Signature
        updateData.line1Remarks = data.line1Remarks?.trim() || null
      } else if (data.submissionType === "LINE2") {
        updateData.line2MachineStatus = data.line2MachineStatus?.trim() || null
        updateData.line2Time = data.line2Time?.trim() || null
        updateData.line2Pic = data.line2Pic?.trim() || null
        if (data.line2Signature) updateData.line2Signature = data.line2Signature
        updateData.line2Remarks = data.line2Remarks?.trim() || null
      } else {
        // ALL or unspecified: update both lines
        updateData.line1Intensity = data.line1Intensity?.trim() || null
        updateData.line1OperatingHours = data.line1OperatingHours?.trim() || null
        updateData.line1RunningDays = data.line1RunningDays?.trim() || null
        updateData.line1Time = data.line1Time?.trim() || null
        updateData.line1Pic = data.line1Pic?.trim() || null
        if (data.line1Signature) updateData.line1Signature = data.line1Signature
        updateData.line1Remarks = data.line1Remarks?.trim() || null

        updateData.line2MachineStatus = data.line2MachineStatus?.trim() || null
        updateData.line2Time = data.line2Time?.trim() || null
        updateData.line2Pic = data.line2Pic?.trim() || null
        if (data.line2Signature) updateData.line2Signature = data.line2Signature
        updateData.line2Remarks = data.line2Remarks?.trim() || null
      }

      const updated = await prisma.productionUVMachineChecklist.update({
        where: { id: existing.id },
        data: updateData,
      })

      revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
      revalidatePath("/forms/maintenance/uv-machine-3-in-1")
      revalidatePath("/forms/maintenance")

      return {
        success: true,
        id: updated.id,
        message: data.submissionType === "LINE1"
          ? "Line 1 (800ML) record updated successfully!"
          : data.submissionType === "LINE2"
            ? "Line 2 (425ML) record updated successfully!"
            : "UV Machine checklist saved successfully!",
      }
    } else {
      // Create brand new record strictly scoped to submissionType
      const createData: any = {
        date: recordDate,
      }

      if (data.submissionType === "LINE1") {
        createData.line1Intensity = data.line1Intensity?.trim() || null
        createData.line1OperatingHours = data.line1OperatingHours?.trim() || null
        createData.line1RunningDays = data.line1RunningDays?.trim() || null
        createData.line1Time = data.line1Time?.trim() || null
        createData.line1Pic = data.line1Pic?.trim() || null
        createData.line1Signature = data.line1Signature || null
        createData.line1Remarks = data.line1Remarks?.trim() || null

        createData.line2MachineStatus = null
        createData.line2Time = null
        createData.line2Pic = null
        createData.line2Signature = null
        createData.line2Remarks = null
      } else if (data.submissionType === "LINE2") {
        createData.line1Intensity = null
        createData.line1OperatingHours = null
        createData.line1RunningDays = null
        createData.line1Time = null
        createData.line1Pic = null
        createData.line1Signature = null
        createData.line1Remarks = null

        createData.line2MachineStatus = data.line2MachineStatus?.trim() || null
        createData.line2Time = data.line2Time?.trim() || null
        createData.line2Pic = data.line2Pic?.trim() || null
        createData.line2Signature = data.line2Signature || null
        createData.line2Remarks = data.line2Remarks?.trim() || null
      } else {
        createData.line1Intensity = data.line1Intensity?.trim() || null
        createData.line1OperatingHours = data.line1OperatingHours?.trim() || null
        createData.line1RunningDays = data.line1RunningDays?.trim() || null
        createData.line1Time = data.line1Time?.trim() || null
        createData.line1Pic = data.line1Pic?.trim() || null
        createData.line1Signature = data.line1Signature || null
        createData.line1Remarks = data.line1Remarks?.trim() || null

        createData.line2MachineStatus = data.line2MachineStatus?.trim() || null
        createData.line2Time = data.line2Time?.trim() || null
        createData.line2Pic = data.line2Pic?.trim() || null
        createData.line2Signature = data.line2Signature || null
        createData.line2Remarks = data.line2Remarks?.trim() || null
      }

      const created = await prisma.productionUVMachineChecklist.create({
        data: createData,
      })

      revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
      revalidatePath("/forms/maintenance/uv-machine-3-in-1")
      revalidatePath("/forms/maintenance")

      return {
        success: true,
        id: created.id,
        message: data.submissionType === "LINE1"
          ? "Line 1 (800ML) record created successfully!"
          : data.submissionType === "LINE2"
            ? "Line 2 (425ML) record created successfully!"
            : "UV Machine checklist saved successfully!",
      }
    }
  } catch (error: any) {
    console.error("Error saving UV Machine record:", error)
    return { success: false, error: error.message || "Failed to save record." }
  }
}

export interface UVMachineFilterParams {
  month?: number
  year?: number
  startDate?: string
  endDate?: string
  search?: string
}

export async function getUVMachineRecords(params: UVMachineFilterParams = {}) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized", data: [] }
    }

    const where: any = {}

    if (params.startDate || params.endDate) {
      where.date = {}
      if (params.startDate) {
        where.date.gte = new Date(`${params.startDate}T00:00:00.000Z`)
      }
      if (params.endDate) {
        where.date.lte = new Date(`${params.endDate}T23:59:59.999Z`)
      }
    } else if (params.month && params.year) {
      const start = new Date(Date.UTC(params.year, params.month - 1, 1, 0, 0, 0))
      const lastDay = new Date(params.year, params.month, 0).getDate()
      const end = new Date(Date.UTC(params.year, params.month - 1, lastDay, 23, 59, 59, 999))
      where.date = {
        gte: start,
        lte: end,
      }
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim()
      where.OR = [
        { line1Pic: { contains: q, mode: "insensitive" } },
        { line2Pic: { contains: q, mode: "insensitive" } },
        { line1Intensity: { contains: q, mode: "insensitive" } },
        { line2MachineStatus: { contains: q, mode: "insensitive" } },
        { line1Remarks: { contains: q, mode: "insensitive" } },
        { line2Remarks: { contains: q, mode: "insensitive" } },
      ]
    }

    const records = await prisma.productionUVMachineChecklist.findMany({
      where,
      orderBy: { date: "desc" },
    })

    return { success: true, data: records }
  } catch (error: any) {
    console.error("Error fetching UV Machine records:", error)
    return { success: false, error: error.message || "Failed to fetch records.", data: [] }
  }
}

export async function deleteUVMachineRecord(id: string) {
  try {
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: "Unauthorized" }
    }

    await prisma.productionUVMachineChecklist.delete({
      where: { id },
    })

    revalidatePath("/forms/maintenance/reports/uv-machine-3-in-1")
    revalidatePath("/forms/maintenance/uv-machine-3-in-1")
    revalidatePath("/forms/maintenance")

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting UV Machine record:", error)
    return { success: false, error: error.message || "Failed to delete record." }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const MACHINES = [
  "AUTO SCRAMBLER",
  "3 IN 1 MACHINE",
  "BLOWER MACHINE",
  "LABEL MACHINE",
  "PRINTER MACHINE",
  "WEIGHING MACHINE",
  "SEALER MACHINE",
  "ROBOTIC ARM MACHINE",
  "WRAPPING MACHINE",
  "SAND FILTER",
  "ACTIVATED CARBON FILTER",
  "HOLLOW MEMBRANE FILTER",
  "UV MACHINE",
  "AIR COMPRESSOR",
  "GENSET",
  "RAW WATER TANK PUMP",
  "RAW TANK",
  "FILTERED TANK",
  "WELL"
]

export type ShiftType = "MORNING" | "NIGHT"
export type LineType = "800ML" | "425ML"

export async function getMaintenanceRecordByDate(dateStr: string) {
  try {
    const selected = new Date(dateStr)
    const startOfDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999)

    const record = await prisma.maintenanceEquipmentRecord.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    })

    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error fetching MaintenanceEquipmentRecord by date:", error)
    return { success: false, error: error.message }
  }
}

export async function saveMaintenanceShiftRecord(data: {
  date: Date
  line: LineType
  shift: ShiftType
  activities: Record<string, string> // machine -> status/remarks
  checkedBy: string
  signature: string
  verifiedBy?: string
  verifiedSig?: string
  remarks?: string
}) {
  try {
    const selected = new Date(data.date)
    const startOfDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 23, 59, 59, 999)

    const existing = await prisma.maintenanceEquipmentRecord.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    })

    // Prepare merged activities array
    let currentActivities: any[] = []
    if (existing && Array.isArray(existing.activities)) {
      currentActivities = existing.activities
    }

    const fieldKey = data.line === "800ML"
      ? (data.shift === "MORNING" ? "ml800Morning" : "ml800Night")
      : (data.shift === "MORNING" ? "ml425Morning" : "ml425Night")

    const updatedActivities = MACHINES.map(machine => {
      const found = currentActivities.find((a: any) => a.activity === machine) || {}
      return {
        activity: machine,
        ml800Morning: fieldKey === "ml800Morning" ? (data.activities[machine] || "") : (found.ml800Morning || ""),
        ml800Night: fieldKey === "ml800Night" ? (data.activities[machine] || "") : (found.ml800Night || ""),
        ml425Morning: fieldKey === "ml425Morning" ? (data.activities[machine] || "") : (found.ml425Morning || ""),
        ml425Night: fieldKey === "ml425Night" ? (data.activities[machine] || "") : (found.ml425Night || ""),
      }
    })

    const updateData: any = {
      activities: updatedActivities,
      remarks: data.remarks || existing?.remarks || "",
    }

    if (data.line === "800ML" && data.shift === "MORNING") {
      updateData.checkedBy800M = data.checkedBy
      updateData.signature800M = data.signature
      if (data.verifiedBy) updateData.verifiedBy800M = data.verifiedBy
      if (data.verifiedSig) updateData.verifiedSig800M = data.verifiedSig
    } else if (data.line === "800ML" && data.shift === "NIGHT") {
      updateData.checkedBy800N = data.checkedBy
      updateData.signature800N = data.signature
      if (data.verifiedBy) updateData.verifiedBy800N = data.verifiedBy
      if (data.verifiedSig) updateData.verifiedSig800N = data.verifiedSig
    } else if (data.line === "425ML" && data.shift === "MORNING") {
      updateData.checkedBy425M = data.checkedBy
      updateData.signature425M = data.signature
      if (data.verifiedBy) updateData.verifiedBy425M = data.verifiedBy
      if (data.verifiedSig) updateData.verifiedSig425M = data.verifiedSig
    } else if (data.line === "425ML" && data.shift === "NIGHT") {
      updateData.checkedBy425N = data.checkedBy
      updateData.signature425N = data.signature
      if (data.verifiedBy) updateData.verifiedBy425N = data.verifiedBy
      if (data.verifiedSig) updateData.verifiedSig425N = data.verifiedSig
    }

    // Set fallback checkedBy
    if (!existing?.checkedBy) {
      updateData.checkedBy = data.checkedBy
    }

    let record
    if (existing) {
      record = await prisma.maintenanceEquipmentRecord.update({
        where: { id: existing.id },
        data: updateData,
      })
    } else {
      record = await prisma.maintenanceEquipmentRecord.create({
        data: {
          date: startOfDay,
          checkedBy: data.checkedBy,
          ...updateData,
        }
      })
    }

    revalidatePath("/forms/maintenance/maintenance-record")
    revalidatePath("/forms/maintenance/reports/maintenance-record")
    revalidatePath("/forms/maintenance/summary")
    return { success: true, data: record }
  } catch (error: any) {
    console.error("Error saving MaintenanceShiftRecord:", error)
    return { success: false, error: error.message }
  }
}

export async function createMaintenanceEquipmentRecord(data: {
  date: Date
  activities: any
  checkedBy: string
  performedSignature?: string
  checkedBy800M?: string
  signature800M?: string
  verifiedBy800M?: string
  verifiedSig800M?: string
  checkedBy800N?: string
  signature800N?: string
  verifiedBy800N?: string
  verifiedSig800N?: string
  checkedBy425M?: string
  signature425M?: string
  verifiedBy425M?: string
  verifiedSig425M?: string
  checkedBy425N?: string
  signature425N?: string
  verifiedBy425N?: string
  verifiedSig425N?: string
  remarks?: string
}) {
  try {
    const record = await prisma.maintenanceEquipmentRecord.create({
      data: {
        date: data.date,
        activities: data.activities,
        checkedBy: data.checkedBy,
        performedSignature: data.performedSignature,
        checkedBy800M: data.checkedBy800M,
        signature800M: data.signature800M,
        verifiedBy800M: data.verifiedBy800M,
        verifiedSig800M: data.verifiedSig800M,
        checkedBy800N: data.checkedBy800N,
        signature800N: data.signature800N,
        verifiedBy800N: data.verifiedBy800N,
        verifiedSig800N: data.verifiedSig800N,
        checkedBy425M: data.checkedBy425M,
        signature425M: data.signature425M,
        verifiedBy425M: data.verifiedBy425M,
        verifiedSig425M: data.verifiedSig425M,
        checkedBy425N: data.checkedBy425N,
        signature425N: data.signature425N,
        verifiedBy425N: data.verifiedBy425N,
        verifiedSig425N: data.verifiedSig425N,
        remarks: data.remarks,
      }
    })

    revalidatePath("/forms/maintenance/maintenance-record")
    revalidatePath("/forms/maintenance/reports/maintenance-record")
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
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)
    
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

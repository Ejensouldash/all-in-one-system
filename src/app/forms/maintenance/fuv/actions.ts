"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { Prisma, MaintenanceHazardProcessControl } from "@prisma/client"
import {
  type FUVRow,
  type FUVFormData,
  type MergedDailyFUVRecord,
  DAY_SHIFT_TIMES,
  ALL_SHIFT_TIMES,
  isPG02Breach,
  isPG05Breach,
  isUVIntensityBreach,
  createEmptyFUVRow,
} from "./types"

export type { FUVRow, FUVFormData, MergedDailyFUVRecord }

export async function getHazardProcessRecordByDateAndShift(dateStr: string, shift: "DAY" | "NIGHT") {
  try {
    const targetDateStart = new Date(`${dateStr}T00:00:00.000Z`)
    const targetDateEnd = new Date(`${dateStr}T23:59:59.999Z`)

    const record = await prisma.maintenanceHazardProcessControl.findFirst({
      where: {
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        shift,
      },
    })

    if (!record) return { success: true, data: null }

    return {
      success: true,
      data: {
        ...record,
        date: record.date.toISOString().split("T")[0],
        rows: (record.rows as unknown as FUVRow[]) || [],
      },
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error fetching FUV record by date & shift:", err)
    return { success: false, error: err.message || "Failed to fetch record." }
  }
}

export async function createOrUpdateHazardProcessRecord(data: FUVFormData) {
  try {
    const targetDate = new Date(`${data.date}T00:00:00.000Z`)
    const targetDateStart = new Date(`${data.date}T00:00:00.000Z`)
    const targetDateEnd = new Date(`${data.date}T23:59:59.999Z`)

    // Check if record already exists for this date and shift
    const existing = await prisma.maintenanceHazardProcessControl.findFirst({
      where: {
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        shift: data.shift,
      },
    })

    if (existing && existing.isLocked) {
      return {
        success: false,
        error: "Rekod ini telah disahkan dan dikunci oleh Penyelia / QC. Pengubahsuaian tidak dibenarkan.",
      }
    }

    // Validate CCP parameters server-side: if any non-off reading breaches CCP limits, remarks is mandatory
    const ccpBreach = (data.rows || []).some(
      (r) =>
        !r.isOff &&
        (isPG02Breach(r.pg02) || isPG05Breach(r.pg05) || isUVIntensityBreach(r.uvIntensity))
    )
    if (ccpBreach && !data.remarks?.trim()) {
      return {
        success: false,
        error:
          "AMARAN CCP: Terdapat parameter CCP yang melebihi/di luar had piawai (PG02 > 3 Bar, PG05 > 2 Bar, atau UV Intensity < 80% / > 99%). Ruangan Catatan / Tindakan Pembetulan (Corrective Action) WAJIB diisi.",
      }
    }

    let savedRecord: MaintenanceHazardProcessControl
    if (existing) {
      savedRecord = await prisma.maintenanceHazardProcessControl.update({
        where: { id: existing.id },
        data: {
          rows: data.rows as unknown as Prisma.InputJsonValue,
          remarks: data.remarks?.trim() || null,
          checkedBy: data.checkedBy,
          performedSignature: data.performedSignature || existing.performedSignature,
          verifiedBy: data.verifiedBy || existing.verifiedBy,
          verifiedSignature: data.verifiedSignature || existing.verifiedSignature,
        },
      })
    } else {
      savedRecord = await prisma.maintenanceHazardProcessControl.create({
        data: {
          date: targetDate,
          shift: data.shift,
          rows: data.rows as unknown as Prisma.InputJsonValue,
          remarks: data.remarks?.trim() || null,
          checkedBy: data.checkedBy,
          performedSignature: data.performedSignature || null,
          verifiedBy: data.verifiedBy || null,
          verifiedSignature: data.verifiedSignature || null,
        },
      })
    }

    revalidatePath("/forms/maintenance/fuv")
    revalidatePath("/forms/maintenance/reports/fuv")
    revalidatePath("/forms/maintenance/summary")

    return { success: true, data: savedRecord }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error saving FUV record:", err)
    return { success: false, error: err.message || "Gagal menyimpan rekod FUV." }
  }
}

export async function getHazardProcessRecords(month: number, year: number) {
  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

    const rawRecords = await prisma.maintenanceHazardProcessControl.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: "asc" }, { shift: "asc" }],
    })

    // Group records by YYYY-MM-DD
    const dateMap = new Map<
      string,
      { day: MaintenanceHazardProcessControl | null; night: MaintenanceHazardProcessControl | null }
    >()

    for (const rec of rawRecords) {
      const dateStr = rec.date.toISOString().split("T")[0]
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { day: null, night: null })
      }
      const entry = dateMap.get(dateStr)!
      if (rec.shift === "DAY") {
        entry.day = rec
      } else if (rec.shift === "NIGHT") {
        entry.night = rec
      }
    }

    const mergedDailyRecords: MergedDailyFUVRecord[] = []

    for (const [dateStr, shifts] of dateMap.entries()) {
      const dayRec = shifts.day
      const nightRec = shifts.night

      const dayRows = (dayRec?.rows as unknown as FUVRow[]) || []
      const nightRows = (nightRec?.rows as unknown as FUVRow[]) || []

      // Build 12 rows: 6 day + 6 night
      const rows: FUVRow[] = ALL_SHIFT_TIMES.map((time) => {
        const isDayTime = (DAY_SHIFT_TIMES as readonly string[]).includes(time)
        const sourceRows = isDayTime ? dayRows : nightRows
        const matched = sourceRows.find((r) => r.time === time)
        const defaultVerifier = isDayTime ? dayRec?.verifiedBy || "" : nightRec?.verifiedBy || ""
        if (matched) {
          return {
            ...matched,
            verifiedBy: matched.verifiedBy || defaultVerifier,
          }
        }

        return createEmptyFUVRow(
          time,
          isDayTime ? dayRec?.checkedBy || "" : nightRec?.checkedBy || ""
        )
      })

      // Shift-aware lock status: true if both shifts recorded and locked, or if single recorded shift is locked
      const isLocked = Boolean(
        dayRec && nightRec
          ? dayRec.isLocked && nightRec.isLocked
          : (dayRec || nightRec)?.isLocked
      )

      mergedDailyRecords.push({
        date: dateStr,
        dayRecord: dayRec,
        nightRecord: nightRec,
        rows,
        checkedByDay: dayRec?.checkedBy,
        performedSignatureDay: dayRec?.performedSignature || undefined,
        checkedByNight: nightRec?.checkedBy,
        performedSignatureNight: nightRec?.performedSignature || undefined,
        verifiedBy: nightRec?.verifiedBy || dayRec?.verifiedBy || undefined,
        verifiedSignature: nightRec?.verifiedSignature || dayRec?.verifiedSignature || undefined,
        remarksDay: dayRec?.remarks || undefined,
        remarksNight: nightRec?.remarks || undefined,
        isLocked,
      })
    }

    return {
      success: true,
      rawRecords,
      data: mergedDailyRecords,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error fetching FUV records for month/year:", err)
    return { success: false, error: err.message || "Failed to load records." }
  }
}

export async function deleteHazardProcessRecord(id: string) {
  try {
    await prisma.maintenanceHazardProcessControl.delete({
      where: { id },
    })
    revalidatePath("/forms/maintenance/fuv")
    revalidatePath("/forms/maintenance/reports/fuv")
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: unknown) {
    const err = error as Error
    console.error("Error deleting FUV record:", err)
    return { success: false, error: err.message || "Failed to delete record." }
  }
}

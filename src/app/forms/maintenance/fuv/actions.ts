"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { Prisma, MaintenanceHazardProcessControl } from "@prisma/client"

export const DAY_SHIFT_TIMES = [
  "7.30 am",
  "9.30 am",
  "11.30 am",
  "1.30 pm",
  "3.30 pm",
  "5.30 pm",
] as const

export const NIGHT_SHIFT_TIMES = [
  "7.30 pm",
  "9.30 pm",
  "11.30 pm",
  "1.30 am",
  "3.30 am",
  "5.30 am",
] as const

export const ALL_SHIFT_TIMES = [
  ...DAY_SHIFT_TIMES,
  ...NIGHT_SHIFT_TIMES,
] as const

export interface FUVRow {
  time: string
  isOff?: boolean
  vfd01?: string
  vfd02?: string
  sp01Ph?: string
  sp01Status?: string
  cs02?: string
  pg01?: string
  pt01?: string
  sp02Ph?: string
  sp02Status?: string
  sp03Ph?: string
  sp03Status?: string
  pg02?: string // CCP1 (Max 3 Bar)
  pg03?: string
  pt02?: string
  pt03?: string
  pg04?: string
  pg05?: string // CCP1 (Max 2 Bar)
  cs01?: string
  fm01?: string
  pg06?: string
  fm02?: string
  uvIntensity?: string // CCP2 (80 - 99%)
  operatingHour?: string
  totalRunningDays?: string
  checkedBy?: string
  verifiedBy?: string
}

export function parseFUVNumeric(val?: string): number | null {
  if (!val || typeof val !== "string" || !val.trim()) return null
  const cleaned = val.replace(/[^0-9.-]/g, "")
  if (!cleaned) return null
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export function isPG02Breach(val?: string, isOff = false): boolean {
  if (isOff) return false
  const n = parseFUVNumeric(val)
  return n !== null && n > 3.0
}

export function isPG05Breach(val?: string, isOff = false): boolean {
  if (isOff) return false
  const n = parseFUVNumeric(val)
  return n !== null && n > 2.0
}

export function isUVIntensityBreach(val?: string, isOff = false): boolean {
  if (isOff) return false
  const n = parseFUVNumeric(val)
  return n !== null && (n < 80 || n > 99)
}

export interface FUVFormData {
  id?: string
  date: string // "YYYY-MM-DD"
  shift: "DAY" | "NIGHT"
  rows: FUVRow[]
  remarks?: string
  checkedBy: string
  performedSignature?: string
  verifiedBy?: string
  verifiedSignature?: string
  isLocked?: boolean
}

export function createEmptyFUVRow(time: string, initialCheckedBy = ""): FUVRow {
  return {
    time,
    isOff: false,
    vfd01: "",
    vfd02: "",
    sp01Ph: "",
    sp01Status: "Clear / No Colour",
    cs02: "",
    pg01: "",
    pt01: "",
    sp02Ph: "",
    sp02Status: "Clear / No Colour",
    sp03Ph: "",
    sp03Status: "Clear / No Colour",
    pg02: "",
    pg03: "",
    pt02: "",
    pt03: "",
    pg04: "",
    pg05: "",
    cs01: "",
    fm01: "",
    pg06: "",
    fm02: "",
    uvIntensity: "",
    operatingHour: "",
    totalRunningDays: "",
    checkedBy: initialCheckedBy,
    verifiedBy: "",
  }
}

export function getDefaultShiftRows(shift: "DAY" | "NIGHT", checkedBy = ""): FUVRow[] {
  const times = shift === "DAY" ? DAY_SHIFT_TIMES : NIGHT_SHIFT_TIMES
  return times.map((t) => createEmptyFUVRow(t, checkedBy))
}

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

export interface MergedDailyFUVRecord {
  date: string // "YYYY-MM-DD"
  dayRecord: MaintenanceHazardProcessControl | null
  nightRecord: MaintenanceHazardProcessControl | null
  rows: FUVRow[] // 12 rows
  checkedByDay?: string
  performedSignatureDay?: string
  checkedByNight?: string
  performedSignatureNight?: string
  verifiedBy?: string
  verifiedSignature?: string
  remarksDay?: string
  remarksNight?: string
  isLocked: boolean
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

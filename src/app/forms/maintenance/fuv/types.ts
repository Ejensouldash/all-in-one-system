import type { MaintenanceHazardProcessControl } from "@prisma/client"

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

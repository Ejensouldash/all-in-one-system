/**
 * Batch Number Date & Shift Decoder for Bubbles O2 Customer Care
 * 
 * Batch Number Format: DDWWYY-SS
 * - DD = Day of week (01 = Monday, 02 = Tuesday, 03 = Wednesday, 04 = Thursday, 05 = Friday, 06 = Saturday, 07 = Sunday)
 * - WW = ISO 8601 Week number (01 to 53)
 * - YY = Year (e.g. 26 = 2026)
 * - SS = Shift suffix (-01 = Shift AM, -02 = Shift PM)
 * 
 * Example:
 * 013526-01 -> Monday, 24 August 2026 · Shift AM (Week 35)
 */

export interface DecodedBatchInfo {
  raw: string
  isValid: boolean
  dayNum?: number
  dayName?: string
  dayShort?: string
  isoWeek?: number
  year?: number
  shiftCode?: string
  shiftName?: string
  date?: Date
  dateStr?: string // e.g. "24/08/2026"
  fullDate?: string // e.g. "Monday, 24 August 2026"
  summary?: string // e.g. "24/08/2026 (Monday · Shift AM)"
  detail?: string // e.g. "Mon, 24 Aug 2026 · Shift AM (Week 35)"
}

const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function isoWeekToDate(year: number, week: number, dayOfWeek: number): Date {
  // In ISO 8601, Jan 4 is always in Week 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7 // 1=Mon, 7=Sun
  const monWeek1 = new Date(Date.UTC(year, 0, 4 - jan4Day + 1))
  const targetTime = monWeek1.getTime() + ((week - 1) * 7 + (dayOfWeek - 1)) * 86400000
  return new Date(targetTime)
}

export function decodeBottleBatchNumber(rawBatch: string | null | undefined): DecodedBatchInfo | null {
  if (!rawBatch) return null
  const clean = rawBatch.trim().toUpperCase()
  if (!clean) return null

  // Matches DDWWYY with optional shift suffix: -01, -02, -AM, -PM, etc.
  // Also supports prefixes if present (e.g. BM1-425-013526-01)
  const regex = /(?:.*-)?(\d{2})(\d{2})(\d{2})(?:[-_](\d{2}|AM|PM))?$/i
  const match = regex.exec(clean)

  if (!match) {
    return { raw: clean, isValid: false }
  }

  const dayNum = parseInt(match[1], 10)
  const isoWeek = parseInt(match[2], 10)
  const rawYear = parseInt(match[3], 10)
  const rawShift = match[4]

  // Validate day: 1 to 7 (01=Monday ... 07=Sunday)
  if (dayNum < 1 || dayNum > 7) {
    return { raw: clean, isValid: false }
  }

  // Validate week: 1 to 53
  if (isoWeek < 1 || isoWeek > 53) {
    return { raw: clean, isValid: false }
  }

  const year = 2000 + rawYear
  const calendarDate = isoWeekToDate(year, isoWeek, dayNum)

  const dayName = DAYS_FULL[dayNum - 1]
  const dayShort = DAYS_SHORT[dayNum - 1]

  let shiftName: string | undefined = undefined
  if (rawShift === "01" || rawShift === "AM") {
    shiftName = "Shift AM"
  } else if (rawShift === "02" || rawShift === "PM") {
    shiftName = "Shift PM"
  } else if (rawShift) {
    shiftName = `Shift ${rawShift}`
  }

  const dd = String(calendarDate.getUTCDate()).padStart(2, "0")
  const mm = String(calendarDate.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = calendarDate.getUTCFullYear()
  const monthName = MONTH_NAMES[calendarDate.getUTCMonth()]

  const dateStr = `${dd}/${mm}/${yyyy}`
  const fullDate = `${dayName}, ${dd} ${monthName} ${yyyy}`
  
  const summaryParts = [dateStr, dayName]
  if (shiftName) summaryParts.push(shiftName)
  const summary = `${dateStr} (${dayName}${shiftName ? ` · ${shiftName}` : ""})`

  const detailParts = [`${dayShort}, ${dd} ${monthName.slice(0, 3)} ${yyyy}`]
  if (shiftName) detailParts.push(shiftName)
  detailParts.push(`(Week ${isoWeek})`)
  const detail = detailParts.join(" · ")

  return {
    raw: clean,
    isValid: true,
    dayNum,
    dayName,
    dayShort,
    isoWeek,
    year,
    shiftCode: rawShift,
    shiftName,
    date: calendarDate,
    dateStr,
    fullDate,
    summary,
    detail,
  }
}

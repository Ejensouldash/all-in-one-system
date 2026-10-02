import { setISOWeek, startOfISOWeek, endOfISOWeek, format, getISOWeeksInYear, getISOWeek } from "date-fns"

export interface ISOWeekOption {
  week: number
  label: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  rangeLabel: string // e.g. "28 Sep - 04 Oct 2026"
  isCurrent: boolean
}

export interface ISOWeekRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  startFormatted: string // DD/MM/YYYY
  endFormatted: string   // DD/MM/YYYY
  shortRange: string     // "28 Sep - 04 Oct 2026"
}

/**
 * Computes start (Monday) and end (Sunday) dates for an ISO 8601 week in a given year.
 * In ISO 8601, January 4 is guaranteed to be in Week 1.
 */
export function getISOWeekDateRange(year: number, week: number): ISOWeekRange {
  const jan4 = new Date(year, 0, 4)
  const targetDate = setISOWeek(jan4, week)
  const start = startOfISOWeek(targetDate)
  const end = endOfISOWeek(targetDate)

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    startFormatted: format(start, "dd/MM/yyyy"),
    endFormatted: format(end, "dd/MM/yyyy"),
    shortRange: `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy")}`,
  }
}

/**
 * Returns all ISO weeks for a given year with friendly labels and dates.
 */
export function getISOWeeksForYear(year: number): ISOWeekOption[] {
  const jan4 = new Date(year, 0, 4)
  const totalWeeks = getISOWeeksInYear(jan4)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentWeek = getISOWeek(now)

  const options: ISOWeekOption[] = []
  for (let w = 1; w <= totalWeeks; w++) {
    const range = getISOWeekDateRange(year, w)
    options.push({
      week: w,
      label: `Week ${String(w).padStart(2, "0")}`,
      startDate: range.startDate,
      endDate: range.endDate,
      rangeLabel: range.shortRange,
      isCurrent: year === currentYear && w === currentWeek,
    })
  }
  return options
}

/**
 * Returns the current ISO year and week number.
 */
export function getCurrentISOWeek(): { year: number; week: number } {
  const now = new Date()
  return {
    year: now.getFullYear(),
    week: getISOWeek(now),
  }
}

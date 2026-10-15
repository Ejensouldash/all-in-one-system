// Date-only MYT values are deliberately independent of browser/server time zones.
export type PMRule = { startDate: string; intervalUnit: string; intervalCount: number }
export type PMInput = PMRule & { equipment: string; srs: string | null; checklist: string[]; picIds: string[] }
export type PMSourceRow = { sheet: string; row: number; date: string; equipment: string; srs: string | null; frequency: string; pic: string; task: string }
export type PMGroup = PMInput & { sourceKey: string; sourceRows: PMSourceRow[]; targetId?: string; reviewed: boolean }
export type PMUser = { id: string; name: string; email: string; eligible: boolean }

export function mytDate(now = new Date()) { return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10) }
export function validDate(value: string): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2199 && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function addDays(date: string, days: number) { return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10) }
export const VALID_DAY_INTERVALS = [1, 7, 14, 28, 42, 84, 168, 336]
export const VALID_MONTH_INTERVALS = [1, 2, 3, 6, 12]

export function frequencyRule(raw: string) {
  const key = raw.trim().toLowerCase()
  if (key === "daily" || key === "daily (mon - sat)" || key === "daily until clear" || key === "mon-sat" || key === "harian") {
    return { intervalUnit: "MON_SAT", intervalCount: 1 }
  }
  if (key === "1 week" || key === "every 1 week" || key === "weekly" || key === "1 minggu") {
    return { intervalUnit: "DAY", intervalCount: 7 }
  }
  if (key === "2 weeks" || key === "every 2 weeks" || key === "2 minggu") {
    return { intervalUnit: "DAY", intervalCount: 14 }
  }
  if (key === "4 weeks" || key === "every 4 weeks" || key === "1 month" || key === "every 1 month" || key === "monthly" || key === "4 minggu" || key === "sebulan") {
    return { intervalUnit: "DAY", intervalCount: 28 }
  }
  if (key === "6 weeks" || key === "every 6 weeks" || key === "every 300-400 operating hours" || key === "300-400 operating hours" || key === "6 minggu") {
    return { intervalUnit: "DAY", intervalCount: 42 }
  }
  if (key === "12 weeks" || key === "every 12 weeks" || key === "3 months" || key === "every 3 months" || key === "12 minggu" || key === "3 bulan") {
    return { intervalUnit: "DAY", intervalCount: 84 }
  }
  if (key === "24 weeks" || key === "every 24 weeks" || key === "6 months" || key === "every 6 months" || key === "24 minggu" || key === "6 bulan") {
    return { intervalUnit: "DAY", intervalCount: 168 }
  }
  if (key === "48 weeks" || key === "every 48 weeks" || key === "yearly" || key === "1 year" || key === "every 1 year" || key === "setahun") {
    return { intervalUnit: "DAY", intervalCount: 336 }
  }
  const months: Record<string, number> = { "calendar-monthly": 1, "2 months": 2, "calendar-3 months": 3, "calendar-6 months": 6, "calendar-yearly": 12 }
  if (months[key]) return { intervalUnit: "MONTH", intervalCount: months[key] }
  throw new Error(`Frequency not supported: ${raw}`)
}

export function validRule(rule: PMRule) {
  return (
    validDate(rule.startDate) &&
    ((rule.intervalUnit === "DAY" && VALID_DAY_INTERVALS.includes(rule.intervalCount)) ||
      (rule.intervalUnit === "MON_SAT" && rule.intervalCount === 1) ||
      (rule.intervalUnit === "MONTH" && VALID_MONTH_INTERVALS.includes(rule.intervalCount)))
  )
}

export function ruleLabel(rule: Pick<PMRule, "intervalUnit" | "intervalCount">) {
  if (rule.intervalUnit === "MON_SAT" || (rule.intervalUnit === "DAY" && rule.intervalCount === 1)) {
    return "Daily (Mon - Sat)"
  }
  if (rule.intervalUnit === "DAY") {
    switch (rule.intervalCount) {
      case 7:
        return "1 Week"
      case 14:
        return "2 Weeks"
      case 28:
        return "4 Weeks (1 Month)"
      case 42:
        return "6 Weeks (~350 Operating Hours)"
      case 84:
        return "12 Weeks (3 Months)"
      case 168:
        return "24 Weeks (6 Months)"
      case 336:
        return "48 Weeks (1 Year)"
      default:
        return `${rule.intervalCount} Days`
    }
  }
  if (rule.intervalUnit === "MONTH") {
    if (rule.intervalCount === 1) return "Monthly (Calendar)"
    if (rule.intervalCount === 12) return "Yearly (Calendar)"
    return `${rule.intervalCount} Months (Calendar)`
  }
  return `${rule.intervalCount} ${rule.intervalUnit}`
}

export function occurrenceDate(rule: PMRule, index: number): string {
  if (rule.intervalUnit === "MON_SAT") {
    const weeks = Math.floor(index / 6)
    const dayOffset = index % 6
    return addDays(rule.startDate, weeks * 7 + dayOffset)
  }
  if (rule.intervalUnit === "DAY") return addDays(rule.startDate, index * rule.intervalCount)
  const [year, month, day] = rule.startDate.split("-").map(Number)
  const first = new Date(Date.UTC(year, month - 1 + index * rule.intervalCount, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(day, last))
  return first.toISOString().slice(0, 10)
}

export function datesBetween(rule: PMRule, from: string, to: string): string[] {
  if (!validRule(rule) || !validDate(from) || !validDate(to) || from > to) {
    throw new Error("Invalid date range or frequency rule.")
  }
  if (rule.intervalUnit === "MON_SAT") {
    const result: string[] = []
    let current = rule.startDate > from ? rule.startDate : from
    while (current <= to) {
      if (current >= rule.startDate) {
        const dow = new Date(current + "T00:00:00Z").getUTCDay()
        if (dow !== 0) {
          result.push(current)
        }
      }
      current = addDays(current, 1)
    }
    return result
  }
  const result: string[] = []
  // Bound covers the supported date range even for the shortest interval.
  for (let i = 0; i < 8000; i++) {
    const date = occurrenceDate(rule, i)
    if (date > to) break
    if (date >= from) result.push(date)
  }
  return result
}
export function normalizeEquipment(raw: string) {
  const text = raw.trim().replace(/\s+/g, " ")
  if (/^3\s*in1 machine$/i.test(text)) return "3in1 Machine"
  if (/^autoscrambler(?: machine)?$/i.test(text)) return "Autoscrambler Machine"
  return text
}
export function pmStatus(task: { completedAt: unknown; dueDate: string }, today: string) {
  return task.completedAt ? "DONE" : task.dueDate < today ? "OVERDUE" : task.dueDate === today ? "TODAY" : "UPCOMING"
}
export function canCompletePM(
  access: { userId: string; isSuperAdmin: boolean },
  picIds: string[],
  canAssignPic = false
) {
  return access.isSuperAdmin || canAssignPic || picIds.includes(access.userId) || picIds.length === 0
}
export function validateCompletion(
  result: string,
  notes: string,
  inspectedDate: string,
  today: string,
  activationDate: string,
  checklist: string[] = [],
  completedChecklist: string[] = [],
  signature?: string | null
) {
  if (!["OK", "ISSUE"].includes(result)) throw new Error("Please select inspection result.")
  if (result === "ISSUE" && !notes.trim()) throw new Error("Notes are required when an issue is reported.")
  if (notes.length > 5000) throw new Error("Notes are too long.")
  if (!validDate(inspectedDate) || inspectedDate > today || inspectedDate < activationDate) throw new Error("Inspection date must be between activation date and today.")
  if (signature !== undefined && (!signature || !signature.trim())) {
    throw new Error("Inspector signature (Checked By) is required.")
  }
  if (result === "OK" && checklist.length > 0) {
    const completedSet = new Set(completedChecklist)
    const missing = checklist.filter(item => !completedSet.has(item))
    if (missing.length > 0) {
      throw new Error("All checklist items must be marked done for OK result. Please review or select 'Issue Reported'.")
    }
  }
}

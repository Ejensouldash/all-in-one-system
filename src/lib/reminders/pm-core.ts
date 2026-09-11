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
export function frequencyRule(raw: string) {
  const key = raw.trim().toLowerCase()
  if (key === "2 weeks") return { intervalUnit: "DAY", intervalCount: 14 }
  const months: Record<string, number> = { monthly: 1, "2 months": 2, "3 months": 3, "6 months": 6, yearly: 12 }
  if (!months[key]) throw new Error(`Frequency tidak disokong: ${raw}`)
  return { intervalUnit: "MONTH", intervalCount: months[key] }
}
export function validRule(rule: PMRule) {
  return validDate(rule.startDate) && ((rule.intervalUnit === "DAY" && rule.intervalCount === 14) || (rule.intervalUnit === "MONTH" && [1, 2, 3, 6, 12].includes(rule.intervalCount)))
}
export function ruleLabel(rule: Pick<PMRule, "intervalUnit" | "intervalCount">) {
  return rule.intervalUnit === "DAY" ? "2 weeks" : rule.intervalCount === 12 ? "Yearly" : rule.intervalCount === 1 ? "Monthly" : `${rule.intervalCount} months`
}
export function occurrenceDate(rule: PMRule, index: number): string {
  if (rule.intervalUnit === "DAY") return addDays(rule.startDate, index * rule.intervalCount)
  const [year, month, day] = rule.startDate.split("-").map(Number)
  const first = new Date(Date.UTC(year, month - 1 + index * rule.intervalCount, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(day, last))
  return first.toISOString().slice(0, 10)
}
export function datesBetween(rule: PMRule, from: string, to: string): string[] {
  if (!validRule(rule) || !validDate(from) || !validDate(to) || from > to) throw new Error("Julat tarikh atau kekerapan tidak sah.")
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

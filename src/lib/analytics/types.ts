/**
 * Shared constants and types for production analytics.
 *
 * Kept out of the "use server" action file because a server action module may only export
 * async functions. Nothing here touches the database or the daily report write path.
 */

// The pack multiplier lives only in PRODUCTION_CONFIG inside DailyReportForm.tsx and is never
// persisted on ProductionOutput. It is redeclared here so analytics stays a pure consumer of
// the form's data rather than a dependency of the form itself.
export const SKUS = [
  { key: "p800_20", label: "800 ML x 20", line: "LINE 1 - 800ml", perBox: 20 },
  { key: "p800_12", label: "800 ML x 12", line: "LINE 1 - 800ml", perBox: 12 },
  { key: "p425_24", label: "425 ML x 24", line: "LINE 2 - 425ml", perBox: 24 },
  { key: "p425_6", label: "425 ML x 6", line: "LINE 2 - 425ml", perBox: 6 },
] as const

export const LINES = ["LINE 1 - 800ml", "LINE 2 - 425ml"] as const

/**
 * Expected reporting schedule, confirmed with production:
 *   Mon-Fri  2 shifts x 2 lines = 4 reports
 *   Saturday 1 shift  x 2 lines = 2 reports
 *   Sunday   rest day
 * Saturday is assumed to be the AM shift — change SATURDAY_SHIFTS if that ever moves.
 */
export const SATURDAY_SHIFTS = ["AM"]
export const WEEKDAY_SHIFTS = ["AM", "PM"]

export const DAY_NAMES = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"]

export const SKU_COLORS: Record<string, string> = {
  p800_20: "#4f46e5",
  p800_12: "#0ea5e9",
  p425_24: "#10b981",
  p425_6: "#f59e0b",
}

export type ShiftStat = { shift: string; boxes: number; pcs: number; rejects: number; downtime: number; reports: number }

export type SkuStat = {
  key: string
  label: string
  line: string
  perBox: number
  boxes: number
  pcs: number
  rejects: number
  rejectRate: number
  share: number
}

export type DayStat = {
  date: string
  dayName: string
  isWorkingDay: boolean
  boxes: number
  pcs: number
  rejects: number
  downtime: number
  reports: number
  expectedReports: number
  bySku: Record<string, number>
  byShift: Record<string, number>
}

export type MissingSlot = { date: string; dayName: string; shift: string; line: string }
export type PendingSlot = { id: string; date: string; shift: string; line: string; status: string }
export type SectionDowntime = { section: string; minutes: number; incidents: number; longest: number; reasons: string[] }

export type AnalyticsPayload = {
  range: { from: string; to: string; totalDays: number; workingDays: number }
  kpi: {
    totalBoxes: number
    totalPcs: number
    totalRejects: number
    rejectRate: number
    totalTransferBags: number
    totalDowntime: number
    downtimeIncidents: number
    compliancePct: number
    reportsSubmitted: number
    reportsExpected: number
    avgBoxesPerWorkingDay: number
  }
  bySku: SkuStat[]
  byDay: DayStat[]
  byShift: ShiftStat[]
  byLine: { line: string; boxes: number; pcs: number; rejects: number; reports: number }[]
  extremes: {
    bestDay: DayStat | null
    worstDay: DayStat | null
    bestShiftLabel: string | null
    worstShiftLabel: string | null
  }
  problems: {
    downtimeBySection: SectionDowntime[]
    topReasons: { reason: string; minutes: number; count: number }[]
    longestIncident: { section: string; reason: string; minutes: number; date: string; shift: string } | null
    paretoRejects: { name: string; value: number; cumulative: number }[]
  }
  rates: {
    // `comparable` is false where usage and rejects are recorded in different units, so the
    // percentage is not a meaningful yield figure. LABEL usage is counted in rolls while LABEL
    // rejects are counted in individual labels.
    categoryStats: Record<string, { usage: number; rejects: number; rate: number; comparable: boolean; unit: string }>
    skuRejectRates: { key: string; label: string; boxes: number; rejects: number; rate: number }[]
  }
  coverage: {
    expectedSlots: number
    submittedSlots: number
    compliancePct: number
    missing: MissingSlot[]
    notApproved: PendingSlot[]
    calendar: { date: string; dayName: string; isWorkingDay: boolean; expected: number; submitted: number; approved: number }[]
  }
  trends: {
    production: { date: string; boxes: number; pcs: number }[]
    incoming: { date: string; bags: number }[]
  }
  storeroom: { category: string; pieces: number }[]
  dataQuality: {
    batchMismatch: { date: string; shift: string; line: string; sku: string; totalBox: number; batchSum: number }[]
    duplicateSlots: { date: string; shift: string; line: string; count: number }[]
    emptyBatches: number
  }
}

// ---------------------------------------------------------------------------------------------
// Storeroom balance report (section 10)
// ---------------------------------------------------------------------------------------------

/** The nine SKUs in use, in the display order production asked for. */
export const STOREROOM_SKUS = [
  "BOTTLE 800ml X225",
  "BOTTLE 425ml X181",
  "BOTTLE 425ml X162",
  "BOX 800x12",
  "BOX 800x20",
  "BOX 425x24",
  "BOX 425x6",
  "LABEL",
  "CAP",
] as const

export type StoreroomUnit = "bag" | "box" | "roll"

export type StoreroomRow = {
  doNumber: string
  sku: string
  batchNo: string
  balance: number
  unit: StoreroomUnit
  mult: number
  pcs: number
  isHold: boolean
  /** True when the row could not be mapped to one of the nine known SKUs. */
  unknownSku: boolean
  /** True when mult is zero or missing, so the pieces figure cannot be trusted. */
  suspectMult: boolean
}

export type StoreroomSkuGroup = {
  sku: string
  unit: StoreroomUnit
  batches: number
  balance: number
  pcs: number
  heldBalance: number
  heldBatches: number
  known: boolean
}

export type StoreroomReport = {
  asOf: string
  rows: StoreroomRow[]
  holds: StoreroomRow[]
  groups: StoreroomSkuGroup[]
  totals: { batches: number; pcs: number; heldBatches: number }
  warnings: string[]
}

export type ExecutiveSummary = {
  headline: string
  overview: string[]
  findings: string[]
  risks: string[]
  recommendations: string[]
  source: "ai" | "rule-based"
}

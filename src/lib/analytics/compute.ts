import { prisma } from "@/lib/prisma"
import {
  SKUS,
  LINES,
  DAY_NAMES,
  SATURDAY_SHIFTS,
  WEEKDAY_SHIFTS,
  type AnalyticsPayload,
  type DayStat,
  type MissingSlot,
  type PendingSlot,
  type SectionDowntime,
  type ShiftStat,
  type SkuStat,
} from "./types"

/**
 * Production analytics aggregation.
 *
 * READ-ONLY: only findMany/findFirst are used here. This module deliberately imports nothing
 * from the daily report or transfer-in modules, so no change here can affect how a form saves
 * or how carry-forward is calculated.
 */

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

function expectedShiftsFor(dayOfWeekIndex: number): string[] {
  if (dayOfWeekIndex === 0) return []
  if (dayOfWeekIndex === 6) return SATURDAY_SHIFTS
  return WEEKDAY_SHIFTS
}

/** Calendar date in Malaysia time. Mirrors the +8h convention already used across the app. */
function toDateStr(d: Date): string {
  return new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0]
}

/** Day of week for a YYYY-MM-DD string, read as a plain calendar date so no timezone drift. */
function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = []
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const cursor = new Date(Date.UTC(fy, fm - 1, fd))
  const end = new Date(Date.UTC(ty, tm - 1, td))
  while (cursor <= end) {
    out.push(cursor.toISOString().split("T")[0])
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

/** RejectLog.item mixes "BOX" with "BOX_P800_12". Collapse to the four material categories. */
function rejectCategory(item: string): "BOTTLE" | "CAP" | "LABEL" | "BOX" | null {
  const v = (item || "").toUpperCase()
  if (v === "BOTTLE") return "BOTTLE"
  if (v === "CAP") return "CAP"
  if (v === "LABEL") return "LABEL"
  if (v.startsWith("BOX")) return "BOX"
  return null
}

/** "BOX_P425_24" -> "p425_24" so box rejects can be attributed to a SKU. */
function rejectSkuKey(item: string): string | null {
  const v = (item || "").toUpperCase()
  if (!v.startsWith("BOX_P")) return null
  const key = v.replace("BOX_", "").toLowerCase()
  return SKUS.some(s => s.key === key) ? key : null
}

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0)
const round2 = (n: number) => Math.round(n * 100) / 100

/** Pretty label for a section name that operators typed freehand. */
export function titleCaseSection(s: string): string {
  const v = (s || "").trim()
  if (!v) return "Lain-lain"
  return v.charAt(0).toUpperCase() + v.slice(1)
}

// ---------------------------------------------------------------------------------------------
// Main aggregation
// ---------------------------------------------------------------------------------------------

export async function computeProductionAnalytics(from: string, to: string): Promise<AnalyticsPayload> {
  const start = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T23:59:59.999Z`)

  const [reports, transferIns, latestReport] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        productions: { include: { batches: true } },
        rejects: true,
        breakdowns: true,
        inventory: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.transferIn.findMany({
      where: { receiveDate: { gte: start, lte: end } },
      include: { items: true },
      orderBy: { receiveDate: "asc" },
    }),
    prisma.dailyReport.findFirst({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: { inventory: true },
    }),
  ])

  // Metrics use APPROVED reports only, matching the dashboard's existing behaviour.
  // Everything else is kept aside for the compliance section.
  const approved = reports.filter(r => r.status === "APPROVED")
  const notApproved: PendingSlot[] = reports
    .filter(r => r.status !== "APPROVED")
    .map(r => ({ id: r.id, date: toDateStr(r.date), shift: r.shift, line: r.line, status: r.status }))

  const dates = eachDate(from, to)
  const skuByKey = new Map<string, (typeof SKUS)[number]>(SKUS.map(s => [s.key as string, s]))

  // ---- per-day scaffold ---------------------------------------------------------------------
  const dayMap = new Map<string, DayStat>()
  for (const date of dates) {
    const dow = dayOfWeek(date)
    const shifts = expectedShiftsFor(dow)
    dayMap.set(date, {
      date,
      dayName: DAY_NAMES[dow],
      isWorkingDay: shifts.length > 0,
      boxes: 0,
      pcs: 0,
      rejects: 0,
      downtime: 0,
      reports: 0,
      expectedReports: shifts.length * LINES.length,
      bySku: Object.fromEntries(SKUS.map(s => [s.key, 0])),
      byShift: { AM: 0, PM: 0 },
    })
  }

  // ---- accumulators -------------------------------------------------------------------------
  const skuTotals = new Map<string, { boxes: number; pcs: number; rejects: number }>(
    SKUS.map(s => [s.key as string, { boxes: 0, pcs: 0, rejects: 0 }])
  )
  const shiftTotals = new Map<string, ShiftStat>([
    ["AM", { shift: "AM", boxes: 0, pcs: 0, rejects: 0, downtime: 0, reports: 0 }],
    ["PM", { shift: "PM", boxes: 0, pcs: 0, rejects: 0, downtime: 0, reports: 0 }],
  ])
  const lineTotals = new Map<string, { line: string; boxes: number; pcs: number; rejects: number; reports: number }>(
    LINES.map(l => [l as string, { line: l as string, boxes: 0, pcs: 0, rejects: 0, reports: 0 }])
  )
  // LABEL usage is stored in rolls while LABEL rejects are counted in individual labels, so its
  // percentage is not a yield figure. It is still computed (unchanged from the previous
  // dashboard) but flagged so the UI and the PDF can say so instead of showing a bogus rate.
  const categoryStats: Record<string, { usage: number; rejects: number; rate: number; comparable: boolean; unit: string }> = {
    BOTTLE: { usage: 0, rejects: 0, rate: 0, comparable: true, unit: "pcs" },
    CAP: { usage: 0, rejects: 0, rate: 0, comparable: true, unit: "pcs" },
    LABEL: { usage: 0, rejects: 0, rate: 0, comparable: false, unit: "rolls vs pcs" },
    BOX: { usage: 0, rejects: 0, rate: 0, comparable: true, unit: "pcs" },
  }
  const rejectByItem = new Map<string, number>()
  const sectionMap = new Map<string, SectionDowntime>()
  const reasonMap = new Map<string, { reason: string; minutes: number; count: number }>()
  let longestIncident: AnalyticsPayload["problems"]["longestIncident"] = null

  const batchMismatch: AnalyticsPayload["dataQuality"]["batchMismatch"] = []
  let emptyBatches = 0

  let totalBoxes = 0
  let totalPcs = 0
  let totalRejects = 0
  let totalDowntime = 0
  let downtimeIncidents = 0

  for (const report of approved) {
    const date = toDateStr(report.date)
    const day = dayMap.get(date)
    const shift = shiftTotals.get(report.shift)
    const line = lineTotals.get(report.line)

    if (day) day.reports += 1
    if (shift) shift.reports += 1
    if (line) line.reports += 1

    // Production. totalBox is canonical; batch rows are only checked for reconciliation.
    for (const prod of report.productions) {
      const sku = skuByKey.get(prod.productType)
      const boxes = prod.totalBox || 0
      const pcs = boxes * (sku?.perBox ?? 0)

      totalBoxes += boxes
      totalPcs += pcs
      if (day) {
        day.boxes += boxes
        day.pcs += pcs
        day.bySku[prod.productType] = (day.bySku[prod.productType] || 0) + boxes
        day.byShift[report.shift] = (day.byShift[report.shift] || 0) + boxes
      }
      if (shift) { shift.boxes += boxes; shift.pcs += pcs }
      if (line) { line.boxes += boxes; line.pcs += pcs }

      const totals = skuTotals.get(prod.productType)
      if (totals) { totals.boxes += boxes; totals.pcs += pcs }

      const realBatches = prod.batches.filter(b => (b.batchNo || "").trim() !== "" || b.qty > 0)
      emptyBatches += prod.batches.length - realBatches.length
      const batchSum = realBatches.reduce((s, b) => s + (b.qty || 0), 0)
      if (batchSum !== boxes) {
        batchMismatch.push({
          date,
          shift: report.shift,
          line: report.line,
          sku: sku?.label ?? prod.productType,
          totalBox: boxes,
          batchSum,
        })
      }
    }

    // Rejects. before + after, matching the existing dashboard convention.
    for (const rej of report.rejects) {
      const value = (rej.before || 0) + (rej.after || 0)
      totalRejects += value
      if (day) day.rejects += value
      if (shift) shift.rejects += value
      if (line) line.rejects += value

      rejectByItem.set(rej.item, (rejectByItem.get(rej.item) || 0) + value)

      const cat = rejectCategory(rej.item)
      if (cat) categoryStats[cat].rejects += value

      const skuKey = rejectSkuKey(rej.item)
      if (skuKey) {
        const totals = skuTotals.get(skuKey)
        if (totals) totals.rejects += value
      }
    }

    // Material usage, for the per-category reject rate denominator.
    for (const inv of report.inventory) {
      if (inv.type !== "Usage") continue
      let cat = ""
      if (inv.sectionKey === "BOTTLE") cat = "BOTTLE"
      else if (inv.sectionKey === "CAP") cat = "CAP"
      else if (inv.sectionKey === "LABEL") cat = "LABEL"
      else if (inv.sectionKey.startsWith("BOX_")) cat = "BOX"
      if (cat) categoryStats[cat].usage += inv.bags * inv.mult
    }

    // Breakdowns. Every report carries a junk zero-downtime row, so filter it out.
    for (const bd of report.breakdowns) {
      const minutes = bd.downtime || 0
      if (minutes <= 0) continue

      totalDowntime += minutes
      downtimeIncidents += 1
      if (day) day.downtime += minutes
      if (shift) shift.downtime += minutes

      const section = titleCaseSection(bd.section)
      const entry = sectionMap.get(section) || { section, minutes: 0, incidents: 0, longest: 0, reasons: [] }
      entry.minutes += minutes
      entry.incidents += 1
      entry.longest = Math.max(entry.longest, minutes)
      const reason = (bd.reason || "").trim()
      if (reason && !entry.reasons.includes(reason)) entry.reasons.push(reason)
      sectionMap.set(section, entry)

      if (reason) {
        const r = reasonMap.get(reason) || { reason, minutes: 0, count: 0 }
        r.minutes += minutes
        r.count += 1
        reasonMap.set(reason, r)
      }

      if (!longestIncident || minutes > longestIncident.minutes) {
        longestIncident = { section, reason: reason || "-", minutes, date, shift: report.shift }
      }
    }
  }

  // ---- reject rates ---------------------------------------------------------------------------
  for (const cat of Object.keys(categoryStats)) {
    const { usage, rejects } = categoryStats[cat]
    categoryStats[cat].rate = round2(pct(rejects, usage + rejects))
  }
  const totalUsages = Object.values(categoryStats).reduce((s, c) => s + c.usage, 0)
  const rejectRate = round2(pct(totalRejects, totalUsages + totalRejects))

  // ---- coverage -------------------------------------------------------------------------------
  const submittedKeys = new Set<string>()
  const slotCount = new Map<string, number>()
  for (const r of reports) {
    const key = `${toDateStr(r.date)}|${r.shift}|${r.line}`
    slotCount.set(key, (slotCount.get(key) || 0) + 1)
    submittedKeys.add(key)
  }
  const approvedKeys = new Set(approved.map(r => `${toDateStr(r.date)}|${r.shift}|${r.line}`))

  const missing: MissingSlot[] = []
  const calendar: AnalyticsPayload["coverage"]["calendar"] = []
  let expectedSlots = 0
  let submittedSlots = 0

  for (const date of dates) {
    const dow = dayOfWeek(date)
    const shifts = expectedShiftsFor(dow)
    let expected = 0
    let submitted = 0
    let approvedHere = 0

    for (const shift of shifts) {
      for (const line of LINES) {
        expected += 1
        const key = `${date}|${shift}|${line}`
        if (submittedKeys.has(key)) {
          submitted += 1
          if (approvedKeys.has(key)) approvedHere += 1
        } else {
          missing.push({ date, dayName: DAY_NAMES[dow], shift, line })
        }
      }
    }

    expectedSlots += expected
    submittedSlots += submitted
    calendar.push({
      date,
      dayName: DAY_NAMES[dow],
      isWorkingDay: shifts.length > 0,
      expected,
      submitted,
      approved: approvedHere,
    })
  }

  const duplicateSlots = [...slotCount.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [date, shift, line] = key.split("|")
      return { date, shift, line, count }
    })

  // ---- extremes -------------------------------------------------------------------------------
  const byDay = dates.map(d => dayMap.get(d)!)
  const producingDays = byDay.filter(d => d.isWorkingDay && d.reports > 0)
  const sortedByOutput = [...producingDays].sort((a, b) => b.boxes - a.boxes)
  const bestDay = sortedByOutput[0] ?? null
  const lowest = sortedByOutput.length > 1 ? sortedByOutput[sortedByOutput.length - 1] : null

  const shiftArr = [...shiftTotals.values()]
  const shiftRanked = shiftArr.filter(s => s.reports > 0).sort((a, b) => b.boxes - a.boxes)

  // ---- SKU stats ------------------------------------------------------------------------------
  const bySku: SkuStat[] = SKUS.map(s => {
    const totals = skuTotals.get(s.key)!
    return {
      key: s.key,
      label: s.label,
      line: s.line,
      perBox: s.perBox,
      boxes: totals.boxes,
      pcs: totals.pcs,
      rejects: totals.rejects,
      rejectRate: round2(pct(totals.rejects, totals.boxes + totals.rejects)),
      share: round2(pct(totals.boxes, totalBoxes)),
    }
  }).sort((a, b) => b.boxes - a.boxes)

  // ---- pareto ---------------------------------------------------------------------------------
  const rejectSorted = [...rejectByItem.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  let running = 0
  const paretoRejects = rejectSorted.map(r => {
    running += r.value
    return { ...r, cumulative: round2(pct(running, totalRejects)) }
  })

  // ---- incoming trend -------------------------------------------------------------------------
  const incomingMap = new Map<string, number>()
  let totalTransferBags = 0
  for (const ti of transferIns) {
    const date = toDateStr(ti.receiveDate)
    for (const item of ti.items) {
      totalTransferBags += item.bags
      incomingMap.set(date, (incomingMap.get(date) || 0) + item.bags)
    }
  }

  // ---- storeroom snapshot (latest approved report — unchanged behaviour) -----------------------
  const storeroomMap = new Map<string, number>()
  if (latestReport) {
    for (const inv of latestReport.inventory.filter(i => i.type === "Storeroom")) {
      let category = "Lain-lain"
      if (inv.sectionKey.includes("BOTTLE")) category = "Bottles"
      else if (inv.sectionKey.includes("CAP")) category = "Caps"
      else if (inv.sectionKey.includes("BOX")) category = "Boxes"
      else if (inv.sectionKey.includes("LABEL")) category = "Labels"
      storeroomMap.set(category, (storeroomMap.get(category) || 0) + inv.bags * inv.mult)
    }
  }

  const workingDays = byDay.filter(d => d.isWorkingDay).length

  return {
    range: { from, to, totalDays: dates.length, workingDays },
    kpi: {
      totalBoxes,
      totalPcs,
      totalRejects,
      rejectRate,
      totalTransferBags,
      totalDowntime,
      downtimeIncidents,
      compliancePct: round2(pct(submittedSlots, expectedSlots)),
      reportsSubmitted: submittedSlots,
      reportsExpected: expectedSlots,
      avgBoxesPerWorkingDay: workingDays > 0 ? Math.round(totalBoxes / workingDays) : 0,
    },
    bySku,
    byDay,
    byShift: shiftArr,
    byLine: [...lineTotals.values()],
    extremes: {
      bestDay,
      worstDay: lowest && lowest.date !== bestDay?.date ? lowest : null,
      bestShiftLabel: shiftRanked[0]?.shift ?? null,
      worstShiftLabel: shiftRanked.length > 1 ? shiftRanked[shiftRanked.length - 1].shift : null,
    },
    problems: {
      downtimeBySection: [...sectionMap.values()].sort((a, b) => b.minutes - a.minutes),
      topReasons: [...reasonMap.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 10),
      longestIncident,
      paretoRejects,
    },
    rates: {
      categoryStats,
      skuRejectRates: bySku.map(s => ({ key: s.key, label: s.label, boxes: s.boxes, rejects: s.rejects, rate: s.rejectRate })),
    },
    coverage: {
      expectedSlots,
      submittedSlots,
      compliancePct: round2(pct(submittedSlots, expectedSlots)),
      missing,
      notApproved,
      calendar,
    },
    trends: {
      production: byDay.map(d => ({ date: d.date, boxes: d.boxes, pcs: d.pcs })),
      incoming: dates.map(d => ({ date: d, bags: incomingMap.get(d) || 0 })),
    },
    storeroom: [...storeroomMap.entries()].map(([category, pieces]) => ({ category, pieces })),
    dataQuality: { batchMismatch, duplicateSlots, emptyBatches },
  }
}

import { prisma } from "@/lib/prisma"
import { getISOWeekDateRange } from "./isoWeek"

export interface BottleBoxTraceItem {
  id: string
  reportId: string
  isoWeek: string
  date: string // YYYY-MM-DD
  dateFormatted: string // DD/MM/YYYY
  shift: string
  line: string
  sku: string
  skuLabel: string
  bottleBatchNo: string
  bottleBags: number
  bottleMult: number
  bottlePcs: number
  boxBatchNo: string
  boxQty: number
  boxType: string
  reportStatus: string
  preparedBy: string
}

export interface BottleBatchSummaryItem {
  bottleBatchNo: string
  skus: string
  lines: string
  totalBags: number
  totalPcs: number
  linkedBoxBatches: string
  totalBoxesProduced: number
  shiftCount: number
  dates: string
}

export interface BatchTraceabilityReport {
  year: number
  week: number
  isoWeekString: string // e.g. "2026-W40"
  dateRange: {
    startDate: string
    endDate: string
    shortRange: string
  }
  filterLine: string
  filterBatchNo: string | null
  detailedRows: BottleBoxTraceItem[]
  summaries: BottleBatchSummaryItem[]
  totals: {
    totalRecords: number
    totalBottlePcs: number
    totalBoxesProduced: number
    uniqueBottleBatches: number
    uniqueBoxBatches: number
  }
}

const SKU_LABELS: Record<string, string> = {
  p800_20: "800 ML x 20",
  p800_12: "800 ML x 12",
  p425_24: "425 ML x 24",
  p425_6: "425 ML x 6",
}

function formatDateDMY(isoDate: string): string {
  if (!isoDate) return "-"
  const parts = isoDate.split("T")[0].split("-")
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return isoDate
}

function toDateStr(d: Date): string {
  // Respect +8h Malaysia Timezone standard in system
  return new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0]
}

export async function getBottleToBoxTraceReport(params: {
  year: number
  week: number
  line?: string
  batchNo?: string
}): Promise<BatchTraceabilityReport> {
  const { year, week, line = "ALL", batchNo = "" } = params
  const range = getISOWeekDateRange(year, week)
  const isoWeekString = `${year}-W${String(week).padStart(2, "0")}`

  const start = new Date(`${range.startDate}T00:00:00.000Z`)
  const end = new Date(`${range.endDate}T23:59:59.999Z`)

  const whereClause: any = {
    date: { gte: start, lte: end },
    status: { in: ["APPROVED", "PENDING"] },
    noProduction: false,
  }

  if (line && line !== "ALL") {
    whereClause.line = { contains: line, mode: "insensitive" }
  }

  const reports = await prisma.dailyReport.findMany({
    where: whereClause,
    include: {
      productions: {
        include: { batches: true },
      },
      inventory: {
        where: {
          type: "Usage",
          sectionKey: { contains: "BOTTLE", mode: "insensitive" },
        },
      },
    },
    orderBy: [{ date: "asc" }, { shift: "asc" }, { line: "asc" }],
  })

  const rawRows: BottleBoxTraceItem[] = []

  for (const report of reports) {
    const reportDateStr = toDateStr(report.date)
    const reportDateFormatted = formatDateDMY(reportDateStr)

    // 1. Gather bottle usage batches in this report
    const bottleItems: {
      id: string
      batchNo: string
      bags: number
      mult: number
      pcs: number
    }[] = []

    for (const inv of report.inventory) {
      const bNo = (inv.batchNo || "").trim()
      const bags = Number(inv.bags) || 0
      const mult = Number(inv.mult) || 1
      if (bNo || bags > 0) {
        bottleItems.push({
          id: inv.id,
          batchNo: bNo || "N/A — No Batch",
          bags,
          mult,
          pcs: Math.round(bags * mult),
        })
      }
    }

    // Fallback if no bottle usage was explicitly logged
    if (bottleItems.length === 0) {
      bottleItems.push({
        id: `empty-bottle-${report.id}`,
        batchNo: "N/A — Not Logged",
        bags: 0,
        mult: 1,
        pcs: 0,
      })
    }

    // 2. Gather production output batches in this report
    const boxItems: {
      id: string
      sku: string
      skuLabel: string
      batchNo: string
      qty: number
      type: string
    }[] = []

    for (const prod of report.productions) {
      const skuLabel = SKU_LABELS[prod.productType] || prod.productType
      for (const b of prod.batches) {
        const bNo = (b.batchNo || "").trim()
        const qty = Number(b.qty) || 0
        if (bNo || qty > 0) {
          boxItems.push({
            id: b.id,
            sku: prod.productType,
            skuLabel,
            batchNo: bNo || "N/A — No Batch",
            qty,
            type: b.type === "OTHER" ? (b.otherType || "OTHER") : (b.type || "Standard"),
          })
        }
      }
    }

    // Fallback if no output batch was logged
    if (boxItems.length === 0) {
      boxItems.push({
        id: `empty-box-${report.id}`,
        sku: "N/A",
        skuLabel: "N/A",
        batchNo: "N/A — No Batch",
        qty: 0,
        type: "N/A",
      })
    }

    // 3. Cross-link each bottle batch with each output box batch produced in this shift
    for (const bottle of bottleItems) {
      for (const box of boxItems) {
        rawRows.push({
          id: `${report.id}-${bottle.id}-${box.id}`,
          reportId: report.id,
          isoWeek: isoWeekString,
          date: reportDateStr,
          dateFormatted: reportDateFormatted,
          shift: report.shift || "AM",
          line: report.line || "Line 1",
          sku: box.sku,
          skuLabel: box.skuLabel,
          bottleBatchNo: bottle.batchNo,
          bottleBags: bottle.bags,
          bottleMult: bottle.mult,
          bottlePcs: bottle.pcs,
          boxBatchNo: box.batchNo,
          boxQty: box.qty,
          boxType: box.type,
          reportStatus: report.status || "APPROVED",
          preparedBy: report.preparedBy || "N/A",
        })
      }
    }
  }

  // 4. Filter by batch number if specified
  const cleanFilter = (batchNo || "").trim().toLowerCase()
  const detailedRows = cleanFilter
    ? rawRows.filter(
        row =>
          row.bottleBatchNo.toLowerCase().includes(cleanFilter) ||
          row.boxBatchNo.toLowerCase().includes(cleanFilter)
      )
    : rawRows

  // 5. Generate Sheet 2 Aggregated Summaries by Bottle Batch
  const summaryMap = new Map<
    string,
    {
      bottleBatchNo: string
      skusSet: Set<string>
      linesSet: Set<string>
      datesSet: Set<string>
      shiftReportsSet: Set<string>
      // To prevent double counting bags/pcs when a bottle batch cross-links multiple boxes in same shift:
      shiftBottleUsage: Map<string, { bags: number; pcs: number }>
      boxBatchesMap: Map<string, number>
    }
  >()

  for (const row of detailedRows) {
    let entry = summaryMap.get(row.bottleBatchNo)
    if (!entry) {
      entry = {
        bottleBatchNo: row.bottleBatchNo,
        skusSet: new Set(),
        linesSet: new Set(),
        datesSet: new Set(),
        shiftReportsSet: new Set(),
        shiftBottleUsage: new Map(),
        boxBatchesMap: new Map(),
      }
      summaryMap.set(row.bottleBatchNo, entry)
    }

    if (row.skuLabel && row.skuLabel !== "N/A") entry.skusSet.add(row.skuLabel)
    if (row.line) entry.linesSet.add(row.line)
    if (row.dateFormatted) entry.datesSet.add(row.dateFormatted)
    entry.shiftReportsSet.add(row.reportId)

    // Store bottle usage per reportId once
    if (!entry.shiftBottleUsage.has(row.reportId)) {
      entry.shiftBottleUsage.set(row.reportId, {
        bags: row.bottleBags,
        pcs: row.bottlePcs,
      })
    }

    // Accumulate box batch quantity
    if (row.boxBatchNo && row.boxBatchNo !== "N/A — No Batch") {
      const existing = entry.boxBatchesMap.get(row.boxBatchNo) || 0
      // If multiple bottle batches were in the same report, the box qty represents that box batch's output
      entry.boxBatchesMap.set(row.boxBatchNo, Math.max(existing, row.boxQty))
    }
  }

  const summaries: BottleBatchSummaryItem[] = Array.from(summaryMap.values()).map(entry => {
    let totalBags = 0
    let totalPcs = 0
    for (const u of entry.shiftBottleUsage.values()) {
      totalBags += u.bags
      totalPcs += u.pcs
    }

    let totalBoxesProduced = 0
    const linkedBoxBatchesList: string[] = []
    for (const [bNo, q] of entry.boxBatchesMap.entries()) {
      totalBoxesProduced += q
      linkedBoxBatchesList.push(`${bNo} (${q.toLocaleString()} boxes)`)
    }

    return {
      bottleBatchNo: entry.bottleBatchNo,
      skus: Array.from(entry.skusSet).join(", ") || "-",
      lines: Array.from(entry.linesSet).join(", ") || "-",
      totalBags: Math.round(totalBags * 100) / 100,
      totalPcs: Math.round(totalPcs),
      linkedBoxBatches: linkedBoxBatchesList.join("; ") || "None",
      totalBoxesProduced,
      shiftCount: entry.shiftReportsSet.size,
      dates: Array.from(entry.datesSet).join(", ") || "-",
    }
  })

  // Compute Overall Totals
  const uniqueBottleBatches = new Set(detailedRows.map(r => r.bottleBatchNo).filter(b => b && !b.startsWith("N/A"))).size
  const uniqueBoxBatches = new Set(detailedRows.map(r => r.boxBatchNo).filter(b => b && !b.startsWith("N/A"))).size

  let totalBottlePcs = 0
  for (const s of summaries) {
    totalBottlePcs += s.totalPcs
  }

  const totalBoxesProduced = summaries.reduce((acc, s) => acc + s.totalBoxesProduced, 0)

  return {
    year,
    week,
    isoWeekString,
    dateRange: {
      startDate: range.startDate,
      endDate: range.endDate,
      shortRange: range.shortRange,
    },
    filterLine: line,
    filterBatchNo: cleanFilter || null,
    detailedRows,
    summaries,
    totals: {
      totalRecords: detailedRows.length,
      totalBottlePcs,
      totalBoxesProduced,
      uniqueBottleBatches,
      uniqueBoxBatches,
    },
  }
}

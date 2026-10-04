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

export interface LinkedBoxDetail {
  batchNo: string
  date: string
  qty: number
}

export interface BottleBatchSummaryItem {
  bottleBatchNo: string
  machine: string // "BM1", "BM2", "BM1, BM2", or "-"
  sku?: string
  skuLabel?: string
  skus: string
  lines: string
  totalBags: number
  totalPcs: number
  linkedBoxBatches: string
  linkedBoxes?: LinkedBoxDetail[]
  totalBoxesProduced: number
  shiftCount: number
  dates: string
}

export interface DistributionLineItem {
  distributionDate: string // e.g. "1-Oct" or "DD/MM/YYYY" or ""
  destination: string      // e.g. "P(LOTUS)" or ""
  quantity: number | null  // e.g. 469 or null (blank)
  remarks?: string
}

export interface ProductionBatchDistributionGroup {
  productionDate: string          // YYYY-MM-DD
  productionDateFormatted: string // e.g. 10/1/2026 or 01/10/2026
  batchNumber: string             // e.g. "034025-01"
  totalProduction: number         // e.g. 1252 boxes
  distributions: DistributionLineItem[]
  remarks?: string
}

export interface SkuDistributionGroup {
  sku: string
  skuLabel: string // e.g. "425mlx24"
  batches: ProductionBatchDistributionGroup[]
}

export interface BatchTraceabilityReport {
  dateMode: "ISO_WEEK" | "CUSTOM"
  year?: number
  week?: number
  isoWeekString: string // e.g. "2026-W40" or "01/09/2026 to 15/09/2026"
  dateRange: {
    startDate: string
    endDate: string
    shortRange: string
  }
  filterLine: string
  filterBatchNo: string | null
  detailedRows: BottleBoxTraceItem[]
  summaries: BottleBatchSummaryItem[]
  distributionGroups: SkuDistributionGroup[] // For Sheet 3 (Production & Distribution)
  totals: {
    totalRecords: number
    totalBottlePcs: number
    totalBoxesProduced: number
    uniqueBottleBatches: number
    uniqueBoxBatches: number
  }
}

export interface BatchTraceabilityParams {
  dateMode?: "ISO_WEEK" | "CUSTOM"
  year?: number
  week?: number
  from?: string // YYYY-MM-DD
  to?: string   // YYYY-MM-DD
  line?: string
  batchNo?: string
}

const SKU_LABELS: Record<string, string> = {
  p800_20: "800 ML x 20",
  p800_12: "800 ML x 12",
  p425_24: "425 ML x 24",
  p425_6: "425 ML x 6",
}

const SKU_BOTTLE_PER_BOX: Record<string, number> = {
  p800_20: 20,
  p800_12: 12,
  p425_24: 24,
  p425_6: 6,
}

function getBottlesPerBox(sku: string, skuLabel?: string): number {
  if (SKU_BOTTLE_PER_BOX[sku]) return SKU_BOTTLE_PER_BOX[sku]
  const str = `${sku} ${skuLabel || ""}`
  const match = str.match(/x\s*(\d+)/i)
  if (match) return parseInt(match[1], 10)
  return 1
}

function formatDateDMY(isoDate: string): string {
  if (!isoDate) return "-"
  const parts = isoDate.split("T")[0].split("-")
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return isoDate
}

function formatDistributionDate(d: Date): string {
  // Format as e.g. "1-Oct" to match standard Gambar 2 layout
  const day = d.getDate()
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${day}-${monthNames[d.getMonth()]}`
}

function toDateStr(d: Date): string {
  // Respect +8h Malaysia Timezone standard in system
  return new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0]
}

export async function getBottleToBoxTraceReport(
  params: BatchTraceabilityParams
): Promise<BatchTraceabilityReport> {
  const {
    dateMode = params.from && params.to ? "CUSTOM" : "ISO_WEEK",
    year = new Date().getFullYear(),
    week = 1,
    from,
    to,
    line = "ALL",
    batchNo = "",
  } = params

  let startDate: string
  let endDate: string
  let shortRange: string
  let isoWeekString: string

  if (dateMode === "CUSTOM" && from && to) {
    let cleanFrom = from.trim()
    let cleanTo = to.trim()
    if (cleanFrom > cleanTo) {
      const temp = cleanFrom
      cleanFrom = cleanTo
      cleanTo = temp
    }
    startDate = cleanFrom
    endDate = cleanTo
    shortRange = `${formatDateDMY(startDate)} - ${formatDateDMY(endDate)}`
    isoWeekString = shortRange
  } else {
    const range = getISOWeekDateRange(year, week)
    startDate = range.startDate
    endDate = range.endDate
    shortRange = range.shortRange
    isoWeekString = `${year}-W${String(week).padStart(2, "0")}`
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

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
  const boxBatchesSet = new Set<string>()

  // Map to store produced box batch info for Sheet 3
  // Key: `${sku}|${batchNo}`
  const producedBatchMap = new Map<
    string,
    {
      sku: string
      skuLabel: string
      batchNumber: string
      productionDate: string
      productionDateFormatted: string
      totalProduction: number
    }
  >()

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

          if (bNo && !bNo.startsWith("N/A")) {
            boxBatchesSet.add(bNo)

            // Track for Sheet 3 (Production & Distribution)
            const mapKey = `${prod.productType}|${bNo}`
            const existingBatch = producedBatchMap.get(mapKey)
            if (existingBatch) {
              existingBatch.totalProduction += qty
            } else {
              producedBatchMap.set(mapKey, {
                sku: prod.productType,
                skuLabel,
                batchNumber: bNo,
                productionDate: reportDateStr,
                productionDateFormatted: reportDateFormatted,
                totalProduction: qty,
              })
            }
          }
        }
      }
    }

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

  // 5. Generate Sheet 2 Aggregated Summaries by Bottle Batch & SKU
  // Precompute output bottle ratio per SKU for proportional bottle allocation across multi-SKU shifts
  const reportSkuRatioMap = new Map<string, number>()
  for (const report of reports) {
    let totalOutputBottles = 0
    const skuBottlesMap = new Map<string, number>()

    for (const prod of report.productions) {
      const bpb = getBottlesPerBox(prod.productType, SKU_LABELS[prod.productType])
      const bottles = (Number(prod.totalBox) || 0) * bpb
      skuBottlesMap.set(prod.productType, (skuBottlesMap.get(prod.productType) || 0) + bottles)
      totalOutputBottles += bottles
    }

    if (totalOutputBottles > 0) {
      for (const [sku, bottles] of skuBottlesMap.entries()) {
        reportSkuRatioMap.set(`${report.id}|${sku}`, bottles / totalOutputBottles)
      }
    } else {
      const count = report.productions.length || 1
      for (const prod of report.productions) {
        reportSkuRatioMap.set(`${report.id}|${prod.productType}`, 1 / count)
      }
    }
  }

  // Key: `${row.bottleBatchNo}|${row.skuLabel}`
  const summaryMap = new Map<
    string,
    {
      bottleBatchNo: string
      sku: string
      skuLabel: string
      machinesSet: Set<string>
      linesSet: Set<string>
      datesSet: Set<string>
      shiftReportsSet: Set<string>
      shiftBottleUsage: Map<string, { bags: number; pcs: number }>
      boxBatchesMap: Map<string, { qty: number; date: string }>
    }
  >()

  for (const row of detailedRows) {
    const groupKey = `${row.bottleBatchNo}|${row.skuLabel}`
    let entry = summaryMap.get(groupKey)
    if (!entry) {
      entry = {
        bottleBatchNo: row.bottleBatchNo,
        sku: row.sku,
        skuLabel: row.skuLabel,
        machinesSet: new Set(),
        linesSet: new Set(),
        datesSet: new Set(),
        shiftReportsSet: new Set(),
        shiftBottleUsage: new Map(),
        boxBatchesMap: new Map(),
      }
      summaryMap.set(groupKey, entry)
    }

    // Determine machine: 425ML Bag 181 = BM1, 425ML Bag 162 = BM2
    if (row.bottleMult === 181 || row.bottleBatchNo.toUpperCase().startsWith("BM1")) {
      entry.machinesSet.add("BM1")
    } else if (row.bottleMult === 162 || row.bottleBatchNo.toUpperCase().startsWith("BM2")) {
      entry.machinesSet.add("BM2")
    }

    if (row.line) entry.linesSet.add(row.line)
    if (row.dateFormatted) entry.datesSet.add(row.dateFormatted)
    entry.shiftReportsSet.add(row.reportId)

    if (!entry.shiftBottleUsage.has(row.reportId)) {
      const ratio = reportSkuRatioMap.get(`${row.reportId}|${row.sku}`) ?? 1
      entry.shiftBottleUsage.set(row.reportId, {
        bags: row.bottleBags * ratio,
        pcs: row.bottlePcs * ratio,
      })
    }

    // Box batches specifically produced for this SKU
    if (row.boxBatchNo && row.boxBatchNo !== "N/A — No Batch") {
      const existing = entry.boxBatchesMap.get(row.boxBatchNo)
      const maxQty = existing ? Math.max(existing.qty, row.boxQty) : row.boxQty
      entry.boxBatchesMap.set(row.boxBatchNo, {
        qty: maxQty,
        date: row.dateFormatted || "-",
      })
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
    const linkedBoxes: LinkedBoxDetail[] = []
    for (const [bNo, info] of entry.boxBatchesMap.entries()) {
      totalBoxesProduced += info.qty
      linkedBoxBatchesList.push(`${bNo} (${info.qty.toLocaleString()} boxes)`)
      linkedBoxes.push({
        batchNo: bNo,
        date: info.date,
        qty: info.qty,
      })
    }

    // Sort linked boxes by date, then batchNo
    linkedBoxes.sort((a, b) => a.date.localeCompare(b.date) || a.batchNo.localeCompare(b.batchNo))

    const machine = entry.machinesSet.size > 0
      ? Array.from(entry.machinesSet).sort().join(", ")
      : "-"

    return {
      bottleBatchNo: entry.bottleBatchNo,
      machine,
      sku: entry.sku,
      skuLabel: entry.skuLabel,
      skus: entry.skuLabel,
      lines: Array.from(entry.linesSet).join(", ") || "-",
      totalBags: Math.round(totalBags * 100) / 100,
      totalPcs: Math.round(totalPcs),
      linkedBoxBatches: linkedBoxBatchesList.join("; ") || "None",
      linkedBoxes,
      totalBoxesProduced,
      shiftCount: entry.shiftReportsSet.size,
      dates: Array.from(entry.datesSet).join(", ") || "-",
    }
  })

  // Sort summaries: primary by bottleBatchNo, secondary by skuLabel
  summaries.sort((a, b) => {
    if (a.bottleBatchNo !== b.bottleBatchNo) {
      return a.bottleBatchNo.localeCompare(b.bottleBatchNo)
    }
    return (a.skuLabel || a.skus).localeCompare(b.skuLabel || b.skus)
  })

  // 6. Generate Sheet 3: Production & Distribution Groups (Gambar 2 format)
  // Query all DO items matching the produced box batch numbers
  const doItems = boxBatchesSet.size > 0
    ? await prisma.dOLineItem.findMany({
        where: {
          batchNumber: { in: Array.from(boxBatchesSet) },
        },
        include: {
          distributionOrder: {
            select: {
              distributionDate: true,
              destination: true,
            },
          },
        },
      })
    : []

  // Sort DO items in memory by distributionDate
  if (doItems.length > 0) {
    doItems.sort((a, b) => {
      const timeA = a.distributionOrder?.distributionDate ? new Date(a.distributionOrder.distributionDate).getTime() : 0
      const timeB = b.distributionOrder?.distributionDate ? new Date(b.distributionOrder.distributionDate).getTime() : 0
      return timeA - timeB
    })
  }

  // Group DO items by batchNumber
  const doByBatchMap = new Map<string, DistributionLineItem[]>()
  for (const item of doItems) {
    const bKey = item.batchNumber.trim()
    const doDate = item.distributionOrder?.distributionDate
      ? formatDistributionDate(new Date(item.distributionOrder.distributionDate))
      : "-"
    const dest = item.distributionOrder?.destination || "-"

    let list = doByBatchMap.get(bKey)
    if (!list) {
      list = []
      doByBatchMap.set(bKey, list)
    }
    list.push({
      distributionDate: doDate,
      destination: dest,
      quantity: item.qtySent,
    })
  }

  // Filter produced batches if batchNo filter is set
  const filteredBatches = Array.from(producedBatchMap.values()).filter(b => {
    if (!cleanFilter) return true
    return b.batchNumber.toLowerCase().includes(cleanFilter)
  })

  // Group by SKU
  const skuDistributionMap = new Map<string, SkuDistributionGroup>()
  for (const pb of filteredBatches) {
    let group = skuDistributionMap.get(pb.sku)
    if (!group) {
      group = {
        sku: pb.sku,
        skuLabel: pb.skuLabel,
        batches: [],
      }
      skuDistributionMap.set(pb.sku, group)
    }

    // Get distribution lines for this batch, or produce 1 blank line for warehouse manual entry
    const existingDOs = doByBatchMap.get(pb.batchNumber)
    const distributions: DistributionLineItem[] =
      existingDOs && existingDOs.length > 0
        ? existingDOs
        : [{ distributionDate: "", destination: "", quantity: null }]

    group.batches.push({
      productionDate: pb.productionDate,
      productionDateFormatted: pb.productionDateFormatted,
      batchNumber: pb.batchNumber,
      totalProduction: pb.totalProduction,
      distributions,
    })
  }

  const distributionGroups: SkuDistributionGroup[] = Array.from(skuDistributionMap.values())

  // Compute Overall Totals
  const uniqueBottleBatches = new Set(
    detailedRows.map(r => r.bottleBatchNo).filter(b => b && !b.startsWith("N/A"))
  ).size
  const uniqueBoxBatches = new Set(
    detailedRows.map(r => r.boxBatchNo).filter(b => b && !b.startsWith("N/A"))
  ).size

  let totalBottlePcs = 0
  for (const s of summaries) {
    totalBottlePcs += s.totalPcs
  }

  const totalBoxesProduced = summaries.reduce((acc, s) => acc + s.totalBoxesProduced, 0)

  return {
    dateMode,
    year,
    week,
    isoWeekString,
    dateRange: {
      startDate,
      endDate,
      shortRange,
    },
    filterLine: line,
    filterBatchNo: cleanFilter || null,
    detailedRows,
    summaries,
    distributionGroups,
    totals: {
      totalRecords: detailedRows.length,
      totalBottlePcs,
      totalBoxesProduced,
      uniqueBottleBatches,
      uniqueBoxBatches,
    },
  }
}

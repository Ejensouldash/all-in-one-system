import { prisma } from "@/lib/prisma"

export interface BatchUsageDetailRow {
  id: string
  reportId: string
  date: string // YYYY-MM-DD
  dateFormatted: string // DD/MM/YYYY
  shift: string
  line: string
  normalizedLine: "LINE 1" | "LINE 2" | string
  productType: string
  sku: string
  batchNo: string
  batchType: string
  status: string
  outputBoxes: number
  bottleUsage: number // pcs
  capUsage: number // pcs
  labelUsage: number // rolls
  boxUsage: number // pcs
  preparedBy: string
  verifiedBy: string
  approvedAt: string | null
  createdAt: string
}

export interface DateUsageSummaryRow {
  date: string // YYYY-MM-DD
  dateFormatted: string // DD/MM/YYYY
  totalBatches: number
  bottleLine1: number
  bottleLine2: number
  totalBottle: number
  totalCap: number
  totalLabel: number
  totalBox: number
  totalBoxesOutput: number
}

export interface LineUsageSummaryRow {
  line: string
  totalBoxes: number
  sharePct: number
  totalBottle: number
  totalCap: number
  totalLabel: number
  totalBox: number
}

export interface MaterialUsageSummaryRow {
  material: "BOTTLE" | "CAP" | "LABEL" | "BOX"
  label: string
  quantity: number
  unit: string
  line1Qty: number
  line2Qty: number
  sharePct: number
}

export interface TopBatchRow {
  batchNo: string
  sku: string
  dateFormatted: string
  line: string
  outputBoxes: number
  bottleUsage: number
}

export interface UsageReportData {
  from: string
  to: string
  fromFormatted: string
  toFormatted: string
  kpis: {
    totalProductionDays: number
    totalBatches: number
    totalBoxesOutput: number
    totalUsageBottle: number
    totalUsageCap: number
    totalUsageLabel: number
    totalUsageBox: number
    usageBottleLine1: number
    usageBottleLine2: number
  }
  top5Batches: TopBatchRow[]
  byLine: LineUsageSummaryRow[]
  byMaterial: MaterialUsageSummaryRow[]
  byDate: DateUsageSummaryRow[]
  byBatch: BatchUsageDetailRow[]
  details: BatchUsageDetailRow[]
}

const SKU_LABELS: Record<string, string> = {
  p800_20: "800 ML x 20",
  p800_12: "800 ML x 12",
  p425_24: "425 ML x 24",
  p425_6: "425 ML x 6",
}

export function normalizeLineName(raw: string): string {
  const val = (raw || "").trim().toUpperCase()
  if (val.includes("LINE 1")) return "LINE 1"
  if (val.includes("LINE 2")) return "LINE 2"
  return raw.trim() || "LINE UNKNOWN"
}

export function formatDateDMY(isoDate: string | Date): string {
  if (!isoDate) return "-"
  if (typeof isoDate === "string") {
    const parts = isoDate.split("T")[0].split("-")
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  const d = new Date(isoDate)
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function toDateStr(d: Date): string {
  // Respect +8h Malaysia Timezone standard in system
  return new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0]
}

/**
 * Mengambil dan mengagregasi data penggunaan bahan (Usage) untuk julat tarikh yang dipilih.
 * Menyokong status APPROVED dan PENDING dengan pengagihan pro-rata mengikut batch.
 */
export async function getUsageReport(from: string, to: string): Promise<UsageReportData> {
  const start = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T23:59:59.999Z`)

  const reports = await prisma.dailyReport.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { in: ["APPROVED", "PENDING"] },
    },
    include: {
      productions: {
        include: {
          batches: true,
        },
      },
      inventory: {
        where: { type: "Usage" },
      },
    },
    orderBy: [{ date: "asc" }, { shift: "asc" }, { line: "asc" }],
  })

  const detailRows: BatchUsageDetailRow[] = []

  // Agregator per tarikh
  const dateMap = new Map<string, {
    date: string
    dateFormatted: string
    batchesSet: Set<string>
    bottleLine1: number
    bottleLine2: number
    totalBottle: number
    totalCap: number
    totalLabel: number
    totalBox: number
    totalBoxesOutput: number
  }>()

  // Agregator per line
  const lineStatsMap = new Map<string, {
    line: string
    totalBoxes: number
    totalBottle: number
    totalCap: number
    totalLabel: number
    totalBox: number
  }>()

  for (const report of reports) {
    const reportDateStr = toDateStr(report.date)
    const reportDateFormatted = formatDateDMY(reportDateStr)
    const normLine = normalizeLineName(report.line)

    // 1. Kira jumlah material usage untuk report ini
    let reportBottleUsage = 0
    let reportCapUsage = 0
    let reportLabelUsage = 0
    let reportBoxUsage = 0

    for (const inv of report.inventory) {
      const bags = Number(inv.bags) || 0
      const mult = Number(inv.mult) || 1
      const qty = bags * mult

      if (inv.sectionKey === "BOTTLE") {
        reportBottleUsage += qty
      } else if (inv.sectionKey === "CAP") {
        reportCapUsage += qty
      } else if (inv.sectionKey === "LABEL") {
        reportLabelUsage += bags // Label dikira dalam unit rolls
      } else if (inv.sectionKey.startsWith("BOX_")) {
        reportBoxUsage += qty
      }
    }

    // 2. Kumpulkan batch pengeluaran dalam report ini
    interface BatchItem {
      productType: string
      skuLabel: string
      batchNo: string
      batchType: string
      qty: number
    }

    const batchItems: BatchItem[] = []

    for (const prod of report.productions) {
      const skuLabel = SKU_LABELS[prod.productType] || prod.productType
      for (const b of prod.batches) {
        const bNo = (b.batchNo || "").trim()
        const bQty = Number(b.qty) || 0
        if (!bNo && bQty <= 0) continue

        batchItems.push({
          productType: prod.productType,
          skuLabel,
          batchNo: bNo || "N/A — Tiada No. Batch",
          batchType: b.type === "OTHER" ? (b.otherType || "OTHER") : (b.type || "Standard"),
          qty: bQty,
        })
      }
    }

    // Jika tiada batch dalam report tetapi ada usage (atau noProduction)
    if (batchItems.length === 0) {
      batchItems.push({
        productType: "N/A",
        skuLabel: "N/A — Tiada Pengeluaran",
        batchNo: "N/A",
        batchType: "N/A",
        qty: 0,
      })
    }

    const totalBatchQty = batchItems.reduce((acc, b) => acc + b.qty, 0)

    // 3. Agihkan usage secara pro-rata mengikut nisbah batch qty
    let allocatedBottleSum = 0
    let allocatedCapSum = 0
    let allocatedLabelSum = 0
    let allocatedBoxSum = 0

    batchItems.forEach((bItem, idx) => {
      const isLast = idx === batchItems.length - 1
      let ratio = 1 / batchItems.length

      if (totalBatchQty > 0) {
        ratio = bItem.qty / totalBatchQty
      }

      let bBottle = 0
      let bCap = 0
      let bLabel = 0
      let bBox = 0

      if (isLast) {
        // Elakkan pembundaran daripada mencipta drift
        bBottle = Math.max(0, reportBottleUsage - allocatedBottleSum)
        bCap = Math.max(0, reportCapUsage - allocatedCapSum)
        bLabel = Math.max(0, Math.round((reportLabelUsage - allocatedLabelSum) * 100) / 100)
        bBox = Math.max(0, reportBoxUsage - allocatedBoxSum)
      } else {
        bBottle = Math.round(reportBottleUsage * ratio)
        bCap = Math.round(reportCapUsage * ratio)
        bLabel = Math.round(reportLabelUsage * ratio * 100) / 100
        bBox = Math.round(reportBoxUsage * ratio)

        allocatedBottleSum += bBottle
        allocatedCapSum += bCap
        allocatedLabelSum += bLabel
        allocatedBoxSum += bBox
      }

      const detailRow: BatchUsageDetailRow = {
        id: `${report.id}_${idx}`,
        reportId: report.id,
        date: reportDateStr,
        dateFormatted: reportDateFormatted,
        shift: report.shift,
        line: report.line,
        normalizedLine: normLine,
        productType: bItem.productType,
        sku: bItem.skuLabel,
        batchNo: bItem.batchNo,
        batchType: bItem.batchType,
        status: report.status,
        outputBoxes: bItem.qty,
        bottleUsage: bBottle,
        capUsage: bCap,
        labelUsage: bLabel,
        boxUsage: bBox,
        preparedBy: report.preparedBy || "-",
        verifiedBy: report.verifiedBy || "-",
        approvedAt: report.approvedAt ? report.approvedAt.toISOString() : null,
        createdAt: report.createdAt.toISOString(),
      }

      detailRows.push(detailRow)
    })

    // 4. Kemas kini agregasi per tarikh
    let dateEntry = dateMap.get(reportDateStr)
    if (!dateEntry) {
      dateEntry = {
        date: reportDateStr,
        dateFormatted: reportDateFormatted,
        batchesSet: new Set<string>(),
        bottleLine1: 0,
        bottleLine2: 0,
        totalBottle: 0,
        totalCap: 0,
        totalLabel: 0,
        totalBox: 0,
        totalBoxesOutput: 0,
      }
      dateMap.set(reportDateStr, dateEntry)
    }

    batchItems.forEach(b => {
      if (b.batchNo && b.batchNo !== "N/A") {
        dateEntry!.batchesSet.add(b.batchNo)
      }
    })

    if (normLine === "LINE 1") {
      dateEntry.bottleLine1 += reportBottleUsage
    } else if (normLine === "LINE 2") {
      dateEntry.bottleLine2 += reportBottleUsage
    }
    dateEntry.totalBottle += reportBottleUsage
    dateEntry.totalCap += reportCapUsage
    dateEntry.totalLabel += reportLabelUsage
    dateEntry.totalBox += reportBoxUsage
    dateEntry.totalBoxesOutput += totalBatchQty

    // 5. Kemas kini agregasi per line
    let lineEntry = lineStatsMap.get(normLine)
    if (!lineEntry) {
      lineEntry = {
        line: normLine,
        totalBoxes: 0,
        totalBottle: 0,
        totalCap: 0,
        totalLabel: 0,
        totalBox: 0,
      }
      lineStatsMap.set(normLine, lineEntry)
    }
    lineEntry.totalBoxes += totalBatchQty
    lineEntry.totalBottle += reportBottleUsage
    lineEntry.totalCap += reportCapUsage
    lineEntry.totalLabel += reportLabelUsage
    lineEntry.totalBox += reportBoxUsage
  }

  // Susun byDate mengikut tarikh menaik
  const sortedDates = Array.from(dateMap.keys()).sort()
  const byDate: DateUsageSummaryRow[] = sortedDates.map(dKey => {
    const d = dateMap.get(dKey)!
    return {
      date: d.date,
      dateFormatted: d.dateFormatted,
      totalBatches: d.batchesSet.size,
      bottleLine1: d.bottleLine1,
      bottleLine2: d.bottleLine2,
      totalBottle: d.totalBottle,
      totalCap: d.totalCap,
      totalLabel: Math.round(d.totalLabel * 100) / 100,
      totalBox: d.totalBox,
      totalBoxesOutput: d.totalBoxesOutput,
    }
  })

  // Jumlah keseluruhan Output Box bagi mengira peratusan line
  const grandTotalBoxes = Array.from(lineStatsMap.values()).reduce((sum, l) => sum + l.totalBoxes, 0)

  // Pastikan LINE 1 dan LINE 2 sentiasa ada dalam susunan
  const standardLines = ["LINE 1", "LINE 2"]
  const allLineKeys = Array.from(new Set([...standardLines, ...Array.from(lineStatsMap.keys())]))

  const byLine: LineUsageSummaryRow[] = allLineKeys.map(lKey => {
    const lData = lineStatsMap.get(lKey) || {
      line: lKey,
      totalBoxes: 0,
      totalBottle: 0,
      totalCap: 0,
      totalLabel: 0,
      totalBox: 0,
    }
    return {
      line: lKey,
      totalBoxes: lData.totalBoxes,
      sharePct: grandTotalBoxes > 0 ? (lData.totalBoxes / grandTotalBoxes) * 100 : 0,
      totalBottle: lData.totalBottle,
      totalCap: lData.totalCap,
      totalLabel: Math.round(lData.totalLabel * 100) / 100,
      totalBox: lData.totalBox,
    }
  })

  // Agregasi Material
  const line1Data = lineStatsMap.get("LINE 1")
  const line2Data = lineStatsMap.get("LINE 2")

  const totalUsageBottle = detailRows.reduce((acc, r) => acc + r.bottleUsage, 0)
  const totalUsageCap = detailRows.reduce((acc, r) => acc + r.capUsage, 0)
  const totalUsageLabel = Math.round(detailRows.reduce((acc, r) => acc + r.labelUsage, 0) * 100) / 100
  const totalUsageBox = detailRows.reduce((acc, r) => acc + r.boxUsage, 0)

  // Jumlah botol LINE 1 dan LINE 2
  const usageBottleLine1 = line1Data?.totalBottle || 0
  const usageBottleLine2 = line2Data?.totalBottle || 0

  const byMaterial: MaterialUsageSummaryRow[] = [
    {
      material: "BOTTLE",
      label: "Bottle (Botol)",
      quantity: totalUsageBottle,
      unit: "pcs",
      line1Qty: usageBottleLine1,
      line2Qty: usageBottleLine2,
      sharePct: totalUsageBottle > 0 ? 100 : 0,
    },
    {
      material: "CAP",
      label: "Cap (Penutup)",
      quantity: totalUsageCap,
      unit: "pcs",
      line1Qty: line1Data?.totalCap || 0,
      line2Qty: line2Data?.totalCap || 0,
      sharePct: totalUsageCap > 0 ? 100 : 0,
    },
    {
      material: "LABEL",
      label: "Label (Pelekat)",
      quantity: totalUsageLabel,
      unit: "rolls",
      line1Qty: Math.round((line1Data?.totalLabel || 0) * 100) / 100,
      line2Qty: Math.round((line2Data?.totalLabel || 0) * 100) / 100,
      sharePct: totalUsageLabel > 0 ? 100 : 0,
    },
    {
      material: "BOX",
      label: "Box (Kotak)",
      quantity: totalUsageBox,
      unit: "pcs",
      line1Qty: line1Data?.totalBox || 0,
      line2Qty: line2Data?.totalBox || 0,
      sharePct: totalUsageBox > 0 ? 100 : 0,
    },
  ]

  // Top 5 Batch berdasarkan kuantiti botol
  const batchAggregateMap = new Map<string, TopBatchRow>()
  for (const r of detailRows) {
    if (!r.batchNo || r.batchNo === "N/A") continue
    const key = `${r.batchNo}_${r.sku}_${r.date}`
    const existing = batchAggregateMap.get(key)
    if (existing) {
      existing.outputBoxes += r.outputBoxes
      existing.bottleUsage += r.bottleUsage
    } else {
      batchAggregateMap.set(key, {
        batchNo: r.batchNo,
        sku: r.sku,
        dateFormatted: r.dateFormatted,
        line: r.normalizedLine,
        outputBoxes: r.outputBoxes,
        bottleUsage: r.bottleUsage,
      })
    }
  }

  const top5Batches = Array.from(batchAggregateMap.values())
    .sort((a, b) => b.bottleUsage - a.bottleUsage)
    .slice(0, 5)

  // Kiraan batch unik
  const uniqueBatchesCount = new Set(
    detailRows.filter(r => r.batchNo && r.batchNo !== "N/A").map(r => r.batchNo)
  ).size

  return {
    from,
    to,
    fromFormatted: formatDateDMY(from),
    toFormatted: formatDateDMY(to),
    kpis: {
      totalProductionDays: byDate.length,
      totalBatches: uniqueBatchesCount,
      totalBoxesOutput: grandTotalBoxes,
      totalUsageBottle,
      totalUsageCap,
      totalUsageLabel,
      totalUsageBox,
      usageBottleLine1,
      usageBottleLine2,
    },
    top5Batches,
    byLine,
    byMaterial,
    byDate,
    byBatch: detailRows, // Disusun menaik mengikut tarikh
    details: detailRows,
  }
}

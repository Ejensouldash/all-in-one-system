import {
  capPcsFromInput,
  effectiveUsageBags,
  getCapUsageBreakdown,
  parseCapMeta,
} from "@/lib/production/capMetrics"

export type BatchCategory = "ALL" | "OUTPUT" | "BOTTLE" | "CAP" | "CARTON" | "LABEL"

export interface BatchFilterCriteria {
  id?: string
  category: BatchCategory
  batchNo: string
}

export interface InventoryLogLike {
  sectionKey?: string | null
  type?: string | null
  period?: string | null
  batchNo?: string | null
  bags?: number | null
  mult?: number | null
  labelType?: string | null
}

export interface ProductionBatchLike {
  id?: string
  batchNo?: string | null
  qty?: number | null
  type?: string | null
  otherType?: string | null
}

export interface ProductionOutputLike {
  productType: string
  totalBox?: number | null
  batches?: ProductionBatchLike[]
}

export interface DailyReportLike {
  noProduction?: boolean | null
  inventory?: InventoryLogLike[]
  productions?: ProductionOutputLike[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Checks whether an InventoryLog sectionKey belongs to the requested BatchCategory.
 */
export function matchesInventorySection(
  sectionKey: string | null | undefined,
  category: BatchCategory
): boolean {
  const sk = (sectionKey || "").toUpperCase()
  switch (category) {
    case "BOTTLE":
      return sk.includes("BOTTLE")
    case "CAP":
      return sk.includes("CAP") && !sk.includes("CARTON")
    case "CARTON":
      return sk.includes("CARTON") || sk.includes("BOX")
    case "LABEL":
      return sk.includes("LABEL")
    case "ALL":
      return true
    case "OUTPUT":
    default:
      return false
  }
}

/**
 * Strictly matches InventoryLog entries where type === "Usage"
 * (excludes Storeroom Balance, TransferIn, and Hold records).
 */
export function matchesInventoryUsageBatch(
  inv: InventoryLogLike,
  category: BatchCategory,
  term: string
): boolean {
  const cleanTerm = (term || "").trim().toLowerCase()
  if (!cleanTerm) return false
  if ((inv.type || "").trim().toUpperCase() !== "USAGE") return false
  if (!matchesInventorySection(inv.sectionKey, category)) return false
  return (inv.batchNo || "").trim().toLowerCase().includes(cleanTerm)
}

/**
 * Determines whether a DailyReport matches a given BatchFilterCriteria.
 * Material categories strictly require a Usage inventory record;
 * OUTPUT strictly checks ProductionBatch; ALL checks either Usage inventory or ProductionBatch.
 */
export function reportMatchesBatchFilter(
  report: DailyReportLike,
  filter: BatchFilterCriteria
): boolean {
  if (report.noProduction) return false
  const term = (filter.batchNo || "").trim().toLowerCase()
  if (!term) return false

  if (filter.category === "OUTPUT") {
    return (report.productions || []).some(p =>
      (p.batches || []).some(b => (b.batchNo || "").trim().toLowerCase().includes(term))
    )
  }

  if (filter.category === "ALL") {
    const matchProd = (report.productions || []).some(p =>
      (p.batches || []).some(b => (b.batchNo || "").trim().toLowerCase().includes(term))
    )
    const matchInv = (report.inventory || []).some(i =>
      matchesInventoryUsageBatch(i, "ALL", term)
    )
    return matchProd || matchInv
  }

  return (report.inventory || []).some(i =>
    matchesInventoryUsageBatch(i, filter.category, term)
  )
}

export interface MaterialUsageSummaryResult {
  materialSection: string
  matchedMaterialBatches: string
  usageBeforeDisplay: string
  usageAfterDisplay: string
  totalUsageDisplay: string
  totalUsageQty: number
  usageUnit: "pcs" | "rolls"
}

function formatSectionUsageEntries(entries: InventoryLogLike[]): {
  display: string
  qty: number
  unit: "pcs" | "rolls"
} {
  if (entries.length === 0) {
    return { display: "Nil", qty: 0, unit: "pcs" }
  }

  const firstSk = (entries[0].sectionKey || "").toUpperCase()
  if (firstSk.includes("LABEL")) {
    const totalRolls = round2(entries.reduce((acc, e) => acc + (Number(e.bags) || 0), 0))
    return {
      display: `${totalRolls.toLocaleString()} Roll`,
      qty: totalRolls,
      unit: "rolls",
    }
  }

  if (firstSk.includes("CAP") && !firstSk.includes("CARTON")) {
    let totalBoxes = 0
    let totalWeight = 0
    let totalBags = 0
    let totalPcs = 0
    for (const e of entries) {
      const b = getCapUsageBreakdown(e)
      totalBoxes += b.boxes
      totalWeight += b.weightKg
      totalBags += b.bags
      totalPcs += b.pcs
    }
    totalWeight = round2(totalWeight)
    totalBags = round2(totalBags)

    const parts: string[] = []
    if (totalBoxes > 0) parts.push(`${totalBoxes} Box`)
    if (totalWeight > 0) parts.push(`${totalWeight} kg`)
    if (parts.length === 0 && totalBags > 0) parts.push(`${totalBags} Box`)

    const prefix = parts.length > 0 ? `${parts.join(" / ")} ` : ""
    return {
      display: `${prefix}(${totalPcs.toLocaleString()} pcs)`,
      qty: totalPcs,
      unit: "pcs",
    }
  }

  if (firstSk.includes("BOTTLE")) {
    let totalBags = 0
    let totalPcs = 0
    for (const e of entries) {
      const bags = Number(e.bags) || 0
      const mult = Number(e.mult) || 1
      totalBags += bags
      totalPcs += Math.round(bags * mult)
    }
    totalBags = round2(totalBags)
    return {
      display: `${totalBags.toLocaleString()} Bag (${totalPcs.toLocaleString()} pcs)`,
      qty: totalPcs,
      unit: "pcs",
    }
  }

  // CARTON / BOX_*
  let totalPcs = 0
  for (const e of entries) {
    const bags = Number(e.bags) || 0
    const mult = Number(e.mult) || 1
    totalPcs += Math.round(bags * mult)
  }
  return {
    display: `${totalPcs.toLocaleString()} Pcs`,
    qty: totalPcs,
    unit: "pcs",
  }
}

function sectionLabel(sk: string): string {
  const upper = sk.toUpperCase()
  if (upper.includes("CAP") && !upper.includes("CARTON")) return "CAP"
  if (upper.includes("BOTTLE")) return "BOTTLE"
  if (upper.includes("LABEL")) return "LABEL"
  if (upper.includes("CARTON") || upper.includes("BOX")) return "CARTON"
  return upper || "MATERIAL"
}

/**
 * Summarizes the matched Usage inventory entries (Before, After, Total)
 * for a given DailyReport and BatchFilterCriteria.
 */
export function summarizeMatchedMaterialUsage(
  inventory: InventoryLogLike[],
  filter: BatchFilterCriteria
): MaterialUsageSummaryResult {
  const usageRows = (inventory || []).filter(
    i => (i.type || "").trim().toUpperCase() === "USAGE" && (i.batchNo || "").trim().length > 0
  )
  const term = (filter.batchNo || "").trim().toLowerCase()

  let matchedRows: InventoryLogLike[] = []
  if (filter.category === "OUTPUT") {
    // When tracing an FG batch, summarize all raw material Usage batches consumed in that shift
    matchedRows = usageRows
  } else {
    matchedRows = usageRows.filter(i => matchesInventoryUsageBatch(i, filter.category, term))
    if (matchedRows.length === 0 && filter.category === "ALL") {
      // ALL matched an FG Output batch instead of a material batch; show all shift Usage materials
      matchedRows = usageRows
    }
  }

  if (matchedRows.length === 0) {
    return {
      materialSection: filter.category === "ALL" || filter.category === "OUTPUT" ? "ALL" : filter.category,
      matchedMaterialBatches: "-",
      usageBeforeDisplay: "Nil",
      usageAfterDisplay: "Nil",
      totalUsageDisplay: "0",
      totalUsageQty: 0,
      usageUnit: filter.category === "LABEL" ? "rolls" : "pcs",
    }
  }

  // Group by normalized material type so mixed OUTPUT/ALL shifts render clearly per material
  const bySection = new Map<string, InventoryLogLike[]>()
  const uniqueBatches: string[] = []
  for (const row of matchedRows) {
    const bNo = (row.batchNo || "").trim()
    if (bNo && !uniqueBatches.includes(bNo)) uniqueBatches.push(bNo)
    const sec = sectionLabel(row.sectionKey || "")
    const arr = bySection.get(sec) || []
    arr.push(row)
    bySection.set(sec, arr)
  }

  if (bySection.size === 1) {
    const [sec, entries] = Array.from(bySection.entries())[0]
    const beforeEntries = entries.filter(e => (e.period || "").toLowerCase() !== "after")
    const afterEntries = entries.filter(e => (e.period || "").toLowerCase() === "after")

    const beforeFmt = formatSectionUsageEntries(beforeEntries)
    const afterFmt = formatSectionUsageEntries(afterEntries)
    const totalFmt = formatSectionUsageEntries(entries)

    return {
      materialSection: sec,
      matchedMaterialBatches: uniqueBatches.join(", "),
      usageBeforeDisplay: beforeFmt.display,
      usageAfterDisplay: afterFmt.display,
      totalUsageDisplay: totalFmt.display,
      totalUsageQty: totalFmt.qty,
      usageUnit: totalFmt.unit,
    }
  }

  // Multiple material types (OUTPUT or ALL search matching FG batch)
  const beforeParts: string[] = []
  const afterParts: string[] = []
  const totalParts: string[] = []
  let primaryQty = 0
  let primaryUnit: "pcs" | "rolls" = "pcs"

  for (const [sec, entries] of bySection.entries()) {
    const bList = Array.from(new Set(entries.map(e => (e.batchNo || "").trim()).filter(Boolean))).join("/")
    const beforeFmt = formatSectionUsageEntries(entries.filter(e => (e.period || "").toLowerCase() !== "after"))
    const afterFmt = formatSectionUsageEntries(entries.filter(e => (e.period || "").toLowerCase() === "after"))
    const totalFmt = formatSectionUsageEntries(entries)

    if (beforeFmt.display !== "Nil") beforeParts.push(`${sec} [${bList}]: ${beforeFmt.display}`)
    if (afterFmt.display !== "Nil") afterParts.push(`${sec} [${bList}]: ${afterFmt.display}`)
    totalParts.push(`${sec} [${bList}]: ${totalFmt.display}`)

    if (sec === "CAP" || (primaryQty === 0 && totalFmt.unit === "pcs")) {
      primaryQty = totalFmt.qty
      primaryUnit = totalFmt.unit
    }
  }

  return {
    materialSection: Array.from(bySection.keys()).join("+"),
    matchedMaterialBatches: uniqueBatches.join(", "),
    usageBeforeDisplay: beforeParts.length > 0 ? beforeParts.join("; ") : "Nil",
    usageAfterDisplay: afterParts.length > 0 ? afterParts.join("; ") : "Nil",
    totalUsageDisplay: totalParts.join("; "),
    totalUsageQty: primaryQty,
    usageUnit: primaryUnit,
  }
}

export { capPcsFromInput, effectiveUsageBags, parseCapMeta }

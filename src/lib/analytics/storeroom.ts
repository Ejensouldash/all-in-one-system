import { getActiveInventory } from "@/app/actions/dailyReport"
import {
  STOREROOM_SKUS,
  type StoreroomReport,
  type StoreroomRow,
  type StoreroomSkuGroup,
  type StoreroomUnit,
} from "./types"

/**
 * Storeroom balance report.
 *
 * This module is a READ-ONLY adapter. It calls the existing getActiveInventory() — the same
 * function that already backs the PRODUCTION STOCK tab and the daily report's carry-forward
 * dropdown — and reshapes its output for the PDF report and the Excel export.
 *
 * getActiveInventory itself is never modified. Reimplementing its replay here would create a
 * fourth carry-forward calculation in this codebase, which is exactly how the figures drifted
 * apart before.
 */

// ---------------------------------------------------------------------------------------------
// SKU mapping
// ---------------------------------------------------------------------------------------------

/**
 * `category` arrives in two different shapes:
 *   - a TransferIn category, e.g. "BOTTLE 800ml", "BOX 425x24", "CAP", "LABEL"
 *   - a sectionKey, e.g. "BOTTLE", "BOX_p425_24" — getActiveInventory uses this for hold rows
 *     that have no matching Transfer In.
 * Both must resolve to the same nine labels.
 */
export function skuLabel(category: string | null | undefined, mult: number): string {
  const raw = (category || "").trim()
  if (!raw) return "TIDAK DIKETAHUI"

  const upper = raw.toUpperCase()

  // Boxes. sectionKey form is BOX_p425_24, TransferIn form is already BOX 425x24.
  if (upper.startsWith("BOX_P")) {
    const parts = raw.replace(/^BOX_p/i, "").split("_")
    if (parts.length >= 2) return `BOX ${parts[0]}x${parts[1]}`
    return raw
  }
  if (upper.startsWith("BOX") && !upper.includes("CARTON")) {
    return raw.replace(/^BOX\s*/i, "BOX ").replace(/\s+/g, " ").trim()
  }

  // Caps. Guard against "CARTON/BOX - CAP", which is a different material.
  if (upper.includes("CARTON")) return raw
  if (upper.includes("CAP")) return "CAP"
  if (upper.includes("LABEL")) return "LABEL"

  // Bottles. The sectionKey form is a bare "BOTTLE", so the size comes from the multiplier.
  if (upper.startsWith("BOTTLE")) {
    const hasSize = /800|425/.test(raw)
    const size = hasSize ? (raw.includes("800") ? "800ml" : "425ml") : mult === 225 ? "800ml" : "425ml"
    return `BOTTLE ${size} X${mult}`
  }

  return raw
}

export function unitFor(sku: string): StoreroomUnit {
  if (sku.startsWith("BOX")) return "box"
  if (sku === "LABEL") return "roll"
  return "bag"
}

const KNOWN = new Set<string>(STOREROOM_SKUS)

/** Known SKUs first in the order production asked for, then anything unrecognised. */
function skuRank(sku: string): number {
  const i = (STOREROOM_SKUS as readonly string[]).indexOf(sku)
  return i === -1 ? STOREROOM_SKUS.length : i
}

// ---------------------------------------------------------------------------------------------

const round = (n: number) => Math.round(n * 100) / 100

export async function getStoreroomReport(asOf: string): Promise<StoreroomReport> {
  const res: any = await getActiveInventory(asOf)
  const batches: any[] = res?.data?.storeroomBatches || []

  const warnings: string[] = []

  const all: StoreroomRow[] = batches.map(b => {
    const mult = Number(b.mult) || 0
    const sku = skuLabel(b.category, mult)
    const balance = round(Number(b.bags) || 0)
    const suspectMult = mult <= 0
    const unknownSku = !KNOWN.has(sku)

    return {
      doNumber: String(b.doNumber || "").trim() || "-",
      sku,
      batchNo: String(b.batchNo || "").trim(),
      balance,
      unit: unitFor(sku),
      mult,
      pcs: Math.round(balance * mult),
      isHold: Boolean(b.isHold),
      unknownSku,
      suspectMult,
    }
  })

  const sortRows = (rows: StoreroomRow[]) =>
    rows.sort((a, b) => {
      const r = skuRank(a.sku) - skuRank(b.sku)
      if (r !== 0) return r
      if (a.sku !== b.sku) return a.sku.localeCompare(b.sku)
      return a.batchNo.localeCompare(b.batchNo)
    })

  const rows = sortRows(all.filter(r => !r.isHold))
  const holds = sortRows(all.filter(r => r.isHold))

  // Group per SKU. Held quantities are tracked separately so they never inflate available stock.
  const groupMap = new Map<string, StoreroomSkuGroup>()
  const ensure = (sku: string): StoreroomSkuGroup => {
    let g = groupMap.get(sku)
    if (!g) {
      g = { sku, unit: unitFor(sku), batches: 0, balance: 0, pcs: 0, heldBalance: 0, heldBatches: 0, known: KNOWN.has(sku) }
      groupMap.set(sku, g)
    }
    return g
  }

  // Every known SKU appears even at zero, so a missing material is visible rather than absent.
  for (const sku of STOREROOM_SKUS) ensure(sku)

  for (const r of rows) {
    const g = ensure(r.sku)
    g.batches += 1
    g.balance = round(g.balance + r.balance)
    g.pcs += r.pcs
  }
  for (const r of holds) {
    const g = ensure(r.sku)
    g.heldBatches += 1
    g.heldBalance = round(g.heldBalance + r.balance)
  }

  const groups = [...groupMap.values()].sort((a, b) => {
    const r = skuRank(a.sku) - skuRank(b.sku)
    return r !== 0 ? r : a.sku.localeCompare(b.sku)
  })

  const unknown = groups.filter(g => !g.known && (g.batches > 0 || g.heldBatches > 0))
  if (unknown.length > 0) {
    warnings.push(
      `${unknown.length} SKU tidak dikenali dipaparkan apa adanya: ${unknown.map(g => g.sku).join(", ")}.`
    )
  }
  const suspect = all.filter(r => r.suspectMult)
  if (suspect.length > 0) {
    warnings.push(
      `${suspect.length} baris ada multiplier sifar, jadi setara pcs tidak boleh dipercayai: ${suspect
        .map(r => `${r.sku} ${r.batchNo}`)
        .join(", ")}.`
    )
  }

  return {
    asOf,
    rows,
    holds,
    groups,
    totals: {
      batches: rows.length,
      pcs: rows.reduce((s, r) => s + r.pcs, 0),
      heldBatches: holds.length,
    },
    warnings,
  }
}

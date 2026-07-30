/**
 * SKU catalogue for the Daily Raw Material (Warehouse) form — SGMP/15/DRM (W).
 *
 * Each entry maps a row on the paper form to the exact `category` + `mult` pair that Transfer In
 * uses, so a stock-out row can be turned into a TransferInItem without any guesswork.
 *
 * The paper form names its units differently per section (BAG / BOX / PCS / ROLL), but all of
 * them are the same counting unit underneath: TransferInItem.bags, with the SKU's multiplier
 * giving the piece count. The paper label is kept so warehouse staff recognise the form.
 */

export type RawMaterialUnit = "BAG" | "BOX" | "PCS" | "ROLL"

export type RawMaterialSku = {
  /** Catalogue key, unique per (category, mult) pair. */
  key: string
  /** Section heading on the paper form. */
  section: string
  /** Label shown in the SKU dropdown. */
  label: string
  /** Transfer In category — what gets written to TransferInItem.category. */
  category: string
  mult: number
  unit: RawMaterialUnit
}

/** In SGMP-15 order: bottles, boxes, labels, cap — 425 before 800 within each material. */
export const RAW_MATERIAL_SKUS: RawMaterialSku[] = [
  { key: "BOTTLE 425ml X181", section: "BOTTLES 425 ML", label: "BOTTLE 425ml X181", category: "BOTTLE 425ml", mult: 181, unit: "BAG" },
  { key: "BOTTLE 425ml X162", section: "BOTTLES 425 ML", label: "BOTTLE 425ml X162", category: "BOTTLE 425ml", mult: 162, unit: "BAG" },
  { key: "BOTTLE 800ml X225", section: "BOTTLES 800 ML", label: "BOTTLE 800ml X225", category: "BOTTLE 800ml", mult: 225, unit: "BOX" },
  { key: "BOX 425x6", section: "BOX 425 ML", label: "BOX 425ml x 6", category: "BOX 425x6", mult: 1, unit: "PCS" },
  { key: "BOX 425x24", section: "BOX 425 ML", label: "BOX 425ml x 24", category: "BOX 425x24", mult: 1, unit: "PCS" },
  { key: "BOX 800x12", section: "BOX 800 ML", label: "BOX 800ml x 12", category: "BOX 800x12", mult: 1, unit: "PCS" },
  { key: "BOX 800x20", section: "BOX 800 ML", label: "BOX 800ml x 20", category: "BOX 800x20", mult: 1, unit: "PCS" },
  // 425 and 800 labels share one Transfer In category. The size lives in the batch number
  // (4STDF-130526 vs 8-STDF-130526), which is how the daily report already tells them apart.
  { key: "LABEL 425ml", section: "LABEL 425 ML", label: "LABEL 425ml", category: "LABEL", mult: 1, unit: "ROLL" },
  { key: "LABEL 800ml", section: "LABEL 800 ML", label: "LABEL 800ml", category: "LABEL", mult: 1, unit: "ROLL" },
  { key: "CAP", section: "CAP", label: "CAP", category: "CAP", mult: 4000, unit: "BOX" },
]

/** Section order for grouped display, matching the paper form. */
export const RAW_MATERIAL_SECTIONS = [
  "BOTTLES 425 ML",
  "BOX 425 ML",
  "LABEL 425 ML",
  "BOTTLES 800 ML",
  "BOX 800 ML",
  "LABEL 800 ML",
  "CAP",
] as const

const BY_KEY = new Map(RAW_MATERIAL_SKUS.map(s => [s.key, s]))

export function findSku(key: string): RawMaterialSku | undefined {
  return BY_KEY.get(key)
}

export function sectionRank(section: string): number {
  const i = (RAW_MATERIAL_SECTIONS as readonly string[]).indexOf(section)
  return i === -1 ? RAW_MATERIAL_SECTIONS.length : i
}

export function skuRank(key: string): number {
  const i = RAW_MATERIAL_SKUS.findIndex(s => s.key === key)
  return i === -1 ? RAW_MATERIAL_SKUS.length : i
}

/** Pieces implied by a quantity in the SKU's own counting unit. */
export function toPieces(sku: RawMaterialSku, qty: number): number {
  return Math.round(qty * sku.mult)
}

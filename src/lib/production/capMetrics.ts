/**
 * Shared CAP (Penutup) conversion constants and parsers.
 * Keeps usage calculations consistent across DailyReport server actions,
 * print views, and batch traceability exports.
 */

export const CAP_PCS_PER_BOX = 4000
export const CAP_BOX_WEIGHT_KG = 0.88
export const CAP_KG_PER_PC = 0.002125

export interface CapMeta {
  weight: number
  boxes: number
}

export interface CapUsageBreakdown {
  boxes: number
  weightKg: number
  pcs: number
  bags: number
}

export function capPcsFromInput(weight: number, boxes: number): number {
  if (weight > 0 && boxes > 0) {
    const net = weight - boxes * CAP_BOX_WEIGHT_KG
    return net > 0 ? Math.round(net / CAP_KG_PER_PC) : 0
  }
  if (weight > 0) return Math.round(weight / CAP_KG_PER_PC)
  if (boxes > 0) return boxes * CAP_PCS_PER_BOX
  return 0
}

export function isJsonLabelType(labelType?: string | null): boolean {
  return !!labelType && labelType.trim().startsWith("{")
}

export function parseCapMeta(labelType?: string | null): CapMeta | null {
  if (!isJsonLabelType(labelType)) return null
  try {
    const p = JSON.parse(labelType!)
    return {
      weight: Number(p.weight) || 0,
      boxes: Number(p.boxes ?? p.originalBags) || 0,
    }
  } catch {
    return null
  }
}

export function effectiveUsageBags(
  u: { bags?: number | null; mult?: number | null; labelType?: string | null },
  sectionKey: string
): number {
  const bags = Number(u.bags) || 0
  if (sectionKey !== "CAP" || bags > 0) return bags
  const meta = parseCapMeta(u.labelType)
  if (!meta) return bags
  const pcs = capPcsFromInput(meta.weight, meta.boxes)
  return pcs > 0 ? pcs / (Number(u.mult) || CAP_PCS_PER_BOX) : 0
}

export function getCapUsageBreakdown(inv: {
  bags?: number | null
  mult?: number | null
  labelType?: string | null
}): CapUsageBreakdown {
  const meta = parseCapMeta(inv.labelType)
  const mult = Number(inv.mult) || CAP_PCS_PER_BOX
  const effBags = effectiveUsageBags(inv, "CAP")
  const metaPcs = meta ? capPcsFromInput(meta.weight, meta.boxes) : 0
  const pcs = metaPcs > 0 ? metaPcs : Math.round(effBags * mult)
  return {
    boxes: meta?.boxes ?? 0,
    weightKg: meta?.weight ?? 0,
    pcs,
    bags: effBags,
  }
}

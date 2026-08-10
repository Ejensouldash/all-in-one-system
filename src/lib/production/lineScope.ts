/**
 * Which production line a raw-material batch belongs to, and therefore which Daily Report
 * section may carry it.
 *
 * This lives in its own pure module — no prisma, no server imports — because the same question
 * is asked on both sides of the wire: DailyReportForm builds its carry-forward dropdowns from it,
 * and dailyReport.ts uses it as the save-time guard. Three divergent copies of this logic are
 * what let 425ml bottles (x181/x162) end up saved inside an 800ml line report.
 *
 * Convention throughout, matching what the label rule already did: reject ONLY the opposite
 * line. Anything unclassifiable is kept, because silently dropping it is exactly what loses data.
 */

/** 800ml runs on x225 bags; 425ml runs on x181/x162. The two sets never overlap. */
const BOTTLE_MULTS_800 = [225]
const BOTTLE_MULTS_425 = [181, 162]

const is800Line = (line: string) => (line || "").includes("800")

/**
 * A bottle batch is judged by its multiplier, not its category string.
 *
 * Multiplier is the more reliable identifier: Transfer In binds category and mult to the same
 * SKU catalogue row (rawMaterialSkus.ts), so they always agree — but a batch put on hold is
 * pushed back with category "BOTTLE" and no size at all, which a category test rejects from
 * both lines at once. mult survives that round trip intact.
 */
export function isOtherLineBottle(mult: number | string | null | undefined, line: string): boolean {
  const m = Number(mult)
  if (!Number.isFinite(m)) return false
  return (is800Line(line) ? BOTTLE_MULTS_425 : BOTTLE_MULTS_800).includes(m)
}

/**
 * A label batch's FIRST DIGIT identifies its line: 8… = 800ml, 4… = 425ml.
 * Batch numbers arrive mixed-case with optional separators (8STDF-130526,
 * 8-stdf-130526, 4stdf-130526), so normalise before reading that digit.
 *
 * Both label sizes share one Transfer In category (rawMaterialSkus.ts:36-39), so the batch
 * number is the only thing that tells them apart.
 */
export function isOtherLineLabel(batchNo: string, line: string): boolean {
  const d = (batchNo || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()[0]
  if (d !== "8" && d !== "4") return false
  return is800Line(line) ? d === "4" : d === "8"
}

export type CarryForwardBatch = {
  category?: string | null
  batchNo?: string | null
  mult?: number | string | null
}

/**
 * The single scope test for the carry-forward list: may this batch appear in `sectionKey`
 * on a report for `line`?
 *
 * sectionKey is one of BOTTLE | LABEL | CAP | BOX_p<size>_<pack>, matching the inventory keys
 * in DailyReportForm.
 */
export function carryForwardBelongsToSection(
  batch: CarryForwardBatch,
  sectionKey: string,
  line: string
): boolean {
  const category = batch.category || ""

  if (sectionKey === "BOTTLE") {
    return category.includes("BOTTLE") && !isOtherLineBottle(batch.mult, line)
  }

  if (sectionKey === "LABEL") {
    return category.includes("LABEL") && !isOtherLineLabel(batch.batchNo || "", line)
  }

  if (sectionKey === "CAP") {
    return category.includes("CAP") && !category.includes("CARTON")
  }

  if (sectionKey.startsWith("BOX")) {
    // BOX_p800_12 -> size 800, pack 12
    const size = sectionKey.replace("BOX_p", "").split("_")[0]
    const pack = sectionKey.split("_")[2]
    return category.includes("BOX")
      && !category.includes("CARTON")
      && category.includes(size)
      && category.includes(pack)
  }

  return false
}

import { isKbpBatchNo } from "@/lib/kbp/batchNumber"

/**
 * Batch number formatting for the Daily Raw Material (Warehouse) form.
 *
 * These rules mirror TransferInForm.tsx:25-48 so a batch typed here is byte-identical to the same
 * batch typed on the production side — that matching is what lets the generated DO line up with
 * the daily report. The helpers are duplicated rather than imported because they are module
 * private in that file, and exporting them would mean editing it.
 *
 * Keep in sync with src/components/forms/TransferInForm.tsx if the production rules ever change.
 */

const STRICT_PATTERN = /^\d{6}-\d{2}$/

/** Bottles and caps use a strict 6-digit + dash + 2-digit shape. Labels and boxes do not. */
export function needsBatchMask(category: string): boolean {
  const c = category || ""
  return c.includes("BOTTLE") || c === "CAP"
}

function maskBatchNo(raw: string): string {
  const digits = (raw || "").replace(/[^0-9]/g, "")
  return digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6, 8)}` : digits
}

/**
 * Uppercase, then apply the 6-2 mask only for bottle and cap categories.
 * Any letter present switches masking off, so KBP batches (BM1-425-032126-01) pass through.
 */
export function normaliseBatchNo(raw: string, category: string): string {
  const upper = (raw || "").toUpperCase()
  if (/[A-Z]/.test(upper)) return upper
  return needsBatchMask(category) ? maskBatchNo(upper) : upper
}

/** Mirrors the production rule: only CAP has its format enforced. */
export function validateBatchNo(raw: string, category: string): string | null {
  const value = (raw || "").trim()
  if (!value) return "Batch number wajib diisi"

  if (category === "CAP" && !STRICT_PATTERN.test(value) && !isKbpBatchNo(value)) {
    return "Format batch CAP mesti 6 digit, sengkang, 2 digit (contoh 013126-01)"
  }
  return null
}

export const batchInputMaxLength = (category: string) => (needsBatchMask(category) ? 17 : 50)

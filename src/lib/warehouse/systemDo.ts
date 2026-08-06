/**
 * DOs that the system generates for itself, and why they must not be edited by hand.
 *
 * Two flows mint a Transfer In document automatically:
 *
 *   `DO - WH<yymmdd>-<seq>`   the Daily Raw Material (warehouse) report — rawMaterialService.ts
 *   `DO - WD<yymmdd>-<seq>`   an Ambil Bahan withdrawal            — withdrawalService.ts
 *
 * In both cases the DO is a *projection* of a record that already exists: the report row, or the
 * withdrawal row. Editing the projection through the ordinary Transfer In form does not touch the
 * record behind it, so the two silently diverge, and every balance that reconciles warehouse
 * against production is wrong from that moment on.
 *
 * This is not hypothetical. On 2026-08-05 `DO - WD260804-002` (1800 boxes of 030826-42524) was
 * opened in the Transfer In edit form: the number was rewritten to `DO - 260804002`, the date moved
 * from 4/8 PM to 5/8 AM, and the quantity raised to 2700. The daily report for 5/8 AM then claimed
 * all 2700 while the warehouse had only ever released 1800 — 900 phantom boxes, and a broken
 * `linkedDoNumber` that would have made the withdrawal impossible to void.
 *
 * A wrong system DO is corrected by correcting its source record, never the DO.
 */

export type SystemDoSource = "DRM" | "WITHDRAWAL"

/**
 * Matches the shapes minted at rawMaterialService.ts (`DO - WH…`) and withdrawalService.ts
 * (`DO - WD…`). Spacing around the dash is loose because the Transfer In form normalises
 * `DO -` spacing on its own, and a value that has been through it must still be recognised.
 */
const SYSTEM_DO = /^DO\s*-\s*W([DH])\d{6}-\d+$/i

export function systemDoSource(doNumber: string | null | undefined): SystemDoSource | null {
  const match = SYSTEM_DO.exec((doNumber || "").trim())
  if (!match) return null
  return match[1].toUpperCase() === "H" ? "DRM" : "WITHDRAWAL"
}

export function isSystemDo(doNumber: string | null | undefined): boolean {
  return systemDoSource(doNumber) !== null
}

/** Where the user has to go instead. Written for warehouse and production staff, in Malay. */
export function systemDoLockMessage(doNumber: string): string {
  const source = systemDoSource(doNumber)
  const origin =
    source === "DRM"
      ? "Borang Daily Raw Material (Warehouse)"
      : "rekod Ambil Bahan"
  return (
    `DO ${doNumber.trim()} dijana oleh sistem daripada ${origin} dan tidak boleh diubah atau dipadam di sini. ` +
    `Betulkan rekod asal itu — DO ini akan dikemas kini sendiri.`
  )
}

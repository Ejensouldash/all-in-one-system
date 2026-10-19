/**
 * Canonical list of GMP (SGMP) form slugs under /forms/maintenance.
 *
 * These match the route folder names one-for-one and are used as the `formType`
 * key on MaintenanceFormDraft. Cleaning is section-scoped, so its draft key is
 * built as `cleaning:<section>` via `cleaningDraftKey()` below.
 */
export const MAINTENANCE_FORM_TYPES = [
  "chemical-control",
  "cleaning",
  "dqip",
  "fbsr",
  "finished-goods",
  "food-handler",
  "fpir",
  "ftdm",
  "fuv",
  "ivvi",
  "lfcr",
  "lighting",
  "maintenance-record",
  "mgb",
  "mgl",
  "mpb",
  "mpl",
  "mwb",
  "mwl",
  "pcdm",
  "pcs",
  "pmir",
  "pmr",
  "product-recall",
  "qcdr",
  "vchif",
  "waste-disposal",
  "waste-management",
  "well-flowrate",
  "wqtr",
] as const

export type MaintenanceFormType = (typeof MAINTENANCE_FORM_TYPES)[number]

/** Draft key for the section-scoped cleaning form (SGMP/05). */
export function cleaningDraftKey(section: string): string {
  return `cleaning:${section}`
}

/**
 * A draft key is valid if it is a known form slug, or a `cleaning:<section>` key.
 * Used to reject junk formType values coming from direct POSTs to the actions.
 */
export function isValidDraftKey(key: string): boolean {
  if ((MAINTENANCE_FORM_TYPES as readonly string[]).includes(key)) return true
  return /^cleaning:[a-z0-9-]+$/.test(key)
}

/** Strips the `:section` suffix so dashboard badges can match on the route slug. */
export function draftKeyToSlug(key: string): string {
  return key.split(":")[0]
}

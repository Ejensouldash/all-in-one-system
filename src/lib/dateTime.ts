/**
 * Malaysia Standard Time (MYT / UTC+8) Date and Time Utilities
 * Centralized formatting helpers ensuring deterministic rendering across SSR, client, and PDF.
 */

export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur"

/**
 * Parses any date input safely into a valid Date object.
 */
function toDateObject(date: Date | string | number | null | undefined): Date | null {
  if (!date) return null
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formats a Date/ISO string to 24-hour Malaysia Date & Time: "DD/MM/YYYY, HH:mm:ss"
 * Example: "23/10/2026, 09:49:52"
 */
export function formatMalaysiaDateTime(
  date: Date | string | number | null | undefined,
  includeSeconds: boolean = true
): string {
  const d = toDateObject(date)
  if (!d) return "-"

  return d.toLocaleString("en-GB", {
    timeZone: MALAYSIA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: false,
  })
}

/**
 * Formats a Date/ISO string to Malaysia Date: "DD/MM/YYYY" or "DD Mon YYYY"
 * Example: "23/10/2026" or "23 Oct 2026"
 */
export function formatMalaysiaDate(
  date: Date | string | number | null | undefined,
  style: "short" | "medium" = "short"
): string {
  const d = toDateObject(date)
  if (!d) return "-"

  return d.toLocaleDateString("en-GB", {
    timeZone: MALAYSIA_TIMEZONE,
    day: "2-digit",
    month: style === "medium" ? "short" : "2-digit",
    year: "numeric",
  })
}

/**
 * Formats a Date/ISO string to Malaysia Time only (24-hour): "HH:mm:ss" or "HH:mm"
 * Example: "09:49:52" or "09:49"
 */
export function formatMalaysiaTime(
  date: Date | string | number | null | undefined,
  includeSeconds: boolean = true
): string {
  const d = toDateObject(date)
  if (!d) return "-"

  return d.toLocaleTimeString("en-GB", {
    timeZone: MALAYSIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
    hour12: false,
  })
}

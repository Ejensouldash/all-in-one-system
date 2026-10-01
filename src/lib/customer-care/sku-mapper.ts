/**
 * Maps raw database product keys (e.g. "p800_20", "p425_24") to official Bubbles O2 packaging descriptions in English.
 * 
 * Rules:
 * - p800_20 -> 800ml × 20 Bottles
 * - p800_12 -> 800ml × 12 Bottles
 * - p425_24 -> 425ml × 24 Bottles
 * - p425_6  -> 425ml × 6 Bottles
 */
export function formatProductPackaging(rawKey: string | null | undefined): string {
  if (!rawKey) return "-"
  const key = rawKey.trim().toLowerCase()
  switch (key) {
    case "p800_20":
      return "800ml × 20 Bottles"
    case "p800_12":
      return "800ml × 12 Bottles"
    case "p425_24":
      return "425ml × 24 Bottles"
    case "p425_6":
      return "425ml × 6 Bottles"
    default:
      return rawKey
        .replace(/p800_20/gi, "800ml × 20 Bottles")
        .replace(/p800_12/gi, "800ml × 12 Bottles")
        .replace(/p425_24/gi, "425ml × 24 Bottles")
        .replace(/p425_6/gi, "425ml × 6 Bottles")
        .replace(/p(\d+)_(\d+)/gi, "$1ml × $2 Bottles")
  }
}

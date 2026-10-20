import fs from "node:fs/promises"
import path from "node:path"
import { BUBBLESO2_COMPANY_PROFILE } from "@/lib/company-profile"

export const nrhoPalette = {
  navyDark: "#0A192F",
  navy: "#0F172A",
  navySoft: "#1E293B",
  body: "#334155",
  muted: "#64748B",
  slateFaint: "#94A3B8",
  border: "#CBD5E1",
  borderLight: "#E2E8F0",
  bgSubtle: "#F8FAFC",
  bgCard: "#F1F5F9",
  blue: "#2563EB",
  blueDark: "#1D4ED8",
  blueSoft: "#EFF6FF",
  cyan: "#0284C7",
  emerald: "#059669",
  emeraldSoft: "#ECFDF5",
  emeraldBorder: "#A7F3D0",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  amberBorder: "#FDE68A",
  rose: "#E11D48",
  roseSoft: "#FFF1F2",
  roseBorder: "#FECDD3",
  white: "#FFFFFF",
}

let cachedLogoBase64: string | null = null

/**
 * Returns the BubblesO2 logo as a Base64 data URI string for @react-pdf/renderer.
 */
export async function getBubblesO2LogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const buffer = await fs.readFile(logoPath)
    cachedLogoBase64 = `data:image/png;base64,${buffer.toString("base64")}`
    return cachedLogoBase64
  } catch (err) {
    console.warn("[getBubblesO2LogoBase64] Could not read logo file:", err)
    return ""
  }
}

export function formatRM(amount: number | null | undefined): string {
  const val = typeof amount === "number" ? amount : 0
  return `RM ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDateStr(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export { BUBBLESO2_COMPANY_PROFILE }

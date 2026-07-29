"use server"

import { auth } from "@/auth"
import { computeProductionAnalytics } from "@/lib/analytics/compute"
import type { AnalyticsPayload } from "@/lib/analytics/types"

/**
 * Read-only analytics for the Forms Analytics dashboard.
 * All aggregation lives in @/lib/analytics/compute so the PDF route can reuse it without
 * going through a server action.
 */
export async function getProductionAnalytics(
  from: string,
  to: string
): Promise<{ success: boolean; data?: AnalyticsPayload; error?: string }> {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const data = await computeProductionAnalytics(from, to)
    return { success: true, data }
  } catch (error: any) {
    console.error("Failed to build production analytics:", error)
    return { success: false, error: error.message }
  }
}

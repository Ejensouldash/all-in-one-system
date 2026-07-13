"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitLightingInspection(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const coverageArea = formData.get("coverageArea") as string
    const results = formData.get("results") as string
    const action = formData.get("action") as string
    const performedBy = formData.get("performedBy") as string

    if (!dateStr || !coverageArea || !results || !performedBy) {
      return { success: false, error: "Please fill in all required fields." }
    }

    await prisma.maintenanceLighting.create({
      data: {
        date: new Date(dateStr),
        coverageArea,
        results,
        action: action || null,
        performedBy,
        verifiedBy: null, // Verifier will sign this later
      }
    })

    revalidatePath("/forms/maintenance/lighting")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit lighting inspection:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

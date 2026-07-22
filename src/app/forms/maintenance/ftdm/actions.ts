"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const STATION_COUNT = 4

export async function submitFlyTrapDailyForm(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const checkedBy = formData.get("checkedBy") as string
    const performedSignature = formData.get("performedSignature") as string

    if (!dateStr || !checkedBy || !performedSignature) {
      return { success: false, error: "Please fill in all required fields and provide signature." }
    }

    const stations: Record<string, boolean> = {}
    for (let i = 1; i <= STATION_COUNT; i++) {
      stations[`station${i}`] = formData.get(`station${i}`) === "on"
    }

    await prisma.maintenanceFlyTrapDaily.create({
      data: {
        date: new Date(dateStr),
        ...stations,
        checkedBy,
        performedSignature,
        verifiedBy: null,
        verifiedSignature: null,
      }
    })

    revalidatePath("/forms/maintenance/ftdm")
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit fly trap daily form:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

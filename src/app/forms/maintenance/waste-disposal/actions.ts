"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitWasteDisposalForm(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const line = (formData.get("line") as string) || "800ML"
    const inspectionTime = formData.get("inspectionTime") as string
    const checkedBy = formData.get("checkedBy") as string
    const performedSignature = formData.get("performedSignature") as string

    if (!dateStr || !inspectionTime || !checkedBy || !performedSignature) {
      return { success: false, error: "Please fill in all required fields and provide signature." }
    }

    // Checkboxes (FormData only includes them if they are checked, usually as "on")
    const feederArea = formData.get("feederArea") === "on"
    const labelArea = formData.get("labelArea") === "on"
    const fillingArea = formData.get("fillingArea") === "on"
    const packagingArea = formData.get("packagingArea") === "on"
    const changingRoom = formData.get("changingRoom") === "on"

    await prisma.maintenanceWasteDisposal.create({
      data: {
        date: new Date(dateStr),
        line,
        inspectionTime,
        feederArea,
        labelArea,
        fillingArea,
        packagingArea,
        changingRoom,
        checkedBy,
        performedSignature,
        verifiedBy: null,
        verifiedSignature: null,
      }
    })

    revalidatePath("/forms/maintenance/waste-disposal")
    revalidatePath("/forms/maintenance/reports/waste-disposal")
    revalidatePath("/forms/maintenance/summary")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit waste disposal form:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

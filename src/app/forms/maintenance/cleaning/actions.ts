"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitCleaningInspectionForm(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const shift = formData.get("shift") as string
    const section = formData.get("section") as string
    const line = formData.get("line") as string || null
    const checkedBy = formData.get("checkedBy") as string

    if (!dateStr || !shift || !section || !checkedBy) {
      return { success: false, error: "Please fill in all required fields (Date, Shift, Section, Checked By)." }
    }

    const date = new Date(dateStr)

    // Extract task checkbox states
    const floorOk = formData.get("floorOk") === "true"
    const platformOk = formData.get("platformOk") === "true"
    const trashOk = formData.get("trashOk") === "true"
    const mirrorOk = formData.get("mirrorOk") === "true"
    const ceilingOk = formData.get("ceilingOk") === "true"
    const machineOk = formData.get("machineOk") === "true"
    const shutterOk = formData.get("shutterOk") === "true"

    // Extract chemical/cleaner input text
    const floorCleaner = formData.get("floorCleaner") as string || null
    const platformCleaner = formData.get("platformCleaner") as string || null
    const trashCleaner = formData.get("trashCleaner") as string || null
    const mirrorCleaner = formData.get("mirrorCleaner") as string || null
    const ceilingCleaner = formData.get("ceilingCleaner") as string || null
    const machineCleaner = formData.get("machineCleaner") as string || null
    const shutterCleaner = formData.get("shutterCleaner") as string || null

    await prisma.maintenanceCleaning.create({
      data: {
        date,
        shift,
        section,
        line: (section === "meeting-changing" || section === "filtration-uv") ? null : line,
        floorOk,
        platformOk,
        trashOk,
        mirrorOk,
        ceilingOk,
        machineOk,
        shutterOk,
        floorCleaner,
        platformCleaner,
        trashCleaner,
        mirrorCleaner,
        ceilingCleaner,
        machineCleaner,
        shutterCleaner,
        checkedBy,
        verifiedBy: null
      }
    })

    revalidatePath("/forms/maintenance/cleaning")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit cleaning inspection form:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

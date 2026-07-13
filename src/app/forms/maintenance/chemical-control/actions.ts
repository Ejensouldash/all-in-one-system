"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitChemicalControlForm(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const chemicalCode = formData.get("chemicalCode") as string
    const timeTaken = formData.get("timeTaken") as string
    const takenBy = formData.get("takenBy") as string
    
    // Optional return fields
    const timeReturn = formData.get("timeReturn") as string
    const returnBy = formData.get("returnBy") as string

    if (!dateStr || !chemicalCode || !timeTaken || !takenBy) {
      return { success: false, error: "Please fill in all required fields (Date, Chemical Code, Time Taken, Taken By)." }
    }

    await prisma.maintenanceChemical.create({
      data: {
        date: new Date(dateStr),
        chemicalCode,
        timeTaken,
        takenBy,
        timeReturn: timeReturn || null,
        returnBy: returnBy || null,
        verifiedBy: null,
      }
    })

    revalidatePath("/forms/maintenance/chemical-control")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit chemical control form:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

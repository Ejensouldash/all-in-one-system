"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitFoodHandlerForm(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const employeeName = formData.get("employeeName") as string
    const checkedBy = formData.get("checkedBy") as string
    const performedSignature = formData.get("performedSignature") as string

    if (!dateStr || !employeeName || !checkedBy || !performedSignature) {
      return { success: false, error: "Please fill in all required fields and provide signature." }
    }

    // Checkboxes
    const hairnet = formData.get("hairnet") === "on"
    const facemask = formData.get("facemask") === "on"
    const cleanUniform = formData.get("cleanUniform") === "on"
    const shoes = formData.get("shoes") === "on"
    const glove = formData.get("glove") === "on"
    const fingernails = formData.get("fingernails") === "on"
    const noJewellery = formData.get("noJewellery") === "on"

    await prisma.maintenanceFoodHandler.create({
      data: {
        date: new Date(dateStr),
        employeeName,
        hairnet,
        facemask,
        cleanUniform,
        shoes,
        glove,
        fingernails,
        noJewellery,
        checkedBy,
        performedSignature,
        verifiedBy: null,
        verifiedSignature: null,
      }
    })

    revalidatePath("/forms/maintenance/food-handler")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit food handler form:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

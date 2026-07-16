"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitWasteManagementForm(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const checkedBy = formData.get("checkedBy") as string
    const performedSignature = formData.get("performedSignature") as string

    if (!dateStr || !checkedBy || !performedSignature) {
      return { success: false, error: "Please fill in all required fields and provide signature." }
    }

    // Recycle fields
    const recyclePlasticBottle = formData.get("recyclePlasticBottle") as string
    const recycleCap = formData.get("recycleCap") as string
    const recycleCartonBox = formData.get("recycleCartonBox") as string
    const recycleLabel = formData.get("recycleLabel") as string
    const recycleOthers = formData.get("recycleOthers") as string

    // Disposal fields
    const disposalPlasticBottle = formData.get("disposalPlasticBottle") as string
    const disposalCap = formData.get("disposalCap") as string
    const disposalCartonBox = formData.get("disposalCartonBox") as string
    const disposalLabel = formData.get("disposalLabel") as string
    const disposalOthers = formData.get("disposalOthers") as string

    // Check if at least one field has data
    const hasData = [
      recyclePlasticBottle, recycleCap, recycleCartonBox, recycleLabel, recycleOthers,
      disposalPlasticBottle, disposalCap, disposalCartonBox, disposalLabel, disposalOthers
    ].some(val => val && val.trim() !== "")

    if (!hasData) {
      return { success: false, error: "Please enter data in at least one category (Recycle or Disposal)." }
    }

    await prisma.maintenanceWasteManagement.create({
      data: {
        date: new Date(dateStr),
        recyclePlasticBottle: recyclePlasticBottle || null,
        recycleCap: recycleCap || null,
        recycleCartonBox: recycleCartonBox || null,
        recycleLabel: recycleLabel || null,
        recycleOthers: recycleOthers || null,
        
        disposalPlasticBottle: disposalPlasticBottle || null,
        disposalCap: disposalCap || null,
        disposalCartonBox: disposalCartonBox || null,
        disposalLabel: disposalLabel || null,
        disposalOthers: disposalOthers || null,
        
        checkedBy,
        performedSignature,
        verifiedBy: null,
        verifiedSignature: null,
      }
    })

    revalidatePath("/forms/maintenance/waste-management")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit waste management form:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

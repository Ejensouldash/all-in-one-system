"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function submitFinishedGoodsInspection(formData: FormData) {
  try {
    const dateStr = formData.get("date") as string
    const qtyDamage425x24 = parseInt(formData.get("qtyDamage425x24") as string) || 0
    const qtyDamage425x6 = parseInt(formData.get("qtyDamage425x6") as string) || 0
    const qtyDamage800x12 = parseInt(formData.get("qtyDamage800x12") as string) || 0
    const qtyDamage800x20 = parseInt(formData.get("qtyDamage800x20") as string) || 0
    
    const actionTaken = formData.get("actionTaken") as string
    const performedBy = formData.get("performedBy") as string
    const remarks = formData.get("remarks") as string
    const performedSignature = formData.get("performedSignature") as string

    if (!dateStr || !performedBy || !performedSignature) {
      return { success: false, error: "Please fill in all required fields and provide signature." }
    }

    if (qtyDamage425x24 === 0 && qtyDamage425x6 === 0 && qtyDamage800x12 === 0 && qtyDamage800x20 === 0) {
       return { success: false, error: "Please enter at least one damage quantity." }
    }

    await prisma.maintenanceFinishedGoods.create({
      data: {
        date: new Date(dateStr),
        qtyDamage425x24,
        qtyDamage425x6,
        qtyDamage800x12,
        qtyDamage800x20,
        actionTaken: actionTaken || null,
        performedBy,
        performedSignature,
        remarks: remarks || null,
        verifiedBy: null,
        verifiedSignature: null,
      }
    })

    revalidatePath("/forms/maintenance/finished-goods")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit finished goods inspection:", error)
    return { success: false, error: error.message || "Failed to submit form." }
  }
}

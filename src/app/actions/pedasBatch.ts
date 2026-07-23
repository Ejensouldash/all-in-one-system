"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"

export async function createPedasBatch(data: {
  sku: string
  batchNo: string
  qtyPerBag: number
  totalBags: number
}) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  const createdBy = user.name || user.email || "Staff Pedas"

  const trimmedBatch = (data.batchNo || "").trim().toUpperCase()
  if (!trimmedBatch) {
    return { success: false, error: "Batch number is required" }
  }

  if (!data.sku) {
    return { success: false, error: "SKU is required" }
  }

  const qtyPerBag = Number(data.qtyPerBag) || 0
  const totalBags = Number(data.totalBags) || 1
  const totalQty = qtyPerBag * totalBags

  try {
    const existing = await prisma.pedasBatch.findUnique({
      where: { batchNo: trimmedBatch }
    })

    if (existing) {
      return { success: false, error: `Batch Number '${trimmedBatch}' already exists!` }
    }

    const batch = await prisma.pedasBatch.create({
      data: {
        sku: data.sku,
        batchNo: trimmedBatch,
        qtyPerBag,
        totalBags,
        totalQty,
        createdBy
      }
    })

    revalidatePath("/forms/production/origin-batch")

    await logUserAction(
      "Created Pedas Origin Batch",
      `Batch: ${trimmedBatch}, SKU: ${data.sku}, Total Qty: ${totalQty}`
    )

    return { success: true, data: batch }
  } catch (error: any) {
    console.error("Failed to create Pedas batch:", error)
    return { success: false, error: error.message }
  }
}

export async function getPedasBatches() {
  try {
    const batches = await prisma.pedasBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    })
    return { success: true, data: batches }
  } catch (error: any) {
    console.error("Failed to fetch Pedas batches:", error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function deletePedasBatch(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    await prisma.pedasBatch.delete({
      where: { id }
    })
    revalidatePath("/forms/production/origin-batch")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

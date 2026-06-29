"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DOStatus, ReturnReason, ReturnStatus, TransferStatus, DistributionMethod } from "@prisma/client"

export async function receiveProductionTransfer(transferId: string, receivedById: string) {
  try {
    const transfer = await prisma.productionTransfer.findUnique({
      where: { id: transferId }
    })

    if (!transfer) {
      return { success: false, error: "Transfer not found" }
    }

    if (transfer.status === "RECEIVED") {
      return { success: false, error: "Transfer already received" }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Transfer Status
      await tx.productionTransfer.update({
        where: { id: transferId },
        data: {
          status: "RECEIVED",
          receivedById: receivedById,
          receivedAt: new Date(),
        }
      })

      // 2. Upsert InventoryBatch
      await tx.inventoryBatch.upsert({
        where: { batchNumber: transfer.batchNumber },
        create: {
          batchNumber: transfer.batchNumber,
          sku: transfer.sku,
          totalQtyIn: transfer.qtyProduced,
          availableBalance: transfer.qtyProduced,
        },
        update: {
          totalQtyIn: { increment: transfer.qtyProduced },
          availableBalance: { increment: transfer.qtyProduced },
        }
      })
    })

    revalidatePath("/forms/warehouse/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to receive transfer:", error)
    return { success: false, error: error.message }
  }
}

export type DOLineItemData = {
  sku: string
  batchNumber: string
  qtySent: number
}

export type DOData = {
  distributionDate: string
  destination: string
  distributionMethod: DistributionMethod
  vehicleNo?: string
  driverName?: string
  createdById: string
  items: DOLineItemData[]
}

export async function createDistributionOrder(data: DOData) {
  try {
    await prisma.$transaction(async (tx) => {
      // Generate DO Number logic (e.g. DO-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      const count = await tx.distributionOrder.count({
        where: { doNumber: { startsWith: `DO-${dateStr}` } }
      })
      const doNumber = `DO-${dateStr}-${(count + 1).toString().padStart(4, "0")}`

      // 1. Create DistributionOrder
      const distOrder = await tx.distributionOrder.create({
        data: {
          doNumber,
          distributionDate: new Date(data.distributionDate),
          destination: data.destination,
          distributionMethod: data.distributionMethod,
          vehicleNo: data.vehicleNo || null,
          driverName: data.driverName || null,
          createdById: data.createdById,
          status: "SHIPPED", // Immediately shipped out based on requirements
          items: {
            create: data.items.map(item => ({
              sku: item.sku,
              batchNumber: item.batchNumber,
              qtySent: item.qtySent
            }))
          }
        }
      })

      // 2. Decrement InventoryBatch
      for (const item of data.items) {
        const batch = await tx.inventoryBatch.findUnique({
          where: { batchNumber: item.batchNumber }
        })

        if (!batch) {
          throw new Error(`Batch ${item.batchNumber} not found in inventory.`)
        }

        if (batch.availableBalance < item.qtySent) {
          throw new Error(`Insufficient balance for batch ${item.batchNumber}. Available: ${batch.availableBalance}, Requested: ${item.qtySent}`)
        }

        await tx.inventoryBatch.update({
          where: { batchNumber: item.batchNumber },
          data: {
            availableBalance: { decrement: item.qtySent },
            totalQtyOut: { increment: item.qtySent }
          }
        })
      }
    })

    revalidatePath("/forms/warehouse/distribution")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to create DO:", error)
    return { success: false, error: error.message }
  }
}

export async function processGoodsReturn(distributionOrderId: string, sku: string, batchNumber: string, qtyReturned: number, reason: ReturnReason) {
  try {
    const distOrder = await prisma.distributionOrder.findUnique({
      where: { id: distributionOrderId }
    })

    if (!distOrder) {
      return { success: false, error: "Distribution Order not found" }
    }

    await prisma.$transaction(async (tx) => {
      // Create return note (Quarantine logic means we do NOT restock InventoryBatch)
      await tx.goodsReturnNote.create({
        data: {
          distributionOrderId,
          sku,
          batchNumber,
          qtyReturned,
          reason,
          status: "QUARANTINE"
        }
      })
    })

    revalidatePath("/forms/warehouse/quarantine")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to process goods return:", error)
    return { success: false, error: error.message }
  }
}

export async function getPendingTransfers() {
  return prisma.productionTransfer.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: 'asc' }
  })
}

export async function getAvailableInventory() {
  return prisma.inventoryBatch.findMany({
    where: { availableBalance: { gt: 0 } },
    orderBy: { batchNumber: 'asc' }
  })
}

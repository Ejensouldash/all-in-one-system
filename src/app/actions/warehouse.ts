"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DOStatus, ReturnReason, ReturnStatus, TransferStatus } from "@prisma/client"

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
  distributionMethod: string
  sponsorshipDetails?: string | null
  vehicleNo?: string | null
  driverName?: string | null
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
          sponsorshipDetails: data.sponsorshipDetails || null,
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

export async function restockQuarantineItem(data: { id: string, signature: string, reason: string, staffName: string }) {
  try {
    const returnNote = await prisma.goodsReturnNote.findUnique({
      where: { id: data.id }
    })
    
    if (!returnNote) throw new Error("Item not found")
    if (returnNote.status !== "QUARANTINE") throw new Error("Item is not in quarantine")

    await prisma.$transaction(async (tx) => {
      // Update Return Note
      await tx.goodsReturnNote.update({
        where: { id: data.id },
        data: {
          status: "RESTOCKED",
          restockedAt: new Date(),
          restockedBy: data.staffName,
          restockedSignature: data.signature,
          restockedReason: data.reason
        }
      })

      // Add back to inventory (totalQtyIn and availableBalance)
      await tx.inventoryBatch.upsert({
        where: { batchNumber: returnNote.batchNumber },
        create: {
          batchNumber: returnNote.batchNumber,
          sku: returnNote.sku,
          totalQtyIn: returnNote.qtyReturned,
          availableBalance: returnNote.qtyReturned
        },
        update: {
          totalQtyIn: { increment: returnNote.qtyReturned },
          availableBalance: { increment: returnNote.qtyReturned }
        }
      })
    })

    revalidatePath("/forms/warehouse/quarantine")
    revalidatePath("/forms/warehouse/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to restock quarantine item:", error)
    return { success: false, error: error.message }
  }
}

export type LedgerEntry = {
  date: Date
  type: "IN" | "OUT" | "ADJUSTMENT"
  reference: string
  qty: number
  remarks?: string
}

export async function getBatchLedger(batchNumber: string) {
  try {
    const entries: LedgerEntry[] = []

    // 1. Warehouse Opening Stock (IN)
    const openingStocks = await prisma.warehouseOpeningStock.findMany({
      where: { batchNumber },
      include: { setBy: true }
    })
    openingStocks.forEach(os => {
      entries.push({
        date: os.createdAt,
        type: "ADJUSTMENT",
        reference: `Opening Stock (M${os.month} Y${os.year})`,
        qty: os.openingQty,
        remarks: `Set by ${os.setBy.name}`
      })
    })

    // 2. Production Transfers (IN)
    const transfers = await prisma.productionTransfer.findMany({
      where: { batchNumber, status: "RECEIVED" }
    })
    transfers.forEach(t => {
      if (t.receivedAt) {
        entries.push({
          date: t.receivedAt,
          type: "IN",
          reference: `Transfer In`,
          qty: t.qtyProduced
        })
      }
    })

    // 3. Handover Items (IN)
    const handovers = await prisma.handoverItem.findMany({
      where: { 
        batchNo: batchNumber,
        handover: { status: "ACKNOWLEDGED" }
      },
      include: { handover: true }
    })
    handovers.forEach(h => {
      if (h.netToWarehousePcs > 0) {
        entries.push({
          date: h.handover.updatedAt,
          type: "IN",
          reference: `Handover #${h.handover.handoverNumber}`,
          qty: h.netToWarehousePcs
        })
      }
    })

    // 4. Distribution Orders (OUT)
    const dos = await prisma.dOLineItem.findMany({
      where: { batchNumber },
      include: { distributionOrder: true }
    })
    dos.forEach(d => {
      entries.push({
        date: d.distributionOrder.distributionDate,
        type: "OUT",
        reference: `DO #${d.distributionOrder.doNumber}`,
        qty: d.qtySent,
        remarks: `To: ${d.distributionOrder.destination}`
      })
    })

    // 5. Goods Returns (IN)
    const returns = await prisma.goodsReturnNote.findMany({
      where: { batchNumber, status: "RESTOCKED" },
      include: { distributionOrder: true }
    })
    returns.forEach(r => {
      if (r.restockedAt) {
        entries.push({
          date: r.restockedAt,
          type: "IN",
          reference: `Return DO #${r.distributionOrder.doNumber}`,
          qty: r.qtyReturned,
          remarks: `Reason: ${r.reason}`
        })
      }
    })

    // Sort entries by Date ascending
    entries.sort((a, b) => a.date.getTime() - b.date.getTime())

    return { success: true, data: entries }
  } catch (error: any) {
    console.error("Failed to fetch batch ledger:", error)
    return { success: false, error: error.message }
  }
}

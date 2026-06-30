"use server"

import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO, isBefore, isAfter, isEqual } from "date-fns"

// 1. Fetch Daily Distribution Report Data
export async function getDailyDistributionReport(dateStr: string) {
  try {
    const targetDate = parseISO(dateStr)
    
    // Fetch all DOs for that date
    const dos = await prisma.distributionOrder.findMany({
      where: {
        distributionDate: {
          gte: startOfDay(targetDate),
          lte: endOfDay(targetDate)
        }
      },
      include: {
        items: true,
        createdBy: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return { success: true, data: dos }
  } catch (error) {
    console.error("Error fetching daily report:", error)
    return { success: false, error: "Failed to fetch daily report" }
  }
}

// 2. Fetch Monthly Finished Goods Report Data
export async function getMonthlyDistributionReport(month: number, year: number) {
  try {
    const startDate = new Date(year, month - 1, 1)
    const endDate = endOfMonth(startDate)

    // 1. Fetch ALL opening stocks to find the baseline for each batch
    // We assume the opening stock is set once at system initialization for each batch
    const allOpeningStocks = await prisma.warehouseOpeningStock.findMany()
    
    // We need a list of all unique batches involved.
    // They can come from: OpeningStock, ProductionTransfers (until end of this month), DOLineItems (until end of this month)
    const batches = new Set<string>()
    allOpeningStocks.forEach(os => batches.add(os.batchNumber))

    const allTransfers = await prisma.productionTransfer.findMany({
      where: {
        status: "RECEIVED",
        receivedAt: { lte: endDate } // Up to the end of the target month
      }
    })
    allTransfers.forEach(pt => batches.add(pt.batchNumber))

    const allDOItems = await prisma.dOLineItem.findMany({
      where: {
        distributionOrder: {
          distributionDate: { lte: endDate } // Up to the end of the target month
        }
      },
      include: {
        distributionOrder: true
      }
    })
    allDOItems.forEach(item => batches.add(item.batchNumber))

    // 2. Calculate values for each batch
    const reportData = []

    for (const batchNumber of Array.from(batches)) {
      // a) Baseline Opening Stock
      const openingStock = allOpeningStocks.find(os => os.batchNumber === batchNumber)
      let baselineQty = openingStock ? openingStock.openingQty : 0
      let baselineDate = openingStock ? new Date(openingStock.year, openingStock.month - 1, 1) : new Date(0) // Default to very old date

      // b) Calculate Balance Opening (Carry forward from previous month)
      // This is Baseline + (Transfers IN before this month) - (DOs OUT before this month)
      const transfersBeforeMonth = allTransfers.filter(pt => 
        pt.batchNumber === batchNumber && 
        pt.receivedAt && 
        isAfter(pt.receivedAt, baselineDate) && 
        isBefore(pt.receivedAt, startDate)
      )
      const doItemsBeforeMonth = allDOItems.filter(item => 
        item.batchNumber === batchNumber && 
        isAfter(item.distributionOrder.distributionDate, baselineDate) && 
        isBefore(item.distributionOrder.distributionDate, startDate)
      )

      const sumInBefore = transfersBeforeMonth.reduce((sum, pt) => sum + pt.qtyProduced, 0)
      const sumOutBefore = doItemsBeforeMonth.reduce((sum, item) => sum + item.qtySent, 0)
      
      const balanceOpening = baselineQty + sumInBefore - sumOutBefore

      // c) Calculate Transfer IN (during this month)
      const transfersDuringMonth = allTransfers.filter(pt => 
        pt.batchNumber === batchNumber && 
        pt.receivedAt && 
        (isEqual(pt.receivedAt, startDate) || isAfter(pt.receivedAt, startDate)) &&
        (isEqual(pt.receivedAt, endDate) || isBefore(pt.receivedAt, endDate))
      )
      const transferIn = transfersDuringMonth.reduce((sum, pt) => sum + pt.qtyProduced, 0)

      // d) Calculate Transfer OUT (during this month)
      const doItemsDuringMonth = allDOItems.filter(item => 
        item.batchNumber === batchNumber && 
        (isEqual(item.distributionOrder.distributionDate, startDate) || isAfter(item.distributionOrder.distributionDate, startDate)) &&
        (isEqual(item.distributionOrder.distributionDate, endDate) || isBefore(item.distributionOrder.distributionDate, endDate))
      )
      
      // Group Transfer OUT by sku for the report breakdown (assuming 1 sku per batch mostly)
      let sku = openingStock?.sku || transfersDuringMonth[0]?.sku || doItemsDuringMonth[0]?.sku || "Unknown"
      
      const transferOut = doItemsDuringMonth.reduce((sum, item) => sum + item.qtySent, 0)

      // e) Balance Carry Forward
      const balanceCarryForward = balanceOpening + transferIn - transferOut

      // Only include if there's any activity or balance for this batch in this month
      if (balanceOpening > 0 || transferIn > 0 || transferOut > 0 || balanceCarryForward > 0) {
        reportData.push({
          sku,
          batchNumber,
          balanceOpening,
          transferIn,
          transferOut,
          balanceCarryForward
        })
      }
    }

    return { success: true, data: reportData }
  } catch (error) {
    console.error("Error fetching monthly report:", error)
    return { success: false, error: "Failed to fetch monthly report" }
  }
}

// 3. Set Opening Stock (System Initialization)
export async function setOpeningStock(data: { batchNumber: string, sku: string, openingQty: number, month: number, year: number, userId: string }) {
  try {
    const existing = await prisma.warehouseOpeningStock.findFirst({
      where: {
        batchNumber: data.batchNumber,
        month: data.month,
        year: data.year
      }
    })

    if (existing) {
      const diff = data.openingQty - existing.openingQty;
      await prisma.$transaction(async (tx) => {
        // Update
        await tx.warehouseOpeningStock.update({
          where: { id: existing.id },
          data: {
            openingQty: data.openingQty,
            sku: data.sku,
            setById: data.userId
          }
        })
        
        // Update live inventory
        await tx.inventoryBatch.upsert({
          where: { batchNumber: data.batchNumber },
          create: {
            batchNumber: data.batchNumber,
            sku: data.sku,
            totalQtyIn: data.openingQty,
            availableBalance: data.openingQty
          },
          update: {
            totalQtyIn: { increment: diff },
            availableBalance: { increment: diff }
          }
        })
      })
    } else {
      await prisma.$transaction(async (tx) => {
        // Create
        await tx.warehouseOpeningStock.create({
          data: {
            batchNumber: data.batchNumber,
            sku: data.sku,
            openingQty: data.openingQty,
            month: data.month,
            year: data.year,
            setById: data.userId
          }
        })
        
        // Add to live inventory
        await tx.inventoryBatch.upsert({
          where: { batchNumber: data.batchNumber },
          create: {
            batchNumber: data.batchNumber,
            sku: data.sku,
            totalQtyIn: data.openingQty,
            availableBalance: data.openingQty
          },
          update: {
            totalQtyIn: { increment: data.openingQty },
            availableBalance: { increment: data.openingQty }
          }
        })
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error setting opening stock:", error)
    return { success: false, error: "Failed to set opening stock" }
  }
}

// 4. Get Existing Opening Stocks
export async function getOpeningStocks() {
  try {
    const data = await prisma.warehouseOpeningStock.findMany({
      include: {
        setBy: true
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    return { success: true, data }
  } catch (error) {
    console.error("Error fetching opening stocks:", error)
    return { success: false, error: "Failed to fetch opening stocks" }
  }
}

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
        distributionOrder: {
          include: {
            createdBy: true
          }
        }
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

      // f) Dates
      let dateValue = new Date(year, month - 1, 1);
      if (transfersDuringMonth.length > 0 && transfersDuringMonth[0].receivedAt) {
        dateValue = transfersDuringMonth[0].receivedAt;
      } else if (doItemsDuringMonth.length > 0 && doItemsDuringMonth[0].distributionOrder.distributionDate) {
        dateValue = doItemsDuringMonth[0].distributionOrder.distributionDate;
      } else if (openingStock && openingStock.createdAt) {
        dateValue = openingStock.createdAt;
      }

      // Calculate Production Date from Batch No
      let productionDate = "-";
      const match = batchNumber.match(/^(\d{2})(\d{2})(\d{2})/);
      if (match) {
        const d = parseInt(match[1]);
        const w = parseInt(match[2]);
        const y = 2000 + parseInt(match[3]);
        if (d >= 1 && d <= 7 && w >= 1 && w <= 53) {
          try {
            // First calculate Jan 1 of that year
            const jan1 = new Date(y, 0, 1);
            // Calculate days to add: (w - 1) * 7 + (d - 1)
            // But ISO week 1 starts on Monday. So let's use a simpler approach:
            // "Minggu daripada 1 Jan". If Jan 1 is in week 1.
            const jan1Day = jan1.getDay();
            const jan1Offset = jan1Day === 0 ? 7 : jan1Day; // 1 (Mon) - 7 (Sun)
            
            // Start of week 1 (Monday)
            const startOfWeek1 = new Date(y, 0, 1 - jan1Offset + 1);
            
            // Add weeks and days
            const targetDate = new Date(startOfWeek1);
            targetDate.setDate(targetDate.getDate() + (w - 1) * 7 + (d - 1));
            
            productionDate = `${targetDate.getDate().toString().padStart(2, '0')}/${(targetDate.getMonth() + 1).toString().padStart(2, '0')}/${targetDate.getFullYear()}`;
          } catch (e) {
            productionDate = "-";
          }
        }
      }

      const formattedDate = `${dateValue.getDate().toString().padStart(2, '0')}/${(dateValue.getMonth() + 1).toString().padStart(2, '0')}/${dateValue.getFullYear()}`;

      // g) Prepared By
      // Find the first DO item for this batch in this month to get the creator
      const preparedBy = doItemsDuringMonth.length > 0 && doItemsDuringMonth[0].distributionOrder.createdBy 
        ? doItemsDuringMonth[0].distributionOrder.createdBy.name 
        : "-";

      // Only include if there's any activity or balance for this batch in this month
      if (balanceOpening > 0 || transferIn > 0 || transferOut > 0 || balanceCarryForward > 0) {
        reportData.push({
          date: formattedDate,
          productionDate,
          sku,
          batchNumber,
          balanceOpening,
          transferIn,
          transferOut,
          balanceCarryForward,
          preparedBy
        })
      }
    }

    // Sort report data by date, then by batch number
    reportData.sort((a, b) => {
      // Compare by date first (simple string comparison works for dd/mm/yyyy if we split, better to compare the Date objects)
      const aParts = a.date.split('/');
      const bParts = b.date.split('/');
      const aDate = new Date(parseInt(aParts[2]), parseInt(aParts[1]) - 1, parseInt(aParts[0])).getTime();
      const bDate = new Date(parseInt(bParts[2]), parseInt(bParts[1]) - 1, parseInt(bParts[0])).getTime();
      if (aDate !== bDate) return aDate - bDate;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

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

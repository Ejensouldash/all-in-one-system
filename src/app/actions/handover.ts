"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { randomBytes } from "crypto"

// Fetch daily reports that are approved and don't have a handover yet
export async function getEligibleDailyReports() {
  try {
    const reports = await prisma.dailyReport.findMany({
      where: {
        status: 'APPROVED',
        productionHandovers: {
          none: {}
        }
      },
      include: {
        productions: {
          include: {
            batches: true
          }
        },
        createdBy: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: reports }
  } catch (error: any) {
    console.error("Error fetching eligible reports:", error)
    return { success: false, error: error.message }
  }
}

export async function createHandover(data: any) {
  try {
    const handoverNumber = `HO-${new Date().getFullYear().toString().substring(2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${randomBytes(2).toString('hex').toUpperCase()}`

    const handover = await prisma.productionHandover.create({
      data: {
        handoverNumber,
        date: new Date(data.date),
        dailyReportId: data.dailyReportId,
        productionStaffId: data.productionStaffId,
        productionSign: data.signature,
        items: {
          create: data.items.map((item: any) => ({
            category: item.category,
            batchNo: item.batchNo,
            type: item.type,
            totalProducedPcs: Number(item.totalProducedPcs),
            netToWarehousePcs: Number(item.netToWarehousePcs),
            deductions: item.deductions?.length > 0 ? {
              create: item.deductions.map((d: any) => ({
                destination: d.destination,
                qtyPcs: Number(d.qtyPcs),
                remarks: d.remarks
              }))
            } : undefined
          }))
        }
      }
    })

    revalidatePath("/forms/production")
    revalidatePath("/forms/warehouse")
    return { success: true, data: handover }
  } catch (error: any) {
    console.error("Error creating handover:", error)
    return { success: false, error: error.message }
  }
}

export async function getPendingHandovers() {
  try {
    const handovers = await prisma.productionHandover.findMany({
      where: { status: 'PENDING' },
      include: {
        productionStaff: true,
        items: {
          include: { deductions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: handovers }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getHandover(id: string) {
  try {
    const handover = await prisma.productionHandover.findUnique({
      where: { id },
      include: {
        productionStaff: true,
        warehouseStaff: true,
        dailyReport: true,
        items: {
          include: { deductions: true }
        }
      }
    })
    return { success: true, data: handover }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function receiveHandover(id: string, signature: string, receiverId: string) {
  try {
    const handover = await prisma.productionHandover.findUnique({
      where: { id },
      include: { items: true }
    })
    if (!handover) throw new Error("Handover not found")

    // 1. Update Handover Status
    await prisma.productionHandover.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        warehouseStaffId: receiverId,
        warehouseSign: signature
      }
    })

    // 2. Automatically create TransferIn Record (Warehouse Receiving)
    const doNumber = `DO-${handover.handoverNumber.replace('HO-', '')}`
    const transferIn = await prisma.transferIn.create({
      data: {
        doNumber,
        receiveDate: new Date(),
        receiveTime: new Date().toLocaleTimeString(),
        receiverName: 'System (Auto Handover)',
        items: {
          create: handover.items
            .filter(item => item.netToWarehousePcs > 0)
            .map(item => {
              return {
                category: item.category,
                batchNo: item.batchNo,
                bags: 1,
                mult: item.netToWarehousePcs
              }
            })
        }
      }
    })

    // 3. Update InventoryBatch
    for (const item of handover.items) {
      if (item.netToWarehousePcs > 0) {
        await prisma.inventoryBatch.upsert({
          where: { batchNumber: item.batchNo },
          update: {
            totalQtyIn: { increment: item.netToWarehousePcs },
            availableBalance: { increment: item.netToWarehousePcs }
          },
          create: {
            batchNumber: item.batchNo,
            sku: item.category,
            totalQtyIn: item.netToWarehousePcs,
            availableBalance: item.netToWarehousePcs
          }
        })
      }
    }

    revalidatePath("/forms/warehouse")
    revalidatePath("/forms/production")
    
    return { success: true }
  } catch (error: any) {
    console.error("Error receiving handover:", error)
    return { success: false, error: error.message }
  }
}

"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createTransferIn(data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const transferIn = await prisma.transferIn.create({
      data: {
        receiveDate: new Date(data.receiveDate),
        receiveTime: data.receiveTime,
        doNumber: data.doNumber,
        receiverName: data.receiverName,
        items: {
          create: data.items.map((item: any) => ({
            category: item.category,
            batchNo: item.batchNo,
            bags: Number(item.bags),
            mult: Number(item.mult),
          }))
        }
      }
    })

    revalidatePath("/forms")
    return { success: true, data: transferIn }
  } catch (error: any) {
    console.error("Failed to create Transfer In:", error)
    return { success: false, error: error.message }
  }
}

export async function updateTransferIn(id: string, data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const existing = await prisma.transferIn.findUnique({
      where: { id }
    })
    
    if (!existing) return { success: false, error: "Not found" }
    
    // Check if within 30 minutes
    const thirtyMinutes = 30 * 60 * 1000
    if (Date.now() - existing.createdAt.getTime() > thirtyMinutes) {
      return { success: false, error: "Time limit exceeded. You can only edit within 30 minutes of submission." }
    }

    // Delete existing items to replace them (simplified approach)
    await prisma.transferInItem.deleteMany({
      where: { transferInId: id }
    })

    const updated = await prisma.transferIn.update({
      where: { id },
      data: {
        receiveDate: new Date(data.receiveDate),
        receiveTime: data.receiveTime,
        doNumber: data.doNumber,
        receiverName: data.receiverName,
        items: {
          create: data.items.map((item: any) => ({
            category: item.category,
            batchNo: item.batchNo,
            bags: Number(item.bags),
            mult: Number(item.mult),
          }))
        }
      }
    })

    revalidatePath("/forms")
    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to update Transfer In:", error)
    return { success: false, error: error.message }
  }
}

export async function getTodayTransferIn() {
  try {
    // For prototyping we might just pull the last 20 items ordered descending to ensure we see them
    const transfers = await prisma.transferIn.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { items: true }
    })
    
    // Flatten the items out
    const flattened = transfers.flatMap(t => t.items.map(i => ({
      category: i.category,
      batchNo: i.batchNo,
      bags: i.bags,
      mult: i.mult,
      doNumber: t.doNumber
    })))

    return { success: true, data: flattened }
  } catch (error: any) {
    console.error("Failed to fetch Transfer In:", error)
    return { success: false, data: [] }
  }
}

export async function getTransferInHistory(page: number = 1, pageSize: number = 20) {
  try {
    const skip = (page - 1) * pageSize
    
    const [transfers, totalCount] = await Promise.all([
      prisma.transferIn.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.transferIn.count()
    ])

    return { 
      success: true, 
      data: transfers,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount
    }
  } catch (error: any) {
    console.error("Failed to fetch Transfer In history:", error)
    return { success: false, data: [], totalPages: 0 }
  }
}

export async function getTransferInById(id: string) {
  try {
    const transfer = await prisma.transferIn.findUnique({
      where: { id },
      include: { items: true }
    })
    return { success: true, data: transfer }
  } catch (error: any) {
    console.error("Failed to fetch Transfer In details:", error)
    return { success: false, data: null, error: error.message }
  }
}

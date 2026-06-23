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

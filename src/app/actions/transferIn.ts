"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

// Module access must come from the DB, never from session.user.modules: the JWT
// snapshots modules at login, so a freshly granted module stays invisible to the
// gate until the user logs out and back in. See the note in src/lib/access.ts.
async function hasTransferInHistoryAccess() {
  const access = await getAccessInfo()
  if (!access) return false
  return hasAnyModule(access, ["TRANSFER_IN_HISTORY"])
}

export async function createTransferIn(data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const transferIn = await prisma.transferIn.create({
      data: {
        receiveDate: new Date(data.receiveDate),
        receiveTime: data.receiveTime,
        shift: data.shift || "AM",
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
    revalidatePath("/forms/production/stock")
    revalidatePath("/forms/production/transfer-in")
    revalidatePath("/forms/production/daily-report", "layout")

    await logUserAction(
      "Created Transfer In DO",
      `DO: ${data.doNumber}, Receiver: ${data.receiverName}. Payload: ${JSON.stringify(data)}`
    )

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

    const hasAccess = await hasTransferInHistoryAccess()

    // Check if within 30 minutes for normal users
    if (!hasAccess) {
      const thirtyMinutes = 30 * 60 * 1000
      if (Date.now() - existing.createdAt.getTime() > thirtyMinutes) {
        return { success: false, error: "Time limit exceeded. You can only edit within 30 minutes of submission." }
      }
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
        shift: data.shift || "AM",
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
    revalidatePath("/forms/production/stock")
    revalidatePath("/forms/production/transfer-in")
    revalidatePath("/forms/production/daily-report", "layout")

    await logUserAction(
      "Updated Transfer In DO",
      `DO: ${data.doNumber}, Edited within 30 minutes limit. Payload: ${JSON.stringify(data)}`
    )

    return { success: true, data: updated }
  } catch (error: any) {
    console.error("Failed to update Transfer In:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteTransferIn(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  if (!(await hasTransferInHistoryAccess())) {
    return { success: false, error: "Unauthorized. You do not have permission to delete Transfer In records." }
  }

  try {
    const existing = await prisma.transferIn.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Not found" }

    await prisma.transferIn.delete({ where: { id } })
    
    revalidatePath("/forms")
    revalidatePath("/forms/production/stock")
    revalidatePath("/forms/production/transfer-in")
    revalidatePath("/forms/production/daily-report", "layout")
    
    await logUserAction(
      "Deleted Transfer In DO",
      `DO: ${existing.doNumber}, Date: ${existing.receiveDate}`
    )

    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete Transfer In:", error)
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

export async function bulkDeleteTransferIn(ids: string[]) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  if (!(await hasTransferInHistoryAccess())) {
    return { success: false, error: "Unauthorized. You do not have permission to delete Transfer In records." }
  }

  try {
    const existing = await prisma.transferIn.findMany({ 
      where: { id: { in: ids } },
      select: { doNumber: true, receiveDate: true }
    })
    
    if (existing.length === 0) return { success: false, error: "No records found" }

    await prisma.transferIn.deleteMany({ where: { id: { in: ids } } })
    
    revalidatePath("/forms")
    revalidatePath("/forms/production/stock")
    revalidatePath("/forms/production/transfer-in")
    revalidatePath("/forms/production/daily-report", "layout")
    
    const details = existing.map(e => `${e.doNumber}`).join(", ")
    await logUserAction(
      "Bulk Deleted Transfer In DOs",
      `Deleted ${existing.length} DOs: ${details}`
    )

    return { success: true }
  } catch (error: any) {
    console.error("Failed to bulk delete Transfer In:", error)
    return { success: false, error: error.message }
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

export async function deleteTransferInItem(batchNo: string, doNumber: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  const role = user.trueRole || user.role
  const modules = user.modules || []
  
  if (role !== "SUPERADMIN" && !modules.includes("PRODUCTION_STOCK")) {
    return { success: false, error: "Unauthorized. You do not have permission to delete stock items." }
  }

  try {
    const transferIn = await prisma.transferIn.findFirst({ where: { doNumber } })
    if (!transferIn) return { success: false, error: "DO Not found" }

    const item = await prisma.transferInItem.findFirst({
      where: { transferInId: transferIn.id, batchNo }
    })
    
    if (!item) return { success: false, error: "Item not found in DO" }

    // Find all reports that might be affected by this deletion (reports on or after the Transfer In date)
    const affectedReports = await prisma.dailyReport.findMany({
      where: {
        date: { gte: transferIn.receiveDate }
      },
      select: { id: true }
    })

    await prisma.transferInItem.delete({ where: { id: item.id } })
    
    revalidatePath("/forms")
    revalidatePath("/forms/production/stock")
    revalidatePath("/forms/production/transfer-in")
    revalidatePath("/forms/production/daily-report", "layout")
    
    // Revalidate specific affected report pages
    for (const report of affectedReports) {
      revalidatePath(`/forms/production/daily-report/${report.id}`)
    }
    
    await logUserAction(
      "Deleted Production Stock Item",
      `Batch: ${batchNo}, DO: ${doNumber}`
    )

    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete stock item:", error)
    return { success: false, error: error.message }
  }
}

export async function bulkDeleteTransferInItems(items: { batchNo: string, doNumber: string }[]) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  const role = user.trueRole || user.role
  const modules = user.modules || []
  
  if (role !== "SUPERADMIN" && !modules.includes("PRODUCTION_STOCK")) {
    return { success: false, error: "Unauthorized. You do not have permission to delete stock items." }
  }

  try {
    let deletedCount = 0;
    const affectedDates: Date[] = []
    
    for (const { batchNo, doNumber } of items) {
      if (!doNumber) continue;
      const transferIn = await prisma.transferIn.findFirst({ where: { doNumber } })
      if (!transferIn) continue;
      
      affectedDates.push(transferIn.receiveDate)

      const item = await prisma.transferInItem.findFirst({
        where: { transferInId: transferIn.id, batchNo }
      })
      
      if (item) {
        await prisma.transferInItem.delete({ where: { id: item.id } })
        deletedCount++;
      }
    }
    
    // Find all reports affected by these deletions
    const earliestDate = affectedDates.length > 0 ? new Date(Math.min(...affectedDates.map(d => d.getTime()))) : new Date()
    const affectedReports = await prisma.dailyReport.findMany({
      where: {
        date: { gte: earliestDate }
      },
      select: { id: true }
    })
    
    revalidatePath("/forms")
    revalidatePath("/forms/production/stock")
    revalidatePath("/forms/production/transfer-in")
    revalidatePath("/forms/production/daily-report", "layout")
    
    // Revalidate specific affected report pages
    for (const report of affectedReports) {
      revalidatePath(`/forms/production/daily-report/${report.id}`)
    }
    
    await logUserAction(
      "Bulk Deleted Production Stock Items",
      `Deleted ${deletedCount} item(s).`
    )

    return { success: true, count: deletedCount }
  } catch (error: any) {
    console.error("Failed to bulk delete stock items:", error)
    return { success: false, error: error.message }
  }
}

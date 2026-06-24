"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createDailyReport(data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const report = await prisma.dailyReport.create({
      data: {
        date: new Date(data.date),
        time: data.time,
        shift: data.shift,
        line: data.line,
        preparedBy: data.preparedBy,
        preparedSignature: data.preparedSignature || null,
        verifiedBy: data.verifiedBy,
        remarks: data.remarks,
        createdById: session.user.id,
        
        // Productions
        productions: {
          create: Object.keys(data.production || {}).filter(k => data.production[k].checked).map(k => ({
            productType: k,
            totalBox: Number(data.production[k].qty),
            batches: {
              create: data.production[k].batches.map((b: any) => ({
                batchNo: b.batchNo,
                qty: Number(b.qty),
                type: b.type,
                otherType: b.otherType
              }))
            }
          }))
        },

        // Rejects
        rejects: {
          create: Object.keys(data.rejects || {}).map(k => ({
            item: k,
            before: Number(data.rejects[k].before) || 0,
            after: Number(data.rejects[k].after) || 0
          }))
        },

        // Inventory
        inventory: {
          create: Object.keys(data.inventory || {}).flatMap(sectionKey => {
            const sources = data.inventory[sectionKey].sources.map((s: any) => ({
              sectionKey,
              type: "Storeroom", // Technically we only submit Storeroom now, as TransferIn comes from DO
              batchNo: s.batchNo,
              bags: Number(s.bags),
              mult: Number(s.mult),
              labelType: s.labelType
            }))
            
            const usages = data.inventory[sectionKey].usages.map((u: any) => ({
              sectionKey,
              type: "Usage",
              period: u.period,
              batchNo: u.batchNo,
              bags: Number(u.bags),
              mult: 1 // Default
            }))

            return [...sources, ...usages]
          })
        }
      }
    })

    revalidatePath("/forms")
    revalidatePath("/forms/daily-report")
    return { success: true, data: report }
  } catch (error: any) {
    console.error("Failed to create Daily Report:", error)
    return { success: false, error: error.message }
  }
}

export async function getActiveInventory() {
  try {
    // 1. Fetch ALL Transfer In items ever
    const allDOItems = await prisma.transferInItem.findMany({
      include: { transferIn: true }
    })
    
    // 2. Fetch ALL Usages ever (Globally)
    const allUsages = await prisma.inventoryLog.findMany({
      where: { type: "Usage" }
    })

    // Calculate global balance for every batch
    const batchBalance: Record<string, { bags: number, mult: number, category: string, date: Date, doNumber: string }> = {}
    
    allDOItems.forEach(item => {
      if (!batchBalance[item.batchNo]) {
        batchBalance[item.batchNo] = { bags: 0, mult: item.mult, category: item.category, date: item.transferIn.receiveDate, doNumber: item.transferIn.doNumber }
      }
      batchBalance[item.batchNo].bags += item.bags
    })
    
    allUsages.forEach(usage => {
      if (batchBalance[usage.batchNo]) {
        batchBalance[usage.batchNo].bags -= usage.bags
      }
    })
    
    // Separate into Today's DO vs Storeroom (Yesterday's Carry Forward / Shift Carry Forward)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const usedBatchNos = new Set(allUsages.map(u => u.batchNo))
    
    const todayDOs: any[] = []
    const storeroomBatches: any[] = []
    
    Object.keys(batchBalance).forEach(batchNo => {
      const data = batchBalance[batchNo]
      if (data.bags > 0) { // Only return active batches
        if (new Date(data.date) >= today && !usedBatchNos.has(batchNo)) {
          // Fresh DO from today that hasn't been touched by any shift yet
          todayDOs.push({ batchNo, bags: data.bags, mult: data.mult, category: data.category, doNumber: data.doNumber })
        } else {
          // Either from yesterday, OR from today but already partially used (Shift Carry Forward)
          storeroomBatches.push({ batchNo, bags: data.bags, mult: data.mult, category: data.category, labelType: "Standard" })
        }
      }
    })

    return { success: true, data: { storeroomBatches, todayDOs } }

  } catch (error: any) {
    console.error("Failed to fetch Active Inventory:", error)
    return { success: false, data: { storeroomBatches: [], todayDOs: [] } }
  }
}

export async function getAllDailyReports() {
  try {
    const reports = await prisma.dailyReport.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: reports }
  } catch (error: any) {
    return { success: false, data: [] }
  }
}

export async function getDailyReportById(id: string) {
  try {
    console.log("Fetching report ID:", id)
    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: {
        productions: { include: { batches: true } },
        rejects: true,
        inventory: true
      }
    })
    console.log("Report found:", report ? "YES" : "NO")
    return { success: true, data: report }
  } catch (error: any) {
    console.error("ERROR FETCHING REPORT:", error)
    return { success: false, data: null, error: error.message }
  }
}

export async function approveDailyReport(id: string, signatureBase64: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  if (user.trueRole !== "SUPERADMIN" && user.trueRole !== "SUPERVISOR") {
    return { success: false, error: "Only Supervisors or Superadmins can approve reports." }
  }

  try {
    const report = await prisma.dailyReport.update({
      where: { id },
      data: { 
        status: "APPROVED",
        verifiedBy: user.name || "SUPERVISOR",
        verifiedSignature: signatureBase64,
        approvedAt: new Date()
      }
    })
    revalidatePath("/forms")
    revalidatePath(`/forms/daily-report/${id}`)
    return { success: true, data: report }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateDailyReport(id: string, data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    // Verify report is PENDING or REJECTED
    const existing = await prisma.dailyReport.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Report not found" }
    if (existing.status !== "PENDING" && existing.status !== "REJECTED") return { success: false, error: "Cannot edit an approved report." }

    // Update requires deleting existing nested data and recreating
    await prisma.$transaction([
      prisma.productionOutput.deleteMany({ where: { reportId: id } }),
      prisma.rejectLog.deleteMany({ where: { reportId: id } }),
      prisma.inventoryLog.deleteMany({ where: { reportId: id } }),
      prisma.dailyReport.update({
        where: { id },
        data: {
          status: "PENDING",
          time: data.time,
          shift: data.shift,
          line: data.line,
          preparedBy: data.preparedBy,
          preparedSignature: data.preparedSignature || null,
          verifiedBy: data.verifiedBy,
          remarks: data.remarks,
          
          productions: {
            create: Object.keys(data.production || {}).filter(k => data.production[k].checked).map(k => ({
              productType: k,
              totalBox: Number(data.production[k].qty),
              batches: {
                create: data.production[k].batches.map((b: any) => ({
                  batchNo: b.batchNo,
                  qty: Number(b.qty),
                  type: b.type,
                  otherType: b.otherType
                }))
              }
            }))
          },

          rejects: {
            create: Object.keys(data.rejects || {}).map(k => ({
              item: k,
              before: Number(data.rejects[k].before) || 0,
              after: Number(data.rejects[k].after) || 0
            }))
          },

          inventory: {
            create: Object.keys(data.inventory || {}).flatMap(sectionKey => {
              const sources = data.inventory[sectionKey].sources.map((s: any) => ({
                sectionKey,
                type: "Storeroom",
                batchNo: s.batchNo,
                bags: Number(s.bags),
                mult: Number(s.mult),
                labelType: s.labelType
              }))
              
              const usages = data.inventory[sectionKey].usages.map((u: any) => ({
                sectionKey,
                type: "Usage",
                period: u.period,
                batchNo: u.batchNo,
                bags: Number(u.bags),
                mult: 1
              }))

              return [...sources, ...usages]
            })
          }
        }
      })
    ])

    revalidatePath("/forms")
    revalidatePath(`/forms/daily-report/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update Daily Report:", error)
    return { success: false, error: error.message }
  }
}

export async function rejectDailyReport(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  if (user.trueRole !== "SUPERADMIN" && user.trueRole !== "SUPERVISOR") {
    return { success: false, error: "Only Supervisors or Superadmins can reject reports." }
  }

  try {
    const report = await prisma.dailyReport.update({
      where: { id },
      data: { status: "REJECTED" }
    })
    revalidatePath("/forms")
    revalidatePath(`/forms/daily-report/${id}`)
    return { success: true, data: report }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getDailyReportsByUser(page: number = 1, pageSize: number = 10) {
  const session = await auth()
  if (!session) return { success: false, data: [], totalPages: 0 }

  try {
    const skip = (page - 1) * pageSize
    
    const [reports, totalCount] = await Promise.all([
      prisma.dailyReport.findMany({
        where: { createdById: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.dailyReport.count({
        where: { createdById: session.user.id }
      })
    ])

    return { 
      success: true, 
      data: reports,
      totalPages: Math.ceil(totalCount / pageSize),
      totalCount
    }
  } catch (error: any) {
    console.error("Failed to fetch user daily reports:", error)
    return { success: false, data: [], totalPages: 0 }
  }
}

export async function getApprovedDailyReportsByDateRange(startDate: string, endDate: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  if (user.trueRole !== "SUPERADMIN" && user.trueRole !== "SUPERVISOR") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const reports = await prisma.dailyReport.findMany({
      where: {
        status: "APPROVED",
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        productions: { include: { batches: true } },
        rejects: true,
        inventory: true
      },
      orderBy: { date: 'asc' }
    })
    
    return { success: true, data: reports }
  } catch (error: any) {
    console.error("Failed to fetch approved reports:", error)
    return { success: false, error: error.message }
  }
}

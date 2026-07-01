"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"

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
        totalManpower: Number(data.totalManpower) || null,
        maxTotalManpower: Number(data.maxTotalManpower) || null,
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
          create: [
            ...Object.keys(data.rejectsScrap || {}).map(k => ({
              item: k,
              before: Number(data.rejectsScrap[k].before) || 0,
              after: Number(data.rejectsScrap[k].after) || 0,
              type: "SCRAP"
            })),
            ...Object.keys(data.rejectsReturn || {}).map(k => ({
              item: k,
              before: Number(data.rejectsReturn[k].before) || 0,
              after: Number(data.rejectsReturn[k].after) || 0,
              type: "RETURN"
            }))
          ]
        },

        // Breakdowns
        breakdowns: {
          create: (data.breakdowns || []).map((b: any) => ({
            section: b.section,
            downtime: Number(b.downtime) || 0,
            reason: b.reason || ""
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
              mult: Number(u.mult) || 1
            }))

            return [...sources, ...usages]
          })
        }
      }
    })

    revalidatePath("/forms")
    revalidatePath("/forms/daily-report")

    // Log the action
    await logUserAction(
      "Submitted Daily Report",
      `Line: ${data.line}, Shift: ${data.shift}, Date: ${data.date}. Payload: ${JSON.stringify(data)}`
    )

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
    const batchBalance: Record<string, { bags: number, mult: number, category: string, date: Date, doNumber: string, batchNo: string }> = {}
    
    allDOItems.forEach(item => {
      const key = `${item.batchNo}|${item.mult}`
      if (!batchBalance[key]) {
        batchBalance[key] = { bags: 0, mult: item.mult, category: item.category, date: item.transferIn.receiveDate, doNumber: item.transferIn.doNumber, batchNo: item.batchNo }
      }
      batchBalance[key].bags += item.bags
    })
    
    allUsages.forEach(usage => {
      const key = `${usage.batchNo}|${usage.mult}`
      if (batchBalance[key]) {
        batchBalance[key].bags -= usage.bags
      }
    })
    
    // Separate into Today's DO vs Storeroom (Yesterday's Carry Forward / Shift Carry Forward)
    const today = new Date()
    today.setHours(0,0,0,0)
    
    // A batch is "used" if there is any usage today for this specific batchKey
    const usedBatchKeys = new Set(allUsages.map(u => `${u.batchNo}|${u.mult}`))
    
    const todayDOs: any[] = []
    const storeroomBatches: any[] = []
    
    Object.keys(batchBalance).forEach(batchKey => {
      const data = batchBalance[batchKey]
      if (data.bags > 0) { // Only return active batches
        if (new Date(data.date) >= today && !usedBatchKeys.has(batchKey)) {
          // Fresh DO from today that hasn't been touched by any shift yet
          todayDOs.push({ batchNo: data.batchNo, bags: data.bags, mult: data.mult, category: data.category, doNumber: data.doNumber })
        } else {
          // Either from yesterday, OR from today but already partially used (Shift Carry Forward)
          storeroomBatches.push({ batchNo: data.batchNo, bags: data.bags, mult: data.mult, category: data.category, labelType: "Standard" })
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
        breakdowns: true,
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
      },
      include: {
        productions: {
          include: { batches: true }
        }
      }
    })

    // Auto-generate ProductionTransfers for the Warehouse
    if (report.status === "APPROVED" && report.productions) {
      const aggregatedBatches: Record<string, number> = {}
      
      for (const prod of report.productions) {
        for (const batch of prod.batches) {
          const key = `${prod.productType}|${batch.batchNo}`
          if (!aggregatedBatches[key]) {
            aggregatedBatches[key] = 0
          }
          aggregatedBatches[key] += batch.qty
        }
      }

      const transferPromises = []
      for (const [key, qty] of Object.entries(aggregatedBatches)) {
        const [sku, batchNo] = key.split('|')
        transferPromises.push(
          prisma.productionTransfer.create({
            data: {
              dailyReportId: report.id,
              sku: sku,
              batchNumber: batchNo,
              qtyProduced: qty,
              status: "PENDING"
            }
          })
        )
      }
      if (transferPromises.length > 0) {
        await Promise.all(transferPromises)
      }
    }
    revalidatePath("/forms")
    revalidatePath(`/forms/production/daily-report/${id}`)

    await logUserAction(
      "Approved Daily Report",
      `Report ID: ${id}`
    )

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
          totalManpower: Number(data.totalManpower) || null,
          maxTotalManpower: Number(data.maxTotalManpower) || null,
          
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
            create: [
              ...Object.keys(data.rejectsScrap || {}).map(k => ({
                item: k,
                before: Number(data.rejectsScrap[k].before) || 0,
                after: Number(data.rejectsScrap[k].after) || 0,
                type: "SCRAP"
              })),
              ...Object.keys(data.rejectsReturn || {}).map(k => ({
                item: k,
                before: Number(data.rejectsReturn[k].before) || 0,
                after: Number(data.rejectsReturn[k].after) || 0,
                type: "RETURN"
              }))
            ]
          },

          breakdowns: {
            create: (data.breakdowns || []).map((b: any) => ({
              section: b.section,
              downtime: Number(b.downtime) || 0,
              reason: b.reason || ""
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
    revalidatePath(`/forms/production/daily-report/${id}`)

    await logUserAction(
      "Updated Daily Report",
      `Report ID: ${id}. Payload: ${JSON.stringify(data)}`
    )

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
    revalidatePath(`/forms/production/daily-report/${id}`)

    await logUserAction(
      "Rejected Daily Report",
      `Report ID: ${id}`
    )

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
        breakdowns: true,
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

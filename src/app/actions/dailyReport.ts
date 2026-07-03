"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"

export async function createDailyReport(data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    // Aggregate Usage Rejects
    const aggregatedRejects = {
      CAP: { before: Number(data.rejectsScrap?.cap?.before) || 0, after: Number(data.rejectsScrap?.cap?.after) || 0 },
      BOTTLE: { before: Number(data.rejectsScrap?.bottle?.before) || 0, after: Number(data.rejectsScrap?.bottle?.after) || 0 },
      LABEL: { before: Number(data.rejectsScrap?.label?.before) || 0, after: Number(data.rejectsScrap?.label?.after) || 0 },
      BOX: { before: Number(data.rejectsScrap?.box?.before) || 0, after: Number(data.rejectsScrap?.box?.after) || 0 }
    }

    Object.keys(data.inventory || {}).forEach(sectionKey => {
      const usages = data.inventory[sectionKey]?.usages || []
      usages.forEach((u: any) => {
        if (u.hasReject && u.rejectQty) {
          const qty = Number(u.rejectQty)
          if (u.period === "Before") aggregatedRejects[sectionKey as keyof typeof aggregatedRejects].before += qty
          else aggregatedRejects[sectionKey as keyof typeof aggregatedRejects].after += qty
        }
      })
    })

    const report = await prisma.dailyReport.create({
      data: {
        date: new Date(data.date),
        time: data.time,
        reportTime: data.reportTime,
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
            ...Object.keys(aggregatedRejects).map(k => ({
              item: k,
              before: aggregatedRejects[k as keyof typeof aggregatedRejects].before,
              after: aggregatedRejects[k as keyof typeof aggregatedRejects].after,
              type: "SCRAP"
            })),
            ...Object.keys(data.rejectsReturn || {}).map(k => ({
              item: k,
              before: Number(data.rejectsReturn[k].before) || 0,
              after: Number(data.rejectsReturn[k].after) || 0,
              type: "RETURN"
            }))
          ].filter(r => r.before > 0 || r.after > 0)
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

            const holds = (data.inventory[sectionKey].holds || []).map((h: any) => ({
              sectionKey,
              type: "Hold",
              batchNo: h.batchNo,
              bags: Number(h.qty),
              mult: Number(h.mult) || 1
            }))

            return [...sources, ...usages, ...holds]
          })
        },

        // Holds
        holds: {
          create: Object.keys(data.inventory || {}).flatMap(sectionKey => {
            return (data.inventory[sectionKey].holds || []).map((h: any) => ({
              sectionKey,
              batchNo: h.batchNo,
              qty: Number(h.qty),
              mult: Number(h.mult) || 1,
              reason: h.reason || ""
            }))
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

export async function getActiveInventory(targetDateStr?: string) {
  try {
    const reportDateString = targetDateStr || new Date().toISOString().split('T')[0]
    
    let targetDate = new Date(reportDateString)
    targetDate.setUTCHours(23, 59, 59, 999)

    // 1. Fetch ALL Transfer In items up to the target date
    const allDOItems = await prisma.transferInItem.findMany({
      where: {
        transferIn: {
          receiveDate: { lte: targetDate }
        }
      },
      include: { transferIn: true }
    })
    
    // 2. Fetch ALL Usages, Holds, Reuses ever (Globally) up to the target date
    const allLogs = await prisma.inventoryLog.findMany({
      where: { 
        type: { in: ["Usage", "Hold", "Reuse"] },
        report: { date: { lte: targetDate } }
      }
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
    
    allLogs.forEach(log => {
      const key = `${log.batchNo}|${log.mult}`
      if (batchBalance[key]) {
        if (log.type === "Usage" || log.type === "Hold") {
          batchBalance[key].bags -= log.bags
        } else if (log.type === "Reuse") {
          batchBalance[key].bags += log.bags
        }
      }
    })
    
    // A batch is "used" if there is any usage today for this specific batchKey
    const usedBatchKeys = new Set(allLogs.filter(l => l.type === "Usage").map(u => `${u.batchNo}|${u.mult}`))
    
    const todayDOs: any[] = []
    const storeroomBatches: any[] = []
    
    Object.keys(batchBalance).forEach(batchKey => {
      const data = batchBalance[batchKey]
      if (data.bags > 0) { // Only return active batches
        const doDateString = new Date(data.date).toISOString().split('T')[0]
        
        if (doDateString === reportDateString && !usedBatchKeys.has(batchKey)) {
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

    // Aggregate Usage Rejects
    const aggregatedRejects = {
      CAP: { before: Number(data.rejectsScrap?.cap?.before) || 0, after: Number(data.rejectsScrap?.cap?.after) || 0 },
      BOTTLE: { before: Number(data.rejectsScrap?.bottle?.before) || 0, after: Number(data.rejectsScrap?.bottle?.after) || 0 },
      LABEL: { before: Number(data.rejectsScrap?.label?.before) || 0, after: Number(data.rejectsScrap?.label?.after) || 0 },
      BOX: { before: Number(data.rejectsScrap?.box?.before) || 0, after: Number(data.rejectsScrap?.box?.after) || 0 }
    }

    Object.keys(data.inventory || {}).forEach(sectionKey => {
      const usages = data.inventory[sectionKey]?.usages || []
      usages.forEach((u: any) => {
        if (u.hasReject && u.rejectQty) {
          const qty = Number(u.rejectQty)
          if (u.period === "Before") aggregatedRejects[sectionKey as keyof typeof aggregatedRejects].before += qty
          else aggregatedRejects[sectionKey as keyof typeof aggregatedRejects].after += qty
        }
      })
    })

    // Update requires deleting existing nested data and recreating
    await prisma.$transaction([
      prisma.productionHoldItem.deleteMany({ where: { reportId: id } }),
      prisma.productionOutput.deleteMany({ where: { reportId: id } }),
      prisma.rejectLog.deleteMany({ where: { reportId: id } }),
      prisma.inventoryLog.deleteMany({ where: { reportId: id } }),
      prisma.dailyReport.update({
        where: { id },
        data: {
          status: "PENDING",
          time: data.time,
          reportTime: data.reportTime,
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
              ...Object.keys(aggregatedRejects).map(k => ({
                item: k,
                before: aggregatedRejects[k as keyof typeof aggregatedRejects].before,
                after: aggregatedRejects[k as keyof typeof aggregatedRejects].after,
                type: "SCRAP"
              })),
              ...Object.keys(data.rejectsReturn || {}).map(k => ({
                item: k,
                before: Number(data.rejectsReturn[k].before) || 0,
                after: Number(data.rejectsReturn[k].after) || 0,
                type: "RETURN"
              }))
            ].filter(r => r.before > 0 || r.after > 0)
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

              const holds = (data.inventory[sectionKey].holds || []).map((h: any) => ({
                sectionKey,
                type: "Hold",
                batchNo: h.batchNo,
                bags: Number(h.qty),
                mult: Number(h.mult) || 1
              }))

              return [...sources, ...usages, ...holds]
            })
          },

          // Holds
          holds: {
            create: Object.keys(data.inventory || {}).flatMap(sectionKey => {
              return (data.inventory[sectionKey].holds || []).map((h: any) => ({
                sectionKey,
                batchNo: h.batchNo,
                qty: Number(h.qty),
                mult: Number(h.mult) || 1,
                reason: h.reason || ""
              }))
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

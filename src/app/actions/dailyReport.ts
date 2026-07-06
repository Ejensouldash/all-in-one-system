"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"

export async function createDailyReport(data: any) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    // Note: Usage rejects are already aggregated into data.rejectsScrap and data.rejectsReturn
    // by the frontend form logic. We just map them directly.

    const report = await prisma.dailyReport.create({
      data: {
        status: data.isDraft ? "DRAFT" : "PENDING",
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
          create: Object.keys(data.production || {}).filter(k => {
            if (data.line.includes('800') && !k.includes('800')) return false;
            if (data.line.includes('425') && !k.includes('425')) return false;
            return data.production[k].checked;
          }).map(k => ({
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
              item: k.toUpperCase(),
              before: Number(data.rejectsScrap[k].before) || 0,
              after: Number(data.rejectsScrap[k].after) || 0,
              type: "SCRAP"
            })),
            ...Object.keys(data.rejectsReturn || {}).map(k => ({
              item: k.toUpperCase(),
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
            if (data.line.includes('800') && sectionKey.startsWith('BOX_') && !sectionKey.includes('800')) return [];
            if (data.line.includes('425') && sectionKey.startsWith('BOX_') && !sectionKey.includes('425')) return [];
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
              mult: Number(u.mult) || 1,
              labelType: u.labelType
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
            if (data.line.includes('800') && sectionKey.startsWith('BOX_') && !sectionKey.includes('800')) return [];
            if (data.line.includes('425') && sectionKey.startsWith('BOX_') && !sectionKey.includes('425')) return [];
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

export async function getActiveInventory(targetDateStr?: string, excludeReportId?: string, shift?: string) {
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
      },
      include: { report: true }
    })

    // Helper: compare dates using LOCAL date components (avoids UTC timezone shift on +08:00)
    const toLocalDateStr = (d: Date) => {
      const dt = new Date(d)
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    }

    // Helper: was this Transfer In item RECEIVED TODAY (on the report date) and does it match the shift?
    const isReceivedToday = (item: any) => {
      if (toLocalDateStr(item.transferIn.receiveDate) !== reportDateString) return false
      // Filter by shift if provided (assuming PM shift starts at 19:00 / 7:00 PM)
      if (shift && item.transferIn.receiveTime) {
        const hour = parseInt(item.transferIn.receiveTime.split(':')[0], 10)
        if (!isNaN(hour)) {
          const isPM = hour >= 19
          if (shift === "AM" && isPM) return false
          if (shift === "PM" && !isPM) return false
        }
      }
      return true
    }

    // Accumulate, per batch key (category|batchNo|mult):
    //  - totalBalance: ALL transfer-in up to target date, minus Usage/Hold (excluding the current report), plus Reuse
    //  - todayItems:   the individual transfer-in items RECEIVED TODAY (shift matched)
    // NOTE: Today's Transfer In is tracked separately so it can ALWAYS be shown under
    //       "Transfer In (Received Today)" — even when the same Batch No already had
    //       carry-forward stock from a previous day.
    const batchInfo: Record<string, {
      totalBalance: number,
      todayItems: any[],
      mult: number,
      category: string,
      batchNo: string,
      transferInId: string,
      doNumber: string
    }> = {}

    allDOItems.forEach(item => {
      const key = `${item.category}|${item.batchNo}|${item.mult}`
      if (!batchInfo[key]) {
        batchInfo[key] = { totalBalance: 0, todayItems: [], mult: item.mult, category: item.category, batchNo: item.batchNo, transferInId: item.transferIn.id, doNumber: item.transferIn.doNumber }
      }
      batchInfo[key].totalBalance += item.bags
      if (isReceivedToday(item)) {
        batchInfo[key].todayItems.push(item)
      }
    })

    allLogs.forEach(log => {
      // Ignore logs from the report being edited so we don't double-deduct them
      if (excludeReportId && log.reportId === excludeReportId) return;

      // Find matching batch by batchNo and mult
      const matchingKeys = Object.keys(batchInfo).filter(k => k.endsWith(`|${log.batchNo}|${log.mult}`))
      if (matchingKeys.length > 0) {
        const key = matchingKeys[0] // Deduct from the first matching category
        if (log.type === "Usage" || log.type === "Hold") {
          batchInfo[key].totalBalance -= log.bags
        } else if (log.type === "Reuse") {
          batchInfo[key].totalBalance += log.bags
        }
      }
    })

    const todayDOs: any[] = []
    const storeroomBatches: any[] = []

    Object.keys(batchInfo).forEach(batchKey => {
      const info = batchInfo[batchKey]

      // Today's Transfer In (raw quantity received today for this batch)
      const todayInRaw = info.todayItems.reduce((sum, it) => sum + it.bags, 0)

      // FORMULA: Total Available = Carry Forward (previous day) + Today's Transfer In
      //  => Carry Forward (Storeroom) = Total Available - Today's Transfer In
      // (Total Available already excludes the current report's own usage via excludeReportId.)
      let carryForward = info.totalBalance - todayInRaw

      // Always list today's received Transfer In separately (each DO item keeps its own id),
      // regardless of whether this batch also carries previous-day stock.
      info.todayItems.forEach(it => {
        if (it.bags > 0) {
          todayDOs.push({ batchNo: it.batchNo, bags: it.bags, mult: it.mult, category: it.category, doNumber: it.transferIn.doNumber, transferInId: it.transferIn.id, id: it.id })
        }
      })

      // Safety clamp: if today's Transfer In was already consumed within the same day by
      // other reports, carryForward could turn negative — clamp to 0.
      if (carryForward < 0) carryForward = 0

      // Show the remaining previous-day balance under the Storeroom (Carry Forward) section.
      if (carryForward > 0) {
        storeroomBatches.push({ batchNo: info.batchNo, bags: carryForward, mult: info.mult, category: info.category, doNumber: info.doNumber, labelType: "Standard", transferInId: info.transferInId })
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
    // Verify report is PENDING, REJECTED, or DRAFT
    const existing = await prisma.dailyReport.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Report not found" }
    if (existing.status !== "PENDING" && existing.status !== "REJECTED" && existing.status !== "DRAFT") return { success: false, error: "Cannot edit an approved report." }

    // Note: Usage rejects are already aggregated into data.rejectsScrap and data.rejectsReturn
    // by the frontend form logic. We just map them directly.

    // Update requires deleting existing nested data and recreating
    await prisma.$transaction([
      prisma.productionHoldItem.deleteMany({ where: { reportId: id } }),
      prisma.productionOutput.deleteMany({ where: { reportId: id } }),
      prisma.rejectLog.deleteMany({ where: { reportId: id } }),
      prisma.inventoryLog.deleteMany({ where: { reportId: id } }),
      prisma.breakdownLog.deleteMany({ where: { reportId: id } }),
      prisma.dailyReport.update({
        where: { id },
        data: {
          status: data.isDraft ? "DRAFT" : "PENDING",
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
            create: Object.keys(data.production || {}).filter(k => {
              if (data.line.includes('800') && !k.includes('800')) return false;
              if (data.line.includes('425') && !k.includes('425')) return false;
              return data.production[k].checked;
            }).map(k => ({
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
                item: k.toUpperCase(),
                before: Number(data.rejectsScrap[k].before) || 0,
                after: Number(data.rejectsScrap[k].after) || 0,
                type: "SCRAP"
              })),
              ...Object.keys(data.rejectsReturn || {}).map(k => ({
                item: k.toUpperCase(),
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
              if (data.line.includes('800') && sectionKey.startsWith('BOX_') && !sectionKey.includes('800')) return [];
              if (data.line.includes('425') && sectionKey.startsWith('BOX_') && !sectionKey.includes('425')) return [];
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
                mult: Number(u.mult) || 1,
                labelType: u.labelType
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
              if (data.line.includes('800') && sectionKey.startsWith('BOX_') && !sectionKey.includes('800')) return [];
              if (data.line.includes('425') && sectionKey.startsWith('BOX_') && !sectionKey.includes('425')) return [];
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

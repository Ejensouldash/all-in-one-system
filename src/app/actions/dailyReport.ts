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
        noProduction: data.noProduction || false,
        
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
          ].filter(r => {
            if (r.before <= 0 && r.after <= 0) return false;
            if (data.line?.includes('800') && (r.item.includes('425') || r.item.includes('P425'))) return false;
            if (data.line?.includes('425') && (r.item.includes('800') || r.item.includes('P800'))) return false;
            return true;
          })
        },

        // Breakdowns
        breakdowns: {
          create: (data.breakdowns || []).map((b: any) => ({
            section: b.section === "others" && b.customSection ? b.customSection : b.section,
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
            })).filter((s: any) => s.batchNo && s.batchNo.trim() !== "")
            
            const usages = data.inventory[sectionKey].usages.map((u: any) => ({
              sectionKey,
              type: "Usage",
              period: u.period,
              batchNo: u.batchNo,
              bags: Number(u.bags),
              mult: Number(u.mult) || 1,
              labelType: u.labelType
            })).filter((u: any) => u.batchNo && u.batchNo.trim() !== "")

            const holds = (data.inventory[sectionKey].holds || []).map((h: any) => ({
              sectionKey,
              type: "Hold",
              batchNo: h.batchNo,
              bags: Number(h.qty),
              mult: Number(h.mult) || 1
            })).filter((h: any) => h.batchNo && h.batchNo.trim() !== "")

            const transferIns = (data.syncedDOs || []).filter((d: any) => {
              if (sectionKey === "CAP") return d.category.includes("CAP") && !d.category.includes("CARTON");
              if (sectionKey === "BOTTLE") return d.category.includes("BOTTLE") && d.category.includes(data.line.includes("800") ? "800" : "425");
              if (sectionKey === "LABEL") return d.category.includes("LABEL") && (data.line.includes("800") ? d.batchNo.startsWith("8S") : d.batchNo.startsWith("4S"));
              if (sectionKey.startsWith("BOX_")) {
                const size = sectionKey.replace("BOX_p", "").split("_")[0];
                const pack = sectionKey.split("_")[2]; // e.g. BOX_p800_12 -> 800, 12
                return d.category.includes("BOX") && !d.category.includes("CARTON") && d.category.includes(size) && d.category.includes(pack);
              }
              return false;
            }).map((d: any) => ({
              sectionKey,
              type: "TransferIn",
              batchNo: d.batchNo,
              bags: Number(d.bags),
              mult: Number(d.mult) || 1,
              labelType: d.doNumber
            }));

            const flags = sectionKey === "BOTTLE" && Array.isArray(data.syncedDOs) ? [{
              sectionKey: "SYSTEM",
              type: "TransferInFlag",
              batchNo: "FLAG",
              bags: 0,
              mult: 0
            }] : [];

            return [...sources, ...usages, ...holds, ...transferIns, ...flags]
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
            })).filter((h: any) => h.batchNo && h.batchNo.trim() !== "")
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
    
    // 2. Fetch ALL Usages, Holds, Reuses, Storeroom, and TransferIn ever (Globally) up to the target date
    const allLogs = await prisma.inventoryLog.findMany({
      where: { 
        type: { in: ["Usage", "Hold", "Reuse", "Storeroom", "TransferIn"] },
        report: { date: { lte: targetDate } }
      },
      include: { report: true }
    })

    // Helper: extract calendar date (YYYY-MM-DD)
    const toMalaysiaDateStr = (d: Date) => {
      const offsetDate = new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000)
      return offsetDate.toISOString().split('T')[0]
    }

    // Set of DO item identifiers already claimed by an existing submitted/approved report
    const claimedDOs = new Set<string>()
    allLogs.forEach(log => {
      if (log.type === "TransferIn" && log.labelType) {
        if (!excludeReportId || log.reportId !== excludeReportId) {
          // Draft reports should not lock Transfer In DOs globally for other reports
          if (log.report && log.report.status !== "DRAFT") {
            claimedDOs.add(`${log.batchNo}|${log.labelType}`)
          }
        }
      }
    })

    // Helper: was this Transfer In item RECEIVED TODAY (on the report date) and does it match the shift?
    const isReceivedToday = (item: any) => {
      if (toMalaysiaDateStr(item.transferIn.receiveDate) !== reportDateString) return false
      
      // Filter by shift if provided
      if (shift) {
        if (item.transferIn.shift) {
          // New DOs with explicit shift
          if (shift !== item.transferIn.shift) return false
        } else if (item.transferIn.receiveTime) {
          // Fallback for old DOs without explicit shift (assume >= 19:00 is PM)
          const hour = parseInt(item.transferIn.receiveTime.split(':')[0], 10)
          if (!isNaN(hour)) {
            const isPM = hour >= 19
            if (shift === "AM" && isPM) return false
            if (shift === "PM" && !isPM) return false
          }
        }
      }
      return true
    }

    const batchInfo: Record<string, {
      totalBalance: number,
      todayItems: any[],
      mult: number,
      category: string,
      batchNo: string,
      transferInId: string,
      doNumber: string
    }> = {}

    const getTimePoint = (d: Date, s: string | null) => {
      const dateStr = toMalaysiaDateStr(d)
      let score = new Date(dateStr).getTime()
      if (s === "AM") score += 1
      else if (s === "PM") score += 2
      else score += 1
      return score
    }

    allDOItems.forEach(item => {
      const key = `${item.category}|${item.batchNo}|${item.mult}`
      if (!batchInfo[key]) {
        batchInfo[key] = { totalBalance: 0, todayItems: [], mult: item.mult, category: item.category, batchNo: item.batchNo, transferInId: item.transferIn.id, doNumber: item.transferIn.doNumber }
      } else {
        if (!batchInfo[key].doNumber.includes(item.transferIn.doNumber)) {
          batchInfo[key].doNumber += `, ${item.transferIn.doNumber}`
        }
      }
      // Only offer under "Transfer In Received Today" if it is received today AND not claimed by another report yet
      if (isReceivedToday(item) && !claimedDOs.has(`${item.batchNo}|${item.transferIn.doNumber}`)) {
        batchInfo[key].todayItems.push(item)
      }
    })

    // Process events chronologically per batch
    Object.keys(batchInfo).forEach(batchKey => {
      const info = batchInfo[batchKey]
      
      const batchDOs = allDOItems.filter(item => `${item.category}|${item.batchNo}|${item.mult}` === batchKey)
      const batchLogs = allLogs.filter(log => {
        if (excludeReportId && log.reportId === excludeReportId) return false
        return batchKey.endsWith(`|${log.batchNo}|${log.mult}`)
      })

      const eventsByTp: Record<number, { transferIns: number, storeroom: number | null, usage: number }> = {}

      batchDOs.forEach(item => {
        const tp = getTimePoint(item.transferIn.receiveDate, item.transferIn.shift)
        if (!eventsByTp[tp]) eventsByTp[tp] = { transferIns: 0, storeroom: null, usage: 0 }
        eventsByTp[tp].transferIns += item.bags
      })

      batchLogs.forEach(log => {
        const tp = getTimePoint(log.report.date, log.report.shift)
        if (!eventsByTp[tp]) eventsByTp[tp] = { transferIns: 0, storeroom: null, usage: 0 }
        
        if (log.type === "Storeroom") {
          eventsByTp[tp].storeroom = (eventsByTp[tp].storeroom || 0) + log.bags
        } else if (log.type === "Usage" || log.type === "Hold") {
          eventsByTp[tp].usage += log.bags
        } else if (log.type === "Reuse") {
          eventsByTp[tp].usage -= log.bags
        }
      })

      const sortedTps = Object.keys(eventsByTp).map(Number).sort((a, b) => a - b)
      let runningBalance = 0

      sortedTps.forEach(tp => {
        const ev = eventsByTp[tp]
        // Manual storeroom entry acts as the absolute balance override for that shift
        if (ev.storeroom !== null) {
          runningBalance = ev.storeroom
        } else {
          runningBalance += ev.transferIns
          runningBalance -= ev.usage
        }
      })

      info.totalBalance = runningBalance
    })

    const todayDOs: any[] = []
    const storeroomBatches: any[] = []

    Object.keys(batchInfo).forEach(batchKey => {
      const info = batchInfo[batchKey]

      // Unclaimed Transfer In received today
      const todayInRaw = info.todayItems.reduce((sum, it) => sum + it.bags, 0)

      let carryForward = info.totalBalance - todayInRaw

      info.todayItems.forEach(it => {
        if (it.bags > 0) {
          todayDOs.push({ batchNo: it.batchNo, bags: it.bags, mult: it.mult, category: it.category, doNumber: it.transferIn.doNumber, transferInId: it.transferIn.id, id: it.id })
        }
      })

      if (carryForward < 0) carryForward = 0

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
          noProduction: data.noProduction || false,
          
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
            ].filter(r => {
              if (r.before <= 0 && r.after <= 0) return false;
              if (data.line?.includes('800') && (r.item.includes('425') || r.item.includes('P425'))) return false;
              if (data.line?.includes('425') && (r.item.includes('800') || r.item.includes('P800'))) return false;
              return true;
            })
          },

          breakdowns: {
            create: (data.breakdowns || []).map((b: any) => ({
              section: b.section === "others" && b.customSection ? b.customSection : b.section,
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
              })).filter((s: any) => s.batchNo && s.batchNo.trim() !== "")
              
              const usages = data.inventory[sectionKey].usages.map((u: any) => ({
                sectionKey,
                type: "Usage",
                period: u.period,
                batchNo: u.batchNo,
                bags: Number(u.bags),
                mult: Number(u.mult) || 1,
                labelType: u.labelType
              })).filter((u: any) => u.batchNo && u.batchNo.trim() !== "")

              const holds = (data.inventory[sectionKey].holds || []).map((h: any) => ({
                sectionKey,
                type: "Hold",
                batchNo: h.batchNo,
                bags: Number(h.qty),
                mult: Number(h.mult) || 1
              })).filter((h: any) => h.batchNo && h.batchNo.trim() !== "")

              const transferIns = (data.syncedDOs || []).filter((d: any) => {
                if (sectionKey === "CAP") return d.category.includes("CAP") && !d.category.includes("CARTON");
                if (sectionKey === "BOTTLE") return d.category.includes("BOTTLE") && d.category.includes(data.line.includes("800") ? "800" : "425");
                if (sectionKey === "LABEL") return d.category.includes("LABEL") && (data.line.includes("800") ? d.batchNo.startsWith("8S") : d.batchNo.startsWith("4S"));
                if (sectionKey.startsWith("BOX_")) {
                  const size = sectionKey.replace("BOX_p", "").split("_")[0];
                  const pack = sectionKey.split("_")[2];
                  return d.category.includes("BOX") && !d.category.includes("CARTON") && d.category.includes(size) && d.category.includes(pack);
                }
                return false;
              }).map((d: any) => ({
                sectionKey,
                type: "TransferIn",
                batchNo: d.batchNo,
                bags: Number(d.bags),
                mult: Number(d.mult) || 1,
                labelType: d.doNumber
              }));

              const flags = sectionKey === "BOTTLE" && Array.isArray(data.syncedDOs) ? [{
                sectionKey: "SYSTEM",
                type: "TransferInFlag",
                batchNo: "FLAG",
                bags: 0,
                mult: 0
              }] : [];

              return [...sources, ...usages, ...holds, ...transferIns, ...flags]
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
              })).filter((h: any) => h.batchNo && h.batchNo.trim() !== "")
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
        date: { gte: start, lte: end },
        status: "APPROVED"
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

export async function deleteDailyReport(id: string) {
  const session = await auth()
  if (!session) return { success: false, error: "Unauthorized" }

  const user = session.user as any
  if (user.trueRole !== "SUPERADMIN" && user.trueRole !== "SUPERVISOR") {
    return { success: false, error: "Unauthorized" }
  }

  try {
    // InventoryLog has onDelete: Cascade, so deleting the report 
    // will delete the logs and restore stock automatically
    await prisma.dailyReport.delete({
      where: { id }
    })

    revalidatePath("/forms")
    revalidatePath("/forms/production/daily-report")
    
    return { success: true }
  } catch (error: any) {
    console.error("Failed to delete report:", error)
    return { success: false, error: error.message }
  }
}  

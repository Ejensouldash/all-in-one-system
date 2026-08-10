"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { logUserAction } from "./audit"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { dailyReportSectionForCategory } from "@/lib/warehouse/withdrawalService"

// CAP conversion constants (must stay in sync with DailyReportForm)
const CAP_PCS_PER_BOX = 4000
const CAP_BOX_WEIGHT_KG = 0.88
const CAP_KG_PER_PC = 0.002125

function capPcsFromInput(weight: number, boxes: number) {
  if (weight > 0 && boxes > 0) {
    const net = weight - (boxes * CAP_BOX_WEIGHT_KG)
    return net > 0 ? Math.round(net / CAP_KG_PER_PC) : 0
  }
  if (weight > 0) return Math.round(weight / CAP_KG_PER_PC)
  if (boxes > 0) return boxes * CAP_PCS_PER_BOX
  return 0
}

// Builds InventoryLog "Usage" rows for one section. The server recomputes CAP bags
// from weight/boxes so a client-side bug can never persist 0 bags for a filled row.
// Draft saves keep rows that carry data even without a batch, so drafts are lossless.
function buildUsageRows(sectionKey: string, usages: any[], sources: any[], isDraft: boolean) {
  return (usages || []).map((u: any) => {
    let labelType = u.labelType
    let bags = Number(u.bags) || 0

    if (sectionKey === "CAP") {
      const w = Number(u.weight) || 0
      const b = Number(u.boxes ?? u.originalBags) || 0
      const pcs = capPcsFromInput(w, b)
      if (pcs > 0) bags = pcs / CAP_PCS_PER_BOX
      labelType = JSON.stringify({
        weight: u.weight ?? "",
        originalBags: u.originalBags ?? u.boxes ?? "",
        boxes: u.boxes ?? u.originalBags ?? ""
      })
    }

    if (sectionKey === "LABEL") {
      // The batch determines the label type — prefer the matching source's labelType
      const src = (sources || []).find((s: any) => s.batchNo === u.batchNo && s.labelType)
      if (src?.labelType) labelType = src.labelType
      if (labelType === "Standard") labelType = "Standard Front"
    }

    return {
      sectionKey,
      type: "Usage",
      period: u.period,
      batchNo: (u.batchNo || "").trim(),
      bags,
      mult: Number(u.mult) || 1,
      labelType
    }
  }).filter((u: any) => {
    if (u.batchNo !== "") return true
    return isDraft && u.bags > 0
  })
}

// Builds InventoryLog "Storeroom" rows for one section. Mirrors buildUsageRows:
// a draft keeps a row that carries a quantity even when no batch was picked yet,
// so a half-filled draft survives a reload instead of vanishing on save.
function buildSourceRows(sectionKey: string, sources: any[], isDraft: boolean) {
  return (sources || []).map((s: any) => ({
    sectionKey,
    type: "Storeroom", // Technically we only submit Storeroom now, as TransferIn comes from DO
    batchNo: (s.batchNo || "").trim(),
    bags: Number(s.bags) || 0,
    mult: Number(s.mult) || 1,
    // Only LABEL rows carry a real label type. Other sections used to inherit a bogus
    // "Standard Front" from the carry-forward dropdown and persist it here, which the
    // report view then printed on every bottle/cap/box row.
    labelType: sectionKey === "LABEL" ? s.labelType : null
  })).filter((s: any) => {
    if (s.batchNo !== "") return true
    return isDraft && s.bags > 0
  })
}

// A label batch's FIRST DIGIT identifies its line: 8… = 800ml, 4… = 425ml.
// Batch numbers arrive mixed-case with optional separators (8STDF-130526,
// 8-stdf-130526, 4stdf-130526), so normalise before reading that digit.
// Reject ONLY the opposite line — anything unclassifiable is kept, because
// silently dropping it is exactly what lost the data.
function isOtherLineLabel(batchNo: string, line: string) {
  const d = (batchNo || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()[0]
  if (d !== "8" && d !== "4") return false
  return line.includes("800") ? d === "4" : d === "8"
}

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
            const sources = buildSourceRows(sectionKey, data.inventory[sectionKey].sources, !!data.isDraft)

            const usages = buildUsageRows(sectionKey, data.inventory[sectionKey].usages, sources, !!data.isDraft)

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
              if (sectionKey === "LABEL") return d.category.includes("LABEL") && !isOtherLineLabel(d.batchNo, data.line);
              if (sectionKey.startsWith("BOX_")) {
                const size = sectionKey.replace("BOX_p", "").split("_")[0];
                const pack = sectionKey.split("_")[2]; // e.g. BOX_p800_12 -> 800, 12
                return d.category.includes("BOX") && !d.category.includes("CARTON") && d.category.includes(size) && d.category.includes(pack);
              }
              return false;
            }).map((d: any) => ({
              sectionKey,
              type: "TransferIn",
              batchNo: (d.batchNo || "").trim(),
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
    revalidatePath("/forms/production")
    revalidatePath("/forms/production/daily-report")

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

    // Helper: batch numbers are typed by hand, so stray whitespace and mixed case creep in. Every
    // key we build below must ignore both, otherwise "270726-42524 " / "270726-42524" and
    // "4stdf-130526" / "4STDF-130526" become separate batches whose usage logs never match.
    const normBatch = (b: string | null | undefined) => (b || "").trim().toUpperCase()

    // Set of DO item identifiers already claimed by an existing submitted/approved report.
    //
    // Only claims made by a report DATED THE SAME DAY count. A report can only ever sync a DO whose
    // receiveDate equals its own date (see isReceivedToday below), so a claim filed on any other
    // date is provably about a different delivery. Without that bound the key below collides:
    // doNumber is not unique on TransferIn, and the Transfer In form strips a BOX DO down to its
    // digits, so short reused names like "DO - 80020" recur every few days. A DO received
    // 2026-08-07 was being hidden by the 2026-08-06 report's claim on a same-named document —
    // invisible to every shift, taking its stock with it.
    //
    // sectionKey is part of the key because InventoryLog has no category column and all four BOX
    // SKUs plus LABEL share mult 1, so batchNo|mult cannot tell them apart.
    const claimedDOs = new Set<string>()
    allLogs.forEach(log => {
      if (log.type === "TransferIn" && log.labelType) {
        if (!excludeReportId || log.reportId !== excludeReportId) {
          // Draft reports should not lock Transfer In DOs globally for other reports
          if (log.report && log.report.status !== "DRAFT") {
            if (toMalaysiaDateStr(log.report.date) !== reportDateString) return
            claimedDOs.add(`${log.sectionKey}|${normBatch(log.batchNo)}|${log.mult}|${log.labelType}`)
          }
        }
      }
    })

    /** The claim key for a Transfer In item, matching how the report writes its log rows. */
    const claimKey = (item: any) =>
      `${dailyReportSectionForCategory(item.category) || ""}|${normBatch(item.batchNo)}|${item.mult}|${item.transferIn.doNumber}`

    // Helper: was this Transfer In item RECEIVED TODAY (on the report date)?
    const isReceivedOnReportDate = (item: any) =>
      toMalaysiaDateStr(item.transferIn.receiveDate) === reportDateString

    // Helper: does the DO belong to the shift being filled? Only a matching one may auto-sync.
    const matchesShift = (item: any) => {
      if (!shift) return true
      if (item.transferIn.shift) {
        // New DOs with explicit shift
        return shift === item.transferIn.shift
      }
      if (item.transferIn.receiveTime) {
        // Fallback for old DOs without explicit shift (assume >= 19:00 is PM)
        const hour = parseInt(item.transferIn.receiveTime.split(':')[0], 10)
        if (!isNaN(hour)) return shift === (hour >= 19 ? "PM" : "AM")
      }
      return true
    }

    const isReceivedToday = (item: any) => isReceivedOnReportDate(item) && matchesShift(item)

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

    // The report being edited sits at this point on the timeline. Anything later must not count
    // towards its opening balance — otherwise an evening delivery leaks into the morning report,
    // which contradicts the rule that an AM Transfer In becomes the PM shift's Storeroom Balance.
    const reportTp = getTimePoint(new Date(reportDateString), shift || "AM")

    // Latest known label type per batch|mult from prior report logs, so carry-forward
    // batches keep their real type (Standard Front/Back, ...) instead of a hardcoded one.
    // LABEL rows only: the key has no sectionKey, and LABEL shares mult 1 with all four BOX
    // SKUs, so without this filter a BOX batch could hand its neighbour a label type.
    const latestLabelTypes: Record<string, { labelType: string, tp: number }> = {}
    allLogs.forEach(log => {
      if (!log.labelType || !log.report) return
      if (log.sectionKey !== "LABEL") return
      if (log.type !== "Storeroom" && log.type !== "Usage") return
      const raw = log.labelType.trim()
      if (raw.startsWith("{") || raw === "(HOLD)" || raw === "HOLD") return // CAP JSON stash / hold markers
      const lt = raw === "Standard" ? "Standard Front" : raw
      const key = `${normBatch(log.batchNo)}|${log.mult}`
      const tp = getTimePoint(log.report.date, log.report.shift)
      if (!latestLabelTypes[key] || tp >= latestLabelTypes[key].tp) {
        latestLabelTypes[key] = { labelType: lt, tp }
      }
    })

    allDOItems.forEach(item => {
      const key = `${item.category}|${normBatch(item.batchNo)}|${item.mult}`
      if (!batchInfo[key]) {
        batchInfo[key] = { totalBalance: 0, todayItems: [], mult: item.mult, category: item.category, batchNo: normBatch(item.batchNo), transferInId: item.transferIn.id, doNumber: item.transferIn.doNumber }
      } else {
        if (!batchInfo[key].doNumber.includes(item.transferIn.doNumber)) {
          batchInfo[key].doNumber += `, ${item.transferIn.doNumber}`
        }
      }
      // Only offer under "Transfer In Received Today" if it is received today AND not claimed by another report yet
      if (isReceivedToday(item) && !claimedDOs.has(claimKey(item))) {
        batchInfo[key].todayItems.push(item)
      }
    })

    // Process events chronologically per batch
    Object.keys(batchInfo).forEach(batchKey => {
      const info = batchInfo[batchKey]
      
      const batchDOs = allDOItems.filter(item => `${item.category}|${normBatch(item.batchNo)}|${item.mult}` === batchKey)

      // InventoryLog carries no category, so a log can only be matched on batchNo|mult — which
      // separates nothing inside the mult-1 family: all four BOX SKUs and LABEL share mult 1.
      // Usage booked against BOX_p800_12 was therefore being subtracted from BOX_p800_20 and from
      // LABEL too whenever they shared a batch number, driving carry forward to zero and dropping
      // the batch out of the dropdown entirely. sectionKey does separate them, so use it — but only
      // within that family, and only when both sides actually carry one, so BOTTLE and CAP balances
      // (already separated by their multipliers) and pre-existing rows stay exactly as they were.
      const infoSection = dailyReportSectionForCategory(info.category)
      const multOneFamily = (k: string | null) => !!k && (k.startsWith("BOX") || k === "LABEL")

      const batchLogs = allLogs.filter(log => {
        if (excludeReportId && log.reportId === excludeReportId) return false
        if (!batchKey.endsWith(`|${normBatch(log.batchNo)}|${log.mult}`)) return false
        if (!multOneFamily(infoSection) || !multOneFamily(log.sectionKey)) return true
        return log.sectionKey === infoSection
      })

      // storeroomByReport keeps each report's declared opening separate. Both production lines draw
      // from the same storeroom and each writes its own row for the same batch and shift, so those
      // rows are one balance seen twice — summing them would double the stock.
      const eventsByTp: Record<number, {
        transferIns: number,
        transferInLogs: number,
        storeroomByReport: Record<string, number>,
        usage: number
      }> = {}
      const blank = () => ({ transferIns: 0, transferInLogs: 0, storeroomByReport: {} as Record<string, number>, usage: 0 })

      batchDOs.forEach(item => {
        const tp = getTimePoint(item.transferIn.receiveDate, item.transferIn.shift)
        if (tp > reportTp) return
        if (!eventsByTp[tp]) eventsByTp[tp] = blank()
        eventsByTp[tp].transferIns += item.bags
      })

      batchLogs.forEach(log => {
        const tp = getTimePoint(log.report.date, log.report.shift)
        if (tp > reportTp) return
        if (!eventsByTp[tp]) eventsByTp[tp] = blank()

        if (log.type === "Storeroom") {
          const byReport = eventsByTp[tp].storeroomByReport
          byReport[log.reportId] = (byReport[log.reportId] || 0) + log.bags
        } else if (log.type === "Usage" || log.type === "Hold") {
          eventsByTp[tp].usage += log.bags
        } else if (log.type === "Reuse") {
          eventsByTp[tp].usage -= log.bags
        } else if (log.type === "TransferIn") {
          eventsByTp[tp].transferInLogs += log.bags
        }
      })

      const sortedTps = Object.keys(eventsByTp).map(Number).sort((a, b) => a - b)
      let runningBalance = 0

      sortedTps.forEach(tp => {
        const ev = eventsByTp[tp]

        // A Storeroom row is the shift's OPENING balance (it is auto-filled from the previous
        // report's carry forward), so it seeds the balance but must NOT swallow that shift's usage.
        const declared = Object.values(ev.storeroomByReport)
        if (declared.length > 0) runningBalance = Math.max(...declared)

        // A saved TransferIn log is the inflow the report actually recorded. Prefer whichever
        // source is larger so the inflow survives the DO being edited or deleted afterwards.
        runningBalance += Math.max(ev.transferIns, ev.transferInLogs)
        runningBalance -= ev.usage
      })

      info.totalBalance = runningBalance
    })

    // Fetch active pending hold items to flag and include batches on hold
    const activeHoldItems = await prisma.productionHoldItem.findMany({
      where: { status: "PENDING" }
    })
    // Keyed by batchNo|mult throughout. A batch can have several PENDING hold rows, so merge their
    // quantities into one entry — otherwise each row pushes its own duplicate into the dropdown.
    const activeHoldMap: Record<string, { batchNo: string, mult: number, sectionKey: string, qty: number }> = {}
    activeHoldItems.forEach(h => {
      const key = `${normBatch(h.batchNo)}|${h.mult}`
      if (!activeHoldMap[key]) {
        activeHoldMap[key] = { batchNo: normBatch(h.batchNo), mult: h.mult, sectionKey: h.sectionKey, qty: 0 }
      }
      activeHoldMap[key].qty += h.qty
    })

    const todayDOs: any[] = []
    const storeroomBatches: any[] = []
    const addedBatchKeys = new Set<string>()

    // Received on the report date but stamped for the OTHER shift, and still unclaimed. These are
    // never auto-synced — the shift on the DO is taken at its word — but they are offered for the
    // report to pull in explicitly. Before this they were simply dropped, and because the same
    // filter fed the "Select Transfer In to Add" list there was no way to reach them from anywhere:
    // a delivery keyed in with the wrong shift took its stock out of production's sight for good.
    const otherShiftDOs = allDOItems
      .filter(item =>
        item.bags > 0 &&
        isReceivedOnReportDate(item) &&
        !matchesShift(item) &&
        !claimedDOs.has(claimKey(item))
      )
      .map(item => ({
        batchNo: normBatch(item.batchNo),
        bags: item.bags,
        mult: item.mult,
        category: item.category,
        doNumber: item.transferIn.doNumber,
        transferInId: item.transferIn.id,
        id: item.id,
        offShift: true,
        doShift: item.transferIn.shift || "",
        receiveTime: item.transferIn.receiveTime || ""
      }))

    Object.keys(batchInfo).forEach(batchKey => {
      const info = batchInfo[batchKey]

      // Unclaimed Transfer In received today
      const todayInRaw = info.todayItems.reduce((sum, it) => sum + it.bags, 0)

      let carryForward = info.totalBalance - todayInRaw

      info.todayItems.forEach(it => {
        if (it.bags > 0) {
          todayDOs.push({ batchNo: normBatch(it.batchNo), bags: it.bags, mult: it.mult, category: it.category, doNumber: it.transferIn.doNumber, transferInId: it.transferIn.id, id: it.id })
        }
      })

      if (carryForward < 0) carryForward = 0
      // batchKey is category|batchNo|mult but holds are tracked by batchNo|mult, so build the
      // matching key here. Getting this wrong left every batch unflagged and let held stock be picked.
      const holdKey = `${info.batchNo}|${info.mult}`
      const isHold = !!activeHoldMap[holdKey]

      if (carryForward > 0 || isHold) {
        addedBatchKeys.add(holdKey)
        const bags = carryForward > 0 ? carryForward : (activeHoldMap[holdKey]?.qty || 1)
        storeroomBatches.push({
          batchNo: info.batchNo,
          bags: bags,
          mult: info.mult,
          category: info.category,
          doNumber: info.doNumber,
          // Only LABEL batches get a label type. Stamping the "Standard Front" fallback onto
          // every category was what seeded bottle/cap/box rows with a label type they never had.
          labelType: isHold
            ? "(HOLD)"
            : (info.category?.includes("LABEL")
                ? (latestLabelTypes[`${info.batchNo}|${info.mult}`]?.labelType || "Standard Front")
                : undefined),
          isHold,
          transferInId: info.transferInId
        })
      }
    })

    // Ensure all pending hold items are available in carry forward dropdown
    Object.entries(activeHoldMap).forEach(([key, h]) => {
      if (!addedBatchKeys.has(key)) {
        let category = h.sectionKey
        if (category === "CAP") category = "CAP"
        else if (category === "BOTTLE") category = "BOTTLE"
        else if (category === "LABEL") category = "LABEL"

        storeroomBatches.push({
          batchNo: h.batchNo,
          bags: h.qty,
          mult: h.mult,
          category: category,
          doNumber: "HOLD",
          labelType: "(HOLD)",
          isHold: true,
          transferInId: ""
        })
        addedBatchKeys.add(key)
      }
    })

    return { success: true, data: { storeroomBatches, todayDOs, otherShiftDOs } }

  } catch (error: any) {
    console.error("Failed to fetch Active Inventory:", error)
    return { success: false, data: { storeroomBatches: [], todayDOs: [], otherShiftDOs: [] } }
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
        inventory: true,
        holds: true
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

    // Approved reports may be edited only by holders of DAILY_REPORT_EDIT_APPROVED.
    // When they are, the report STAYS approved: dropping it back to PENDING would
    // discard the supervisor's verification and let re-approval duplicate the
    // ProductionTransfer rows that approveDailyReport creates.
    let isApprovedEdit = false
    if (existing.status !== "PENDING" && existing.status !== "REJECTED" && existing.status !== "DRAFT") {
      const access = await getAccessInfo()
      isApprovedEdit = existing.status === "APPROVED" && !!access && hasAnyModule(access, ["DAILY_REPORT_EDIT_APPROVED"])
      if (!isApprovedEdit) return { success: false, error: "Cannot edit an approved report." }
    }

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
          status: isApprovedEdit ? "APPROVED" : (data.isDraft ? "DRAFT" : "PENDING"),
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
              const sources = buildSourceRows(sectionKey, data.inventory[sectionKey].sources, !!data.isDraft)

              const usages = buildUsageRows(sectionKey, data.inventory[sectionKey].usages, sources, !!data.isDraft)

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
                if (sectionKey === "LABEL") return d.category.includes("LABEL") && !isOtherLineLabel(d.batchNo, data.line);
                if (sectionKey.startsWith("BOX_")) {
                  const size = sectionKey.replace("BOX_p", "").split("_")[0];
                  const pack = sectionKey.split("_")[2];
                  return d.category.includes("BOX") && !d.category.includes("CARTON") && d.category.includes(size) && d.category.includes(pack);
                }
                return false;
              }).map((d: any) => ({
                sectionKey,
                type: "TransferIn",
                batchNo: (d.batchNo || "").trim(),
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
    revalidatePath("/forms/production")
    revalidatePath("/forms/production/daily-report")
    revalidatePath(`/forms/production/daily-report/${id}`)

    await logUserAction(
      isApprovedEdit ? "Edited APPROVED Daily Report" : "Updated Daily Report",
      `Report ID: ${id}.${isApprovedEdit ? " Report remained APPROVED after edit." : ""} Payload: ${JSON.stringify(data)}`
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

import { prisma } from "@/lib/prisma"
import { getStoreroomReport } from "@/lib/analytics/storeroom"

/**
 * Returns current date formatted as YYYY-MM-DD in Malaysia (+08:00) timezone.
 */
export function getMalaysiaDateStr(d: Date = new Date()): string {
  const offsetDate = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return offsetDate.toISOString().split("T")[0]
}

function errorMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? "Ralat tidak diketahui")
}

/**
 * Normalizes bilingual Malay / English keywords to match database records.
 * e.g. "botol" -> "BOTTLE", "penutup" -> "CAP", "kotak" -> "BOX"
 */
function normalizeItemFilter(rawFilter?: string): string {
  const f = (rawFilter || "").toUpperCase().trim()
  if (!f || f === "ALL" || f === "SEMUA") return ""
  if (f.includes("BOTOL") || f.includes("BOTTLE")) return "BOTTLE"
  if (f.includes("PENUTUP") || f.includes("CAP")) return "CAP"
  if (f.includes("LABEL")) return "LABEL"
  if (f.includes("KOTAK") || f.includes("BOX") || f.includes("CARTON")) return "BOX"
  return f
}

/**
 * 1. Fetch Storeroom stock balance (bottles, caps, labels, cartons/boxes)
 */
export async function getStoreroomStock(params: { itemFilter?: string; date?: string }) {
  const asOf = params.date || getMalaysiaDateStr()
  try {
    const report = await getStoreroomReport(asOf)
    const filter = normalizeItemFilter(params.itemFilter)

    // Filter groups (SKU totals)
    const groups = report.groups.filter(g => {
      if (!filter) return g.pcs > 0 || g.heldBatches > 0
      return g.sku.toUpperCase().includes(filter)
    })

    // Filter individual batch rows
    const rows = report.rows.filter(r => {
      if (!filter) return true
      return r.sku.toUpperCase().includes(filter)
    })

    return {
      asOf: report.asOf,
      summaryPerSku: groups.map(g => ({
        sku: g.sku,
        unit: g.unit,
        totalBalanceBagsOrBoxes: g.balance,
        totalPcs: g.pcs,
        activeBatchesCount: g.batches,
        heldPieces: g.heldBalance,
      })),
      totalAvailablePieces: groups.reduce((acc, g) => acc + g.pcs, 0),
      batchBreakdownSample: rows.slice(0, 15).map(r => ({
        sku: r.sku,
        batchNo: r.batchNo,
        doNumber: r.doNumber,
        balance: r.balance,
        pcs: r.pcs,
      })),
      totalBatches: report.totals.batches,
      heldBatches: report.totals.heldBatches,
    }
  } catch (error: unknown) {
    return { error: `Gagal mendapatkan baki storeroom: ${errorMessageOf(error)}` }
  }
}

/**
 * 2. Fetch Transfer-In records (Incoming DOs and delivery breakdown)
 */
export async function getTransferInDeliveries(params: { date?: string; itemFilter?: string }) {
  const targetDateStr = params.date || getMalaysiaDateStr()
  const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`)

  try {
    const records = await prisma.transferIn.findMany({
      where: {
        receiveDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const filter = normalizeItemFilter(params.itemFilter)
    let totalPieces = 0
    let totalBags = 0

    const deliveries = records.map(rec => {
      const filteredItems = rec.items.filter(item => {
        if (!filter) return true
        return (
          item.category.toUpperCase().includes(filter) ||
          item.batchNo.toUpperCase().includes(filter)
        )
      })

      const recPieces = filteredItems.reduce((sum, item) => sum + (item.bags * item.mult), 0)
      const recBags = filteredItems.reduce((sum, item) => sum + item.bags, 0)
      totalPieces += recPieces
      totalBags += recBags

      return {
        id: rec.id,
        doNumber: rec.doNumber,
        receiveDate: rec.receiveDate.toISOString().split("T")[0],
        receiveTime: rec.receiveTime,
        shift: rec.shift,
        receiverName: rec.receiverName,
        items: filteredItems.map(item => ({
          category: item.category,
          batchNo: item.batchNo,
          bags: item.bags,
          mult: item.mult,
          totalPcs: item.bags * item.mult,
        })),
        totalPieces: recPieces,
      }
    })

    return {
      date: targetDateStr,
      totalDeliveriesCount: deliveries.length,
      totalPiecesDelivered: totalPieces,
      totalBagsOrBoxesDelivered: totalBags,
      deliveries,
    }
  } catch (error: unknown) {
    return { error: `Gagal mendapatkan rekod transfer-in: ${errorMessageOf(error)}` }
  }
}

/**
 * 3. Fetch Daily Production Report insights (outputs, scrap/rejects, machine breakdowns)
 */
export async function getDailyProductionSummary(params: { date?: string; line?: string }) {
  const targetDateStr = params.date || getMalaysiaDateStr()
  const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`)
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`)

  try {
    const whereClause: {
      date: { gte: Date; lte: Date }
      line?: { contains: string; mode: "insensitive" }
    } = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    }
    if (params.line) {
      whereClause.line = { contains: params.line, mode: "insensitive" }
    }

    const reports = await prisma.dailyReport.findMany({
      where: whereClause,
      include: {
        productions: {
          include: { batches: true },
        },
        rejects: true,
        breakdowns: true,
      },
      orderBy: { createdAt: "desc" },
    })

    if (reports.length === 0) {
      return {
        date: targetDateStr,
        message: `Tiada laporan harian produksi dijumpai untuk tarikh ${targetDateStr}.`,
        reportsCount: 0,
      }
    }

    return {
      date: targetDateStr,
      reportsCount: reports.length,
      reports: reports.map(r => ({
        id: r.id,
        line: r.line,
        shift: r.shift,
        status: r.status,
        preparedBy: r.preparedBy,
        verifiedBy: r.verifiedBy,
        noProduction: r.noProduction,
        productions: r.productions.map(p => ({
          productType: p.productType,
          totalBox: p.totalBox,
          batches: p.batches.map(b => ({
            batchNo: b.batchNo,
            qty: b.qty,
            type: b.type,
          })),
        })),
        totalScrapRejectCount: r.rejects.reduce((sum, rej) => sum + (rej.after - rej.before || 0), 0),
        rejectDetails: r.rejects.map(rej => ({
          item: rej.item,
          diff: rej.after - rej.before,
          type: rej.type,
        })),
        breakdowns: r.breakdowns.map(b => ({
          section: b.section,
        })),
      })),
    }
  } catch (error: unknown) {
    return { error: `Gagal mendapatkan laporan produksi: ${errorMessageOf(error)}` }
  }
}

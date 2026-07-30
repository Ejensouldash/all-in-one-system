import { prisma } from "@/lib/prisma"
import { findSku, skuRank } from "./rawMaterialSkus"
import { normaliseBatchNo, validateBatchNo } from "./batchFormat"

/**
 * Core logic for the Daily Raw Material (Warehouse) form.
 *
 * Kept out of the server action so it can be exercised directly by verification scripts, and so
 * the action stays a thin auth wrapper. Same split as src/lib/analytics/compute.ts.
 *
 * Nothing here touches production code. The only cross-module write is the TransferIn document,
 * which is how a stock-out reaches the Daily Production Report — exactly the mechanism
 * src/app/actions/handover.ts already uses.
 */

export type RawMaterialRowInput = {
  sku: string
  batchNo: string
  balanceIn: number
  qtyIn: number
  qtyOut: number
  remarks?: string
}

export type RawMaterialReportInput = {
  date: string // YYYY-MM-DD
  time: string
  shift: string // "AM" | "PM"
  preparedBy: string
  preparedSignature?: string
  verifiedBy?: string
  verifiedSignature?: string
  remarks?: string
  createdById?: string | null
  rows: RawMaterialRowInput[]
}

export class RawMaterialError extends Error {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** @db.Date columns are compared at UTC midnight everywhere else in this codebase. */
export function toDbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function num(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

// ---------------------------------------------------------------------------------------------

/**
 * Opening balances for a new form: the carry forward of the most recent report.
 * Rows that carried forward zero are dropped — a finished batch should not reappear.
 */
export async function loadCarryForwardPrefill() {
  const previous = await prisma.warehouseRawMaterialReport.findFirst({
    orderBy: [{ date: "desc" }, { sequence: "desc" }],
    include: { items: true },
  })

  if (!previous) return { rows: [], from: null }

  const rows = previous.items
    .filter(i => i.carryForward > 0)
    .map(i => ({ sku: i.sku, batchNo: i.batchNo, balanceIn: i.carryForward }))
    .sort((a, b) => skuRank(a.sku) - skuRank(b.sku) || a.batchNo.localeCompare(b.batchNo))

  return {
    rows,
    from: {
      id: previous.id,
      date: previous.date.toISOString().split("T")[0],
      sequence: previous.sequence,
      shift: previous.shift,
    },
  }
}

/** Validates and computes every row. Throws RawMaterialError with a row-specific message. */
export function buildItems(input: RawMaterialReportInput) {
  if (!ISO_DATE.test(input.date)) throw new RawMaterialError("Tarikh tidak sah")
  if (input.shift !== "AM" && input.shift !== "PM") throw new RawMaterialError("Shift mesti AM atau PM")
  if (!input.preparedBy?.trim()) throw new RawMaterialError("Prepared by wajib diisi")

  const rawRows = (input.rows || []).filter(
    r => r.sku && (r.batchNo?.trim() || num(r.balanceIn) || num(r.qtyIn) || num(r.qtyOut))
  )
  if (rawRows.length === 0) throw new RawMaterialError("Sekurang-kurangnya satu baris diperlukan")

  const items: {
    sku: string; category: string; mult: number; batchNo: string
    balanceIn: number; qtyIn: number; qtyOut: number; carryForward: number; remarks: string | null
  }[] = []
  const seen = new Set<string>()

  for (const [i, row] of rawRows.entries()) {
    const at = `Baris ${i + 1}`
    const sku = findSku(row.sku)
    if (!sku) throw new RawMaterialError(`${at}: SKU "${row.sku}" tidak dikenali`)

    const batchNo = normaliseBatchNo(row.batchNo || "", sku.category).trim()
    const batchError = validateBatchNo(batchNo, sku.category)
    if (batchError) throw new RawMaterialError(`${at}: ${batchError}`)

    const key = `${sku.key}|${batchNo}`
    if (seen.has(key)) throw new RawMaterialError(`${at}: ${sku.label} batch ${batchNo} berulang dalam borang yang sama`)
    seen.add(key)

    const balanceIn = num(row.balanceIn)
    const qtyIn = num(row.qtyIn)
    const qtyOut = num(row.qtyOut)

    if (balanceIn < 0 || qtyIn < 0 || qtyOut < 0) throw new RawMaterialError(`${at}: kuantiti tidak boleh negatif`)

    // TransferInItem.bags is an integer column, so a fractional stock-out would be silently
    // truncated on the way to production. Reject it here instead of losing the remainder.
    if (!Number.isInteger(qtyOut)) throw new RawMaterialError(`${at}: Quantity Stock Out mesti nombor bulat`)

    const carryForward = balanceIn + qtyIn - qtyOut
    if (carryForward < 0) {
      throw new RawMaterialError(
        `${at}: ${sku.label} batch ${batchNo} — stock out (${qtyOut}) melebihi stok yang ada (${balanceIn + qtyIn})`
      )
    }

    items.push({
      sku: sku.key,
      category: sku.category,
      mult: sku.mult,
      batchNo,
      balanceIn,
      qtyIn,
      qtyOut,
      carryForward,
      remarks: row.remarks?.trim() || null,
    })
  }

  return items
}

/** Saves the report and, when there is any stock out, the TransferIn document it feeds. */
export async function saveRawMaterialReport(input: RawMaterialReportInput) {
  const items = buildItems(input)
  const reportDate = toDbDate(input.date)

  return prisma.$transaction(async tx => {
    const existing = await tx.warehouseRawMaterialReport.count({ where: { date: reportDate } })
    const sequence = existing + 1

    const outRows = items.filter(i => i.qtyOut > 0)
    // The "DO - " prefix with spaces matters: if a human later opens this DO in the Transfer In
    // edit form, that form rewrites the number to exactly this shape. Matching it up front keeps
    // the value stable instead of changing on first edit.
    const doNumber = outRows.length > 0
      ? `DO - WH${input.date.slice(2).replace(/-/g, "")}-${sequence}`
      : null

    const report = await tx.warehouseRawMaterialReport.create({
      data: {
        date: reportDate,
        time: input.time,
        shift: input.shift,
        sequence,
        preparedBy: input.preparedBy.trim(),
        preparedSignature: input.preparedSignature || null,
        verifiedBy: input.verifiedBy?.trim() || null,
        verifiedSignature: input.verifiedSignature || null,
        remarks: input.remarks?.trim() || null,
        createdById: input.createdById || null,
        linkedDoNumber: doNumber,
        items: { create: items },
      },
      include: { items: true },
    })

    if (doNumber && outRows.length > 0) {
      await tx.transferIn.create({
        data: {
          doNumber,
          receiveDate: reportDate,
          receiveTime: input.time,
          shift: input.shift,
          receiverName: "System (Warehouse DRM)",
          items: {
            create: outRows.map(r => ({
              category: r.category,
              batchNo: r.batchNo,
              bags: Math.round(r.qtyOut),
              mult: r.mult,
            })),
          },
        },
      })
    }

    return report
  })
}

/**
 * Has the DO generated by a report already been pulled into a Daily Production Report?
 *
 * Deleting a claimed DO would leave usage behind with no matching inflow — the exact
 * "balance goes negative and the batch vanishes" failure fixed earlier this week.
 */
export async function checkLinkedDoClaimed(reportId: string) {
  const report = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { linkedDoNumber: true },
  })
  if (!report?.linkedDoNumber) return { claimed: false, by: [] as string[] }

  const logs = await prisma.inventoryLog.findMany({
    where: { type: "TransferIn", labelType: report.linkedDoNumber },
    include: { report: { select: { date: true, shift: true, line: true, status: true } } },
  })

  const claiming = logs.filter(l => l.report && l.report.status !== "DRAFT")
  return {
    claimed: claiming.length > 0,
    by: [
      ...new Set(
        claiming.map(l => `${l.report!.date.toISOString().split("T")[0]} ${l.report!.shift} ${l.report!.line}`)
      ),
    ],
  }
}

export async function deleteReportAndLinkedDo(reportId: string) {
  const report = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { linkedDoNumber: true, date: true, sequence: true },
  })
  if (!report) throw new RawMaterialError("Report tidak dijumpai")

  await prisma.$transaction(async tx => {
    if (report.linkedDoNumber) {
      await tx.transferIn.deleteMany({ where: { doNumber: report.linkedDoNumber } })
    }
    await tx.warehouseRawMaterialReport.delete({ where: { id: reportId } })
  })

  return report
}

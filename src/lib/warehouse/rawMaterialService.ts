import { prisma } from "@/lib/prisma"
import { findSku, skuRank } from "./rawMaterialSkus"
import { normaliseBatchNo, validateBatchNo } from "./batchFormat"
import { getBatchAnchors, getWithdrawnSincePerKey, type BatchAnchor } from "./withdrawalService"

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
  referenceDoNumber?: string
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

const round2 = (n: number) => Math.round(n * 100) / 100

// ---------------------------------------------------------------------------------------------

export const ACTIVE = "ACTIVE"
export const VOID = "VOID"

/**
 * Opening balances for a new form: each batch's own carry forward from wherever it was last
 * mentioned in an ACTIVE report, plus the stock-out already recorded against it since then.
 *
 * This spans however many different reports those batches last appeared in — it does NOT take
 * only the single most-recent report's rows. The paper form has ten SKU sections and staff will
 * not necessarily touch every section every time; a batch must not vanish from the chain just
 * because the latest report happened to skip it.
 *
 * Warehouse staff cannot know how much production helped itself to, so `qtyOut` is filled from the
 * withdrawal records rather than typed. Rows carrying a withdrawal come back locked.
 */
export async function loadCarryForwardPrefill() {
  const anchors = await getBatchAnchors()
  const withdrawn = await getWithdrawnSincePerKey(anchors)

  const rows = [...anchors.values()]
    .filter(a => a.carryForward > 0)
    .map(a => ({
      sku: a.sku,
      batchNo: a.batchNo,
      balanceIn: a.carryForward,
      withdrawnQty: withdrawn.get(`${a.sku}|${a.batchNo}`) || 0,
    }))
    .sort((a, b) => skuRank(a.sku) - skuRank(b.sku) || a.batchNo.localeCompare(b.batchNo))

  if (rows.length === 0) return { rows: [], from: null }

  // Purely informational for the on-screen note — batches can anchor off different reports now,
  // so this names whichever report most recently touched any of them, not "the" source of truth.
  let mostRecent: BatchAnchor | null = null
  for (const a of anchors.values()) {
    if (a.carryForward > 0 && (!mostRecent || a.createdAt > mostRecent.createdAt)) mostRecent = a
  }
  const latestReport = mostRecent
    ? await prisma.warehouseRawMaterialReport.findUnique({
        where: { id: mostRecent.reportId },
        select: { date: true, sequence: true, shift: true },
      })
    : null

  return {
    rows,
    from: latestReport
      ? {
          date: latestReport.date.toISOString().split("T")[0],
          sequence: latestReport.sequence,
          shift: latestReport.shift,
        }
      : null,
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
    balanceIn: number; qtyIn: number; qtyOut: number; carryForward: number
    referenceDoNumber: string | null; remarks: string | null
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
      // Informational reference for QC only. It must never alter the generated TransferIn DO.
      referenceDoNumber: row.referenceDoNumber?.trim().toUpperCase() || null,
      remarks: row.remarks?.trim() || null,
    })
  }

  return items
}

type BuiltItem = ReturnType<typeof buildItems>[number]

/**
 * Splits each row's Quantity Stock Out into "already gone on a withdrawal DO" and "typed by hand",
 * and returns only the hand-typed remainder — the portion that may mint a DO here. Stock that left
 * through a recorded withdrawal already carries its own DO; without this the same boxes would reach
 * production twice.
 *
 * A row typed BELOW what the withdrawal records already show is a contradiction, not a remainder:
 * the warehouse is claiming less left the rack than production was handed. This used to be dropped
 * silently by a `> 0` filter, leaving the report and the withdrawals disagreeing with nothing to
 * show for it. Reject it and make the warehouse resolve which of the two is wrong.
 */
function assertCoversWithdrawals(items: BuiltItem[], withdrawnByKey: Map<string, number>) {
  const rows = items.map(i => ({
    ...i,
    withdrawnQty: withdrawnByKey.get(`${i.sku}|${i.batchNo}`) || 0,
    manualOut: round2(i.qtyOut - (withdrawnByKey.get(`${i.sku}|${i.batchNo}`) || 0)),
  }))

  const short = rows.filter(r => r.manualOut < 0)
  if (short.length > 0) {
    const detail = short
      .map(r => `${r.sku} batch ${r.batchNo} (taip ${r.qtyOut}, sudah keluar ${r.withdrawnQty})`)
      .join("; ")
    throw new RawMaterialError(
      `Quantity Stock Out lebih rendah daripada stok yang sudah keluar melalui Ambil Bahan: ${detail}. ` +
      `Naikkan angka itu, atau batalkan pengeluaran yang salah dahulu.`
    )
  }

  return rows.filter(r => r.manualOut > 0)
}

/** Saves the report and, when any stock out was typed by hand, the TransferIn document it feeds. */
export async function saveRawMaterialReport(input: RawMaterialReportInput) {
  const items = buildItems(input)
  const reportDate = toDbDate(input.date)

  // Read before opening the transaction. Each row is measured against ITS OWN batch's anchor
  // report, not one anchor applied to every row — see getBatchAnchors for why that distinction
  // matters. These withdrawals already carry their own DO.
  const anchors = await getBatchAnchors()
  const withdrawnByKey = await getWithdrawnSincePerKey(anchors, input.date)

  return prisma.$transaction(async tx => {
    // Counts voided reports too, so a sequence is never reused and DO numbers cannot collide
    // with one that was already handed to production before being voided.
    const existing = await tx.warehouseRawMaterialReport.count({ where: { date: reportDate } })
    const sequence = existing + 1

    // Stock that left through a recorded withdrawal already has its own DO, so only the portion
    // the warehouse typed by hand may generate one here. Without this the same boxes would reach
    // production twice.
    const outRows = assertCoversWithdrawals(items, withdrawnByKey)

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
              bags: Math.round(r.manualOut),
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
 * Which Daily Production Reports reference this report's generated DO?
 *
 * DRAFT reports count. If the DO is deleted while a draft still holds an InventoryLog row of
 * type "TransferIn" for it, the balance replay keeps counting that inflow through
 * Math.max(ev.transferIns, ev.transferInLogs) even though the TransferInItem is gone — a phantom
 * inflow that only clears when the draft is next saved.
 */
export async function checkLinkedDoClaimed(reportId: string) {
  const report = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { linkedDoNumber: true },
  })
  if (!report?.linkedDoNumber) return { claimed: false, submitted: [] as string[], drafts: [] as string[] }

  const logs = await prisma.inventoryLog.findMany({
    where: { type: "TransferIn", labelType: report.linkedDoNumber },
    include: { report: { select: { date: true, shift: true, line: true, status: true } } },
  })

  const describe = (l: (typeof logs)[number]) =>
    `${l.report!.date.toISOString().split("T")[0]} ${l.report!.shift} ${l.report!.line}`

  const withReport = logs.filter(l => l.report)
  const submitted = [...new Set(withReport.filter(l => l.report!.status !== "DRAFT").map(describe))]
  const drafts = [...new Set(withReport.filter(l => l.report!.status === "DRAFT").map(describe))]

  return { claimed: submitted.length > 0 || drafts.length > 0, submitted, drafts }
}

export type EditabilityReason =
  | "VOIDED"
  | "NOT_LATEST"
  | "CLAIMED_SUBMITTED"
  | "CLAIMED_DRAFT"
  | "WITHDRAWN_SINCE"
  | "NOT_FOUND"

export type Editability = {
  editable: boolean
  reason: EditabilityReason | null
  /** Plain-language message: what is blocking, and what to do about it. */
  detail: string
  isLatest: boolean
  blockedBy: string[]
}

/**
 * The single gate every mutation goes through. All three conditions must hold.
 *
 * The "must be the latest report" rule exists because balanceIn is stored as a snapshot on each
 * row. Editing an earlier report would silently leave every later report's opening balance stale.
 */
export async function getEditability(reportId: string): Promise<Editability> {
  const report = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, date: true, sequence: true, createdAt: true, items: { select: { sku: true, batchNo: true } } },
  })
  if (!report) {
    return { editable: false, reason: "NOT_FOUND", detail: "Borang tidak dijumpai.", isLatest: false, blockedBy: [] }
  }

  if (report.status !== ACTIVE) {
    return {
      editable: false,
      reason: "VOIDED",
      detail: "Borang ini sudah dibatalkan (VOID). Tiada tindakan lanjut boleh dibuat.",
      isLatest: false,
      blockedBy: [],
    }
  }

  const latest = await prisma.warehouseRawMaterialReport.findFirst({
    where: { status: ACTIVE },
    orderBy: [{ date: "desc" }, { sequence: "desc" }],
    select: { id: true, date: true, sequence: true },
  })
  const isLatest = latest?.id === report.id

  if (!isLatest && latest) {
    const label = `${latest.date.toISOString().split("T")[0]} #${latest.sequence}`
    return {
      editable: false,
      reason: "NOT_LATEST",
      detail:
        `Hanya borang terakhir boleh diubah. Borang ${label} datang selepas borang ini, dan ` +
        `Balance In Warehouse-nya diambil daripada carry forward di sini. Batalkan borang terkemudian dahulu.`,
      isLatest: false,
      blockedBy: [label],
    }
  }

  const claim = await checkLinkedDoClaimed(reportId)
  if (claim.submitted.length > 0) {
    return {
      editable: false,
      reason: "CLAIMED_SUBMITTED",
      detail:
        `DO borang ini sudah digunakan oleh Daily Production Report (${claim.submitted.join("; ")}). ` +
        `Buang DO itu daripada borang harian tersebut dahulu.`,
      isLatest,
      blockedBy: claim.submitted,
    }
  }
  if (claim.drafts.length > 0) {
    return {
      editable: false,
      reason: "CLAIMED_DRAFT",
      detail:
        `DO borang ini sudah di-sync ke dalam draft Daily Production Report (${claim.drafts.join("; ")}). ` +
        `Buang DO itu daripada draft tersebut dan simpan semula, barulah borang ini boleh diubah.`,
      isLatest,
      blockedBy: claim.drafts,
    }
  }

  // Because this report is confirmed to be the latest one overall (above), it is unambiguously
  // the current anchor for every batch it lists — nothing newer exists for any of them. If a
  // withdrawal was recorded against one of those batches after this report, voiding or editing it
  // away would leave that withdrawal's "since" calculation anchored to nothing: the batch's
  // balance and any future report's prefill for it would simply vanish, exactly as happened when
  // this gap was found (report voided, later withdrawal's stock became untraceable).
  const keys = new Set(report.items.map(i => `${i.sku}|${i.batchNo}`))
  if (keys.size > 0) {
    const laterWithdrawals = await prisma.rawMaterialWithdrawal.findMany({
      where: { status: ACTIVE, createdAt: { gt: report.createdAt } },
      select: { withdrawalNo: true, items: { select: { sku: true, batchNo: true } } },
    })
    const dependents = laterWithdrawals
      .filter(w => w.items.some(i => keys.has(`${i.sku}|${i.batchNo}`)))
      .map(w => w.withdrawalNo)

    if (dependents.length > 0) {
      return {
        editable: false,
        reason: "WITHDRAWN_SINCE",
        detail:
          `Tidak boleh diubah — pengeluaran (${dependents.join(", ")}) telah direkod berdasarkan baki ` +
          `dalam borang ini. Batalkan pengeluaran itu dahulu.`,
        isLatest,
        blockedBy: dependents,
      }
    }
  }

  return { editable: true, reason: null, detail: "Borang ini boleh diubah atau dibatalkan.", isLatest, blockedBy: [] }
}

/**
 * Per-row breakdown of a saved report's Quantity Stock Out: how much of it had already left on an
 * Ambil Bahan withdrawal (which carries its own DO), and which withdrawals those were.
 *
 * This is the same arithmetic saveRawMaterialReport/updateRawMaterialReport use to decide how big
 * the generated DO should be. It exists separately so the form and the printout can *show* the
 * split. Warehouse staff typing 2700 and watching a 900-box DO come out the other end, with nothing
 * on screen explaining the difference, is what made the 5 Aug 2026 discrepancy so hard to read.
 *
 * Keyed `sku|batchNo`, matching withdrawnByKey.
 */
export type WithdrawnSplit = { withdrawnQty: number; withdrawalNos: string[] }

export async function getWithdrawnSplitForReport(reportId: string): Promise<Map<string, WithdrawnSplit>> {
  const report = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { date: true },
  })
  if (!report) return new Map()

  const dateStr = report.date.toISOString().split("T")[0]
  const anchors = await getBatchAnchors(reportId)
  const withdrawnByKey = await getWithdrawnSincePerKey(anchors, dateStr)
  if (withdrawnByKey.size === 0) return new Map()

  // Name the withdrawals behind each number, using the same anchor/date window the totals used.
  const withdrawals = await prisma.rawMaterialWithdrawal.findMany({
    where: { status: ACTIVE, date: { lte: report.date } },
    include: { items: true },
  })

  const split = new Map<string, WithdrawnSplit>()
  for (const [key, withdrawnQty] of withdrawnByKey) {
    split.set(key, { withdrawnQty, withdrawalNos: [] })
  }
  for (const w of withdrawals) {
    for (const line of w.items) {
      const key = `${line.sku}|${line.batchNo}`
      const anchor = anchors.get(key)
      if (anchor && w.createdAt <= anchor.createdAt) continue
      const entry = split.get(key)
      if (entry && !entry.withdrawalNos.includes(w.withdrawalNo)) entry.withdrawalNos.push(w.withdrawalNo)
    }
  }
  return split
}

/** Throws unless the report passes every gate. Used by all three mutations. */
async function assertEditable(reportId: string): Promise<Editability> {
  const state = await getEditability(reportId)
  if (!state.editable) throw new RawMaterialError(state.detail)
  return state
}

/**
 * Rewrites a report in place. The DO number is deliberately preserved so it does not change on
 * every edit; the rows behind it are replaced. Same delete-and-recreate shape as updateTransferIn
 * and updateDailyReport.
 */
export async function updateRawMaterialReport(
  reportId: string,
  input: Omit<RawMaterialReportInput, "date">
) {
  await assertEditable(reportId)

  const existing = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { date: true, sequence: true, linkedDoNumber: true },
  })
  if (!existing) throw new RawMaterialError("Borang tidak dijumpai")

  // The date is fixed after creation: changing it would move the report within the chain and
  // change its sequence. A wrong date is fixed by voiding and re-entering.
  const dateStr = existing.date.toISOString().split("T")[0]
  const items = buildItems({ ...input, date: dateStr })

  // Same rule as on create: withdrawn stock already has its own DO, so only the hand-typed
  // remainder may generate one here. Excludes this report itself so it doesn't anchor off its
  // own prior values while being edited.
  const anchors = await getBatchAnchors(reportId)
  const withdrawnByKey = await getWithdrawnSincePerKey(anchors, dateStr)

  const outRows = assertCoversWithdrawals(items, withdrawnByKey)

  const doNumber = outRows.length > 0
    ? existing.linkedDoNumber || `DO - WH${dateStr.slice(2).replace(/-/g, "")}-${existing.sequence}`
    : null

  return prisma.$transaction(async tx => {
    if (existing.linkedDoNumber) {
      await tx.transferIn.deleteMany({ where: { doNumber: existing.linkedDoNumber } })
    }
    await tx.warehouseRawMaterialItem.deleteMany({ where: { reportId } })

    const report = await tx.warehouseRawMaterialReport.update({
      where: { id: reportId },
      data: {
        time: input.time,
        shift: input.shift,
        preparedBy: input.preparedBy.trim(),
        preparedSignature: input.preparedSignature || null,
        verifiedBy: input.verifiedBy?.trim() || null,
        verifiedSignature: input.verifiedSignature || null,
        remarks: input.remarks?.trim() || null,
        linkedDoNumber: doNumber,
        items: { create: items },
      },
      include: { items: true },
    })

    if (doNumber && outRows.length > 0) {
      await tx.transferIn.create({
        data: {
          doNumber,
          receiveDate: existing.date,
          receiveTime: input.time,
          shift: input.shift,
          receiverName: "System (Warehouse DRM)",
          items: {
            create: outRows.map(r => ({
              category: r.category,
              batchNo: r.batchNo,
              bags: Math.round(r.manualOut),
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
 * Voids a report: the record and its rows stay readable, the generated DO is removed, and the
 * chain skips it. The sequence is never reused, so DO numbers cannot collide later.
 */
export async function voidRawMaterialReport(reportId: string, reason: string, voidedById?: string | null) {
  await assertEditable(reportId)
  if (!reason?.trim()) throw new RawMaterialError("Sebab pembatalan wajib diisi")

  const existing = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { linkedDoNumber: true, date: true, sequence: true },
  })
  if (!existing) throw new RawMaterialError("Borang tidak dijumpai")

  await prisma.$transaction(async tx => {
    if (existing.linkedDoNumber) {
      await tx.transferIn.deleteMany({ where: { doNumber: existing.linkedDoNumber } })
    }
    await tx.warehouseRawMaterialReport.update({
      where: { id: reportId },
      data: { status: VOID, voidedAt: new Date(), voidedById: voidedById || null, voidReason: reason.trim() },
    })
  })

  return existing
}

/** Hard delete, for test and demo data. Same gate as everything else. */
export async function deleteReportAndLinkedDo(reportId: string) {
  await assertEditable(reportId)

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

/** Bypasses the gate. Only for cleaning up data created by verification scripts. */
export async function forceDeleteReport(reportId: string) {
  const report = await prisma.warehouseRawMaterialReport.findUnique({
    where: { id: reportId },
    select: { linkedDoNumber: true },
  })
  if (!report) return
  await prisma.$transaction(async tx => {
    if (report.linkedDoNumber) {
      await tx.transferIn.deleteMany({ where: { doNumber: report.linkedDoNumber } })
    }
    await tx.warehouseRawMaterialReport.delete({ where: { id: reportId } })
  })
}

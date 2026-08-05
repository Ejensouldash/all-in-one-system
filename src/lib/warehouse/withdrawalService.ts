import { prisma } from "@/lib/prisma"
import { findSku, skuRank, sectionRank, type RawMaterialSku } from "./rawMaterialSkus"
import { normaliseBatchNo } from "./batchFormat"

/**
 * Raw material withdrawal — warehouse to production.
 *
 * Production takes stock off the rack itself, so warehouse staff cannot know the outflow. Whoever
 * moves the stock records it here, and the Daily Raw Material form's QUANTITY STOCK OUT is derived
 * from these records instead of being typed.
 *
 * A PRODUCTION withdrawal writes a TransferIn document straight away, which is the only path into
 * the Daily Production Report that leaves production code untouched.
 */

export const ACTIVE = "ACTIVE"
export const VOID = "VOID"

export const PURPOSES = ["PRODUCTION", "DISPOSAL", "RETURN", "ADJUSTMENT"] as const
export type WithdrawalPurpose = (typeof PURPOSES)[number]

export class WithdrawalError extends Error {}

export type WithdrawalLineInput = { sku: string; batchNo: string; qty: number }

export type WithdrawalInput = {
  /** When the material actually left the rack (YYYY-MM-DD). May be in the past — see MAX_BACKDATE_DAYS. */
  date: string
  time: string
  shift: string
  takenBy: string
  purpose: WithdrawalPurpose
  remarks?: string
  /** Required when `date` is before today. Its presence is what marks the row as a late entry. */
  backdateReason?: string
  /** Set by the action layer from the RAW_MATERIAL_WITHDRAWAL_BACKDATE module. */
  allowBackdate?: boolean
  createdById?: string | null
  lines: WithdrawalLineInput[]
}

export type LiveStockRow = {
  key: string // `${sku}|${batchNo}`
  sku: string
  label: string
  section: string
  unit: string
  category: string
  mult: number
  batchNo: string
  available: number
  /** Sort key derived from the DDMMYY prefix most batch numbers carry. Oldest first. */
  ageKey: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const round = (n: number) => Math.round(n * 1000) / 1000

/** How far back a late entry may reach. Beyond this the paper trail is stale enough to warrant a
 *  correction on the Daily Raw Material form instead. */
export const MAX_BACKDATE_DAYS = 7

/** Recording a withdrawal for a past date is a separate grant on top of the modules that allow
 *  recording at all, the same way DAILY_REPORT_EDIT_APPROVED sits on top of daily report access.
 *  Lives here rather than in the action file: a "use server" module may only export async functions. */
export const BACKDATE_MODULE = "RAW_MATERIAL_WITHDRAWAL_BACKDATE"

function toDbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * "Now" in Malaysia, regardless of the server's own timezone. Same +8 shift the daily report uses
 * (toMalaysiaDateStr in app/actions/dailyReport.ts); read the UTC parts off the shifted instant.
 */
function malaysiaNow(): Date {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
}

/** Today in Malaysia as YYYY-MM-DD. The single definition of "today" for the whole withdrawal flow. */
export function malaysiaToday(): string {
  return malaysiaNow().toISOString().split("T")[0]
}

/** Current Malaysian wall clock as HH:MM. */
function malaysiaTimeNow(): string {
  const d = malaysiaNow()
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
}

/** Which shift is running right now — the same 19:00–07:00 rule the withdraw form defaults to. */
function malaysiaShiftNow(): "AM" | "PM" {
  const h = malaysiaNow().getUTCHours()
  return h >= 19 || h < 7 ? "PM" : "AM"
}

/** Whole days between two YYYY-MM-DD strings, `to` minus `from`. */
function daysBetween(from: string, to: string): number {
  return Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / 86_400_000)
}

/**
 * Batch numbers mostly start DDMMYY (270726-42524). Turn that into YYMMDD so a plain string sort
 * puts the oldest batch first; anything that does not match sorts last rather than pretending.
 */
function batchAgeKey(batchNo: string): string {
  const m = /(\d{2})(\d{2})(\d{2})/.exec(batchNo || "")
  if (!m) return "999999" + batchNo
  const [, dd, mm, yy] = m
  return `${yy}${mm}${dd}`
}

// ---------------------------------------------------------------------------------------------
// Live stock
// ---------------------------------------------------------------------------------------------

/**
 * What is physically on the warehouse rack right now, per batch.
 *
 *   available(B) = carryForward(B) on the latest ACTIVE DRM report containing B
 *                  − ACTIVE withdrawals of B recorded after that report
 *
 * Ordering is by createdAt, not the report date, so a backdated form cannot invert the sequence.
 */
export type BatchAnchor = { sku: string; batchNo: string; createdAt: Date; carryForward: number; reportId: string }

/**
 * The latest ACTIVE report PER BATCH — not the single latest report overall.
 *
 * This distinction matters: the paper form has ten SKU sections, and staff will not necessarily
 * touch every section on every report. If report N only covers CAP, a batch of BOX last mentioned
 * in report N-1 must still carry forward — it must not vanish just because the most recent report
 * happened not to mention it. Every caller that needs "what does this batch currently stand at"
 * must go through this, not a naive "most recent report" lookup.
 *
 * `excludeReportId` lets an edit compute what the world looked like without the report being
 * edited, so it doesn't anchor off itself.
 */
export async function getBatchAnchors(excludeReportId?: string): Promise<Map<string, BatchAnchor>> {
  const reports = await prisma.warehouseRawMaterialReport.findMany({
    where: { status: ACTIVE, ...(excludeReportId ? { id: { not: excludeReportId } } : {}) },
    orderBy: { createdAt: "asc" },
    include: { items: true },
  })

  const latest = new Map<string, BatchAnchor>()
  for (const report of reports) {
    for (const item of report.items) {
      const key = `${item.sku}|${item.batchNo}`
      const existing = latest.get(key)
      if (!existing || report.createdAt >= existing.createdAt) {
        latest.set(key, {
          sku: item.sku,
          batchNo: item.batchNo,
          createdAt: report.createdAt,
          carryForward: item.carryForward,
          reportId: report.id,
        })
      }
    }
  }
  return latest
}

/**
 * How much of each batch has been withdrawn since ITS OWN anchor report — not one anchor applied
 * uniformly to every batch. A batch with no anchor (never appeared in any ACTIVE report) counts
 * every active withdrawal against it, matching the very-first-report case.
 */
export async function getWithdrawnSincePerKey(anchors: Map<string, BatchAnchor>): Promise<Map<string, number>> {
  const withdrawals = await prisma.rawMaterialWithdrawal.findMany({
    where: { status: ACTIVE },
    include: { items: true },
  })

  const totals = new Map<string, number>()
  for (const w of withdrawals) {
    for (const line of w.items) {
      const key = `${line.sku}|${line.batchNo}`
      const anchor = anchors.get(key)
      if (anchor && w.createdAt <= anchor.createdAt) continue // already folded into that report's qtyOut
      totals.set(key, round((totals.get(key) || 0) + line.qty))
    }
  }
  return totals
}

export async function getLiveWarehouseStock(): Promise<LiveStockRow[]> {
  const anchors = await getBatchAnchors()
  const takenSince = await getWithdrawnSincePerKey(anchors)

  const rows: LiveStockRow[] = []
  for (const [key, anchor] of anchors) {
    const sku = findSku(anchor.sku)
    if (!sku) continue
    const available = round(anchor.carryForward - (takenSince.get(key) || 0))
    if (available <= 0) continue
    rows.push({
      key,
      sku: sku.key,
      label: sku.label,
      section: sku.section,
      unit: sku.unit,
      category: sku.category,
      mult: sku.mult,
      batchNo: anchor.batchNo,
      available,
      ageKey: batchAgeKey(anchor.batchNo),
    })
  }

  // Grouped the way the paper form reads, oldest batch first within each SKU.
  return rows.sort(
    (a, b) =>
      sectionRank(a.section) - sectionRank(b.section) ||
      skuRank(a.sku) - skuRank(b.sku) ||
      a.ageKey.localeCompare(b.ageKey) ||
      a.batchNo.localeCompare(b.batchNo)
  )
}

// ---------------------------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------------------------

function validateLines(lines: WithdrawalLineInput[], stock: LiveStockRow[]) {
  const clean = (lines || []).filter(l => l.sku && l.batchNo?.trim() && Number(l.qty) > 0)
  if (clean.length === 0) throw new WithdrawalError("Sekurang-kurangnya satu baris dengan kuantiti diperlukan")

  const byKey = new Map(stock.map(s => [s.key, s]))
  const seen = new Set<string>()
  const resolved: { sku: RawMaterialSku; batchNo: string; qty: number }[] = []

  for (const [i, line] of clean.entries()) {
    const at = `Baris ${i + 1}`
    const sku = findSku(line.sku)
    if (!sku) throw new WithdrawalError(`${at}: SKU "${line.sku}" tidak dikenali`)

    const batchNo = normaliseBatchNo(line.batchNo, sku.category).trim()
    const key = `${sku.key}|${batchNo}`

    if (seen.has(key)) throw new WithdrawalError(`${at}: ${sku.label} batch ${batchNo} berulang dalam satu pengeluaran`)
    seen.add(key)

    const available = byKey.get(key)
    if (!available) {
      throw new WithdrawalError(
        `${at}: ${sku.label} batch ${batchNo} tiada baki dalam warehouse. Pastikan warehouse sudah rekod stock in untuk batch ini.`
      )
    }

    const qty = Number(line.qty)
    if (!Number.isInteger(qty)) throw new WithdrawalError(`${at}: kuantiti mesti nombor bulat`)
    if (qty > available.available) {
      throw new WithdrawalError(
        `${at}: ${sku.label} batch ${batchNo} — cuba ambil ${qty} ${sku.unit.toLowerCase()} tetapi hanya ${available.available} tersedia`
      )
    }

    resolved.push({ sku, batchNo, qty })
  }

  return resolved
}

export async function createWithdrawal(input: WithdrawalInput) {
  if (!ISO_DATE.test(input.date)) throw new WithdrawalError("Tarikh tidak sah")
  if (input.shift !== "AM" && input.shift !== "PM") throw new WithdrawalError("Shift mesti AM atau PM")
  if (!input.takenBy?.trim()) throw new WithdrawalError("Nama pengambil wajib diisi")
  if (!PURPOSES.includes(input.purpose)) throw new WithdrawalError("Tujuan tidak sah")

  // A late entry records the day the material left the rack, which is not the day it is booked in.
  // Everything downstream needs to know which of the two it is looking at, so settle it here once.
  const today = malaysiaToday()
  if (input.date > today) throw new WithdrawalError("Tarikh tidak boleh pada masa hadapan")

  const isBackdated = input.date < today
  const backdateReason = input.backdateReason?.trim() || null
  if (isBackdated) {
    if (!input.allowBackdate) {
      throw new WithdrawalError(
        "Tiada kebenaran untuk merekod tarikh lepas. Minta admin beri akses 'Ambil Bahan — Rekod Tarikh Lepas'."
      )
    }
    if (!backdateReason) throw new WithdrawalError("Sebab rekod lewat wajib diisi")
    const late = daysBetween(input.date, today)
    if (late > MAX_BACKDATE_DAYS) {
      throw new WithdrawalError(
        `Rekod lewat hanya dibenarkan sehingga ${MAX_BACKDATE_DAYS} hari ke belakang (tarikh ini ${late} hari lepas)`
      )
    }
  }

  const stock = await getLiveWarehouseStock()
  const resolved = validateLines(input.lines, stock)

  const dateStamp = input.date.slice(2).replace(/-/g, "")

  return prisma.$transaction(async tx => {
    // Counting rows for the date breaks once one has been hard-deleted (forceDeleteWithdrawal): the
    // count goes back down and the next number collides with the unique withdrawalNo. Take the
    // highest suffix already issued for the date instead, so gaps are skipped rather than reused.
    const last = await tx.rawMaterialWithdrawal.findFirst({
      where: { withdrawalNo: { startsWith: `WD-${dateStamp}-` } },
      orderBy: { withdrawalNo: "desc" },
      select: { withdrawalNo: true },
    })
    const lastSeq = last ? Number(last.withdrawalNo.slice(-3)) : 0
    const seq = String((Number.isFinite(lastSeq) ? lastSeq : 0) + 1).padStart(3, "0")
    const withdrawalNo = `WD-${dateStamp}-${seq}`

    // Only a production withdrawal becomes stock for the daily report. Disposal, return and
    // adjustment reduce the warehouse balance without sending anything downstream.
    const makesDo = input.purpose === "PRODUCTION"
    const doNumber = makesDo ? `DO - WD${dateStamp}-${seq}` : null

    const withdrawal = await tx.rawMaterialWithdrawal.create({
      data: {
        withdrawalNo,
        date: toDbDate(input.date),
        time: input.time,
        shift: input.shift,
        takenBy: input.takenBy.trim(),
        purpose: input.purpose,
        remarks: input.remarks?.trim() || null,
        backdateReason,
        createdById: input.createdById || null,
        linkedDoNumber: doNumber,
        items: {
          create: resolved.map(r => ({
            sku: r.sku.key,
            category: r.sku.category,
            mult: r.sku.mult,
            batchNo: r.batchNo,
            qty: r.qty,
          })),
        },
      },
      include: { items: true },
    })

    if (doNumber) {
      // The DO carries the POSTING date, not the event date, even when the withdrawal is backdated.
      // getActiveInventory only offers a DO to the report whose date and shift match receiveDate
      // (isReceivedToday), so a DO stamped with a past date would be offered only to a report that
      // is already submitted — unclaimable, and then wiped by the next report that declares that
      // batch's Storeroom opening. Posting it now keeps it reachable. The event date stays visible
      // in doNumber, in the receiver name, and on the withdrawal row itself.
      await tx.transferIn.create({
        data: {
          doNumber,
          receiveDate: toDbDate(isBackdated ? today : input.date),
          receiveTime: isBackdated ? malaysiaTimeNow() : input.time,
          shift: isBackdated ? malaysiaShiftNow() : input.shift,
          receiverName: isBackdated
            ? `Production Withdrawal (rekod lewat ${input.date} ${input.shift}) - ${input.takenBy.trim()}`
            : `Production Withdrawal - ${input.takenBy.trim()}`,
          items: {
            create: resolved.map(r => ({
              category: r.sku.category,
              batchNo: r.batchNo,
              bags: Math.round(r.qty),
              mult: r.sku.mult,
            })),
          },
        },
      })
    }

    return withdrawal
  })
}

// ---------------------------------------------------------------------------------------------
// Void guard
// ---------------------------------------------------------------------------------------------

export type WithdrawalVoidability = {
  voidable: boolean
  reason: "VOIDED" | "CLAIMED_SUBMITTED" | "CLAIMED_DRAFT" | "CLOSED_BY_REPORT" | "NOT_FOUND" | null
  detail: string
  blockedBy: string[]
}

/**
 * Three gates, same shape as the Daily Raw Material form's own guard.
 *
 * The third is specific to withdrawals: once a DRM report has been filed that counted this
 * withdrawal in its QUANTITY STOCK OUT, voiding it would leave that report's figure wrong with
 * nothing on screen to say so.
 */
export async function getWithdrawalVoidability(id: string): Promise<WithdrawalVoidability> {
  const w = await prisma.rawMaterialWithdrawal.findUnique({
    where: { id },
    select: {
      id: true, status: true, createdAt: true, linkedDoNumber: true, withdrawalNo: true,
      items: { select: { sku: true, batchNo: true } },
    },
  })
  if (!w) return { voidable: false, reason: "NOT_FOUND", detail: "Pengeluaran tidak dijumpai.", blockedBy: [] }

  if (w.status !== ACTIVE) {
    return {
      voidable: false,
      reason: "VOIDED",
      detail: "Pengeluaran ini sudah dibatalkan. Tiada tindakan lanjut boleh dibuat.",
      blockedBy: [],
    }
  }

  if (w.linkedDoNumber) {
    const logs = await prisma.inventoryLog.findMany({
      where: { type: "TransferIn", labelType: w.linkedDoNumber },
      include: { report: { select: { date: true, shift: true, line: true, status: true } } },
    })
    const describe = (l: (typeof logs)[number]) =>
      `${l.report!.date.toISOString().split("T")[0]} ${l.report!.shift} ${l.report!.line}`
    const withReport = logs.filter(l => l.report)
    const submitted = [...new Set(withReport.filter(l => l.report!.status !== "DRAFT").map(describe))]
    const drafts = [...new Set(withReport.filter(l => l.report!.status === "DRAFT").map(describe))]

    if (submitted.length > 0) {
      return {
        voidable: false,
        reason: "CLAIMED_SUBMITTED",
        detail:
          `DO ${w.linkedDoNumber} sudah digunakan oleh Daily Production Report (${submitted.join("; ")}). ` +
          `Buang DO itu daripada borang harian tersebut dahulu.`,
        blockedBy: submitted,
      }
    }
    if (drafts.length > 0) {
      return {
        voidable: false,
        reason: "CLAIMED_DRAFT",
        detail:
          `DO ${w.linkedDoNumber} sudah di-sync ke dalam draft Daily Production Report (${drafts.join("; ")}). ` +
          `Buang DO itu daripada draft tersebut dan simpan semula.`,
        blockedBy: drafts,
      }
    }
  }

  // Only a report that actually mentions one of this withdrawal's own batches can have counted
  // it — a later report for an unrelated SKU has nothing to do with this withdrawal and must not
  // block it. Checking naively for "any later report" over-blocked in exactly this way before.
  const withdrawalKeys = new Set(w.items.map(i => `${i.sku}|${i.batchNo}`))
  const laterReports = await prisma.warehouseRawMaterialReport.findMany({
    where: { status: ACTIVE, createdAt: { gt: w.createdAt } },
    orderBy: { createdAt: "asc" },
    select: { date: true, sequence: true, items: { select: { sku: true, batchNo: true } } },
  })
  const closing = laterReports.find(r => r.items.some(i => withdrawalKeys.has(`${i.sku}|${i.batchNo}`)))
  if (closing) {
    const label = `${closing.date.toISOString().split("T")[0]} #${closing.sequence}`
    return {
      voidable: false,
      reason: "CLOSED_BY_REPORT",
      detail:
        `Borang Daily Raw Material ${label} sudah difailkan selepas pengeluaran ini dan mengambil kira ` +
        `kuantitinya dalam Quantity Stock Out. Batalkan borang itu dahulu, jika tidak angkanya akan jadi salah.`,
      blockedBy: [label],
    }
  }

  return { voidable: true, reason: null, detail: "Pengeluaran ini boleh dibatalkan.", blockedBy: [] }
}

export async function voidWithdrawal(id: string, reason: string, voidedById?: string | null) {
  const state = await getWithdrawalVoidability(id)
  if (!state.voidable) throw new WithdrawalError(state.detail)
  if (!reason?.trim()) throw new WithdrawalError("Sebab pembatalan wajib diisi")

  const w = await prisma.rawMaterialWithdrawal.findUnique({
    where: { id },
    select: { linkedDoNumber: true, withdrawalNo: true },
  })
  if (!w) throw new WithdrawalError("Pengeluaran tidak dijumpai")

  await prisma.$transaction(async tx => {
    if (w.linkedDoNumber) {
      await tx.transferIn.deleteMany({ where: { doNumber: w.linkedDoNumber } })
    }
    await tx.rawMaterialWithdrawal.update({
      where: { id },
      data: { status: VOID, voidedAt: new Date(), voidedById: voidedById || null, voidReason: reason.trim() },
    })
  })

  return w
}

export async function listWithdrawals(limit = 80) {
  return prisma.rawMaterialWithdrawal.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: true },
  })
}

/** Bypasses the guard. Only for cleaning up data created by verification scripts. */
export async function forceDeleteWithdrawal(id: string) {
  const w = await prisma.rawMaterialWithdrawal.findUnique({
    where: { id },
    select: { linkedDoNumber: true },
  })
  if (!w) return
  await prisma.$transaction(async tx => {
    if (w.linkedDoNumber) await tx.transferIn.deleteMany({ where: { doNumber: w.linkedDoNumber } })
    await tx.rawMaterialWithdrawal.delete({ where: { id } })
  })
}

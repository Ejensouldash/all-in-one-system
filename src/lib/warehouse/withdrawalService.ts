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

type ProductionLineSize = "425" | "800"

/** The production line a raw-material SKU belongs to. CAP is shared by both lines, so it is
 * deliberately left unsynchronised rather than guessing a destination draft. */
function productionLineForSku(sku: RawMaterialSku): ProductionLineSize | null {
  const identity = `${sku.key} ${sku.category} ${sku.section}`.toUpperCase()
  if (identity.includes("425")) return "425"
  if (identity.includes("800")) return "800"
  return null
}

function matchesProductionLine(line: string, size: ProductionLineSize) {
  return (line || "").toUpperCase().includes(size)
}

/**
 * Keep these section keys aligned with DailyReportForm's inventory mapping.
 *
 * Driven by the Transfer In category, because that is the only identifier that survives onto
 * TransferInItem and InventoryLog — getActiveInventory has nothing else to map from. A null
 * result means the category has no section of its own (CARTON, WRAPPING, TAPE...).
 */
export function dailyReportSectionForCategory(category: string): string | null {
  const c = category || ""
  if (c.includes("BOTTLE")) return "BOTTLE"
  if (c === "LABEL") return "LABEL"
  if (c === "CAP") return "CAP"

  const box = /^BOX\s+(425|800)x(6|12|20|24)$/i.exec(c)
  return box ? `BOX_p${box[1]}_${box[2]}` : null
}

/** Every BOX SKU's catalogue key and category are the same string (rawMaterialSkus.ts:32-35). */
function dailyReportSectionForSku(sku: RawMaterialSku): string | null {
  return dailyReportSectionForCategory(sku.category)
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
 *
 * `upTo` (an ISO date) closes the window at the top. A DRM report dated D is a statement about the
 * rack as it stood on D, so a withdrawal that physically happened after D has nothing to do with
 * it. Without this bound, saving a backdated report — or re-saving an old one — would net out
 * withdrawals from the future and quietly shrink the DO it hands to production. Live stock
 * (getLiveWarehouseStock) deliberately passes nothing: "now" has no upper bound.
 */
export async function getWithdrawnSincePerKey(
  anchors: Map<string, BatchAnchor>,
  upTo?: string
): Promise<Map<string, number>> {
  const withdrawals = await prisma.rawMaterialWithdrawal.findMany({
    where: { status: ACTIVE, ...(upTo ? { date: { lte: toDbDate(upTo) } } : {}) },
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
    // A late production withdrawal belongs to the shift in which the material physically moved.
    // It may be added straight into that shift's draft, but never silently changes a submitted
    // GMP report. CAP has no 425/800 identity, so it remains available as a historical DO rather
    // than being guessed into either line's draft.
    const draftsByLine = new Map<ProductionLineSize, { id: string }>()
    if (isBackdated && input.purpose === "PRODUCTION") {
      const affectedLines = [...new Set(
        resolved.map(r => productionLineForSku(r.sku)).filter((line): line is ProductionLineSize => line !== null)
      )]

      if (affectedLines.length > 0) {
        const reports = await tx.dailyReport.findMany({
          where: { date: toDbDate(input.date), shift: input.shift },
          select: { id: true, line: true, status: true },
        })

        for (const lineSize of affectedLines) {
          const matching = reports.filter(report => matchesProductionLine(report.line, lineSize))
          const locked = matching.filter(report => report.status !== "DRAFT")
          if (locked.length > 0) {
            const statuses = [...new Set(locked.map(report => report.status))].join(", ")
            throw new WithdrawalError(
              `Daily Production Report ${input.date} ${input.shift} untuk line ${lineSize}ml sudah ${statuses}. ` +
              "Buka semula atau buat pembetulan laporan tersebut dahulu sebelum merekod pengeluaran lewat."
            )
          }

          // No report at all for that date/shift/line means there is nothing to receive the DO.
          // getActiveInventory only offers a Transfer In whose receiveDate AND shift match the form
          // being filled, so a DO stamped 4/8 PM will never appear on the 5/8 PM form — it would
          // simply vanish, taking the stock with it. Refuse rather than release into nowhere.
          if (matching.length === 0) {
            throw new WithdrawalError(
              `Tiada Daily Production Report untuk ${input.date} ${input.shift} line ${lineSize}ml. ` +
              "Buat draf laporan tersebut dahulu, barulah DO pengeluaran ini ada tempat untuk masuk."
            )
          }

          const drafts = matching.filter(report => report.status === "DRAFT")
          if (drafts.length > 1) {
            throw new WithdrawalError(
              `Terdapat lebih daripada satu Daily Production Report DRAFT untuk ${input.date} ${input.shift} line ${lineSize}ml. ` +
              "Sila kekalkan satu draf sahaja sebelum merekod pengeluaran lewat."
            )
          }
          if (drafts[0]) draftsByLine.set(lineSize, drafts[0])
        }
      }
    }

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
      // The DO belongs to the moment the material actually left the warehouse.
      // A matching DRAFT report is synchronised below in this same transaction.
      await tx.transferIn.create({
        data: {
          doNumber,
          receiveDate: toDbDate(input.date),
          receiveTime: input.time,
          shift: input.shift,
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

      if (isBackdated) {
        const inventoryRows = resolved.flatMap(r => {
          const line = productionLineForSku(r.sku)
          const report = line ? draftsByLine.get(line) : undefined
          const sectionKey = dailyReportSectionForSku(r.sku)
          if (!report || !sectionKey) return []

          return [{
            reportId: report.id,
            sectionKey,
            type: "TransferIn",
            batchNo: r.batchNo,
            bags: Math.round(r.qty),
            mult: r.sku.mult,
            labelType: doNumber,
          }]
        })

        if (inventoryRows.length > 0) {
          await tx.inventoryLog.createMany({ data: inventoryRows })
        }
      }
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

/**
 * Read-only reconciliation for BOX batches: does what the warehouse says it released match what
 * production was actually handed?
 *
 *   npx tsx scripts/reconcile-box.ts            all BOX batches
 *   npx tsx scripts/reconcile-box.ts 030826      only batches containing "030826"
 *
 * Warehouse side, per batch:
 *   sum(WarehouseRawMaterialItem.qtyOut) over ACTIVE DRM reports
 *   — this figure already INCLUDES stock that left on an Ambil Bahan withdrawal, because the DRM
 *     form records the day's total stock-out. Withdrawals are therefore NOT added again.
 *
 * Production side, per batch: what a Daily Production Report actually CLAIMED — the
 *   InventoryLog rows of type "TransferIn". A Transfer In document that no report ever pulled in
 *   has moved no stock, so counting every TransferInItem instead would flag every stale draft DO
 *   as a discrepancy. Unclaimed DOs are listed separately, marked (unclaimed).
 *
 * The DRM's own DO (`DO - WH…`) carries only the hand-typed remainder and each withdrawal's DO
 * (`DO - WD…`) carries the rest, so on a healthy batch the two sides land on the same number.
 *
 * Only batches the DRM module has actually seen are compared. Anything the warehouse never
 * recorded a stock-out for predates the module (production keyed those DOs by hand), and its
 * "difference" would be meaningless — those are listed under a separate heading.
 *
 * On 2026-08-05 this reported +900 on batch 030826-42524 against the claimed DOs:
 * `DO - WD260804-002` had been hand-edited from 1800 to 2700 through the Transfer In form.
 * See src/lib/warehouse/systemDo.ts.
 *
 * Writes nothing. Safe to run against production.
 */

import { prisma } from "../src/lib/prisma"

const ACTIVE = "ACTIVE"
const filter = process.argv[2] || ""

const iso = (d: Date) => d.toISOString().split("T")[0]
const nf = (n: number) => n.toLocaleString("en-MY")

async function main() {
  const [reports, withdrawals, doItems, claims] = await Promise.all([
    prisma.warehouseRawMaterialReport.findMany({ where: { status: ACTIVE }, include: { items: true } }),
    prisma.rawMaterialWithdrawal.findMany({ where: { status: ACTIVE }, include: { items: true } }),
    prisma.transferInItem.findMany({ include: { transferIn: true } }),
    prisma.inventoryLog.findMany({
      where: { type: "TransferIn" },
      include: { report: { select: { date: true, shift: true, line: true, status: true } } },
    }),
  ])

  type Side = {
    released: number; received: number
    drmRefs: string[]; doRefs: string[]; wdRefs: string[]; claimRefs: string[]
  }
  const byBatch = new Map<string, Side>()
  const touch = (batchNo: string): Side => {
    const key = batchNo.trim().toUpperCase()
    if (!byBatch.has(key)) {
      byBatch.set(key, { released: 0, received: 0, drmRefs: [], doRefs: [], wdRefs: [], claimRefs: [] })
    }
    return byBatch.get(key)!
  }

  // doNumber is NOT unique — `DO - 42524` names several different Transfer In documents. So the
  // production side has to be totalled from the claims themselves, never by looking up each
  // TransferInItem and asking "was a DO by this name claimed?": that counts every same-named
  // document as claimed and inflates the difference.
  const claimedByBatch = new Map<string, Set<string>>()
  for (const c of claims) {
    if (!c.labelType) continue
    const key = (c.batchNo || "").trim().toUpperCase()
    if (!claimedByBatch.has(key)) claimedByBatch.set(key, new Set())
    claimedByBatch.get(key)!.add(c.labelType.trim())
  }

  const isBox = (s: string) => /^BOX/i.test(s)

  for (const r of reports) {
    for (const i of r.items) {
      if (!isBox(i.sku) || i.qtyOut <= 0) continue
      const side = touch(i.batchNo)
      side.released += i.qtyOut
      side.drmRefs.push(`${iso(r.date)} ${r.shift} #${r.sequence} (${nf(i.qtyOut)})`)
    }
  }

  // Informational only — a withdrawal's quantity is already inside the DRM's qtyOut. Listed so a
  // mismatch can be traced back to the record that should explain it.
  for (const w of withdrawals) {
    for (const i of w.items) {
      if (!isBox(i.sku)) continue
      touch(i.batchNo).wdRefs.push(`${w.withdrawalNo} ${iso(w.date)} ${w.shift} (${nf(i.qty)})`)
    }
  }

  // Production side = what the reports actually booked.
  for (const c of claims) {
    if (!c.sectionKey?.startsWith("BOX")) continue
    const side = touch(c.batchNo)
    side.received += c.bags
    side.claimRefs.push(
      `${iso(c.report.date)} ${c.report.shift} ${c.report.line} ${c.report.status} ` +
      `claimed ${nf(c.bags)} as ${c.labelType || "(no DO)"}`
    )
  }

  // Transfer In documents are listed for context only, so a difference can be traced to a paper
  // trail. "possibly unclaimed" is a hint, not arithmetic — with a reused doNumber it cannot tell
  // which of the same-named documents a report booked.
  for (const item of doItems) {
    if (!isBox(item.category)) continue
    const key = item.batchNo.trim().toUpperCase()
    const named = claimedByBatch.get(key)?.has(item.transferIn.doNumber.trim()) ?? false
    touch(item.batchNo).doRefs.push(
      `${item.transferIn.doNumber} ${iso(item.transferIn.receiveDate)} ${item.transferIn.shift || "?"} ` +
      `(${nf(item.bags)})${named ? "" : "  (possibly unclaimed)"}`
    )
  }

  const all = [...byBatch.entries()]
    .filter(([batch]) => !filter || batch.includes(filter.toUpperCase()))
    .map(([batch, s]) => ({ batch, ...s, diff: s.received - s.released }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.batch.localeCompare(b.batch))

  const tracked = all.filter(r => r.released > 0)
  const untracked = all.filter(r => r.released === 0 && r.received > 0)
  const bad = tracked.filter(r => r.diff !== 0)

  console.log(`DRM-tracked batches: ${tracked.length}   Out of balance: ${bad.length}\n`)

  for (const r of bad) {
    console.log(`${r.batch}   warehouse released ${nf(r.released)}   production claimed ${nf(r.received)}   diff ${r.diff > 0 ? "+" : ""}${nf(r.diff)}`)
    for (const ref of r.drmRefs) console.log(`    DRM  ${ref}`)
    for (const ref of r.wdRefs) console.log(`    WD   ${ref}`)
    for (const ref of r.doRefs) console.log(`    DO   ${ref}`)
    for (const ref of r.claimRefs) console.log(`    BOOK ${ref}`)
    console.log("")
  }

  if (bad.length === 0) console.log("Every DRM-tracked BOX batch balances.\n")

  if (untracked.length > 0) {
    console.log(`Not tracked by the DRM module (${untracked.length} batches) — production keyed these DOs by hand, so there is nothing to compare against:`)
    for (const r of untracked) console.log(`    ${r.batch}  claimed ${nf(r.received)}`)
  }

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

/**
 * Read-only: why does a BOX Transfer In DO not show up under "Transfer In (Received Today)"?
 *
 *   npx tsx scripts/diagnose-box-do.ts 2026-08-05
 *   npx tsx scripts/diagnose-box-do.ts 2026-08-05 80020     only categories containing "80020"
 *
 * For every BOX TransferInItem received on the given date, this replays the gates
 * getActiveInventory (src/app/actions/dailyReport.ts) applies before a DO reaches the daily
 * report, for each of the four report slots that could take it (AM/PM x LINE 1 800ml /
 * LINE 2 425ml), and says how the DO gets there:
 *
 *   auto-synced   receiveDate and shift both match the report — appears under
 *                 "Transfer In (Received Today)" without anyone doing anything
 *   selectable    right date, other shift — offered in "Select Transfer In to Add" as [SHIFT ...]
 *   used          a non-DRAFT report on the SAME DATE already claimed it
 *   UNREACHABLE   no report can see it; the stock is invisible to production
 *
 * A claim filed by a report on a different date is reported as a note and otherwise ignored: a
 * report only ever syncs DOs whose receiveDate equals its own date, so such a claim is provably
 * about a different delivery. That used to hide DOs outright, because BOX DO numbers are stripped
 * to digits (TransferInForm.tsx) and TransferIn.doNumber is not unique, so short names recur.
 *
 * Client side, the item lands in exactly one BOX section keyed off its category
 * (DailyReportForm.tsx:711-723) — printed here as SECTION.
 *
 * Writes nothing. Safe to run against production.
 */

import { prisma } from "../src/lib/prisma"

const dateArg = process.argv[2]
const filter = (process.argv[3] || "").toUpperCase()

if (!dateArg || !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error("Usage: npx tsx scripts/diagnose-box-do.ts <YYYY-MM-DD> [category-filter]")
  process.exit(1)
}

// Same helpers as getActiveInventory, so this reports what the action actually does.
const toMalaysiaDateStr = (d: Date) =>
  new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000).toISOString().split("T")[0]
const normBatch = (b: string | null | undefined) => (b || "").trim().toUpperCase()

/** Mirrors DailyReportForm.tsx:711-723 — which BOX INVENTORY block renders this category. */
function sectionForCategory(category: string): string | null {
  const c = category || ""
  if (!c.includes("BOX") || c.includes("CARTON")) return null
  for (const id of ["p800_12", "p800_20", "p425_24", "p425_6"]) {
    const size = id.replace("p", "").split("_")[0]
    const pack = id.split("_")[1]
    if (c.includes(size) && c.includes(pack)) return `BOX_${id}`
  }
  return null
}

/** Mirrors the receiveTime fallback for DOs saved before `shift` existed (dailyReport.ts:313-321). */
function effectiveShift(shift: string | null, receiveTime: string | null): string | null {
  if (shift) return shift
  if (!receiveTime) return null
  const hour = parseInt(receiveTime.split(":")[0], 10)
  if (isNaN(hour)) return null
  return hour >= 19 ? "PM" : "AM"
}

const SLOTS = [
  { shift: "AM", line: "LINE 1 - 800ml" },
  { shift: "PM", line: "LINE 1 - 800ml" },
  { shift: "AM", line: "LINE 2 - 425ml" },
  { shift: "PM", line: "LINE 2 - 425ml" },
]

/** A BOX section only renders on the line that makes that bottle size (DailyReportForm.tsx:708). */
const sectionOnLine = (sectionKey: string, line: string) =>
  line.includes("800") ? sectionKey.includes("800") : sectionKey.includes("425")

async function main() {
  const target = new Date(`${dateArg}T00:00:00.000Z`)

  const items = await prisma.transferInItem.findMany({
    where: { transferIn: { receiveDate: target } },
    include: { transferIn: true },
  })

  const boxItems = items
    .filter(i => sectionForCategory(i.category) !== null)
    .filter(i => !filter || i.category.toUpperCase().includes(filter) || normBatch(i.batchNo).includes(filter))
    .sort((a, b) => a.transferIn.doNumber.localeCompare(b.transferIn.doNumber) || a.category.localeCompare(b.category))

  if (boxItems.length === 0) {
    console.log(`No BOX Transfer In items with receiveDate ${dateArg}.`)
    console.log(`Check the date on the DO itself — a DO dated a different day is invisible to this report.`)
    await prisma.$disconnect()
    return
  }

  // Every claim ever made, so "claimed" can name the report that took it. DRAFT reports do not
  // lock a DO globally (dailyReport.ts:297), so they are recorded but not treated as blocking.
  const claims = await prisma.inventoryLog.findMany({
    where: { type: "TransferIn" },
    include: { report: { select: { date: true, shift: true, line: true, status: true } } },
  })

  const claimedBy = new Map<string, { date: string; where: string }[]>()
  for (const c of claims) {
    if (!c.labelType || !c.report) continue
    if (c.report.status === "DRAFT") continue
    const key = `${normBatch(c.batchNo)}|${c.mult}|${c.labelType.trim()}`
    const date = c.report.date.toISOString().split("T")[0]
    const where = `${date} ${c.report.shift} ${c.report.line}`
    if (!claimedBy.has(key)) claimedBy.set(key, [])
    if (!claimedBy.get(key)!.some(e => e.where === where)) claimedBy.get(key)!.push({ date, where })
  }

  console.log(`BOX Transfer In items received ${dateArg}: ${boxItems.length}\n`)

  const lost: string[] = []
  let usedTotal = 0
  let reachableTotal = 0

  for (const item of boxItems) {
    const t = item.transferIn
    const section = sectionForCategory(item.category)!
    const stamped = t.shift || "(none)"
    const eff = effectiveShift(t.shift, t.receiveTime)
    const claimKey = `${normBatch(item.batchNo)}|${item.mult}|${t.doNumber}`
    const claimedAt = claimedBy.get(claimKey) || []

    console.log(`${t.doNumber}   ${item.category}   batch ${normBatch(item.batchNo)}   ${item.bags} x${item.mult}`)
    console.log(`    received ${toMalaysiaDateStr(t.receiveDate)} ${t.receiveTime}   shift stamped ${stamped}` +
      (eff && eff !== t.shift ? `   (time implies ${eff})` : ""))
    console.log(`    section  ${section}   receiver ${t.receiverName}`)

    // A claim made by a report on a DIFFERENT date can never be about this document: a report only
    // ever syncs DOs whose receiveDate equals its own date. Such a claim is a false positive of the
    // `batchNo|mult|doNumber` key, which collides because BOX DO numbers are stripped to digits
    // (TransferInForm.tsx:225-227) and TransferIn.doNumber is not unique.
    const own = claimedAt.filter(c => c.date === dateArg)
    const stale = claimedAt.filter(c => c.date !== dateArg)

    if (stale.length > 0) {
      console.log(`    note     ignoring claim from ${stale.map(c => c.where).join("; ")} — different date, so a different delivery`)
    }

    const verdicts: string[] = []
    let used = false
    let reachable = false
    for (const slot of SLOTS) {
      const label = `${slot.shift} ${slot.line}`
      if (!sectionOnLine(section, slot.line)) continue // that line has no block for this box size

      if (own.length > 0) {
        verdicts.push(`${label}: used — claimed by ${own.map(c => c.where).join("; ")}`)
        used = true
      } else if (item.bags <= 0) {
        verdicts.push(`${label}: HIDDEN — bags is ${item.bags}`)
      } else if (eff === slot.shift) {
        verdicts.push(`${label}: auto-synced`)
        reachable = true
      } else {
        // Not auto-synced, but offered under "Select Transfer In to Add" marked [SHIFT ...].
        verdicts.push(`${label}: selectable (off-shift — DO says ${eff ?? "unknown"})`)
        reachable = true
      }
    }
    for (const v of verdicts) console.log(`    ${v}`)

    if (used) usedTotal++
    else if (reachable) reachableTotal++
    else lost.push(`${t.doNumber}  ${item.category}  ${normBatch(item.batchNo)}  ${item.bags} bags`)

    console.log("")
  }

  console.log(`used by a report: ${usedTotal}    still selectable: ${reachableTotal}    UNREACHABLE: ${lost.length}`)
  if (lost.length > 0) {
    console.log(`\nNo report on ${dateArg} can ever see these — the stock is invisible to production:`)
    for (const l of lost) console.log(`    ${l}`)
  }

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})

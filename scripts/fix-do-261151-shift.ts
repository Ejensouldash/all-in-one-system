/**
 * One-off repair for `DO - 261151` being claimed by the 2026-08-10 AM report.
 *
 *   npx tsx scripts/fix-do-261151-shift.ts            dry run; writes nothing
 *   npx tsx scripts/fix-do-261151-shift.ts --apply    applies one guarded transaction
 */

import assert from "node:assert/strict"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"
import dotenv from "dotenv"

dotenv.config({ path: ".env", override: true })

const APPLY = process.argv.includes("--apply")
const USE_TRANSACTION_POOLER = process.argv.includes("--transaction-pooler")

// Prefer the maintenance/direct endpoint when available; the application transaction pooler may
// be saturated by live traffic and is not required for this single-connection repair.
const hasDirectUrl = Boolean(process.env.DIRECT_URL) && !USE_TRANSACTION_POOLER
let connectionString = hasDirectUrl
  ? process.env.DIRECT_URL || ""
  : process.env.DATABASE_URL || ""
if (!hasDirectUrl && connectionString.includes("pooler.supabase.com")) {
  connectionString = connectionString.replace(":5432/", ":6543/")
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += connectionString.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true"
  }
}

// The application client intentionally fails fast after five seconds. A guarded maintenance task
// uses one connection and waits longer instead of repeatedly opening new pooler sessions.
const repairPool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 30_000,
})
const prisma = new PrismaClient({ adapter: new PrismaPg(repairPool) })

const AM_REPORT_ID = "60d3d6ff-0472-4616-9ea7-699129875ab0"
const PM_REPORT_ID = "efb1c4b3-d8ee-4295-a6d5-bedbbaaaa7b4"
const ORIGINAL_TRANSFER_ID = "5d32afc5-9545-41d7-be51-297f90ed143e"
const DUPLICATE_TRANSFER_ID = "55d0d6ae-32a1-4080-8784-b32e9e039a55"
const DO_NUMBER = "DO - 261151"
const REPORT_DATE = "2026-08-10"

const EXPECTED_ITEMS = [
  { category: "BOTTLE 425ML", batchNo: "043226-01", bags: 13, mult: 181 },
  { category: "BOTTLE 425ML", batchNo: "053226-02", bags: 112, mult: 181 },
  { category: "BOTTLE 425ML", batchNo: "063226-01", bags: 35, mult: 181 },
  { category: "BOTTLE 425ML", batchNo: "063226-01", bags: 60, mult: 162 },
]

const norm = (value: unknown) => String(value || "").trim().toUpperCase()
const dateOnly = (value: Date) => value.toISOString().split("T")[0]
const sectionForCategory = (category: string) => norm(category).includes("BOTTLE") ? "BOTTLE" : null

function signature(items: Array<{ category?: string, batchNo: string, bags: number, mult: number }>) {
  return items
    .map(item => ({
      category: norm(item.category || "BOTTLE 425ML"),
      batchNo: norm(item.batchNo),
      bags: Number(item.bags),
      mult: Number(item.mult),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
}

async function loadState(db: PrismaClient | Prisma.TransactionClient) {
  // Keep these sequential: the production transaction pooler has a deliberately small session
  // budget and a repair must not fan out several new connections merely to inspect four records.
  const amReport = await db.dailyReport.findUnique({
    where: { id: AM_REPORT_ID },
    include: { inventory: true },
  })
  const pmReport = await db.dailyReport.findUnique({
    where: { id: PM_REPORT_ID },
    include: { inventory: true },
  })
  const original = await db.transferIn.findUnique({
    where: { id: ORIGINAL_TRANSFER_ID },
    include: { items: true },
  })
  const duplicate = await db.transferIn.findUnique({
    where: { id: DUPLICATE_TRANSFER_ID },
    include: { items: true },
  })

  const wrongAMLogs = (amReport?.inventory || []).filter(log =>
    log.type === "TransferIn" && norm(log.labelType) === norm(DO_NUMBER)
  )
  const correctPMLogs = (pmReport?.inventory || []).filter(log =>
    log.type === "TransferIn" && norm(log.labelType) === norm(DO_NUMBER)
  )

  return { amReport, pmReport, original, duplicate, wrongAMLogs, correctPMLogs }
}

function assertBaseRecords(state: Awaited<ReturnType<typeof loadState>>) {
  assert(state.amReport, `AM report ${AM_REPORT_ID} not found.`)
  assert(state.pmReport, `PM report ${PM_REPORT_ID} not found.`)
  assert(state.original, `Original Transfer In ${ORIGINAL_TRANSFER_ID} not found.`)

  assert.equal(dateOnly(state.amReport.date), REPORT_DATE, "AM report date changed; stop.")
  assert.equal(state.amReport.shift, "AM", "AM report shift changed; stop.")
  assert.equal(state.amReport.status, "PENDING", "AM report status changed; stop.")
  assert.equal(dateOnly(state.pmReport.date), REPORT_DATE, "PM report date changed; stop.")
  assert.equal(state.pmReport.shift, "PM", "PM report shift changed; stop.")
  assert.equal(state.pmReport.status, "DRAFT", "PM report status changed; stop.")

  assert.equal(state.original.doNumber, DO_NUMBER, "Original DO number changed; stop.")
  assert.equal(dateOnly(state.original.receiveDate), REPORT_DATE, "Original DO date changed; stop.")
  assert.equal(state.original.shift, "PM", "Original DO is no longer PM; stop.")
  assert.deepEqual(signature(state.original.items), signature(EXPECTED_ITEMS), "Original DO item set changed; stop.")
}

function isAlreadyApplied(state: Awaited<ReturnType<typeof loadState>>) {
  return !state.duplicate && state.wrongAMLogs.length === 0 && state.correctPMLogs.length === 4
}

function assertReadyToApply(state: Awaited<ReturnType<typeof loadState>>) {
  assertBaseRecords(state)
  assert(state.duplicate, `Duplicate Transfer In ${DUPLICATE_TRANSFER_ID} not found; state is partially changed.`)
  assert.equal(state.duplicate.doNumber, DO_NUMBER, "Duplicate DO number changed; stop.")
  assert.equal(dateOnly(state.duplicate.receiveDate), REPORT_DATE, "Duplicate DO date changed; stop.")
  assert.equal(state.duplicate.shift, "PM", "Duplicate DO shift changed; stop.")
  assert.deepEqual(signature(state.duplicate.items), signature(EXPECTED_ITEMS), "Duplicate item set is no longer exact; stop.")
  assert(
    state.wrongAMLogs.length === 0 || state.wrongAMLogs.length === 4,
    "Expected either the original four wrong AM logs or the already-cleaned AM state; stop."
  )
  if (state.wrongAMLogs.length === 4) {
    assert.deepEqual(signature(state.wrongAMLogs), signature(EXPECTED_ITEMS), "Wrong AM log set changed; stop.")
  }
  assert.equal(state.correctPMLogs.length, 0, "PM report already has partial DO - 261151 logs; stop.")

  for (const item of state.original.items) {
    assert.equal(sectionForCategory(item.category), "BOTTLE", `Unexpected category ${item.category}; stop.`)
  }
}

function printPlan(state: Awaited<ReturnType<typeof loadState>>) {
  console.log(`Repair ${DO_NUMBER} (${REPORT_DATE} PM)`)
  console.log(`  AM report ${AM_REPORT_ID.slice(0, 8)}: remove ${state.wrongAMLogs.length} TransferIn logs`)
  console.log(`  PM report ${PM_REPORT_ID.slice(0, 8)}: add ${state.original.items.length} TransferIn logs from ${ORIGINAL_TRANSFER_ID.slice(0, 8)}`)
  console.log(`  Duplicate ${DUPLICATE_TRANSFER_ID.slice(0, 8)}: delete document and ${state.duplicate?.items.length || 0} items`)
  console.table(signature(state.original.items))
}

async function main() {
  const state = await loadState(prisma)
  assertBaseRecords(state)

  if (isAlreadyApplied(state)) {
    console.log("Repair is already applied; no write is required.")
    return
  }

  assertReadyToApply(state)
  printPlan(state)

  if (!APPLY) {
    console.log("Dry run only. Nothing was written. Re-run with --apply after reviewing this diff.")
    return
  }

  await prisma.$transaction(async tx => {
    // Re-read and re-assert inside the transaction so a concurrent edit cannot invalidate the plan.
    const lockedState = await loadState(tx)
    assertReadyToApply(lockedState)

    const removed = await tx.inventoryLog.deleteMany({
      where: { id: { in: lockedState.wrongAMLogs.map(log => log.id) } },
    })
    assert.equal(
      removed.count,
      lockedState.wrongAMLogs.length,
      "Transaction removed a different number of AM logs than the guarded preflight found."
    )

    const added = await tx.inventoryLog.createMany({
      data: lockedState.original.items.map(item => ({
        reportId: PM_REPORT_ID,
        sectionKey: "BOTTLE",
        type: "TransferIn",
        batchNo: item.batchNo.trim(),
        bags: item.bags,
        mult: item.mult,
        labelType: DO_NUMBER,
      })),
    })
    assert.equal(added.count, 4, "Transaction did not add exactly four PM logs.")

    await tx.transferIn.delete({ where: { id: DUPLICATE_TRANSFER_ID } })
    await tx.auditLog.create({
      data: {
        userName: "System (repair script)",
        action: "Repaired cross-shift Transfer In DO",
        details:
          `${DO_NUMBER}: confirmed ${AM_REPORT_ID} (2026-08-10 AM) had ${lockedState.wrongAMLogs.length} ` +
          `remaining wrong rows, added 4 InventoryLog rows to ${PM_REPORT_ID} (2026-08-10 PM), ` +
          `retained source ${ORIGINAL_TRANSFER_ID}, and deleted exact ` +
          `duplicate ${DUPLICATE_TRANSFER_ID}. Applied by scripts/fix-do-261151-shift.ts.`,
      },
    })
  })

  const after = await loadState(prisma)
  assertBaseRecords(after)
  assert(isAlreadyApplied(after), "Post-transaction verification failed.")
  console.log("Applied and verified successfully.")
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

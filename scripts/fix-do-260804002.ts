/**
 * One-off repair: restore Transfer In `DO - 260804002` to the withdrawal it was generated from.
 *
 *   npx tsx scripts/fix-do-260804002.ts            dry run — prints the diff, writes nothing
 *   npx tsx scripts/fix-do-260804002.ts --apply    performs the update
 *
 * On 2026-08-05 the DO minted by withdrawal WD-260804-002 was opened in the Transfer In edit form
 * and altered: renumbered, re-dated to the day it was keyed in, and its quantity raised from the
 * 1800 boxes the warehouse actually released to 2700. src/lib/warehouse/systemDo.ts now blocks that
 * edit; this restores the row it happened to.
 *
 * This fixes ONLY the Transfer In document. The Daily Production Reports that booked stock from it
 * are GMP records and are corrected through the application's own edit flow, never from here.
 */

import { prisma } from "../src/lib/prisma"

const APPLY = process.argv.includes("--apply")

const TRANSFER_IN_ID = "338dbfac-dfec-41e0-9a0d-88195a6fc8ef"
const ITEM_ID = "88e7ec81-744c-4b3b-81b3-fd17afdb362f"
const WITHDRAWAL_NO = "WD-260804-002"

async function main() {
  const [existing, withdrawal] = await Promise.all([
    prisma.transferIn.findUnique({ where: { id: TRANSFER_IN_ID }, include: { items: true } }),
    prisma.rawMaterialWithdrawal.findFirst({ where: { withdrawalNo: WITHDRAWAL_NO }, include: { items: true } }),
  ])

  if (!existing) throw new Error(`TransferIn ${TRANSFER_IN_ID} not found — already repaired, or wrong environment.`)
  if (!withdrawal) throw new Error(`Withdrawal ${WITHDRAWAL_NO} not found.`)
  if (withdrawal.status !== "ACTIVE") throw new Error(`Withdrawal ${WITHDRAWAL_NO} is ${withdrawal.status}, not ACTIVE. Stop and re-check.`)

  const line = withdrawal.items[0]
  if (withdrawal.items.length !== 1 || !line) throw new Error("Expected exactly one withdrawal line; the shape has changed. Stop.")

  // Rebuild exactly what createWithdrawal would mint today, from the withdrawal itself.
  const target = {
    doNumber: withdrawal.linkedDoNumber!,
    receiveDate: withdrawal.date,
    receiveTime: withdrawal.time,
    shift: withdrawal.shift,
    receiverName: `Production Withdrawal (rekod lewat ${withdrawal.date.toISOString().split("T")[0]} ${withdrawal.shift}) - ${withdrawal.takenBy}`,
    bags: Math.round(line.qty),
  }

  const item = existing.items.find(i => i.id === ITEM_ID)
  if (!item) throw new Error(`TransferInItem ${ITEM_ID} not found on this DO. Stop.`)

  console.log("Transfer In", TRANSFER_IN_ID)
  const diff = (label: string, from: unknown, to: unknown) =>
    console.log(`  ${label.padEnd(14)} ${String(from).padEnd(70)} ->  ${to}`)

  diff("doNumber", existing.doNumber, target.doNumber)
  diff("receiveDate", existing.receiveDate.toISOString().split("T")[0], target.receiveDate.toISOString().split("T")[0])
  diff("receiveTime", existing.receiveTime, target.receiveTime)
  diff("shift", existing.shift, target.shift)
  diff("receiverName", existing.receiverName, target.receiverName)
  diff("items[0].bags", item.bags, target.bags)

  if (!APPLY) {
    console.log("\nDry run — nothing written. Re-run with --apply to perform this update.")
    await prisma.$disconnect()
    return
  }

  await prisma.$transaction([
    prisma.transferIn.update({
      where: { id: TRANSFER_IN_ID },
      data: {
        doNumber: target.doNumber,
        receiveDate: target.receiveDate,
        receiveTime: target.receiveTime,
        shift: target.shift,
        receiverName: target.receiverName,
      },
    }),
    prisma.transferInItem.update({ where: { id: ITEM_ID }, data: { bags: target.bags } }),
    prisma.auditLog.create({
      data: {
        userName: "System (repair script)",
        action: "Repaired system Transfer In DO",
        details:
          `Restored ${TRANSFER_IN_ID} to withdrawal ${WITHDRAWAL_NO}. ` +
          `doNumber ${existing.doNumber} -> ${target.doNumber}; ` +
          `receiveDate ${existing.receiveDate.toISOString().split("T")[0]} ${existing.shift} -> ` +
          `${target.receiveDate.toISOString().split("T")[0]} ${target.shift}; ` +
          `bags ${item.bags} -> ${target.bags}. Run by scripts/fix-do-260804002.ts.`,
      },
    }),
  ])

  console.log("\nApplied.")
  console.log("The 5/8 AM report still holds an InventoryLog labelled 'DO - 260804002' for 2700.")
  console.log("Correct that through the application's edit flow — see the repair steps.")

  await prisma.$disconnect()
}

main().catch(async e => {
  console.error(e.message || e)
  await prisma.$disconnect()
  process.exit(1)
})

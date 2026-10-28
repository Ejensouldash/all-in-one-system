import "server-only"

import type { Prisma } from "@prisma/client"

// Running numbers for marketing requisitions: REQ-MKT-YYYY-XXXX (batch), LN-MKT-YYYY-XXXX (asset loan),
// MR-MKT-YYYY-XXXX (merchandise request). All reads go through the transaction client so numbers
// taken earlier in the same transaction are visible, and the advisory lock serialises concurrent submits.

type Tx = Prisma.TransactionClient

const formatNumber = (prefix: string, seq: number) => `${prefix}${String(seq).padStart(4, "0")}`

function trailingSeq(code: string | null | undefined): number {
  const n = parseInt(code?.split("-").pop() ?? "", 10)
  return isNaN(n) ? 0 : n
}

export async function lockMarketingRequisitionNumbers(tx: Tx, year: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`marketing-requisition:${year}`}))`
}

// Batch codes are only stored in remarks ("Requisition Batch: REQ-MKT-YYYY-XXXX ...")
export async function nextRequisitionBatchCode(tx: Tx, year: number) {
  const prefix = `REQ-MKT-${year}-`
  const pattern = new RegExp(`${prefix}(\\d+)`)
  const loans = await tx.marketingAssetLoan.findMany({
    where: { remarks: { contains: prefix } },
    select: { remarks: true },
  })
  const requests = await tx.marketingMerchandiseRequest.findMany({
    where: { remarks: { contains: prefix } },
    select: { remarks: true },
  })

  let maxSeq = 0
  for (const { remarks } of [...loans, ...requests]) {
    const match = remarks?.match(pattern)
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10))
  }
  return formatNumber(prefix, maxSeq + 1)
}

// Returns a generator so several loans in one transaction get consecutive numbers
export async function loanNumberSequence(tx: Tx, year: number) {
  const prefix = `LN-MKT-${year}-`
  const last = await tx.marketingAssetLoan.findFirst({
    where: { loanNumber: { startsWith: prefix } },
    orderBy: { loanNumber: "desc" },
    select: { loanNumber: true },
  })
  let seq = trailingSeq(last?.loanNumber)
  return () => formatNumber(prefix, ++seq)
}

export async function merchandiseRequestNumberSequence(tx: Tx, year: number) {
  const prefix = `MR-MKT-${year}-`
  const last = await tx.marketingMerchandiseRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: "desc" },
    select: { requestNumber: true },
  })
  let seq = trailingSeq(last?.requestNumber)
  return () => formatNumber(prefix, ++seq)
}

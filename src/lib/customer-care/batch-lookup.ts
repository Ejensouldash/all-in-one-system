import "server-only"
import { prisma } from "@/lib/prisma"
import { formatProductPackaging } from "./sku-mapper"

export interface MatchedProductionRecord {
  batchId: string
  bottleBatchNo: string // 1. Batch No Bottle (reported on bottle / from InventoryLog)
  productionOutputBatchNo: string // 2. Batch Production Output (finished goods packaging batch)
  productionQuantityBoxes: number
  productionType: string
  otherType: string | null
  productPacking: string
  totalBoxInReport: number
  dailyReportId: string
  productionDate: Date
  shift: string
  line: string
  reportStatus: string
  preparedBy: string
  verifiedBy: string | null
  remarks: string | null
  bottleUsageType?: string // e.g. "Usage", "Storeroom"
}

export type BatchLookupResult = {
  matchStatus: "MATCHED" | "MULTI_MATCH" | "UNMATCHED" | "NOT_REPORTED"
  cleanBatchNo: string | null
  matches: MatchedProductionRecord[]
  remarks: string | null
}

const PLACEHOLDER_TOKENS = new Set([
  "0",
  "N/A",
  "NA",
  "-",
  "--",
  "---",
  "NONE",
  "TIADA",
  "NIL",
  "NO",
  "TIADA BATCH",
  "N/L",
  "NULL",
])

/**
 * Searches Daily Production Reports based strictly on the BOTTLE Batch Number (Batch No Botol).
 * Finds the Daily Reports where this bottle batch was used / held in Storeroom,
 * and extracts the corresponding finished goods Production Output Batch and Packaging configuration.
 */
export async function lookupProductionBatches(
  rawBatchNo: string | null | undefined,
  productSize: "425ml" | "800ml"
): Promise<BatchLookupResult> {
  if (!rawBatchNo) {
    return { matchStatus: "NOT_REPORTED", cleanBatchNo: null, matches: [], remarks: null }
  }

  const clean = rawBatchNo.trim().toUpperCase()
  if (PLACEHOLDER_TOKENS.has(clean) || clean.length < 2) {
    return {
      matchStatus: "NOT_REPORTED",
      cleanBatchNo: null,
      matches: [],
      remarks: "Marked as unaffected / not reported.",
    }
  }

  const is425 = productSize.includes("425")
  const targetSize = is425 ? "425" : "800"
  const targetLineName = is425 ? "LINE 2" : "LINE 1"

  // 1. Search for DailyReports where this Bottle Batch was recorded in InventoryLog strictly for the specific Line / Size
  const matchingReports = await prisma.dailyReport.findMany({
    where: {
      OR: [
        { line: { contains: targetSize, mode: "insensitive" } },
        { line: { contains: targetLineName, mode: "insensitive" } },
      ],
      inventory: {
        some: {
          sectionKey: { contains: "BOTTLE", mode: "insensitive" },
          batchNo: { equals: clean, mode: "insensitive" },
        },
      },
    },
    include: {
      inventory: {
        where: {
          sectionKey: { contains: "BOTTLE", mode: "insensitive" },
          batchNo: { equals: clean, mode: "insensitive" },
        },
      },
      productions: {
        where: {
          productType: { contains: targetSize, mode: "insensitive" },
        },
        include: {
          batches: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  })

  const candidates: MatchedProductionRecord[] = []

  for (const report of matchingReports) {
    // Strictly filter productions to only those matching target product size (never fall back to other sizes)
    const relevantProductions = report.productions.filter((p) =>
      p.productType.toLowerCase().includes(targetSize)
    )

    for (const prod of relevantProductions) {
      for (const batch of prod.batches) {
        candidates.push({
          batchId: batch.id,
          bottleBatchNo: clean,
          productionOutputBatchNo: batch.batchNo,
          productionQuantityBoxes: batch.qty,
          productionType: batch.type,
          otherType: batch.otherType,
          productPacking: formatProductPackaging(prod.productType),
          totalBoxInReport: prod.totalBox,
          dailyReportId: report.id,
          productionDate: report.date,
          shift: report.shift,
          line: report.line,
          reportStatus: report.status,
          preparedBy: report.preparedBy,
          verifiedBy: report.verifiedBy,
          remarks: report.remarks,
          bottleUsageType: report.inventory[0]?.type || "Usage",
        })
      }
    }
  }

  if (candidates.length === 0) {
    return {
      matchStatus: "UNMATCHED",
      cleanBatchNo: clean,
      matches: [],
      remarks: `No Daily Production Report found using Bottle Batch "${clean}" for ${productSize}. Please verify with Storeroom / Daily Reports.`,
    }
  }

  if (candidates.length === 1) {
    return {
      matchStatus: "MATCHED",
      cleanBatchNo: clean,
      matches: candidates,
      remarks: null,
    }
  }

  return {
    matchStatus: "MULTI_MATCH",
    cleanBatchNo: clean,
    matches: candidates,
    remarks: `Bottle batch "${clean}" was used across ${candidates.length} finished goods packaging runs/shifts.`,
  }
}

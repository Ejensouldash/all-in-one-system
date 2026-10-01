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

  // 1. Search for DailyReports where this Bottle Batch was recorded in InventoryLog (sectionKey containing BOTTLE)
  const matchingReports = await prisma.dailyReport.findMany({
    where: {
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
        include: {
          batches: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  })

  const sizeDigit = productSize.includes("425") ? "425" : "800"
  const candidates: MatchedProductionRecord[] = []

  for (const report of matchingReports) {
    // Filter productions matching the line or product size (425ml vs 800ml)
    const relevantProductions = report.productions.filter(
      (p) =>
        p.productType.toLowerCase().includes(sizeDigit) ||
        report.line.toLowerCase().includes(sizeDigit)
    )

    const prods = relevantProductions.length > 0 ? relevantProductions : report.productions

    for (const prod of prods) {
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
      remarks: `No Daily Production Report found using Bottle Batch "${clean}". Please verify with Storeroom / Daily Reports.`,
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

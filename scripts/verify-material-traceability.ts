import assert from "node:assert/strict"
import ExcelJS from "exceljs"
import {
  capPcsFromInput,
  effectiveUsageBags,
  getCapUsageBreakdown,
  parseCapMeta,
} from "../src/lib/production/capMetrics"
import {
  matchesInventoryUsageBatch,
  reportMatchesBatchFilter,
  summarizeMatchedMaterialUsage,
} from "../src/lib/analytics/batchMatching"
import { buildBottleBoxTraceWorkbookWithMeta } from "../src/lib/excel/BottleBoxTraceWorkbook"
import type { BatchTraceabilityReport } from "../src/lib/analytics/batchTraceability"

// 1. CAP Metrics Tests
assert.equal(capPcsFromInput(10.88, 1), 4706)
assert.equal(capPcsFromInput(0, 2), 8000)
assert.equal(capPcsFromInput(8.5, 0), 4000)
assert.deepEqual(parseCapMeta('{"weight": "8.5", "boxes": "1"}'), { weight: 8.5, boxes: 1 })
assert.equal(parseCapMeta("Standard Front"), null)

const legacyZeroBagCap = {
  bags: 0,
  mult: 4000,
  labelType: '{"weight": 8.5, "boxes": 0}',
}
assert.equal(effectiveUsageBags(legacyZeroBagCap, "CAP"), 1)
assert.equal(getCapUsageBreakdown(legacyZeroBagCap).pcs, 4000)

// 2. Usage-Only Batch Matching Tests
const storeroomCap = { sectionKey: "CAP", type: "Storeroom", batchNo: "033726-01", bags: 5, mult: 4000 }
const transferCap = { sectionKey: "CAP", type: "TransferIn", batchNo: "033726-01", bags: 5, mult: 4000 }
const holdCap = { sectionKey: "CAP", type: "Hold", batchNo: "033726-01", bags: 1, mult: 4000 }
const usageCapBefore = {
  sectionKey: "CAP",
  type: "Usage",
  period: "Before",
  batchNo: "033726-01",
  bags: 2,
  mult: 4000,
  labelType: '{"weight": 0, "boxes": 2}',
}
const usageCapAfter = {
  sectionKey: "CAP",
  type: "Usage",
  period: "After",
  batchNo: "033726-01",
  bags: 1,
  mult: 4000,
  labelType: '{"weight": 4.88, "boxes": 1}',
}
const usageCarton = { sectionKey: "BOX_p425_24", type: "Usage", batchNo: "033726-01", bags: 100, mult: 1 }

assert.equal(matchesInventoryUsageBatch(storeroomCap, "CAP", "033726-01"), false)
assert.equal(matchesInventoryUsageBatch(transferCap, "CAP", "033726-01"), false)
assert.equal(matchesInventoryUsageBatch(holdCap, "CAP", "033726-01"), false)
assert.equal(matchesInventoryUsageBatch(usageCarton, "CAP", "033726-01"), false)
assert.equal(matchesInventoryUsageBatch(usageCapBefore, "CAP", "033726-01"), true)
assert.equal(matchesInventoryUsageBatch(usageCapBefore, "ALL", "033726-01"), true)
assert.equal(matchesInventoryUsageBatch(storeroomCap, "ALL", "033726-01"), false)

assert.equal(
  reportMatchesBatchFilter(
    { noProduction: false, inventory: [storeroomCap, transferCap, holdCap], productions: [] },
    { category: "CAP", batchNo: "033726-01" }
  ),
  false
)
assert.equal(
  reportMatchesBatchFilter(
    { noProduction: true, inventory: [usageCapBefore], productions: [] },
    { category: "CAP", batchNo: "033726-01" }
  ),
  false
)
assert.equal(
  reportMatchesBatchFilter(
    { noProduction: false, inventory: [usageCapBefore], productions: [] },
    { category: "CAP", batchNo: "033726-01" }
  ),
  true
)

const capSummary = summarizeMatchedMaterialUsage([storeroomCap, usageCapBefore, usageCapAfter], {
  category: "CAP",
  batchNo: "033726-01",
})
assert.equal(capSummary.materialSection, "CAP")
assert.equal(capSummary.matchedMaterialBatches, "033726-01")
assert.equal(capSummary.usageBeforeDisplay, "2 Box (8,000 pcs)")
assert.equal(capSummary.usageAfterDisplay, "1 Box / 4.88 kg (1,882 pcs)")
assert.equal(capSummary.totalUsageQty, 9882)
assert.equal(capSummary.usageUnit, "pcs")

// 3. Excel Workbook Restructuring Tests
async function verifyWorkbooks() {
  const baseReport: BatchTraceabilityReport = {
    dateMode: "BATCH_LIST",
    isoWeekString: "All Time",
    dateRange: { startDate: "2026-01-01", endDate: "2026-11-25", shortRange: "All Time" },
    filterLine: "ALL",
    filterBatchNo: "033726-01",
    batchFilters: [{ category: "CAP", batchNo: "033726-01" }],
    detailedRows: [],
    summaries: [],
    distributionGroups: [
      {
        sku: "p425_24",
        skuLabel: "425 ML x 24",
        batches: [
          {
            productionDate: "2026-10-01",
            productionDateFormatted: "01/10/2026",
            batchNumber: "FG-261001-01",
            totalProduction: 350,
            distributions: [
              { distributionDate: "2-Oct", destination: "LOTUS", quantity: 200 },
              { distributionDate: "3-Oct", destination: "MYDIN", quantity: 100 },
            ],
          },
        ],
      },
    ],
    materialToFgRows: [
      {
        id: "r1-fg1",
        shiftKey: "CAP|033726-01|rep1",
        searchedCategory: "CAP",
        searchedBatch: "033726-01",
        materialSection: "CAP",
        matchedMaterialBatches: "033726-01",
        reportId: "rep1",
        reportDate: "2026-10-01",
        reportDateFormatted: "01/10/2026",
        shift: "AM",
        line: "LINE 2 (425ml)",
        reportStatus: "APPROVED",
        preparedBy: "Ali",
        usageBeforeDisplay: "2 Box (8,000 pcs)",
        usageAfterDisplay: "1 Box / 4.88 kg (1,882 pcs)",
        totalUsageDisplay: "3 Box / 4.88 kg (9,882 pcs)",
        totalUsageQty: 9882,
        usageUnit: "pcs",
        fgSku: "p425_24",
        fgSkuLabel: "425 ML x 24",
        fgBatchNo: "FG-261001-01",
        fgBoxesProduced: 350,
        distributions: [
          { distributionDate: "2-Oct", destination: "LOTUS", quantity: 200 },
          { distributionDate: "3-Oct", destination: "MYDIN", quantity: 100 },
        ],
      },
      {
        id: "r1-fg2",
        shiftKey: "CAP|033726-01|rep1",
        searchedCategory: "CAP",
        searchedBatch: "033726-01",
        materialSection: "CAP",
        matchedMaterialBatches: "033726-01",
        reportId: "rep1",
        reportDate: "2026-10-01",
        reportDateFormatted: "01/10/2026",
        shift: "AM",
        line: "LINE 2 (425ml)",
        reportStatus: "APPROVED",
        preparedBy: "Ali",
        usageBeforeDisplay: "2 Box (8,000 pcs)",
        usageAfterDisplay: "1 Box / 4.88 kg (1,882 pcs)",
        totalUsageDisplay: "3 Box / 4.88 kg (9,882 pcs)",
        totalUsageQty: 9882,
        usageUnit: "pcs",
        fgSku: "p425_6",
        fgSkuLabel: "425 ML x 6",
        fgBatchNo: "FG-261001-02",
        fgBoxesProduced: 120,
        distributions: [{ distributionDate: "-", destination: "In Warehouse / Not Distributed", quantity: null }],
      },
    ],
    totals: {
      totalRecords: 0,
      totalBottlePcs: 0,
      totalBoxesProduced: 470,
      uniqueBottleBatches: 0,
      uniqueBoxBatches: 2,
    },
  }

  const capResult = await buildBottleBoxTraceWorkbookWithMeta(baseReport, "Tester", "25 Nov 2026")
  assert.equal(capResult.sheetCount, 2)

  const capWb = new ExcelJS.Workbook()
  await capWb.xlsx.load(capResult.buffer as unknown as ArrayBuffer)
  assert.deepEqual(
    capWb.worksheets.map(w => w.name),
    ["Material-to-FG Trace", "Production & Distribution"]
  )
  const wsMat = capWb.getWorksheet("Material-to-FG Trace")!
  assert.equal(wsMat.getCell("D9").value, "033726-01")
  assert.equal(wsMat.getCell("L9").value, "FG-261001-01")
  assert.equal(wsMat.getCell("M9").value, 350)
  assert.equal(wsMat.getCell("L11").value, "FG-261001-02")
  assert.equal(wsMat.getCell("M11").value, 120)

  // Bottle-only search keeps Bottle sheets + Material-to-FG Trace (4 sheets)
  const bottleReport: BatchTraceabilityReport = {
    ...baseReport,
    batchFilters: [{ category: "BOTTLE", batchNo: "BM1-001" }],
  }
  const bottleResult = await buildBottleBoxTraceWorkbookWithMeta(bottleReport, "Tester", "25 Nov 2026")
  assert.equal(bottleResult.sheetCount, 4)

  console.log("ALL MATERIAL TRACEABILITY CHECKS PASSED")
}

verifyWorkbooks().catch(err => {
  console.error(err)
  process.exit(1)
})

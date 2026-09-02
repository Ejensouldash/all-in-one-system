import dotenv from "dotenv"
dotenv.config()

import { getUsageReport } from "@/lib/analytics/usage"
import { buildUsageWorkbook } from "@/lib/excel/UsageWorkbook"

async function runValidation() {
  console.log("=== MEMULAKAN UJIAN VALIDASI EXPORT USAGE ===")

  // 1. Ujian Date Filtering: Julat tarikh 30 hari
  const from = "2026-08-01"
  const to = "2026-09-02"
  console.log(`\n[Test 1] Menjana report bagi julat ${from} hingga ${to}...`)
  
  const report = await getUsageReport(from, to)

  console.log("-> Hasil KPI:")
  console.log(`   - Total Production Days: ${report.kpis.totalProductionDays}`)
  console.log(`   - Total Batches: ${report.kpis.totalBatches}`)
  console.log(`   - Total Output Boxes: ${report.kpis.totalBoxesOutput.toLocaleString()}`)
  console.log(`   - Total Bottle Usage: ${report.kpis.totalUsageBottle.toLocaleString()} pcs`)
  console.log(`   - Usage Bottle Line 1: ${report.kpis.usageBottleLine1.toLocaleString()} pcs`)
  console.log(`   - Usage Bottle Line 2: ${report.kpis.usageBottleLine2.toLocaleString()} pcs`)
  console.log(`   - Total Cap Usage: ${report.kpis.totalUsageCap.toLocaleString()} pcs`)
  console.log(`   - Total Label Usage: ${report.kpis.totalUsageLabel.toLocaleString()} rolls`)
  console.log(`   - Total Box Usage: ${report.kpis.totalUsageBox.toLocaleString()} pcs`)

  // 2. Semakan Integriti Pengagihan Pro-rata & Pencegahan Double Counting
  console.log("\n[Test 2] Semakan Integriti Data & Pro-rata:")
  
  // A. Semak Bottle L1 + L2 == Total Bottle
  const sumBottleLines = report.kpis.usageBottleLine1 + report.kpis.usageBottleLine2
  const bottleDiff = Math.abs(sumBottleLines - report.kpis.totalUsageBottle)
  console.log(`   - LINE 1 (${report.kpis.usageBottleLine1}) + LINE 2 (${report.kpis.usageBottleLine2}) = ${sumBottleLines}`)
  console.log(`   - Total Bottle KPI: ${report.kpis.totalUsageBottle}`)
  if (bottleDiff === 0) {
    console.log("   [PASSED] Semakan LINE 1 + LINE 2 tepat 100%!")
  } else {
    console.error(`   [FAILED] Terdapat perbezaan botol: ${bottleDiff}`)
    process.exit(1)
  }

  // B. Semak Jumlah Detail == Jumlah KPI
  const detailTotalBottle = report.details.reduce((s: number, r) => s + r.bottleUsage, 0)
  const detailTotalCap = report.details.reduce((s: number, r) => s + r.capUsage, 0)
  const detailTotalLabel = Math.round(report.details.reduce((s: number, r) => s + r.labelUsage, 0) * 100) / 100
  const detailTotalBox = report.details.reduce((s: number, r) => s + r.boxUsage, 0)

  console.log(`   - Detail Bottle: ${detailTotalBottle} vs KPI: ${report.kpis.totalUsageBottle}`)
  console.log(`   - Detail Cap: ${detailTotalCap} vs KPI: ${report.kpis.totalUsageCap}`)
  console.log(`   - Detail Label: ${detailTotalLabel} vs KPI: ${report.kpis.totalUsageLabel}`)
  console.log(`   - Detail Box: ${detailTotalBox} vs KPI: ${report.kpis.totalUsageBox}`)

  if (
    detailTotalBottle === report.kpis.totalUsageBottle &&
    detailTotalCap === report.kpis.totalUsageCap &&
    detailTotalLabel === report.kpis.totalUsageLabel &&
    detailTotalBox === report.kpis.totalUsageBox
  ) {
    console.log("   [PASSED] Jumlah Detail sama tepat dengan KPI tanpa double counting!")
  } else {
    console.error("   [FAILED] Jumlah Detail tidak sepadan dengan KPI!")
    process.exit(1)
  }

  // C. Semak Jumlah ByDate == Jumlah KPI
  const dateTotalBottle = report.byDate.reduce((s: number, r) => s + r.totalBottle, 0)
  const dateTotalCap = report.byDate.reduce((s: number, r) => s + r.totalCap, 0)
  const dateTotalLabel = Math.round(report.byDate.reduce((s: number, r) => s + r.totalLabel, 0) * 100) / 100
  const dateTotalBox = report.byDate.reduce((s: number, r) => s + r.totalBox, 0)

  if (
    dateTotalBottle === report.kpis.totalUsageBottle &&
    dateTotalCap === report.kpis.totalUsageCap &&
    dateTotalLabel === report.kpis.totalUsageLabel &&
    dateTotalBox === report.kpis.totalUsageBox
  ) {
    console.log("   [PASSED] Jumlah ByDate sama tepat dengan Detail dan KPI!")
  } else {
    console.error("   [FAILED] Jumlah ByDate tidak sepadan!")
    process.exit(1)
  }

  // 3. Ujian Pembinaan Fail Excel (7 Sheets)
  console.log("\n[Test 3] Membina fail Excel (.xlsx) dengan ExcelJS...")
  const buffer = await buildUsageWorkbook(report, "Ujian Automatik Antigravity", "02/09/2026, 08:30")
  console.log(`   [PASSED] Fail Excel berjaya dibina! Saiz buffer: ${buffer.length.toLocaleString()} bytes.`)

  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)
  const sheetNames = wb.worksheets.map(w => w.name)
  console.log("   -> Senarai 7 Worksheets yang dikesan:", sheetNames)

  const expectedSheets = [
    "Executive Dashboard",
    "Usage Summary by Date",
    "Usage Summary by Batch",
    "Usage by Line",
    "Usage by Material",
    "Usage Detail",
    "Data Dictionary & Notes",
  ]

  const allSheetsPresent = expectedSheets.every(s => sheetNames.includes(s))
  if (allSheetsPresent && sheetNames.length === 7) {
    console.log("   [PASSED] Kesemua 7 sheets disahkan wujud dan lengkap!")
  } else {
    console.error("   [FAILED] Struktur sheet tidak menepati spesifikasi!")
    process.exit(1)
  }

  // 4. Ujian Julat 1 Hari Sahaja
  console.log("\n[Test 4] Ujian Julat 1 Hari (2026-09-01 hingga 2026-09-01)...")
  const report1Day = await getUsageReport("2026-09-01", "2026-09-01")
  console.log(`   - Bilangan Production Days: ${report1Day.kpis.totalProductionDays}`)
  console.log(`   - Bilangan Batches: ${report1Day.kpis.totalBatches}`)
  console.log(`   - Total Bottles: ${report1Day.kpis.totalUsageBottle.toLocaleString()} pcs`)
  console.log("   [PASSED] Ujian 1 hari berjaya.")

  // 5. Ujian Tiada Data (Empty Range)
  console.log("\n[Test 5] Ujian Tiada Data (2020-01-01 hingga 2020-01-02)...")
  const reportEmpty = await getUsageReport("2020-01-01", "2020-01-02")
  const emptyBuffer = await buildUsageWorkbook(reportEmpty, "Ujian Tiada Data", "02/09/2026, 08:30")
  console.log(`   - Bilangan Detail Rows: ${reportEmpty.details.length}`)
  console.log(`   - Saiz Buffer Fail Kosong: ${emptyBuffer.length.toLocaleString()} bytes`)
  console.log("   [PASSED] Ujian tiada data berjaya mengendalikan kes sifar secara anggun.")

  console.log("\n=== SEMUA 5 UJIAN AUTOMATIK SELESAI DENGAN JAYANYA (100% PASSED) ===")
}

runValidation().catch(err => {
  console.error("Ralat dalam ujian:", err)
  process.exit(1)
})

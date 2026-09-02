import ExcelJS from "exceljs"
import type { UsageReportData } from "@/lib/analytics/usage"

/**
 * BubblesO2 Comprehensive Usage Report Workbook (7 Sheets).
 *
 * Built with exceljs with clean corporate styling, robust number formatting,
 * freeze panes, auto-fit columns, and print layouts.
 */

const INK = "FF0F172A" // Slate 900
const MUTED = "FF64748B" // Slate 500
const BORDER = "FFCBD5E1" // Slate 300
const HEADER_BG = "FF064E3B" // Emerald 900
const HEADER_FG = "FFFFFFFF" // White
const SUBHEADER_BG = "FF0F766E" // Teal 700
const ZEBRA = "FFF8FAFC" // Slate 50
const CARD_BG = "FFF0FDF4" // Emerald 50
const TOTAL_BG = "FFE2E8F0" // Slate 200

const NUM = "#,##0"
const NUM_DEC = "#,##0.00"
const PCT = "0.00%"

const thinBorder = { style: "thin" as const, color: { argb: BORDER } }
const doubleBottomBorder = { style: "double" as const, color: { argb: INK } }
const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }
const totalBorders = { top: thinBorder, left: thinBorder, bottom: doubleBottomBorder, right: thinBorder }

function styleHeaderCell(cell: ExcelJS.Cell, bgColor = HEADER_BG) {
  cell.font = { bold: true, size: 10, color: { argb: HEADER_FG } }
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } }
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
  cell.border = allBorders
}

function autoFitColumns(ws: ExcelJS.Worksheet, minWidth = 12, maxWidth = 35) {
  ws.columns.forEach(column => {
    let maxLen = minWidth
    column.eachCell?.({ includeEmpty: false }, cell => {
      // Don't gauge length on merged banner cells (row <= 3)
      if (Number(cell.row) <= 3) return
      const text = cell.value !== null && cell.value !== undefined ? String(cell.value) : ""
      if (text.length > maxLen) {
        maxLen = text.length
      }
    })
    column.width = Math.min(maxLen + 3, maxWidth)
  })
}

function writeSheetHeader(
  ws: ExcelJS.Worksheet,
  lastColLetter: string,
  sheetTitle: string,
  dateRangeStr: string,
  generatedAt: string,
  preparedBy: string
): number {
  ws.mergeCells(`A1:${lastColLetter}1`)
  const t = ws.getCell("A1")
  t.value = sheetTitle
  t.font = { bold: true, size: 14, color: { argb: INK } }
  t.alignment = { vertical: "middle" }
  ws.getRow(1).height = 24

  ws.mergeCells(`A2:${lastColLetter}2`)
  const sub = ws.getCell("A2")
  sub.value = `Julat Tarikh: ${dateRangeStr}   •   Dijana: ${generatedAt}   •   Disediakan Oleh: ${preparedBy}`
  sub.font = { size: 9, color: { argb: MUTED } }
  ws.getRow(2).height = 16

  ws.getRow(3).height = 8
  return 4
}

export async function buildUsageWorkbook(
  report: UsageReportData,
  preparedBy: string,
  generatedAt: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "BubblesO2 AIO System"
  wb.created = new Date()

  const dateRangeStr = `${report.fromFormatted} hingga ${report.toFormatted}`

  // ===============================================================================================
  // SHEET 1: Executive Dashboard
  // ===============================================================================================
  const ws1 = wb.addWorksheet("Executive Dashboard", {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws1, "I", "BUBBLESO2 PRODUCTION USAGE REPORT — EXECUTIVE DASHBOARD", dateRangeStr, generatedAt, preparedBy)

  // KPI CARDS SECTION (Rows 5 to 7)
  ws1.getRow(5).height = 14
  ws1.getRow(6).height = 28
  ws1.getRow(7).height = 14

  const cards = [
    { startCol: "A", endCol: "B", title: "TOTAL PRODUCTION DAYS", value: report.kpis.totalProductionDays, fmt: NUM, sub: `${report.kpis.totalBatches} Production Batches` },
    { startCol: "C", endCol: "D", title: "TOTAL OUTPUT BOXES", value: report.kpis.totalBoxesOutput, fmt: NUM, sub: "Kotak Siap Diproses" },
    { startCol: "E", endCol: "E", title: "TOTAL USAGE BOTTLE", value: report.kpis.totalUsageBottle, fmt: NUM, sub: `L1: ${report.kpis.usageBottleLine1.toLocaleString()} | L2: ${report.kpis.usageBottleLine2.toLocaleString()}` },
    { startCol: "F", endCol: "F", title: "TOTAL USAGE CAP", value: report.kpis.totalUsageCap, fmt: NUM, sub: "Pcs Penutup" },
    { startCol: "G", endCol: "G", title: "TOTAL USAGE LABEL", value: report.kpis.totalUsageLabel, fmt: NUM_DEC, sub: "Rolls Gulung" },
    { startCol: "H", endCol: "I", title: "TOTAL USAGE BOX", value: report.kpis.totalUsageBox, fmt: NUM, sub: "Kotak Pembungkusan" },
  ]

  cards.forEach(c => {
    ws1.mergeCells(`${c.startCol}5:${c.endCol}5`)
    const tCell = ws1.getCell(`${c.startCol}5`)
    tCell.value = c.title
    tCell.font = { bold: true, size: 8, color: { argb: "FF047857" } }
    tCell.alignment = { horizontal: "center", vertical: "middle" }
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } }

    ws1.mergeCells(`${c.startCol}6:${c.endCol}6`)
    const vCell = ws1.getCell(`${c.startCol}6`)
    vCell.value = c.value
    vCell.numFmt = c.fmt
    vCell.font = { bold: true, size: 14, color: { argb: INK } }
    vCell.alignment = { horizontal: "center", vertical: "middle" }
    vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } }

    ws1.mergeCells(`${c.startCol}7:${c.endCol}7`)
    const sCell = ws1.getCell(`${c.startCol}7`)
    sCell.value = c.sub
    sCell.font = { size: 8, color: { argb: MUTED } }
    sCell.alignment = { horizontal: "center", vertical: "middle" }
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } }

    // Card borders
    const startIdx = c.startCol.charCodeAt(0) - 64
    const endIdx = c.endCol.charCodeAt(0) - 64
    for (let r = 5; r <= 7; r++) {
      for (let col = startIdx; col <= endIdx; col++) {
        ws1.getRow(r).getCell(col).border = allBorders
      }
    }
  })

  // SECTION 1: Ringkasan Penggunaan Mengikut Line (Row 9)
  let currRow = 9
  ws1.mergeCells(`A${currRow}:G${currRow}`)
  const sec1Title = ws1.getCell(`A${currRow}`)
  sec1Title.value = "1. RINGKASAN PENGGUNAAN MENGIKUT PRODUCTION LINE"
  sec1Title.font = { bold: true, size: 11, color: { argb: INK } }
  ws1.getRow(currRow).height = 20

  currRow += 1
  const lineHeaders = ["PRODUCTION LINE", "OUTPUT (BOXES)", "SHARE (%)", "USAGE BOTTLE (PCS)", "USAGE CAP (PCS)", "USAGE LABEL (ROLLS)", "USAGE BOX (PCS)"]
  const lineHRow = ws1.getRow(currRow)
  lineHRow.height = 22
  lineHeaders.forEach((h, i) => {
    const cell = lineHRow.getCell(i + 1)
    cell.value = h
    styleHeaderCell(cell, HEADER_BG)
  })

  report.byLine.forEach(l => {
    currRow += 1
    const r = ws1.getRow(currRow)
    r.height = 18
    r.getCell(1).value = l.line
    r.getCell(1).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(2).value = l.totalBoxes
    r.getCell(2).numFmt = NUM
    r.getCell(3).value = l.sharePct / 100
    r.getCell(3).numFmt = PCT
    r.getCell(4).value = l.totalBottle
    r.getCell(4).numFmt = NUM
    r.getCell(5).value = l.totalCap
    r.getCell(5).numFmt = NUM
    r.getCell(6).value = l.totalLabel
    r.getCell(6).numFmt = NUM_DEC
    r.getCell(7).value = l.totalBox
    r.getCell(7).numFmt = NUM

    for (let col = 1; col <= 7; col++) {
      r.getCell(col).border = allBorders
      if (currRow % 2 === 0) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
  })

  // SECTION 2: Ringkasan Penggunaan Mengikut Bahan (Material)
  currRow += 2
  ws1.mergeCells(`A${currRow}:G${currRow}`)
  const sec2Title = ws1.getCell(`A${currRow}`)
  sec2Title.value = "2. RINGKASAN PENGGUNAAN MENGIKUT MATERIAL"
  sec2Title.font = { bold: true, size: 11, color: { argb: INK } }
  ws1.getRow(currRow).height = 20

  currRow += 1
  const matHeaders = ["MATERIAL", "KUANTITI SEBENAR", "UNIT UKURAN", "KUANTITI LINE 1", "KUANTITI LINE 2", "SHARE (%)", "STATUS PENGGUNAAN"]
  const matHRow = ws1.getRow(currRow)
  matHRow.height = 22
  matHeaders.forEach((h, i) => {
    const cell = matHRow.getCell(i + 1)
    cell.value = h
    styleHeaderCell(cell, SUBHEADER_BG)
  })

  report.byMaterial.forEach(m => {
    currRow += 1
    const r = ws1.getRow(currRow)
    r.height = 18
    r.getCell(1).value = m.label
    r.getCell(1).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(2).value = m.quantity
    r.getCell(2).numFmt = m.unit === "rolls" ? NUM_DEC : NUM
    r.getCell(3).value = m.unit.toUpperCase()
    r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(4).value = m.line1Qty
    r.getCell(4).numFmt = m.unit === "rolls" ? NUM_DEC : NUM
    r.getCell(5).value = m.line2Qty
    r.getCell(5).numFmt = m.unit === "rolls" ? NUM_DEC : NUM
    r.getCell(6).value = m.sharePct / 100
    r.getCell(6).numFmt = PCT
    r.getCell(7).value = m.quantity > 0 ? "AKTIF DIGUNAKAN" : "TIADA REKOD"
    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" }

    for (let col = 1; col <= 7; col++) {
      r.getCell(col).border = allBorders
      if (currRow % 2 === 0) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
  })

  // SECTION 3: Top 5 Batches Mengikut Usage Botol
  currRow += 2
  ws1.mergeCells(`A${currRow}:G${currRow}`)
  const sec3Title = ws1.getCell(`A${currRow}`)
  sec3Title.value = "3. TOP 5 BATCHES PENGELUARAN (BERDASARKAN PENGGUNAAN BOTOL)"
  sec3Title.font = { bold: true, size: 11, color: { argb: INK } }
  ws1.getRow(currRow).height = 20

  currRow += 1
  const topHeaders = ["RANK", "BATCH NO", "SKU / PRODUK", "TARIKH", "LINE", "OUTPUT (BOXES)", "USAGE BOTOL (PCS)"]
  const topHRow = ws1.getRow(currRow)
  topHRow.height = 22
  topHeaders.forEach((h, i) => {
    const cell = topHRow.getCell(i + 1)
    cell.value = h
    styleHeaderCell(cell, HEADER_BG)
  })

  if (report.top5Batches.length === 0) {
    currRow += 1
    ws1.mergeCells(`A${currRow}:G${currRow}`)
    const emptyCell = ws1.getCell(`A${currRow}`)
    emptyCell.value = "Tiada rekod batch pengeluaran dalam julat tarikh ini."
    emptyCell.alignment = { horizontal: "center", vertical: "middle" }
    emptyCell.font = { italic: true, color: { argb: MUTED } }
    emptyCell.border = allBorders
  } else {
    report.top5Batches.forEach((b, idx) => {
      currRow += 1
      const r = ws1.getRow(currRow)
      r.height = 18
      r.getCell(1).value = `#${idx + 1}`
      r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(2).value = b.batchNo
      r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(3).value = b.sku
      r.getCell(4).value = b.dateFormatted
      r.getCell(4).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(5).value = b.line
      r.getCell(6).value = b.outputBoxes
      r.getCell(6).numFmt = NUM
      r.getCell(7).value = b.bottleUsage
      r.getCell(7).numFmt = NUM

      for (let col = 1; col <= 7; col++) {
        r.getCell(col).border = allBorders
        if (currRow % 2 === 0) {
          r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
        }
      }
    })
  }

  autoFitColumns(ws1, 14, 30)

  // ===============================================================================================
  // SHEET 2: Usage Summary by Date
  // ===============================================================================================
  const ws2 = wb.addWorksheet("Usage Summary by Date", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws2, "I", "RINGKASAN PENGGUNAAN BAHAN MENGIKUT TARIKH (DAILY USAGE)", dateRangeStr, generatedAt, preparedBy)

  const dateCols = [
    { key: "date", header: "TARIKH (DD/MM/YYYY)", width: 16 },
    { key: "batches", header: "BIL. BATCH", width: 12 },
    { key: "boxes", header: "OUTPUT BOXES", width: 14 },
    { key: "bottleL1", header: "BOTOL LINE 1 (PCS)", width: 18 },
    { key: "bottleL2", header: "BOTOL LINE 2 (PCS)", width: 18 },
    { key: "totalBottle", header: "TOTAL BOTOL (PCS)", width: 18 },
    { key: "totalCap", header: "TOTAL CAP (PCS)", width: 16 },
    { key: "totalLabel", header: "TOTAL LABEL (ROLLS)", width: 18 },
    { key: "totalBox", header: "TOTAL BOX (PCS)", width: 16 },
  ]
  ws2.columns = dateCols

  const hRow2 = ws2.getRow(4)
  hRow2.height = 24
  dateCols.forEach((col, i) => {
    const cell = hRow2.getCell(i + 1)
    cell.value = col.header
    styleHeaderCell(cell, HEADER_BG)
  })

  const dateStartRow = 5
  let dateCurrRow = 5

  report.byDate.forEach((d, idx) => {
    const r = ws2.getRow(dateCurrRow)
    r.height = 18
    r.getCell(1).value = d.dateFormatted
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).value = d.totalBatches
    r.getCell(2).numFmt = NUM
    r.getCell(3).value = d.totalBoxesOutput
    r.getCell(3).numFmt = NUM
    r.getCell(4).value = d.bottleLine1
    r.getCell(4).numFmt = NUM
    r.getCell(5).value = d.bottleLine2
    r.getCell(5).numFmt = NUM
    r.getCell(6).value = { formula: `D${dateCurrRow}+E${dateCurrRow}`, result: d.totalBottle }
    r.getCell(6).numFmt = NUM
    r.getCell(7).value = d.totalCap
    r.getCell(7).numFmt = NUM
    r.getCell(8).value = d.totalLabel
    r.getCell(8).numFmt = NUM_DEC
    r.getCell(9).value = d.totalBox
    r.getCell(9).numFmt = NUM

    for (let col = 1; col <= 9; col++) {
      r.getCell(col).border = allBorders
      if (idx % 2 === 1) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
    dateCurrRow += 1
  })

  // Date Total Row
  if (report.byDate.length > 0) {
    const totRow = ws2.getRow(dateCurrRow)
    totRow.height = 20
    totRow.getCell(1).value = "JUMLAH KESELURUHAN"
    totRow.getCell(1).font = { bold: true, size: 10, color: { argb: INK } }
    totRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    const lastDataRow = dateCurrRow - 1
    totRow.getCell(2).value = { formula: `SUM(B${dateStartRow}:B${lastDataRow})`, result: report.kpis.totalBatches }
    totRow.getCell(2).numFmt = NUM
    totRow.getCell(3).value = { formula: `SUM(C${dateStartRow}:C${lastDataRow})`, result: report.kpis.totalBoxesOutput }
    totRow.getCell(3).numFmt = NUM
    totRow.getCell(4).value = { formula: `SUM(D${dateStartRow}:D${lastDataRow})`, result: report.kpis.usageBottleLine1 }
    totRow.getCell(4).numFmt = NUM
    totRow.getCell(5).value = { formula: `SUM(E${dateStartRow}:E${lastDataRow})`, result: report.kpis.usageBottleLine2 }
    totRow.getCell(5).numFmt = NUM
    totRow.getCell(6).value = { formula: `SUM(F${dateStartRow}:F${lastDataRow})`, result: report.kpis.totalUsageBottle }
    totRow.getCell(6).numFmt = NUM
    totRow.getCell(7).value = { formula: `SUM(G${dateStartRow}:G${lastDataRow})`, result: report.kpis.totalUsageCap }
    totRow.getCell(7).numFmt = NUM
    totRow.getCell(8).value = { formula: `SUM(H${dateStartRow}:H${lastDataRow})`, result: report.kpis.totalUsageLabel }
    totRow.getCell(8).numFmt = NUM_DEC
    totRow.getCell(9).value = { formula: `SUM(I${dateStartRow}:I${lastDataRow})`, result: report.kpis.totalUsageBox }
    totRow.getCell(9).numFmt = NUM

    for (let col = 1; col <= 9; col++) {
      const cell = totRow.getCell(col)
      cell.font = { bold: true, size: 10, color: { argb: INK } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  autoFitColumns(ws2, 12, 25)

  // ===============================================================================================
  // SHEET 3: Usage Summary by Batch
  // ===============================================================================================
  const ws3 = wb.addWorksheet("Usage Summary by Batch", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws3, "J", "RINGKASAN PENGGUNAAN BAHAN MENGIKUT BATCH PENGELUARAN", dateRangeStr, generatedAt, preparedBy)

  const batchCols = [
    { key: "date", header: "TARIKH", width: 14 },
    { key: "batchNo", header: "BATCH NO", width: 16 },
    { key: "line", header: "LINE", width: 16 },
    { key: "sku", header: "SKU / PRODUK", width: 18 },
    { key: "status", header: "STATUS", width: 13 },
    { key: "output", header: "OUTPUT (BOXES)", width: 15 },
    { key: "bottle", header: "USAGE BOTOL (PCS)", width: 18 },
    { key: "cap", header: "USAGE CAP (PCS)", width: 16 },
    { key: "label", header: "USAGE LABEL (ROLLS)", width: 18 },
    { key: "box", header: "USAGE BOX (PCS)", width: 16 },
  ]
  ws3.columns = batchCols

  const hRow3 = ws3.getRow(4)
  hRow3.height = 24
  batchCols.forEach((col, i) => {
    const cell = hRow3.getCell(i + 1)
    cell.value = col.header
    styleHeaderCell(cell, HEADER_BG)
  })

  const batchStartRow = 5
  let batchCurrRow = 5

  report.byBatch.forEach((b, idx) => {
    const r = ws3.getRow(batchCurrRow)
    r.height = 18
    r.getCell(1).value = b.dateFormatted
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).value = b.batchNo
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(3).value = b.line
    r.getCell(4).value = b.sku
    r.getCell(5).value = b.status
    r.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
    if (b.status === "PENDING") {
      r.getCell(5).font = { bold: true, color: { argb: "FFD97706" } } // Amber
    }
    r.getCell(6).value = b.outputBoxes
    r.getCell(6).numFmt = NUM
    r.getCell(7).value = b.bottleUsage
    r.getCell(7).numFmt = NUM
    r.getCell(8).value = b.capUsage
    r.getCell(8).numFmt = NUM
    r.getCell(9).value = b.labelUsage
    r.getCell(9).numFmt = NUM_DEC
    r.getCell(10).value = b.boxUsage
    r.getCell(10).numFmt = NUM

    for (let col = 1; col <= 10; col++) {
      r.getCell(col).border = allBorders
      if (idx % 2 === 1) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
    batchCurrRow += 1
  })

  // Batch Total Row
  if (report.byBatch.length > 0) {
    const totRow = ws3.getRow(batchCurrRow)
    totRow.height = 20
    totRow.getCell(1).value = "JUMLAH KESELURUHAN"
    totRow.getCell(1).font = { bold: true, size: 10, color: { argb: INK } }
    totRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    const lastDataRow = batchCurrRow - 1
    totRow.getCell(6).value = { formula: `SUM(F${batchStartRow}:F${lastDataRow})`, result: report.kpis.totalBoxesOutput }
    totRow.getCell(6).numFmt = NUM
    totRow.getCell(7).value = { formula: `SUM(G${batchStartRow}:G${lastDataRow})`, result: report.kpis.totalUsageBottle }
    totRow.getCell(7).numFmt = NUM
    totRow.getCell(8).value = { formula: `SUM(H${batchStartRow}:H${lastDataRow})`, result: report.kpis.totalUsageCap }
    totRow.getCell(8).numFmt = NUM
    totRow.getCell(9).value = { formula: `SUM(I${batchStartRow}:I${lastDataRow})`, result: report.kpis.totalUsageLabel }
    totRow.getCell(9).numFmt = NUM_DEC
    totRow.getCell(10).value = { formula: `SUM(J${batchStartRow}:J${lastDataRow})`, result: report.kpis.totalUsageBox }
    totRow.getCell(10).numFmt = NUM

    for (let col = 1; col <= 10; col++) {
      const cell = totRow.getCell(col)
      cell.font = { bold: true, size: 10, color: { argb: INK } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  autoFitColumns(ws3, 12, 25)

  // ===============================================================================================
  // SHEET 4: Usage by Line
  // ===============================================================================================
  const ws4 = wb.addWorksheet("Usage by Line", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws4, "G", "RINGKASAN PENGGUNAAN BAHAN MENGIKUT PRODUCTION LINE", dateRangeStr, generatedAt, preparedBy)

  const lineCols = [
    { key: "line", header: "PRODUCTION LINE", width: 22 },
    { key: "output", header: "OUTPUT (BOXES)", width: 16 },
    { key: "share", header: "SHARE (%)", width: 14 },
    { key: "bottle", header: "TOTAL BOTTLE (PCS)", width: 20 },
    { key: "cap", header: "TOTAL CAP (PCS)", width: 18 },
    { key: "label", header: "TOTAL LABEL (ROLLS)", width: 20 },
    { key: "box", header: "TOTAL BOX (PCS)", width: 18 },
  ]
  ws4.columns = lineCols

  const hRow4 = ws4.getRow(4)
  hRow4.height = 24
  lineCols.forEach((col, i) => {
    const cell = hRow4.getCell(i + 1)
    cell.value = col.header
    styleHeaderCell(cell, HEADER_BG)
  })

  const lineStartRow = 5
  let lineCurrRow = 5

  report.byLine.forEach((l, idx) => {
    const r = ws4.getRow(lineCurrRow)
    r.height = 20
    r.getCell(1).value = l.line
    r.getCell(2).value = l.totalBoxes
    r.getCell(2).numFmt = NUM
    r.getCell(3).value = l.sharePct / 100
    r.getCell(3).numFmt = PCT
    r.getCell(4).value = l.totalBottle
    r.getCell(4).numFmt = NUM
    r.getCell(5).value = l.totalCap
    r.getCell(5).numFmt = NUM
    r.getCell(6).value = l.totalLabel
    r.getCell(6).numFmt = NUM_DEC
    r.getCell(7).value = l.totalBox
    r.getCell(7).numFmt = NUM

    for (let col = 1; col <= 7; col++) {
      r.getCell(col).border = allBorders
      if (idx % 2 === 1) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
    lineCurrRow += 1
  })

  // Line Total Row
  if (report.byLine.length > 0) {
    const totRow = ws4.getRow(lineCurrRow)
    totRow.height = 20
    totRow.getCell(1).value = "JUMLAH KESELURUHAN"
    totRow.getCell(1).font = { bold: true, size: 10, color: { argb: INK } }
    totRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    const lastDataRow = lineCurrRow - 1
    totRow.getCell(2).value = { formula: `SUM(B${lineStartRow}:B${lastDataRow})`, result: report.kpis.totalBoxesOutput }
    totRow.getCell(2).numFmt = NUM
    totRow.getCell(3).value = 1.0
    totRow.getCell(3).numFmt = PCT
    totRow.getCell(4).value = { formula: `SUM(D${lineStartRow}:D${lastDataRow})`, result: report.kpis.totalUsageBottle }
    totRow.getCell(4).numFmt = NUM
    totRow.getCell(5).value = { formula: `SUM(E${lineStartRow}:E${lastDataRow})`, result: report.kpis.totalUsageCap }
    totRow.getCell(5).numFmt = NUM
    totRow.getCell(6).value = { formula: `SUM(F${lineStartRow}:F${lastDataRow})`, result: report.kpis.totalUsageLabel }
    totRow.getCell(6).numFmt = NUM_DEC
    totRow.getCell(7).value = { formula: `SUM(G${lineStartRow}:G${lastDataRow})`, result: report.kpis.totalUsageBox }
    totRow.getCell(7).numFmt = NUM

    for (let col = 1; col <= 7; col++) {
      const cell = totRow.getCell(col)
      cell.font = { bold: true, size: 10, color: { argb: INK } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  autoFitColumns(ws4, 14, 25)

  // ===============================================================================================
  // SHEET 5: Usage by Material
  // ===============================================================================================
  const ws5 = wb.addWorksheet("Usage by Material", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws5, "F", "RINGKASAN PENGGUNAAN MENGIKUT KATEGORI MATERIAL", dateRangeStr, generatedAt, preparedBy)

  const matCols = [
    { key: "material", header: "MATERIAL", width: 22 },
    { key: "qty", header: "KUANTITI SEBENAR", width: 18 },
    { key: "unit", header: "UNIT UKURAN", width: 14 },
    { key: "l1", header: "KUANTITI LINE 1", width: 18 },
    { key: "l2", header: "KUANTITI LINE 2", width: 18 },
    { key: "share", header: "STATUS / CATATAN", width: 20 },
  ]
  ws5.columns = matCols

  const hRow5 = ws5.getRow(4)
  hRow5.height = 24
  matCols.forEach((col, i) => {
    const cell = hRow5.getCell(i + 1)
    cell.value = col.header
    styleHeaderCell(cell, HEADER_BG)
  })

  let matCurrRow = 5
  report.byMaterial.forEach((m, idx) => {
    const r = ws5.getRow(matCurrRow)
    r.height = 20
    r.getCell(1).value = m.label
    r.getCell(2).value = m.quantity
    r.getCell(2).numFmt = m.unit === "rolls" ? NUM_DEC : NUM
    r.getCell(3).value = m.unit.toUpperCase()
    r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(4).value = m.line1Qty
    r.getCell(4).numFmt = m.unit === "rolls" ? NUM_DEC : NUM
    r.getCell(5).value = m.line2Qty
    r.getCell(5).numFmt = m.unit === "rolls" ? NUM_DEC : NUM
    r.getCell(6).value = m.unit === "rolls" ? "Unit Gulung (Rolls)" : "Unit Keping (Pcs)"
    r.getCell(6).alignment = { horizontal: "center", vertical: "middle" }

    for (let col = 1; col <= 6; col++) {
      r.getCell(col).border = allBorders
      if (idx % 2 === 1) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
    matCurrRow += 1
  })

  autoFitColumns(ws5, 14, 25)

  // ===============================================================================================
  // SHEET 6: Usage Detail
  // ===============================================================================================
  const ws6 = wb.addWorksheet("Usage Detail", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws6, "P", "REKOD TERPERINCI PENGGUNAAN BAHAN (USAGE DETAIL DATASET)", dateRangeStr, generatedAt, preparedBy)

  const detailCols = [
    { key: "date", header: "TARIKH", width: 14 },
    { key: "shift", header: "SHIFT", width: 10 },
    { key: "line", header: "PRODUCTION LINE", width: 18 },
    { key: "sku", header: "SKU / PRODUK", width: 18 },
    { key: "batchNo", header: "BATCH NO PRODUCTION", width: 20 },
    { key: "batchType", header: "BATCH TYPE", width: 14 },
    { key: "status", header: "STATUS", width: 12 },
    { key: "output", header: "OUTPUT BOXES", width: 14 },
    { key: "bottle", header: "USAGE BOTOL (PCS)", width: 18 },
    { key: "cap", header: "USAGE CAP (PCS)", width: 16 },
    { key: "label", header: "USAGE LABEL (ROLLS)", width: 18 },
    { key: "box", header: "USAGE BOX (PCS)", width: 16 },
    { key: "reportId", header: "REPORT ID", width: 26 },
    { key: "preparedBy", header: "OPERATOR", width: 18 },
    { key: "approvedAt", header: "DISAHKAN PADA", width: 20 },
    { key: "createdAt", header: "DIREKOD PADA", width: 20 },
  ]
  ws6.columns = detailCols

  const hRow6 = ws6.getRow(4)
  hRow6.height = 24
  detailCols.forEach((col, i) => {
    const cell = hRow6.getCell(i + 1)
    cell.value = col.header
    styleHeaderCell(cell, HEADER_BG)
  })

  const detStartRow = 5
  let detCurrRow = 5

  report.details.forEach((d, idx) => {
    const r = ws6.getRow(detCurrRow)
    r.height = 18
    r.getCell(1).value = d.dateFormatted
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).value = d.shift
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(3).value = d.line
    r.getCell(4).value = d.sku
    r.getCell(5).value = d.batchNo
    r.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(6).value = d.batchType
    r.getCell(6).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(7).value = d.status
    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
    if (d.status === "PENDING") {
      r.getCell(7).font = { bold: true, color: { argb: "FFD97706" } }
    }
    r.getCell(8).value = d.outputBoxes
    r.getCell(8).numFmt = NUM
    r.getCell(9).value = d.bottleUsage
    r.getCell(9).numFmt = NUM
    r.getCell(10).value = d.capUsage
    r.getCell(10).numFmt = NUM
    r.getCell(11).value = d.labelUsage
    r.getCell(11).numFmt = NUM_DEC
    r.getCell(12).value = d.boxUsage
    r.getCell(12).numFmt = NUM
    r.getCell(13).value = d.reportId
    r.getCell(13).font = { size: 9, color: { argb: MUTED } }
    r.getCell(14).value = d.preparedBy
    r.getCell(15).value = d.approvedAt ? d.approvedAt.split("T")[0] : "-"
    r.getCell(15).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(16).value = d.createdAt ? d.createdAt.split("T")[0] : "-"
    r.getCell(16).alignment = { horizontal: "center", vertical: "middle" }

    for (let col = 1; col <= 16; col++) {
      r.getCell(col).border = allBorders
      if (idx % 2 === 1) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
    detCurrRow += 1
  })

  // Detail Total Row
  if (report.details.length > 0) {
    const totRow = ws6.getRow(detCurrRow)
    totRow.height = 20
    totRow.getCell(1).value = "JUMLAH KESELURUHAN"
    totRow.getCell(1).font = { bold: true, size: 10, color: { argb: INK } }
    totRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    const lastDataRow = detCurrRow - 1
    totRow.getCell(8).value = { formula: `SUM(H${detStartRow}:H${lastDataRow})`, result: report.kpis.totalBoxesOutput }
    totRow.getCell(8).numFmt = NUM
    totRow.getCell(9).value = { formula: `SUM(I${detStartRow}:I${lastDataRow})`, result: report.kpis.totalUsageBottle }
    totRow.getCell(9).numFmt = NUM
    totRow.getCell(10).value = { formula: `SUM(J${detStartRow}:J${lastDataRow})`, result: report.kpis.totalUsageCap }
    totRow.getCell(10).numFmt = NUM
    totRow.getCell(11).value = { formula: `SUM(K${detStartRow}:K${lastDataRow})`, result: report.kpis.totalUsageLabel }
    totRow.getCell(11).numFmt = NUM_DEC
    totRow.getCell(12).value = { formula: `SUM(L${detStartRow}:L${lastDataRow})`, result: report.kpis.totalUsageBox }
    totRow.getCell(12).numFmt = NUM

    for (let col = 1; col <= 16; col++) {
      const cell = totRow.getCell(col)
      cell.font = { bold: true, size: 10, color: { argb: INK } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  // Set Excel AutoFilter on Usage Detail
  ws6.autoFilter = `A4:P${Math.max(4, detCurrRow - 1)}`

  autoFitColumns(ws6, 12, 28)

  // ===============================================================================================
  // SHEET 7: Data Dictionary / Calculation Notes
  // ===============================================================================================
  const ws7 = wb.addWorksheet("Data Dictionary & Notes", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws7, "D", "KAMUS DATA & NOTA PENGIRAAN LAPORAN USAGE BUBBLESO2", dateRangeStr, generatedAt, preparedBy)

  const dictCols = [
    { key: "field", header: "NAMA MEDAN / KONSEP", width: 26 },
    { key: "source", header: "SUMBER DATA (DATABASE)", width: 28 },
    { key: "unit", header: "UNIT & TIMEZONE", width: 22 },
    { key: "notes", header: "FORMULA & NOTA PENGIRAAN", width: 45 },
  ]
  ws7.columns = dictCols

  const hRow7 = ws7.getRow(4)
  hRow7.height = 24
  dictCols.forEach((col, i) => {
    const cell = hRow7.getCell(i + 1)
    cell.value = col.header
    styleHeaderCell(cell, HEADER_BG)
  })

  const dictionaryItems = [
    {
      field: "Production Date",
      source: "DailyReport.date",
      unit: "Date (DD/MM/YYYY)",
      notes: "Tarikh sebenar operasi pengeluaran dijalankan mengikut zon masa Malaysia (UTC+8). Tidak menggunakan created_at untuk mengelakkan ralat tarikh.",
    },
    {
      field: "Batch Number Production",
      source: "ProductionBatch.batchNo",
      unit: "Text (String)",
      notes: "Nombor lot/batch pengeluaran produk siap (contoh: 023626-01). Tidak dicampur dengan nombor batch bahan mentah.",
    },
    {
      field: "Production Line",
      source: "DailyReport.line",
      unit: "Text (String)",
      notes: "Line operasi pengeluaran (contoh: 'LINE 1 - 800ml' dan 'LINE 2 - 425ml'). Dinormalkan kepada LINE 1 dan LINE 2 untuk tujuan laporan ringkasan.",
    },
    {
      field: "Usage Bottle (Botol)",
      source: "InventoryLog (sectionKey = 'BOTTLE', type = 'Usage')",
      unit: "Pcs (Botol)",
      notes: "Formula: bags * mult. Multiplier ialah 225 bagi saiz 800ml dan 181/162 bagi saiz 425ml. Menghasilkan jumlah botol fizikal yang digunakan.",
    },
    {
      field: "Usage Cap (Penutup)",
      source: "InventoryLog (sectionKey = 'CAP', type = 'Usage')",
      unit: "Pcs (Penutup)",
      notes: "Formula: bags * mult. Multiplier standard ialah 4,000 unit penutup setiap beg/kotak.",
    },
    {
      field: "Usage Label (Pelekat)",
      source: "InventoryLog (sectionKey = 'LABEL', type = 'Usage')",
      unit: "Rolls (Gulung)",
      notes: "Formula: bags * 1. Direkod dalam unit gulung (rolls), merangkumi pelekat hadapan (Front) dan belakang (Back). Tidak dicampur terus dengan unit pcs.",
    },
    {
      field: "Usage Box (Kotak)",
      source: "InventoryLog (sectionKey LIKE 'BOX_%', type = 'Usage')",
      unit: "Pcs (Kotak)",
      notes: "Formula: bags * 1. Kotak beralur karton yang digunakan untuk membungkus botol siap.",
    },
    {
      field: "Pro-Rata Batch Allocation",
      source: "ProductionBatch.qty / DailyReport.totalBoxes",
      unit: "Ratio (%)",
      notes: "Jika sesebuah laporan harian mengandungi lebih daripada 1 batch pengeluaran, penggunaan bahan diagihkan secara berkadaran mengikut nisbah output setiap batch bagi mengelakkan double counting.",
    },
    {
      field: "Status Laporan",
      source: "DailyReport.status",
      unit: "APPROVED / PENDING",
      notes: "Laporan merangkumi status APPROVED dan PENDING (dengan tanda amaran amber untuk PENDING) supaya pihak pengurusan mendapat maklumat lengkap.",
    },
    {
      field: "Pivot-style Summary",
      source: "ExcelJS Table & Formulas",
      unit: "Summary Aggregation",
      notes: "Library ExcelJS tidak menyokong penjanaan native OpenXML PivotTable. Jadual ringkasan berformula (SUM/COUNT) disediakan dengan fungsi agregasi yang setara.",
    },
  ]

  let dictCurrRow = 5
  dictionaryItems.forEach((item, idx) => {
    const r = ws7.getRow(dictCurrRow)
    r.height = 36
    r.getCell(1).value = item.field
    r.getCell(1).font = { bold: true, size: 9, color: { argb: INK } }
    r.getCell(1).alignment = { vertical: "middle" }

    r.getCell(2).value = item.source
    r.getCell(2).font = { size: 9, color: { argb: "FF0369A1" } }
    r.getCell(2).alignment = { vertical: "middle" }

    r.getCell(3).value = item.unit
    r.getCell(3).alignment = { vertical: "middle" }

    r.getCell(4).value = item.notes
    r.getCell(4).alignment = { vertical: "middle", wrapText: true }

    for (let col = 1; col <= 4; col++) {
      r.getCell(col).border = allBorders
      if (idx % 2 === 1) {
        r.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }
    dictCurrRow += 1
  })

  autoFitColumns(ws7, 18, 50)

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

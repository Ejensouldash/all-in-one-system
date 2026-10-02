import ExcelJS from "exceljs"
import type { BatchTraceabilityReport } from "@/lib/analytics/batchTraceability"

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

function autoFitColumns(ws: ExcelJS.Worksheet, minWidth = 12, maxWidth = 45) {
  ws.columns.forEach(column => {
    let maxLen = minWidth
    column.eachCell?.({ includeEmpty: false }, cell => {
      // Don't gauge length on merged banner cells (row <= 4)
      if (Number(cell.row) <= 4) return
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
  subText: string
): number {
  ws.mergeCells(`A1:${lastColLetter}1`)
  const t = ws.getCell("A1")
  t.value = sheetTitle
  t.font = { bold: true, size: 13, color: { argb: INK } }
  t.alignment = { vertical: "middle" }
  ws.getRow(1).height = 24

  ws.mergeCells(`A2:${lastColLetter}2`)
  const sub = ws.getCell("A2")
  sub.value = subText
  sub.font = { size: 9, color: { argb: MUTED } }
  ws.getRow(2).height = 18

  ws.getRow(3).height = 8
  return 4
}

export async function buildBottleBoxTraceWorkbook(
  report: BatchTraceabilityReport,
  preparedBy: string,
  generatedAt: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "BubblesO2 AIO System"
  wb.created = new Date()

  const subText = `ISO Week: ${report.isoWeekString}   •   Date Range: ${report.dateRange.startDate} to ${report.dateRange.endDate} (${report.dateRange.shortRange})   •   Line: ${report.filterLine}   •   Filter: ${report.filterBatchNo || "All Batches"}   •   Generated: ${generatedAt}   •   Prepared By: ${preparedBy}`

  // ===============================================================================================
  // SHEET 1: Bottle-to-Box Traceability (Detailed)
  // ===============================================================================================
  const ws1 = wb.addWorksheet("Bottle-to-Box Traceability", {
    views: [{ state: "frozen", ySplit: 8 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws1, "O", "BUBBLESO2 BATCH TRACEABILITY REPORT — BOTTLE TO BOX OUTPUT", subText)

  // KPI CARDS SECTION (Rows 4 to 6)
  const kpis = [
    { label: "TOTAL MAPPINGS", value: report.totals.totalRecords, colStart: "A", colEnd: "C" },
    { label: "BOTTLE BATCHES", value: report.totals.uniqueBottleBatches, colStart: "D", colEnd: "F" },
    { label: "OUTPUT BOX BATCHES", value: report.totals.uniqueBoxBatches, colStart: "G", colEnd: "I" },
    { label: "TOTAL BOTTLES USED (PCS)", value: report.totals.totalBottlePcs, colStart: "J", colEnd: "L" },
    { label: "TOTAL BOXES PRODUCED", value: report.totals.totalBoxesProduced, colStart: "M", colEnd: "O" },
  ]

  ws1.getRow(4).height = 14
  ws1.getRow(5).height = 24

  kpis.forEach(card => {
    ws1.mergeCells(`${card.colStart}4:${card.colEnd}4`)
    const lblCell = ws1.getCell(`${card.colStart}4`)
    lblCell.value = card.label
    lblCell.font = { bold: true, size: 8, color: { argb: MUTED } }
    lblCell.alignment = { horizontal: "center", vertical: "middle" }

    ws1.mergeCells(`${card.colStart}5:${card.colEnd}5`)
    const valCell = ws1.getCell(`${card.colStart}5`)
    valCell.value = card.value
    valCell.font = { bold: true, size: 14, color: { argb: INK } }
    valCell.numFmt = NUM
    valCell.alignment = { horizontal: "center", vertical: "middle" }

    // Card border
    const startColIndex = card.colStart.charCodeAt(0) - 64
    const endColIndex = card.colEnd.charCodeAt(0) - 64
    for (let r = 4; r <= 5; r++) {
      for (let c = startColIndex; c <= endColIndex; c++) {
        const cell = ws1.getRow(r).getCell(c)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } }
        cell.border = allBorders
      }
    }
  })

  ws1.getRow(7).height = 10

  // TABLE HEADERS (Row 8)
  const headers = [
    "No.",
    "ISO Week",
    "Date",
    "Shift",
    "Production Line",
    "Product / SKU",
    "Bottle Batch No (Usage)",
    "Bottle Bags",
    "Pcs / Bag",
    "Total Bottles Used (Pcs)",
    "Box Batch No (Output)",
    "Output Boxes (Qty)",
    "Batch Type",
    "Report Status",
    "Prepared By",
  ]

  const headerRow = ws1.getRow(8)
  headerRow.height = 26
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = h
    styleHeaderCell(cell, HEADER_BG)
  })

  // DATA ROWS
  let currentRow = 9
  report.detailedRows.forEach((row, idx) => {
    const r = ws1.getRow(currentRow)
    r.height = 20

    r.getCell(1).value = idx + 1
    r.getCell(2).value = row.isoWeek
    r.getCell(3).value = row.dateFormatted
    r.getCell(4).value = row.shift
    r.getCell(5).value = row.line
    r.getCell(6).value = row.skuLabel
    r.getCell(7).value = row.bottleBatchNo
    r.getCell(8).value = row.bottleBags
    r.getCell(9).value = row.bottleMult
    r.getCell(10).value = row.bottlePcs
    r.getCell(11).value = row.boxBatchNo
    r.getCell(12).value = row.boxQty
    r.getCell(13).value = row.boxType
    r.getCell(14).value = row.reportStatus
    r.getCell(15).value = row.preparedBy

    // Alignments & Number Formats
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(4).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(5).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(6).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(7).font = { bold: true, color: { argb: "FF047857" } } // Emerald 700
    r.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(8).numFmt = NUM_DEC
    r.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(9).numFmt = NUM
    r.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(10).numFmt = NUM
    r.getCell(11).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(11).font = { bold: true, color: { argb: "FF1D4ED8" } } // Blue 700
    r.getCell(12).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(12).numFmt = NUM
    r.getCell(13).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(14).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(15).alignment = { horizontal: "left", vertical: "middle" }

    // Zebra striping
    const isEven = idx % 2 === 0
    for (let c = 1; c <= 15; c++) {
      const cell = r.getCell(c)
      cell.border = allBorders
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }

    currentRow++
  })

  // SUMMARY ROW (Bottom Total)
  if (report.detailedRows.length > 0) {
    const totalRow = ws1.getRow(currentRow)
    totalRow.height = 22
    totalRow.getCell(1).value = "TOTAL"
    totalRow.getCell(1).font = { bold: true }
    totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    ws1.mergeCells(`A${currentRow}:G${currentRow}`)

    // Formula for Bottle Bags (Col H)
    const bagsCell = totalRow.getCell(8)
    bagsCell.value = { formula: `SUBTOTAL(9, H9:H${currentRow - 1})` }
    bagsCell.numFmt = NUM_DEC
    bagsCell.font = { bold: true }
    bagsCell.alignment = { horizontal: "right", vertical: "middle" }

    // Formula for Total Bottles (Col J)
    const pcsCell = totalRow.getCell(10)
    pcsCell.value = { formula: `SUBTOTAL(9, J9:J${currentRow - 1})` }
    pcsCell.numFmt = NUM
    pcsCell.font = { bold: true }
    pcsCell.alignment = { horizontal: "right", vertical: "middle" }

    // Formula for Output Boxes (Col L)
    const boxesCell = totalRow.getCell(12)
    boxesCell.value = { formula: `SUBTOTAL(9, L9:L${currentRow - 1})` }
    boxesCell.numFmt = NUM
    boxesCell.font = { bold: true }
    boxesCell.alignment = { horizontal: "right", vertical: "middle" }

    for (let c = 1; c <= 15; c++) {
      const cell = totalRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  autoFitColumns(ws1, 10, 36)

  // ===============================================================================================
  // SHEET 2: Batch Summary (Aggregated by Bottle Batch)
  // ===============================================================================================
  const ws2 = wb.addWorksheet("Batch Summary", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws2, "J", "BUBBLESO2 AGGREGATED SUMMARY BY BOTTLE BATCH", subText)

  const summaryHeaders = [
    "No.",
    "Bottle Batch No",
    "Products / SKUs Involved",
    "Production Lines",
    "Total Bags Used",
    "Total Bottles Used (Pcs)",
    "Linked Box Batches (Output)",
    "Total Boxes Produced",
    "Shifts Involved",
    "Production Dates",
  ]

  const sHeaderRow = ws2.getRow(5)
  sHeaderRow.height = 26
  summaryHeaders.forEach((h, idx) => {
    const cell = sHeaderRow.getCell(idx + 1)
    cell.value = h
    styleHeaderCell(cell, SUBHEADER_BG)
  })

  let sRowIdx = 6
  report.summaries.forEach((s, idx) => {
    const r = ws2.getRow(sRowIdx)
    r.height = 22

    r.getCell(1).value = idx + 1
    r.getCell(2).value = s.bottleBatchNo
    r.getCell(3).value = s.skus
    r.getCell(4).value = s.lines
    r.getCell(5).value = s.totalBags
    r.getCell(6).value = s.totalPcs
    r.getCell(7).value = s.linkedBoxBatches
    r.getCell(8).value = s.totalBoxesProduced
    r.getCell(9).value = s.shiftCount
    r.getCell(10).value = s.dates

    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).font = { bold: true, color: { argb: "FF047857" } }
    r.getCell(3).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(4).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(5).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(5).numFmt = NUM_DEC
    r.getCell(6).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(6).numFmt = NUM
    r.getCell(7).alignment = { horizontal: "left", vertical: "middle", wrapText: true }
    r.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(8).numFmt = NUM
    r.getCell(8).font = { bold: true, color: { argb: "FF1D4ED8" } }
    r.getCell(9).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(10).alignment = { horizontal: "left", vertical: "middle" }

    const isEven = idx % 2 === 0
    for (let c = 1; c <= 10; c++) {
      const cell = r.getCell(c)
      cell.border = allBorders
      if (isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    }

    sRowIdx++
  })

  // Summary Sheet Total Row
  if (report.summaries.length > 0) {
    const sTotalRow = ws2.getRow(sRowIdx)
    sTotalRow.height = 22
    sTotalRow.getCell(1).value = "TOTAL"
    sTotalRow.getCell(1).font = { bold: true }
    sTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    ws2.mergeCells(`A${sRowIdx}:D${sRowIdx}`)

    const bagsCell = sTotalRow.getCell(5)
    bagsCell.value = { formula: `SUBTOTAL(9, E6:E${sRowIdx - 1})` }
    bagsCell.numFmt = NUM_DEC
    bagsCell.font = { bold: true }
    bagsCell.alignment = { horizontal: "right", vertical: "middle" }

    const pcsCell = sTotalRow.getCell(6)
    pcsCell.value = { formula: `SUBTOTAL(9, F6:F${sRowIdx - 1})` }
    pcsCell.numFmt = NUM
    pcsCell.font = { bold: true }
    pcsCell.alignment = { horizontal: "right", vertical: "middle" }

    const boxesCell = sTotalRow.getCell(8)
    boxesCell.value = { formula: `SUBTOTAL(9, H6:H${sRowIdx - 1})` }
    boxesCell.numFmt = NUM
    boxesCell.font = { bold: true }
    boxesCell.alignment = { horizontal: "right", vertical: "middle" }

    for (let c = 1; c <= 10; c++) {
      const cell = sTotalRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  autoFitColumns(ws2, 12, 45)

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

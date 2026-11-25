import ExcelJS from "exceljs"
import type {
  BatchTraceabilityReport,
  MaterialToFgTraceRow,
} from "@/lib/analytics/batchTraceability"

const INK = "FF0F172A" // Slate 900
const MUTED = "FF64748B" // Slate 500
const BORDER = "FFCBD5E1" // Slate 300
const HEADER_BG = "FF064E3B" // Emerald 900
const HEADER_FG = "FFFFFFFF" // White
const SUBHEADER_BG = "FF0F766E" // Teal 700
const ZEBRA = "FFF8FAFC" // Slate 50
const CARD_BG = "FFF0FDF4" // Emerald 50
const TOTAL_BG = "FFE2E8F0" // Slate 200

// Ice Blue style matching Gambar 2
const ICE_BLUE_BG = "FFD9E1F2" // Soft Ice Blue
const ICE_BLUE_FG = "FF000000" // Black

const NUM = "#,##0"
const NUM_DEC = "#,##0.00"

const thinBorder = { style: "thin" as const, color: { argb: BORDER } }
const doubleBottomBorder = { style: "double" as const, color: { argb: INK } }
const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder }
const totalBorders = { top: thinBorder, left: thinBorder, bottom: doubleBottomBorder, right: thinBorder }

interface KpiCard {
  label: string
  value: number
  colStart: string
  colEnd: string
}

function colLetterToIndex(col: string): number {
  let idx = 0
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64)
  }
  return idx
}

function styleHeaderCell(cell: ExcelJS.Cell, bgColor = HEADER_BG, fgColor = HEADER_FG) {
  cell.font = { bold: true, size: 10, color: { argb: fgColor } }
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

function renderKpiCards(ws: ExcelJS.Worksheet, kpis: KpiCard[]) {
  ws.getRow(4).height = 14
  ws.getRow(5).height = 24

  kpis.forEach(card => {
    ws.mergeCells(`${card.colStart}4:${card.colEnd}4`)
    const lblCell = ws.getCell(`${card.colStart}4`)
    lblCell.value = card.label
    lblCell.font = { bold: true, size: 8, color: { argb: MUTED } }
    lblCell.alignment = { horizontal: "center", vertical: "middle" }

    ws.mergeCells(`${card.colStart}5:${card.colEnd}5`)
    const valCell = ws.getCell(`${card.colStart}5`)
    valCell.value = card.value
    valCell.font = { bold: true, size: 14, color: { argb: INK } }
    valCell.numFmt = NUM
    valCell.alignment = { horizontal: "center", vertical: "middle" }

    const startColIndex = colLetterToIndex(card.colStart)
    const endColIndex = colLetterToIndex(card.colEnd)
    for (let r = 4; r <= 5; r++) {
      for (let c = startColIndex; c <= endColIndex; c++) {
        const cell = ws.getRow(r).getCell(c)
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } }
        cell.border = allBorders
      }
    }
  })

  ws.getRow(7).height = 10
}

function writeBottleToBoxSheet(
  wb: ExcelJS.Workbook,
  report: BatchTraceabilityReport,
  subText: string
) {
  const ws1 = wb.addWorksheet("Bottle-to-Box Traceability", {
    views: [{ state: "frozen", ySplit: 8 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws1, "O", "BUBBLESO2 BATCH TRACEABILITY REPORT — BOTTLE TO BOX OUTPUT", subText)

  renderKpiCards(ws1, [
    { label: "TOTAL MAPPINGS", value: report.totals.totalRecords, colStart: "A", colEnd: "C" },
    { label: "BOTTLE BATCHES", value: report.totals.uniqueBottleBatches, colStart: "D", colEnd: "F" },
    { label: "OUTPUT BOX BATCHES", value: report.totals.uniqueBoxBatches, colStart: "G", colEnd: "I" },
    { label: "TOTAL BOTTLES USED (PCS)", value: report.totals.totalBottlePcs, colStart: "J", colEnd: "L" },
    { label: "TOTAL BOXES PRODUCED", value: report.totals.totalBoxesProduced, colStart: "M", colEnd: "O" },
  ])

  const headers = [
    "No.",
    "ISO Week / Range",
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

    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(4).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(5).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(6).alignment = { horizontal: "left", vertical: "middle" }
    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(7).font = { bold: true, color: { argb: "FF047857" } }
    r.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(8).numFmt = NUM_DEC
    r.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(9).numFmt = NUM
    r.getCell(10).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(10).numFmt = NUM
    r.getCell(11).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(11).font = { bold: true, color: { argb: "FF1D4ED8" } }
    r.getCell(12).alignment = { horizontal: "right", vertical: "middle" }
    r.getCell(12).numFmt = NUM
    r.getCell(13).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(14).alignment = { horizontal: "center", vertical: "middle" }
    r.getCell(15).alignment = { horizontal: "left", vertical: "middle" }

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

  if (report.detailedRows.length > 0) {
    const totalRow = ws1.getRow(currentRow)
    totalRow.height = 22
    totalRow.getCell(1).value = "TOTAL"
    totalRow.getCell(1).font = { bold: true }
    totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    ws1.mergeCells(`A${currentRow}:G${currentRow}`)

    const bagsCell = totalRow.getCell(8)
    bagsCell.value = { formula: `SUBTOTAL(9, H9:H${currentRow - 1})` }
    bagsCell.numFmt = NUM_DEC
    bagsCell.font = { bold: true }
    bagsCell.alignment = { horizontal: "right", vertical: "middle" }

    const pcsCell = totalRow.getCell(10)
    pcsCell.value = { formula: `SUBTOTAL(9, J9:J${currentRow - 1})` }
    pcsCell.numFmt = NUM
    pcsCell.font = { bold: true }
    pcsCell.alignment = { horizontal: "right", vertical: "middle" }

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
}

function writeBottleSummarySheet(
  wb: ExcelJS.Workbook,
  report: BatchTraceabilityReport,
  subText: string
) {
  const ws2 = wb.addWorksheet("Batch Summary", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(ws2, "M", "BUBBLESO2 BATCH TRACEABILITY REPORT — FG BOX LEVEL SUMMARY", subText)

  const summaryHeaders = [
    "No.",
    "Batch No Bottle",
    "Machine",
    "Production Date",
    "SKU",
    "Batch Number FG",
    "Quantity (box)",
    "Total Bags Used",
    "Total Bottles Used (Pcs)",
    "Batch No Preform 31.0G",
    "Batch No Resin",
    "Batch No Preform 18.5G",
    "Batch No Resin",
  ]

  const sHeaderRow = ws2.getRow(5)
  sHeaderRow.height = 28
  summaryHeaders.forEach((h, idx) => {
    const cell = sHeaderRow.getCell(idx + 1)
    cell.value = h
    styleHeaderCell(cell, SUBHEADER_BG)
  })

  let sRowIdx = 6
  report.summaries.forEach((s, idx) => {
    const boxList =
      s.linkedBoxes && s.linkedBoxes.length > 0
        ? s.linkedBoxes
        : [{ batchNo: "-", date: s.dates ? s.dates.split(",")[0].trim() : "-", qty: 0 }]

    const startRow = sRowIdx
    const isEven = idx % 2 === 0

    boxList.forEach((box, k) => {
      const r = ws2.getRow(sRowIdx)
      r.height = 22

      if (k === 0) {
        r.getCell(1).value = idx + 1
        r.getCell(2).value = s.bottleBatchNo
        r.getCell(3).value = s.machine
        r.getCell(5).value = s.skuLabel || s.skus
        r.getCell(8).value = s.totalBags
        r.getCell(9).value = s.totalPcs
        r.getCell(10).value = ""
        r.getCell(11).value = ""
        r.getCell(12).value = ""
        r.getCell(13).value = ""
      }

      r.getCell(4).value = box.date
      r.getCell(6).value = box.batchNo
      r.getCell(7).value = box.qty

      r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(2).font = { bold: true, color: { argb: "FF047857" } }
      r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(3).font = { bold: true, color: { argb: "FF4338CA" } }
      r.getCell(4).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(6).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(6).font = { bold: true }
      r.getCell(7).alignment = { horizontal: "right", vertical: "middle" }
      r.getCell(7).numFmt = NUM
      r.getCell(7).font = { bold: true, color: { argb: "FF1D4ED8" } }
      r.getCell(8).alignment = { horizontal: "right", vertical: "middle" }
      r.getCell(8).numFmt = NUM_DEC
      r.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
      r.getCell(9).numFmt = NUM
      r.getCell(10).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      r.getCell(11).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      r.getCell(12).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      r.getCell(13).alignment = { horizontal: "center", vertical: "middle", wrapText: true }

      for (let c = 1; c <= 13; c++) {
        const cell = r.getCell(c)
        cell.border = allBorders
        if (isEven) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
        }
      }

      sRowIdx++
    })

    const endRow = sRowIdx - 1
    if (boxList.length > 1) {
      ws2.mergeCells(startRow, 1, endRow, 1)
      ws2.mergeCells(startRow, 2, endRow, 2)
      ws2.mergeCells(startRow, 3, endRow, 3)
      ws2.mergeCells(startRow, 5, endRow, 5)
      ws2.mergeCells(startRow, 8, endRow, 8)
      ws2.mergeCells(startRow, 9, endRow, 9)
      ws2.mergeCells(startRow, 10, endRow, 10)
      ws2.mergeCells(startRow, 11, endRow, 11)
      ws2.mergeCells(startRow, 12, endRow, 12)
      ws2.mergeCells(startRow, 13, endRow, 13)
    }
  })

  if (report.summaries.length > 0) {
    const sTotalRow = ws2.getRow(sRowIdx)
    sTotalRow.height = 24
    sTotalRow.getCell(1).value = "TOTAL"
    sTotalRow.getCell(1).font = { bold: true }
    sTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }

    ws2.mergeCells(`A${sRowIdx}:F${sRowIdx}`)

    const boxesCell = sTotalRow.getCell(7)
    boxesCell.value = { formula: `SUBTOTAL(9, G6:G${sRowIdx - 1})` }
    boxesCell.numFmt = NUM
    boxesCell.font = { bold: true, color: { argb: "FF1D4ED8" } }
    boxesCell.alignment = { horizontal: "right", vertical: "middle" }

    const bagsCell = sTotalRow.getCell(8)
    bagsCell.value = { formula: `SUBTOTAL(9, H6:H${sRowIdx - 1})` }
    bagsCell.numFmt = NUM_DEC
    bagsCell.font = { bold: true }
    bagsCell.alignment = { horizontal: "right", vertical: "middle" }

    const pcsCell = sTotalRow.getCell(9)
    pcsCell.value = { formula: `SUBTOTAL(9, I6:I${sRowIdx - 1})` }
    pcsCell.numFmt = NUM
    pcsCell.font = { bold: true }
    pcsCell.alignment = { horizontal: "right", vertical: "middle" }

    for (let c = 1; c <= 13; c++) {
      const cell = sTotalRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  const colWidthsSheet2 = [8, 16, 12, 16, 16, 18, 16, 16, 22, 22, 22, 22, 22]
  colWidthsSheet2.forEach((w, idx) => {
    ws2.getColumn(idx + 1).width = w
  })
}

function writeProductionDistributionSheet(wb: ExcelJS.Workbook, report: BatchTraceabilityReport) {
  const ws3 = wb.addWorksheet("Production & Distribution", {
    views: [{ state: "frozen", ySplit: 2 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const dStart = new Date(report.dateRange.startDate)
  const monthNamesUpper = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const monthYearLabel =
    report.dateMode === "BATCH_LIST" && report.dateRange.shortRange === "All Time"
      ? "ALL TIME"
      : `MONTH: ${monthNamesUpper[dStart.getMonth()]} ${String(dStart.getFullYear()).slice(-2)}`

  let currentDistRow = 1

  const distHeaders = [
    "Production Date",
    "Batch Number",
    "Total Production",
    "Distribution Date",
    "Destination",
    "Quantity",
    "Total Quantity",
    "Balance",
    "Remarks",
  ]

  if (report.distributionGroups.length === 0) {
    const r1 = ws3.getRow(currentDistRow)
    r1.height = 24
    r1.getCell(1).value = monthYearLabel
    r1.getCell(1).font = { bold: true, size: 11, color: { argb: INK } }
    r1.getCell(9).value = report.filterLine !== "ALL" ? report.filterLine : "All Lines"
    r1.getCell(9).font = { bold: true, size: 11, color: { argb: INK } }
    r1.getCell(9).alignment = { horizontal: "right" }
    currentDistRow++

    const r2 = ws3.getRow(currentDistRow)
    r2.height = 24
    distHeaders.forEach((h, idx) => {
      const cell = r2.getCell(idx + 1)
      cell.value = h
      styleHeaderCell(cell, ICE_BLUE_BG, ICE_BLUE_FG)
    })
  } else {
    report.distributionGroups.forEach((skuGroup, groupIdx) => {
      const bannerRow = ws3.getRow(currentDistRow)
      bannerRow.height = 22
      bannerRow.getCell(1).value = monthYearLabel
      bannerRow.getCell(1).font = { bold: true, size: 10, color: { argb: INK } }
      bannerRow.getCell(1).alignment = { vertical: "middle" }

      bannerRow.getCell(9).value = skuGroup.skuLabel
      bannerRow.getCell(9).font = { bold: true, size: 11, color: { argb: INK } }
      bannerRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
      currentDistRow++

      const tableHeaderRow = ws3.getRow(currentDistRow)
      tableHeaderRow.height = 24
      distHeaders.forEach((h, idx) => {
        const cell = tableHeaderRow.getCell(idx + 1)
        cell.value = h
        styleHeaderCell(cell, ICE_BLUE_BG, ICE_BLUE_FG)
      })
      currentDistRow++

      skuGroup.batches.forEach(b => {
        const batchStartRow = currentDistRow
        const lineCount = Math.max(b.distributions.length, 1)
        const batchEndRow = batchStartRow + lineCount - 1

        b.distributions.forEach(dist => {
          const r = ws3.getRow(currentDistRow)
          r.height = 20

          r.getCell(4).value = dist.distributionDate || ""
          r.getCell(4).alignment = { horizontal: "center", vertical: "middle" }

          r.getCell(5).value = dist.destination || ""
          r.getCell(5).alignment = { horizontal: "left", vertical: "middle" }

          if (dist.quantity !== null && dist.quantity !== undefined) {
            r.getCell(6).value = dist.quantity
            r.getCell(6).numFmt = NUM
          } else {
            r.getCell(6).value = ""
          }
          r.getCell(6).alignment = { horizontal: "right", vertical: "middle" }

          r.getCell(9).value = dist.remarks || b.remarks || ""
          r.getCell(9).alignment = { horizontal: "left", vertical: "middle" }

          for (let c = 1; c <= 9; c++) {
            r.getCell(c).border = allBorders
          }

          currentDistRow++
        })

        const cellA = ws3.getCell(`A${batchStartRow}`)
        cellA.value = b.productionDateFormatted
        cellA.alignment = { horizontal: "center", vertical: "middle" }
        if (lineCount > 1) {
          ws3.mergeCells(`A${batchStartRow}:A${batchEndRow}`)
        }

        const cellB = ws3.getCell(`B${batchStartRow}`)
        cellB.value = b.batchNumber
        cellB.font = { bold: true }
        cellB.alignment = { horizontal: "center", vertical: "middle" }
        if (lineCount > 1) {
          ws3.mergeCells(`B${batchStartRow}:B${batchEndRow}`)
        }

        const cellC = ws3.getCell(`C${batchStartRow}`)
        cellC.value = b.totalProduction
        cellC.font = { bold: true }
        cellC.numFmt = NUM
        cellC.alignment = { horizontal: "center", vertical: "middle" }
        if (lineCount > 1) {
          ws3.mergeCells(`C${batchStartRow}:C${batchEndRow}`)
        }

        const cellG = ws3.getCell(`G${batchStartRow}`)
        if (lineCount > 1) {
          cellG.value = { formula: `SUM(F${batchStartRow}:F${batchEndRow})` }
          ws3.mergeCells(`G${batchStartRow}:G${batchEndRow}`)
        } else {
          cellG.value = { formula: `IF(F${batchStartRow}="","",F${batchStartRow})` }
        }
        cellG.font = { bold: true, color: { argb: "FF15803D" } }
        cellG.numFmt = NUM
        cellG.alignment = { horizontal: "center", vertical: "middle" }

        const cellH = ws3.getCell(`H${batchStartRow}`)
        cellH.value = { formula: `C${batchStartRow}-IF(G${batchStartRow}="",0,G${batchStartRow})` }
        cellH.font = { bold: true }
        cellH.numFmt = NUM
        cellH.alignment = { horizontal: "center", vertical: "middle" }
        if (lineCount > 1) {
          ws3.mergeCells(`H${batchStartRow}:H${batchEndRow}`)
        }
      })

      if (groupIdx < report.distributionGroups.length - 1) {
        currentDistRow += 2
      }
    })
  }

  const colWidths = [16, 18, 16, 16, 22, 14, 16, 14, 25]
  colWidths.forEach((w, idx) => {
    ws3.getColumn(idx + 1).width = w
  })
}

function writeMaterialToFgSheet(
  wb: ExcelJS.Workbook,
  report: BatchTraceabilityReport,
  subText: string
) {
  const rows = report.materialToFgRows || []
  const ws = wb.addWorksheet("Material-to-FG Trace", {
    views: [{ state: "frozen", ySplit: 8 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(
    ws,
    "Q",
    "BUBBLESO2 MATERIAL-TO-FG TRACEABILITY — USAGE ONLY & FINISHED GOODS OUTPUT",
    subText
  )

  // Group rows by shiftKey so shift-level Usage is never double-counted
  const shiftGroups: MaterialToFgTraceRow[][] = []
  const shiftGroupMap = new Map<string, MaterialToFgTraceRow[]>()
  for (const r of rows) {
    let grp = shiftGroupMap.get(r.shiftKey)
    if (!grp) {
      grp = []
      shiftGroupMap.set(r.shiftKey, grp)
      shiftGroups.push(grp)
    }
    grp.push(r)
  }

  const uniqueMaterialBatches = new Set<string>()
  let totalMaterialQty = 0
  const uniqueFgBatches = new Set<string>()
  let totalFgBoxes = 0

  for (const grp of shiftGroups) {
    const head = grp[0]
    head.matchedMaterialBatches
      .split(",")
      .map(s => s.trim())
      .filter(s => s && s !== "-")
      .forEach(b => uniqueMaterialBatches.add(b))
    totalMaterialQty += head.totalUsageQty
    for (const fg of grp) {
      if (fg.fgBatchNo && fg.fgBatchNo !== "N/A") {
        uniqueFgBatches.add(fg.fgBatchNo)
      }
      totalFgBoxes += fg.fgBoxesProduced
    }
  }

  renderKpiCards(ws, [
    { label: "SHIFTS MATCHED (USAGE)", value: shiftGroups.length, colStart: "A", colEnd: "C" },
    { label: "MATERIAL BATCHES", value: uniqueMaterialBatches.size, colStart: "D", colEnd: "F" },
    { label: "FG BATCHES PRODUCED", value: uniqueFgBatches.size, colStart: "G", colEnd: "I" },
    { label: "TOTAL MATERIAL USED", value: totalMaterialQty, colStart: "J", colEnd: "M" },
    { label: "TOTAL FG PRODUCED (BOXES)", value: totalFgBoxes, colStart: "N", colEnd: "Q" },
  ])

  const headers = [
    "No.",
    "Category",
    "Searched Batch",
    "Material Batch (Usage)",
    "Production Date",
    "Shift",
    "Production Line",
    "Usage (Before)",
    "Usage (After)",
    "Total Material Used",
    "FG SKU",
    "FG Batch No",
    "FG Qty (Boxes)",
    "DO Date",
    "DO Destination / Customer",
    "DO Qty Sent (Boxes)",
    "Prepared By & Status",
  ]

  const headerRow = ws.getRow(8)
  headerRow.height = 28
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = h
    styleHeaderCell(cell, HEADER_BG)
  })

  let mRowIdx = 9
  let shiftCounter = 1

  shiftGroups.forEach((grp, sIdx) => {
    const isEven = sIdx % 2 === 0
    const shiftStartRow = mRowIdx
    const shiftHead = grp[0]

    grp.forEach((fgRow, fgIdx) => {
      const distList =
        fgRow.distributions && fgRow.distributions.length > 0
          ? fgRow.distributions
          : [{ distributionDate: "-", destination: "In Warehouse / Not Distributed", quantity: null }]

      const fgStartRow = mRowIdx

      distList.forEach((dist, dIdx) => {
        const r = ws.getRow(mRowIdx)
        r.height = 22

        if (fgIdx === 0 && dIdx === 0) {
          r.getCell(1).value = shiftCounter++
          r.getCell(2).value = shiftHead.searchedCategory
          r.getCell(3).value = shiftHead.searchedBatch
          r.getCell(4).value = shiftHead.matchedMaterialBatches
          r.getCell(5).value = shiftHead.reportDateFormatted
          r.getCell(6).value = shiftHead.shift
          r.getCell(7).value = shiftHead.line
          r.getCell(8).value = shiftHead.usageBeforeDisplay
          r.getCell(9).value = shiftHead.usageAfterDisplay
          r.getCell(10).value = shiftHead.totalUsageDisplay
          r.getCell(17).value = `${shiftHead.preparedBy} (${shiftHead.reportStatus})`
        }

        if (dIdx === 0) {
          r.getCell(11).value = fgRow.fgSkuLabel
          r.getCell(12).value = fgRow.fgBatchNo
          r.getCell(13).value = fgRow.fgBoxesProduced
        }

        r.getCell(14).value = dist.distributionDate || "-"
        r.getCell(15).value = dist.destination || "-"
        r.getCell(16).value = dist.quantity !== null && dist.quantity !== undefined ? dist.quantity : ""

        r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(3).font = { bold: true }
        r.getCell(4).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        r.getCell(4).font = { bold: true, color: { argb: "FF047857" } }
        r.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(6).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(7).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(8).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        r.getCell(9).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        r.getCell(10).alignment = { horizontal: "center", vertical: "middle", wrapText: true }
        r.getCell(10).font = { bold: true, color: { argb: "FF047857" } }

        r.getCell(11).alignment = { horizontal: "left", vertical: "middle" }
        r.getCell(12).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(12).font = { bold: true, color: { argb: "FF1D4ED8" } }
        r.getCell(13).alignment = { horizontal: "right", vertical: "middle" }
        r.getCell(13).numFmt = NUM
        r.getCell(13).font = { bold: true, color: { argb: "FF1D4ED8" } }

        r.getCell(14).alignment = { horizontal: "center", vertical: "middle" }
        r.getCell(15).alignment = { horizontal: "left", vertical: "middle" }
        r.getCell(16).alignment = { horizontal: "right", vertical: "middle" }
        r.getCell(16).numFmt = NUM
        r.getCell(16).font = { bold: true, color: { argb: "FF15803D" } }

        r.getCell(17).alignment = { horizontal: "left", vertical: "middle" }

        for (let c = 1; c <= 17; c++) {
          const cell = r.getCell(c)
          cell.border = allBorders
          if (isEven) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
          }
        }

        mRowIdx++
      })

      const fgEndRow = mRowIdx - 1
      if (fgEndRow > fgStartRow) {
        ;[11, 12, 13].forEach(colNum => {
          ws.mergeCells(fgStartRow, colNum, fgEndRow, colNum)
        })
      }
    })

    const shiftEndRow = mRowIdx - 1
    if (shiftEndRow > shiftStartRow) {
      ;[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17].forEach(colNum => {
        ws.mergeCells(shiftStartRow, colNum, shiftEndRow, colNum)
      })
    }
  })

  if (mRowIdx > 9) {
    const totalRow = ws.getRow(mRowIdx)
    totalRow.height = 24
    totalRow.getCell(1).value = "TOTAL"
    totalRow.getCell(1).font = { bold: true }
    totalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    ws.mergeCells(`A${mRowIdx}:L${mRowIdx}`)

    const totalFgCell = totalRow.getCell(13)
    totalFgCell.value = { formula: `SUM(M9:M${mRowIdx - 1})` }
    totalFgCell.numFmt = NUM
    totalFgCell.font = { bold: true, color: { argb: "FF1D4ED8" } }
    totalFgCell.alignment = { horizontal: "right", vertical: "middle" }

    const totalDoCell = totalRow.getCell(16)
    totalDoCell.value = { formula: `SUM(P9:P${mRowIdx - 1})` }
    totalDoCell.numFmt = NUM
    totalDoCell.font = { bold: true, color: { argb: "FF15803D" } }
    totalDoCell.alignment = { horizontal: "right", vertical: "middle" }

    for (let c = 1; c <= 17; c++) {
      const cell = totalRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  const colWidths = [7, 12, 18, 22, 14, 9, 15, 24, 24, 24, 16, 18, 15, 13, 26, 17, 24]
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w
  })
}

function writeMultiBatchMatrixSheet(
  wb: ExcelJS.Workbook,
  report: BatchTraceabilityReport,
  subText: string
) {
  if (!report.matrixRows || report.matrixRows.length === 0) return

  const ws4 = wb.addWorksheet("Multi-Batch Trace Matrix", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  writeSheetHeader(
    ws4,
    "R",
    "BUBBLESO2 MULTI-BATCH TRACEABILITY MATRIX — RAW MATERIAL TO DISTRIBUTION",
    subText
  )

  const matrixHeaders = [
    "No.",
    "Searched Category",
    "Searched Batch No",
    "Production Date",
    "Shift",
    "Production Line",
    "Output SKU",
    "Output FG Batch No",
    "FG Boxes Produced",
    "Bottle Batch (Usage)",
    "Bottle Used (Pcs)",
    "Cap Batch (Usage)",
    "Label Batch (Usage)",
    "Carton Batch (Usage)",
    "DO Date",
    "DO Destination / Customer",
    "DO Qty Sent (Boxes)",
    "Prepared By & Status",
  ]

  const mHeaderRow = ws4.getRow(5)
  mHeaderRow.height = 28
  matrixHeaders.forEach((h, idx) => {
    const cell = mHeaderRow.getCell(idx + 1)
    cell.value = h
    styleHeaderCell(cell, HEADER_BG)
  })

  let mRowIdx = 6
  let itemCounter = 1

  report.matrixRows.forEach((row, rowIdx) => {
    const distList =
      row.distributions && row.distributions.length > 0
        ? row.distributions
        : [{ distributionDate: "-", destination: "-", quantity: null }]

    const isEven = rowIdx % 2 === 0
    const startRow = mRowIdx

    distList.forEach((dist, dIdx) => {
      const r = ws4.getRow(mRowIdx)
      r.height = 22

      if (dIdx === 0) {
        r.getCell(1).value = itemCounter++
        r.getCell(2).value = row.searchedCategory
        r.getCell(3).value = row.searchedBatch
        r.getCell(4).value = row.reportDateFormatted
        r.getCell(5).value = row.shift
        r.getCell(6).value = row.line
        r.getCell(7).value = row.fgSkuLabel
        r.getCell(8).value = row.fgBatchNo
        r.getCell(9).value = row.fgBoxesProduced
        r.getCell(10).value = row.bottleBatch
        r.getCell(11).value = row.bottlePcs
        r.getCell(12).value = row.capBatch
        r.getCell(13).value = row.labelBatch
        r.getCell(14).value = row.cartonBatch
        r.getCell(18).value = `${row.preparedBy} (${row.reportStatus})`
      }

      r.getCell(15).value = dist.distributionDate || "-"
      r.getCell(16).value = dist.destination || "-"
      r.getCell(17).value = dist.quantity !== null && dist.quantity !== undefined ? dist.quantity : ""

      r.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(2).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(3).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(3).font = { bold: true }
      r.getCell(4).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(5).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(6).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(7).alignment = { horizontal: "left", vertical: "middle" }
      r.getCell(8).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(8).font = { bold: true }

      r.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
      r.getCell(9).numFmt = NUM
      r.getCell(9).font = { bold: true }

      r.getCell(10).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(11).alignment = { horizontal: "right", vertical: "middle" }
      r.getCell(11).numFmt = NUM

      r.getCell(12).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(13).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(14).alignment = { horizontal: "center", vertical: "middle" }

      r.getCell(15).alignment = { horizontal: "center", vertical: "middle" }
      r.getCell(16).alignment = { horizontal: "left", vertical: "middle" }
      r.getCell(17).alignment = { horizontal: "right", vertical: "middle" }
      r.getCell(17).numFmt = NUM
      r.getCell(17).font = { bold: true, color: { argb: "FF15803D" } }

      r.getCell(18).alignment = { horizontal: "left", vertical: "middle" }

      for (let c = 1; c <= 18; c++) {
        const cell = r.getCell(c)
        cell.border = allBorders
        if (isEven) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
        }
      }

      mRowIdx++
    })

    if (distList.length > 1) {
      const endRow = mRowIdx - 1
      const colsToMerge = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18]
      colsToMerge.forEach(colNum => {
        ws4.mergeCells(startRow, colNum, endRow, colNum)
      })
    }
  })

  if (mRowIdx > 6) {
    const mTotalRow = ws4.getRow(mRowIdx)
    mTotalRow.height = 24
    mTotalRow.getCell(1).value = "TOTAL"
    mTotalRow.getCell(1).font = { bold: true }
    mTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    ws4.mergeCells(`A${mRowIdx}:H${mRowIdx}`)

    const totalBoxesCell = mTotalRow.getCell(9)
    totalBoxesCell.value = { formula: `SUM(I6:I${mRowIdx - 1})` }
    totalBoxesCell.numFmt = NUM
    totalBoxesCell.font = { bold: true }
    totalBoxesCell.alignment = { horizontal: "right", vertical: "middle" }

    const totalDOCell = mTotalRow.getCell(17)
    totalDOCell.value = { formula: `SUM(Q6:Q${mRowIdx - 1})` }
    totalDOCell.numFmt = NUM
    totalDOCell.font = { bold: true }
    totalDOCell.alignment = { horizontal: "right", vertical: "middle" }

    for (let c = 1; c <= 18; c++) {
      const cell = mTotalRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } }
      cell.border = totalBorders
    }
  }

  const mColWidths = [8, 18, 20, 15, 10, 15, 18, 20, 16, 20, 16, 18, 18, 18, 14, 26, 18, 24]
  mColWidths.forEach((w, idx) => {
    ws4.getColumn(idx + 1).width = w
  })
}

export async function buildBottleBoxTraceWorkbookWithMeta(
  report: BatchTraceabilityReport,
  preparedBy: string,
  generatedAt: string
): Promise<{ buffer: Buffer; sheetCount: number }> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "BubblesO2 AIO System"
  wb.created = new Date()

  const rangePrefix =
    report.dateMode === "CUSTOM"
      ? "Date Range: "
      : report.dateMode === "BATCH_LIST"
      ? "Batch Search Range: "
      : "ISO Week: "

  const subText = `${rangePrefix}${report.isoWeekString}   •   Line: ${report.filterLine}   •   Filter: ${report.filterBatchNo || "All Batches"}   •   Generated: ${generatedAt}   •   Prepared By: ${preparedBy}`

  const isBatchListMode = report.dateMode === "BATCH_LIST" && (report.batchFilters?.length ?? 0) > 0
  const isBottleOnlySearch =
    isBatchListMode && report.batchFilters!.every(f => f.category === "BOTTLE")

  if (isBatchListMode && !isBottleOnlySearch) {
    // Focused 2-sheet layout for Cap, Label, Carton, FG Output, or All-Category batch traces
    writeMaterialToFgSheet(wb, report, subText)
    writeProductionDistributionSheet(wb, report)
  } else {
    // Bottle-only batch trace or ISO Week / Custom Date reports
    writeBottleToBoxSheet(wb, report, subText)
    writeBottleSummarySheet(wb, report, subText)
    writeProductionDistributionSheet(wb, report)
    if (isBottleOnlySearch) {
      writeMaterialToFgSheet(wb, report, subText)
    } else {
      writeMultiBatchMatrixSheet(wb, report, subText)
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    sheetCount: wb.worksheets.length,
  }
}

export async function buildBottleBoxTraceWorkbook(
  report: BatchTraceabilityReport,
  preparedBy: string,
  generatedAt: string
): Promise<Buffer> {
  const { buffer } = await buildBottleBoxTraceWorkbookWithMeta(report, preparedBy, generatedAt)
  return buffer
}

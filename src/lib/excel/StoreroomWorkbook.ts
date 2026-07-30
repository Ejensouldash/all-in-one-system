import ExcelJS from "exceljs"
import type { StoreroomReport } from "@/lib/analytics/types"

/**
 * Storeroom balance carry-forward workbook.
 *
 * Built with exceljs rather than the repo's existing `xlsx` because SheetJS Community silently
 * drops cell styling on write (`get_cell_style` never reads `cell.s`), so bold headers, fills and
 * borders would not survive. The sheet is meant to be usable as-is with no manual tidying.
 */

const INK = "FF0F172A"
const HEADER_BG = "FF312E81"
const HEADER_FG = "FFFFFFFF"
const ZEBRA = "FFF8FAFC"
const HOLD_BG = "FFFEF3C7"
const BORDER = "FFCBD5E1"
const MUTED = "FF64748B"

const NUM = "#,##0"
const NUM2 = "#,##0.##"

const thin = { style: "thin" as const, color: { argb: BORDER } }
const allBorders = { top: thin, left: thin, bottom: thin, right: thin }

function dmy(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/** Title block shared by both sheets. Returns the row index the table header should start on. */
function writeTitle(ws: ExcelJS.Worksheet, lastCol: string, title: string, asOf: string, generatedAt: string, preparedBy: string) {
  ws.mergeCells(`A1:${lastCol}1`)
  const t = ws.getCell("A1")
  t.value = title
  t.font = { bold: true, size: 15, color: { argb: INK } }
  t.alignment = { vertical: "middle" }
  ws.getRow(1).height = 24

  ws.mergeCells(`A2:${lastCol}2`)
  const sub = ws.getCell("A2")
  sub.value = `Setakat ${dmy(asOf)}   •   Dijana ${generatedAt}   •   Oleh ${preparedBy}`
  sub.font = { size: 9, color: { argb: MUTED } }
  ws.getRow(2).height = 16

  ws.getRow(3).height = 6
  return 4
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 20
  row.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: HEADER_FG } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = allBorders
  })
}

export async function buildStoreroomWorkbook(
  report: StoreroomReport,
  preparedBy: string,
  generatedAt: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "BubblesO2 AIO System"
  wb.created = new Date()

  // ------------------------------------------------------------------ Sheet 1: Balance Detail
  const ws = wb.addWorksheet("Balance Detail", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  ws.columns = [
    { key: "do", width: 30 },
    { key: "sku", width: 22 },
    { key: "batch", width: 18 },
    { key: "balance", width: 13 },
    { key: "unit", width: 10 },
    { key: "mult", width: 10 },
    { key: "pcs", width: 15 },
    { key: "status", width: 13 },
  ]

  const headerRowIdx = writeTitle(ws, "H", "LAPORAN BAKI STOREROOM (CARRY FORWARD)", report.asOf, generatedAt, preparedBy)

  const header = ws.getRow(headerRowIdx)
  header.values = ["DO NO", "SKU", "BATCH NO", "BALANCE", "UNIT", "MULT", "TOTAL PCS", "STATUS"]
  styleHeaderRow(header)

  // Available stock first, then held stock, so the two never blur together.
  const ordered = [
    ...report.rows.map(r => ({ r, hold: false })),
    ...report.holds.map(r => ({ r, hold: true })),
  ]

  let rowIdx = headerRowIdx
  ordered.forEach(({ r, hold }, i) => {
    rowIdx += 1
    const row = ws.getRow(rowIdx)
    row.values = [r.doNumber, r.sku, r.batchNo, r.balance, r.unit, r.mult, r.pcs, hold ? "HOLD" : "Tersedia"]

    row.eachCell(cell => {
      cell.border = allBorders
      cell.font = { size: 10, color: { argb: INK } }
      if (hold) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HOLD_BG } }
      } else if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
      }
    })

    row.getCell(1).alignment = { wrapText: true, vertical: "middle" }
    row.getCell(4).numFmt = NUM2
    row.getCell(6).numFmt = NUM
    row.getCell(7).numFmt = NUM
    row.getCell(5).alignment = { horizontal: "center" }
    row.getCell(8).alignment = { horizontal: "center" }
    if (hold) row.getCell(8).font = { size: 10, bold: true, color: { argb: "FF92400E" } }
  })

  // Totals cover available stock only — held stock is not usable and must not inflate it.
  rowIdx += 1
  const totals = ws.getRow(rowIdx)
  totals.values = ["JUMLAH (TERSEDIA)", "", `${report.totals.batches} batch`, "", "", "", report.totals.pcs, ""]
  totals.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: INK } }
    cell.border = { ...allBorders, top: { style: "double", color: { argb: INK } } }
  })
  totals.getCell(7).numFmt = NUM

  ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: 8 } }

  if (report.holds.length > 0) {
    rowIdx += 2
    const note = ws.getCell(`A${rowIdx}`)
    ws.mergeCells(`A${rowIdx}:H${rowIdx}`)
    note.value = `Nota: ${report.totals.heldBatches} batch berstatus HOLD (baris kuning) sedang menunggu keputusan kuarantin dan TIDAK dikira dalam jumlah tersedia.`
    note.font = { size: 9, italic: true, color: { argb: MUTED } }
  }

  report.warnings.forEach(w => {
    rowIdx += 1
    ws.mergeCells(`A${rowIdx}:H${rowIdx}`)
    const cell = ws.getCell(`A${rowIdx}`)
    cell.value = `Amaran data: ${w}`
    cell.font = { size: 9, italic: true, color: { argb: "FFB45309" } }
  })

  // ------------------------------------------------------------------ Sheet 2: Ringkasan SKU
  const sum = wb.addWorksheet("Ringkasan SKU", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  sum.columns = [
    { key: "sku", width: 24 },
    { key: "batches", width: 11 },
    { key: "balance", width: 15 },
    { key: "unit", width: 10 },
    { key: "pcs", width: 16 },
    { key: "held", width: 15 },
  ]

  const sumHeaderIdx = writeTitle(sum, "F", "RINGKASAN BAKI IKUT SKU", report.asOf, generatedAt, preparedBy)
  const sumHeader = sum.getRow(sumHeaderIdx)
  sumHeader.values = ["SKU", "BATCH", "BAKI TERSEDIA", "UNIT", "SETARA PCS", "DITAHAN"]
  styleHeaderRow(sumHeader)

  let sIdx = sumHeaderIdx
  report.groups.forEach((g, i) => {
    sIdx += 1
    const row = sum.getRow(sIdx)
    row.values = [g.sku, g.batches, g.balance, g.unit, g.pcs, g.heldBalance || 0]
    row.eachCell(cell => {
      cell.border = allBorders
      cell.font = { size: 10, color: { argb: INK } }
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } }
    })
    row.getCell(1).font = { size: 10, bold: true, color: { argb: INK } }
    row.getCell(3).numFmt = NUM2
    row.getCell(5).numFmt = NUM
    row.getCell(6).numFmt = NUM2
    row.getCell(4).alignment = { horizontal: "center" }
    if (!g.known) {
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HOLD_BG } }
      })
    }
  })

  sIdx += 1
  const sumTotals = sum.getRow(sIdx)
  sumTotals.values = ["JUMLAH", report.totals.batches, "", "", report.totals.pcs, ""]
  sumTotals.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: INK } }
    cell.border = { ...allBorders, top: { style: "double", color: { argb: INK } } }
  })
  sumTotals.getCell(5).numFmt = NUM

  sum.autoFilter = { from: { row: sumHeaderIdx, column: 1 }, to: { row: sumHeaderIdx, column: 6 } }

  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

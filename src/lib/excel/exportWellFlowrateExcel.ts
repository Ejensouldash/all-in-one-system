import ExcelJS from "exceljs"
import type { WellFlowratePdfRecord } from "@/lib/pdf/generateWellFlowratePdf"

const BRAND_DARK = "FF0F172A" // Slate 900
const BRAND_SKY = "FF0284C7" // Sky 600
const BORDER_COLOR = "FFCBD5E1" // Slate 300
const ZEBRA_BG = "FFF8FAFC" // Slate 50
const WHITE = "FFFFFFFF"
const MUTED = "FF64748B" // Slate 500

const thinBorder: ExcelJS.Border = {
  style: "thin",
  color: { argb: BORDER_COLOR },
}

const allBorders: Partial<ExcelJS.Borders> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
}

export async function exportWellFlowrateToExcel(
  records: WellFlowratePdfRecord[],
  periodLabel: string = "All Time"
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Bubbles O2 AIO System"
  wb.created = new Date()

  const ws = wb.addWorksheet("Well Flowrate", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // 1. Company Banner (Row 1)
  ws.mergeCells("A1:J1")
  const r1 = ws.getCell("A1")
  r1.value = "BUBBLES O2 SDN. BHD."
  r1.font = { name: "Calibri", size: 14, bold: true, color: { argb: BRAND_DARK } }
  r1.alignment = { vertical: "middle" }
  ws.getRow(1).height = 24

  // 2. Report Title (Row 2)
  ws.mergeCells("A2:J2")
  const r2 = ws.getCell("A2")
  r2.value = "WELL FLOWRATE MONITORING REPORT"
  r2.font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND_SKY } }
  r2.alignment = { vertical: "middle" }
  ws.getRow(2).height = 20

  // 3. Metadata Subtitle (Row 3)
  ws.mergeCells("A3:J3")
  const r3 = ws.getCell("A3")
  const nowStr = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  r3.value = `Filter Period: ${periodLabel}   •   Generated On: ${nowStr}   •   Total Records: ${records.length}   •   Scope: Internal Production & Utilities Record`
  r3.font = { name: "Calibri", size: 9, italic: true, color: { argb: MUTED } }
  r3.alignment = { vertical: "middle" }
  ws.getRow(3).height = 18

  // Row 4: Spacer
  ws.getRow(4).height = 8

  // 4. Table Header (Row 5)
  const headers = [
    "No.",
    "Date & Time",
    "PIC Name",
    "Well 2",
    "Well 3",
    "Well 4",
    "Well 7",
    "Well 8",
    "Well 12",
    "Remarks / Notes",
  ]

  const headerRow = ws.getRow(5)
  headerRow.height = 26
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = h
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: WHITE } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_DARK },
    }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = allBorders
  })

  // 5. Data Rows
  let currentRow = 6
  records.forEach((record, index) => {
    const row = ws.getRow(currentRow)
    row.height = 20

    const isZebra = index % 2 === 1
    const bgFill: ExcelJS.Fill = isZebra
      ? { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_BG } }
      : { type: "pattern", pattern: "solid", fgColor: { argb: WHITE } }

    const formattedDate = new Date(record.dateTime).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    row.getCell(1).value = index + 1
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(2).value = formattedDate
    row.getCell(2).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(3).value = record.picName
    row.getCell(3).alignment = { vertical: "middle", horizontal: "left" }

    row.getCell(4).value = record.well2 || "-"
    row.getCell(4).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(5).value = record.well3 || "-"
    row.getCell(5).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(6).value = record.well4 || "-"
    row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(7).value = record.well7 || "-"
    row.getCell(7).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(8).value = record.well8 || "-"
    row.getCell(8).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(9).value = record.well12 || "-"
    row.getCell(9).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(10).value = record.remarks || "-"
    row.getCell(10).alignment = { vertical: "middle", horizontal: "left" }

    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.border = allBorders
      cell.fill = bgFill
    }

    currentRow++
  })

  // Auto-fit column widths
  const baseWidths = [7, 22, 22, 16, 16, 16, 16, 16, 16, 35]
  baseWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w
  })

  ws.autoFilter = `A5:J5`

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Well_Flowrate_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

import ExcelJS from "exceljs"
import type { WaterQualityROPdfRecord } from "@/lib/pdf/generateWaterQualityROPdf"

const BRAND_DARK = "FF0F172A" // Slate 900
const BRAND_TEAL = "FF0F766E" // Teal 700
const BRAND_TEAL_LIGHT = "FFF0FDFA" // Teal 50
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

const totalBorders: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BRAND_DARK } },
  bottom: { style: "double", color: { argb: BRAND_DARK } },
  left: thinBorder,
  right: thinBorder,
}

export async function exportWaterQualityROToExcel(
  records: WaterQualityROPdfRecord[],
  periodLabel: string = "All Time"
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Bubbles O2 AIO System"
  wb.created = new Date()

  const ws = wb.addWorksheet("Water Quality RO", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // 1. Company Banner (Row 1)
  ws.mergeCells("A1:N1")
  const r1 = ws.getCell("A1")
  r1.value = "BUBBLES O2 SDN. BHD."
  r1.font = { name: "Calibri", size: 14, bold: true, color: { argb: BRAND_DARK } }
  r1.alignment = { vertical: "middle" }
  ws.getRow(1).height = 24

  // 2. Report Title (Row 2)
  ws.mergeCells("A2:N2")
  const r2 = ws.getCell("A2")
  r2.value = "WATER QUALITY TESTING REPORT — REVERSE OSMOSIS (RO) SYSTEM"
  r2.font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND_TEAL } }
  r2.alignment = { vertical: "middle" }
  ws.getRow(2).height = 20

  // 3. Metadata Subtitle (Row 3)
  ws.mergeCells("A3:N3")
  const r3 = ws.getCell("A3")
  const nowStr = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  r3.value = `Filter Period: ${periodLabel}   •   Generated On: ${nowStr}   •   Total Records: ${records.length}   •   Scope: Internal Production & Utilities Monitoring`
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
    "pH",
    "Turbidity",
    "Colour",
    "Smell / Odour",
    "Cond. Before (μS/cm)",
    "Cond. After (μS/cm)",
    "Cond. Performance (%)",
    "UV Intensity",
    "UV Operating Hours",
    "UV Running Days",
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
      fgColor: { argb: BRAND_TEAL },
    }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = allBorders
  })

  // 5. Data Rows (Starting at Row 6)
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

    // Cell values
    row.getCell(1).value = index + 1
    row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(2).value = formattedDate
    row.getCell(2).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(3).value = record.picName
    row.getCell(3).alignment = { vertical: "middle", horizontal: "left" }

    row.getCell(4).value = record.ph
    row.getCell(4).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(5).value = record.turbidity
    row.getCell(5).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(6).value = record.colour
    row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(7).value = record.smell
    row.getCell(7).alignment = { vertical: "middle", horizontal: "center" }

    // Numbers for Conductivity
    if (record.condBefore !== null && record.condBefore !== undefined) {
      row.getCell(8).value = record.condBefore
      row.getCell(8).numFmt = "#,##0.00"
    } else {
      row.getCell(8).value = null
    }
    row.getCell(8).alignment = { vertical: "middle", horizontal: "right" }

    if (record.condAfter !== null && record.condAfter !== undefined) {
      row.getCell(9).value = record.condAfter
      row.getCell(9).numFmt = "#,##0.00"
    } else {
      row.getCell(9).value = null
    }
    row.getCell(9).alignment = { vertical: "middle", horizontal: "right" }

    // LIVE EXCEL FORMULA FOR CONDUCTIVITY PERFORMANCE %
    // Formula: =IF(ISNUMBER(H6)*(H6>0), (H6-I6)/H6, "")
    // Formatted as percentage: 0.00%
    const condBeforeCell = `H${currentRow}`
    const condAfterCell = `I${currentRow}`
    const formulaText = `IF(AND(ISNUMBER(${condBeforeCell}), ${condBeforeCell}>0, ISNUMBER(${condAfterCell})), (${condBeforeCell}-${condAfterCell})/${condBeforeCell}, "")`

    const initialResult =
      record.condPerformance !== null && record.condPerformance !== undefined
        ? record.condPerformance / 100
        : undefined

    row.getCell(10).value = {
      formula: formulaText,
      result: initialResult,
    }
    row.getCell(10).numFmt = "0.00%"
    row.getCell(10).font = { bold: true, color: { argb: "FF0F766E" } }
    row.getCell(10).alignment = { vertical: "middle", horizontal: "right" }

    // UV
    row.getCell(11).value = record.uvIntensity || "-"
    row.getCell(11).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(12).value = record.uvOperatingHours || "-"
    row.getCell(12).alignment = { vertical: "middle", horizontal: "center" }

    row.getCell(13).value = record.uvRunningDays || "-"
    row.getCell(13).alignment = { vertical: "middle", horizontal: "center" }

    // Remarks
    row.getCell(14).value = record.remarks || "-"
    row.getCell(14).alignment = { vertical: "middle", horizontal: "left" }

    // Apply styling to all row cells
    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c)
      cell.border = allBorders
      if (c !== 10) {
        cell.fill = bgFill
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_TEAL_LIGHT } }
      }
    }

    currentRow++
  })

  // 6. Summary / Average Row (if records exist)
  if (records.length > 0) {
    const totalRow = ws.getRow(currentRow)
    totalRow.height = 22

    // Merge A to G for "AVERAGE / SUMMARY"
    ws.mergeCells(`A${currentRow}:G${currentRow}`)
    const lbl = totalRow.getCell(1)
    lbl.value = "AVERAGE (AVERAGE REJECTION PERFORMANCE)"
    lbl.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: BRAND_DARK } }
    lbl.alignment = { vertical: "middle", horizontal: "right" }

    // Average Cond Before
    const avgCondBefore = totalRow.getCell(8)
    avgCondBefore.value = {
      formula: `AVERAGE(H6:H${currentRow - 1})`,
    }
    avgCondBefore.numFmt = "#,##0.00"
    avgCondBefore.font = { bold: true }
    avgCondBefore.alignment = { vertical: "middle", horizontal: "right" }

    // Average Cond After
    const avgCondAfter = totalRow.getCell(9)
    avgCondAfter.value = {
      formula: `AVERAGE(I6:I${currentRow - 1})`,
    }
    avgCondAfter.numFmt = "#,##0.00"
    avgCondAfter.font = { bold: true }
    avgCondAfter.alignment = { vertical: "middle", horizontal: "right" }

    // Overall Average Performance
    const avgPerf = totalRow.getCell(10)
    avgPerf.value = {
      formula: `IF(H${currentRow}>0, (H${currentRow}-I${currentRow})/H${currentRow}, "")`,
    }
    avgPerf.numFmt = "0.00%"
    avgPerf.font = { bold: true, color: { argb: "FF0F766E" } }
    avgPerf.alignment = { vertical: "middle", horizontal: "right" }

    // Blank out remaining summary cells
    totalRow.getCell(11).value = ""
    totalRow.getCell(12).value = ""
    totalRow.getCell(13).value = ""
    totalRow.getCell(14).value = ""

    for (let c = 1; c <= 14; c++) {
      const cell = totalRow.getCell(c)
      cell.border = totalBorders
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }
    }
  }

  // 7. Auto-fit column widths with protective padding
  const baseWidths = [
    7,  // No.
    22, // Date & Time
    22, // PIC Name
    12, // pH
    12, // Turbidity
    14, // Colour
    14, // Smell
    22, // Cond. Before
    22, // Cond. After
    24, // Cond. Performance %
    16, // UV Intensity
    20, // UV Operating Hours
    18, // UV Running Days
    32, // Remarks
  ]

  baseWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w
  })

  // 8. Enable Excel Native Auto-Filter on Table Headers
  ws.autoFilter = `A5:N5`

  // 9. Write buffer and trigger instant browser download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `Water_Quality_RO_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

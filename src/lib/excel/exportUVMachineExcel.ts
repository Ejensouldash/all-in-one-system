import ExcelJS from "exceljs"
import type { UVMachinePdfRecord } from "@/lib/pdf/generateUVMachinePdf"

const BRAND_DARK = "FF0F172A" // Slate 900
const BRAND_BLUE = "FF1E3A8A" // Blue 900
const BORDER_COLOR = "FFCBD5E1" // Slate 300
const ZEBRA_BG = "FFF8FAFC" // Slate 50
const WHITE = "FFFFFFFF"

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

export async function exportUVMachineToExcel(
  records: UVMachinePdfRecord[],
  periodLabel: string = "All Time"
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Bubbles O2 AIO System"
  wb.created = new Date()

  const ws = wb.addWorksheet("UV Machine 3 In 1", {
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
  ws.mergeCells("A1:L1")
  const r1 = ws.getCell("A1")
  r1.value = "BUBBLES O2 SDN. BHD. — QUALITY & PRODUCTION ASSURANCE"
  r1.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: WHITE } }
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_DARK } }
  r1.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  ws.getRow(1).height = 26

  // 2. Report Title (Row 2)
  ws.mergeCells("A2:L2")
  const r2 = ws.getCell("A2")
  r2.value = "UV MACHINE 3 IN 1 CHECKLIST REPORT (LINE 1: 800ML & LINE 2: 425ML)"
  r2.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: WHITE } }
  r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_BLUE } }
  r2.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  ws.getRow(2).height = 30

  // 3. Metadata (Row 3)
  ws.mergeCells("A3:L3")
  const r3 = ws.getCell("A3")
  r3.value = `Filter Period: ${periodLabel.toUpperCase()}  |  Total Records: ${records.length}  |  Generated: ${new Date().toLocaleString("en-GB")}`
  r3.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF475569" } }
  r3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
  r3.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  ws.getRow(3).height = 20

  // Row 4: Empty spacer
  ws.getRow(4).height = 6

  // 4. Header Row (Row 5)
  const headers = [
    "Date",
    "Line 1 Intensity",
    "Line 1 Op. Hours",
    "Line 1 Run Days",
    "Line 1 Time",
    "Line 1 PIC",
    "Line 1 Remarks",
    "Line 2 Status",
    "Line 2 Time",
    "Line 2 PIC",
    "Line 2 Remarks",
    "Supervisor Verification",
  ]

  const headerRow = ws.getRow(5)
  headerRow.height = 26
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = h
    cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: WHITE } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_BLUE } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = allBorders
  })

  // 5. Data Rows
  records.forEach((rec, idx) => {
    const rowIdx = 6 + idx
    const row = ws.getRow(rowIdx)
    row.height = 22

    const d = rec.date ? new Date(rec.date).toLocaleDateString("en-GB") : "-"

    const values = [
      d,
      rec.line1Intensity || "-",
      rec.line1OperatingHours || "-",
      rec.line1RunningDays || "-",
      rec.line1Time || "-",
      rec.line1Pic || "-",
      rec.line1Remarks || "-",
      rec.line2MachineStatus || "-",
      rec.line2Time || "-",
      rec.line2Pic || "-",
      rec.line2Remarks || "-",
      rec.verifiedBy ? `${rec.verifiedBy} (Verified)` : "Pending",
    ]

    const isEven = idx % 2 === 0
    const rowBg = isEven ? WHITE : ZEBRA_BG

    values.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1)
      cell.value = v
      cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1E293B" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }
      cell.alignment = { vertical: "middle", horizontal: cIdx === 0 ? "center" : "left" }
      cell.border = allBorders

      // Color coding for Line 2 Status
      if (cIdx === 7) {
        if (v === "Red Light") {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFBE123C" } }
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } }
        } else if (v === "Green Light") {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F766E" } }
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }
        }
      }

      // Color coding for Supervisor Verification
      if (cIdx === 11) {
        if (v.includes("Verified")) {
          cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F766E" } }
        } else {
          cell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF94A3B8" } }
        }
      }
    })
  })

  // Auto-fit Column Widths
  const colWidths = [14, 18, 18, 18, 14, 18, 24, 18, 14, 18, 24, 22]
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w
  })

  // Download browser trigger
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_")
  a.download = `BubblesO2_UV_Machine_${cleanPeriod}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

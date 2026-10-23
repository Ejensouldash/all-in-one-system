import ExcelJS from "exceljs"

export interface MarketingStockMovementRecord {
  id: string
  itemId: string
  variantId?: string | null
  variantName?: string | null
  type: string
  quantity: number
  totalPrice?: number | null
  pricePerUnit?: number | null
  department?: string | null
  handledBy: string
  remarks?: string | null
  createdAt: string | Date
  item?: {
    id?: string
    name: string
    brand?: string | null
    category?: string | null
    location: string
    unit: string
    pricePerUnit?: number | null
  } | null
  variant?: {
    id: string
    variantName: string
    sku?: string | null
  } | null
}

const BRAND_DARK = "FF0F172A" // Slate 900
const BRAND_BLUE = "FF1D4ED8" // Blue 700
const BORDER_COLOR = "FFCBD5E1" // Slate 300
const ZEBRA_BG = "FFF8FAFC" // Slate 50
const GREEN_BG = "FFECFDF5" // Emerald 50
const GREEN_TEXT = "FF065F46" // Emerald 800
const RED_BG = "FFFEF2F2" // Red 50
const RED_TEXT = "FF991B1B" // Red 800
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

export async function exportMarketingStockMovementExcel(
  records: MarketingStockMovementRecord[],
  filters?: {
    startDate?: string
    endDate?: string
    type?: string
    searchTerm?: string
  }
): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Bubbles O2 AIO System"
  wb.created = new Date()

  const ws = wb.addWorksheet("Stock Movement", {
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
  r1.value = "BUBBLES O2 SDN. BHD. (Co. No. 201601013208 / 1184139-H)"
  r1.font = { name: "Calibri", size: 13, bold: true, color: { argb: BRAND_DARK } }
  r1.alignment = { vertical: "middle" }
  ws.getRow(1).height = 24

  // 2. Report Title (Row 2)
  ws.mergeCells("A2:N2")
  const r2 = ws.getCell("A2")
  r2.value = "MARKETING MERCHANDISE STOCK MOVEMENT REPORT"
  r2.font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND_BLUE } }
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
  
  const periodLabel = filters?.startDate || filters?.endDate
    ? `${filters.startDate ? new Date(filters.startDate).toLocaleDateString("en-GB") : "Beginning"} to ${filters.endDate ? new Date(filters.endDate).toLocaleDateString("en-GB") : "Today"}`
    : "All Time"

  const typeFilterLabel = filters?.type && filters.type !== "ALL" ? filters.type : "All Movements"
  r3.value = `Period: ${periodLabel}   •   Movement Filter: ${typeFilterLabel}   •   Generated On: ${nowStr}   •   Total Records: ${records.length}`
  r3.font = { name: "Calibri", size: 9, italic: true, color: { argb: MUTED } }
  r3.alignment = { vertical: "middle" }
  ws.getRow(3).height = 18

  // Row 4: Spacer
  ws.getRow(4).height = 8

  // 4. Table Header (Row 5)
  const headers = [
    "No.",
    "Date & Time",
    "Type",
    "Item Name",
    "Variant / Spec",
    "Category",
    "Location",
    "Movement Qty",
    "Unit",
    "Unit Price (RM)",
    "Total Value (RM)",
    "Department",
    "Handled By",
    "Remarks / Purpose",
  ]

  const headerRow = ws.getRow(5)
  headerRow.values = headers
  headerRow.height = 24

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_DARK },
    }
    cell.font = {
      name: "Calibri",
      size: 9.5,
      bold: true,
      color: { argb: "FFFFFFFF" },
    }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = allBorders
  })

  // Set specific header alignments
  headerRow.getCell(4).alignment = { vertical: "middle", horizontal: "left" }
  headerRow.getCell(5).alignment = { vertical: "middle", horizontal: "left" }
  headerRow.getCell(14).alignment = { vertical: "middle", horizontal: "left" }

  // 5. Data Rows
  let totalQtyIn = 0
  let totalQtyOut = 0
  let totalValIn = 0
  let totalValOut = 0

  records.forEach((rec, idx) => {
    const rowIdx = idx + 6
    const row = ws.getRow(rowIdx)
    row.height = 20

    const isEven = idx % 2 === 1
    const rowBg = isEven ? ZEBRA_BG : "FFFFFFFF"

    const formattedDate = rec.createdAt ? new Date(rec.createdAt).toLocaleString("en-GB") : "-"
    const itemName = rec.item?.name || "Unknown Item"
    const variantSpec = rec.variantName || rec.variant?.variantName || "-"
    const category = rec.item?.category || "MERCHANDISE"
    const location = rec.item?.location || "HQ Store"
    const unit = rec.item?.unit || "pcs"
    const unitPrice = typeof rec.pricePerUnit === "number" ? rec.pricePerUnit : (rec.item?.pricePerUnit ?? 0)
    const lineTotal = typeof rec.totalPrice === "number" ? rec.totalPrice : (rec.quantity * unitPrice)

    if (rec.type === "IN") {
      totalQtyIn += Number(rec.quantity) || 0
      totalValIn += Number(lineTotal) || 0
    } else {
      totalQtyOut += Number(rec.quantity) || 0
      totalValOut += Number(lineTotal) || 0
    }

    row.values = [
      idx + 1,
      formattedDate,
      rec.type,
      itemName,
      variantSpec,
      category,
      location,
      rec.quantity,
      unit,
      unitPrice,
      lineTotal,
      rec.department || "MARKETING",
      rec.handledBy || "-",
      rec.remarks || "-",
    ]

    // Default style each cell
    row.eachCell((cell, colNum) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg },
      }
      cell.font = { name: "Calibri", size: 9, color: { argb: BRAND_DARK } }
      cell.border = allBorders
      cell.alignment = { vertical: "middle" }

      // Alignments & formats per column
      if (colNum === 1) cell.alignment = { vertical: "middle", horizontal: "center" }
      if (colNum === 2) cell.alignment = { vertical: "middle", horizontal: "center" }
      if (colNum === 3) {
        cell.alignment = { vertical: "middle", horizontal: "center" }
        if (rec.type === "IN") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN_BG } }
          cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: GREEN_TEXT } }
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED_BG } }
          cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: RED_TEXT } }
        }
      }
      if (colNum === 6 || colNum === 7 || colNum === 9) {
        cell.alignment = { vertical: "middle", horizontal: "center" }
      }
      if (colNum === 8) {
        cell.alignment = { vertical: "middle", horizontal: "right" }
        cell.numFmt = "#,##0"
        cell.font = { name: "Calibri", size: 9, bold: true }
      }
      if (colNum === 10 || colNum === 11) {
        cell.alignment = { vertical: "middle", horizontal: "right" }
        cell.numFmt = '"RM " #,##0.00'
      }
    })
  })

  // 6. Summary Rows
  const summaryStartRow = records.length + 6
  
  // Row for Inward Total
  const inRow = ws.getRow(summaryStartRow)
  inRow.height = 20
  inRow.values = [
    "", "", "", "TOTAL STOCK IN (INWARD)", "", "", "",
    totalQtyIn,
    "", "",
    totalValIn,
    "", "", ""
  ]
  inRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: GREEN_TEXT } }
    cell.border = allBorders
  })
  inRow.getCell(8).numFmt = "#,##0"
  inRow.getCell(8).alignment = { vertical: "middle", horizontal: "right" }
  inRow.getCell(11).numFmt = '"RM " #,##0.00'
  inRow.getCell(11).alignment = { vertical: "middle", horizontal: "right" }

  // Row for Outward Total
  const outRow = ws.getRow(summaryStartRow + 1)
  outRow.height = 20
  outRow.values = [
    "", "", "", "TOTAL STOCK OUT (DISPATCHED)", "", "", "",
    totalQtyOut,
    "", "",
    totalValOut,
    "", "", ""
  ]
  outRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: RED_TEXT } }
    cell.border = allBorders
  })
  outRow.getCell(8).numFmt = "#,##0"
  outRow.getCell(8).alignment = { vertical: "middle", horizontal: "right" }
  outRow.getCell(11).numFmt = '"RM " #,##0.00'
  outRow.getCell(11).alignment = { vertical: "middle", horizontal: "right" }

  // Grand Total Row
  const totalRow = ws.getRow(summaryStartRow + 2)
  totalRow.height = 22
  totalRow.values = [
    "", "", "", "NET MOVEMENT (IN − OUT)", "", "", "",
    totalQtyIn - totalQtyOut,
    "", "",
    totalValIn - totalValOut,
    "", "", ""
  ]
  totalRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" }, // slate 100
    }
    cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: BRAND_DARK } }
    cell.border = totalBorders
  })
  totalRow.getCell(8).numFmt = "+#,##0;-#,##0;0"
  totalRow.getCell(8).alignment = { vertical: "middle", horizontal: "right" }
  totalRow.getCell(11).numFmt = '"RM " #,##0.00'
  totalRow.getCell(11).alignment = { vertical: "middle", horizontal: "right" }

  // 7. Column Widths
  const columnWidths = [
    6,  // No.
    19, // Date & Time
    10, // Type
    26, // Item Name
    18, // Variant
    14, // Category
    14, // Location
    14, // Movement Qty
    8,  // Unit
    15, // Unit Price (RM)
    16, // Total Value (RM)
    18, // Department
    16, // Handled By
    32, // Remarks / Purpose
  ]

  columnWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w
  })

  // 8. AutoFilter
  ws.autoFilter = `A5:N${records.length + 5}`

  // 9. Download buffer
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const dateTag = new Date().toISOString().slice(0, 10)
  a.download = `Marketing_Merchandise_Stock_Movement_Report_${dateTag}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

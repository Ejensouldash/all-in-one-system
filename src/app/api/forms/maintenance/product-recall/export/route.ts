import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getAccessInfo } from "@/lib/access"

export const runtime = "nodejs"
export const maxDuration = 60

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export async function GET(request: Request) {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get("month") || "", 10)
    const year = parseInt(searchParams.get("year") || "", 10)
    const search = searchParams.get("search")?.trim() || ""

    const whereClause: Prisma.ProductRecallWhereInput = {}

    // Month & Year filtering in Asia/Kuala_Lumpur (UTC+8)
    if (year && month) {
      const startOfMonthMyt = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0, 0))
      const lastDay = new Date(year, month, 0).getDate()
      const endOfMonthMyt = new Date(Date.UTC(year, month - 1, lastDay, 15, 59, 59, 999))

      whereClause.recallDate = {
        gte: startOfMonthMyt,
        lte: endOfMonthMyt,
      }
    } else if (year) {
      const startOfYear = new Date(Date.UTC(year, 0, 1, -8, 0, 0, 0))
      const endOfYear = new Date(Date.UTC(year, 11, 31, 15, 59, 59, 999))
      whereClause.recallDate = {
        gte: startOfYear,
        lte: endOfYear,
      }
    }

    // Text search
    if (search) {
      whereClause.OR = [
        { recallNo: { contains: search, mode: "insensitive" } },
        { reason: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        { preparedByName: { contains: search, mode: "insensitive" } },
        {
          items: {
            some: {
              OR: [
                { customer: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { batchNumber: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      ]
    }

    const records = await prisma.productRecall.findMany({
      where: whereClause,
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: {
        recallDate: "asc",
      },
    })

    // Data Clean Up & Flattening
    const rows: {
      date: string
      recallNo: string
      customer: string
      sku: string
      batchNumber: string
      quantity: number
      reason: string
      remarks: string
      preparedBy: string
    }[] = []

    records.forEach((recall) => {
      const d = new Date(recall.recallDate)
      const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      const cleanRecallNo = recall.recallNo?.trim() || `PR-${recall.id.slice(0, 8).toUpperCase()}`
      const cleanReason = recall.reason?.trim() || "-"
      const cleanPreparedBy = recall.preparedByName?.trim() || "-"

      recall.items.forEach((item) => {
        rows.push({
          date: dateStr,
          recallNo: cleanRecallNo,
          customer: item.customer.trim().toUpperCase(),
          sku: item.sku.trim(),
          batchNumber: item.batchNumber.trim().toUpperCase(),
          quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
          reason: cleanReason,
          remarks: item.remarks?.trim() || recall.remarks?.trim() || "-",
          preparedBy: cleanPreparedBy,
        })
      })
    })

    // Build Formatted Excel Workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Bubbles O2 All-in-One System"
    workbook.lastModifiedBy = access.name || "QC Inspector"
    workbook.created = new Date()

    const ws = workbook.addWorksheet("Product Recall", {
      views: [{ showGridLines: true }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    })

    const periodText = month && year ? `${MONTH_NAMES[month - 1]} ${year}` : `${year || "All Time"}`

    // Title Block
    ws.mergeCells("A1:J1")
    const titleCell = ws.getCell("A1")
    titleCell.value = "BUBBLESO2 SDN BHD"
    titleCell.font = { bold: true, size: 14, color: { argb: "FF0F172A" } }
    titleCell.alignment = { vertical: "middle" }
    ws.getRow(1).height = 24

    ws.mergeCells("A2:J2")
    const subCell = ws.getCell("A2")
    subCell.value = `PRODUCT RECALL RECORD (SGMP/22/PR) — ${periodText.toUpperCase()}`
    subCell.font = { bold: true, size: 11, color: { argb: "FF334155" } }
    subCell.alignment = { vertical: "middle" }
    ws.getRow(2).height = 18

    ws.mergeCells("A3:J3")
    const metaCell = ws.getCell("A3")
    metaCell.value = `Exported: ${new Date().toLocaleString("en-GB")}   •   By: ${access.name || "QC Inspector"}   •   Total Line Items: ${rows.length}`
    metaCell.font = { italic: true, size: 9, color: { argb: "FF64748B" } }
    metaCell.alignment = { vertical: "middle" }
    ws.getRow(3).height = 16

    ws.getRow(4).height = 8 // Blank spacing row

    // Table Header (Row 5)
    const headerRow = ws.getRow(5)
    headerRow.height = 24
    const headers = [
      "NO",
      "DATE",
      "REFERENCE NO",
      "CUSTOMER",
      "SKU",
      "BATCH NUMBER",
      "QUANTITY (UNITS)",
      "REASON FOR RECALL",
      "REMARKS",
      "PREPARED BY",
    ]

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    }

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    }

    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = h
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } } // Slate-800
      cell.alignment = {
        vertical: "middle",
        horizontal: idx === 6 ? "right" : (idx === 3 || idx === 7 || idx === 8) ? "left" : "center",
      }
      cell.border = headerBorder
    })

    // Populate Data Rows
    let totalQuantity = 0
    rows.forEach((r, idx) => {
      const rowNum = 6 + idx
      const row = ws.getRow(rowNum)
      row.height = 20
      totalQuantity += r.quantity

      const isZebra = idx % 2 === 1
      const bgColor = isZebra ? "FFF8FAFC" : "FFFFFFFF"

      const rowValues = [
        idx + 1,
        r.date,
        r.recallNo,
        r.customer,
        r.sku,
        r.batchNumber,
        r.quantity,
        r.reason,
        r.remarks,
        r.preparedBy,
      ]

      rowValues.forEach((val, cIdx) => {
        const cell = row.getCell(cIdx + 1)
        cell.value = val
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } }
        cell.border = thinBorder

        if (cIdx === 0) {
          cell.alignment = { vertical: "middle", horizontal: "center" }
          cell.font = { size: 9, color: { argb: "FF64748B" } }
        } else if (cIdx === 1 || cIdx === 2 || cIdx === 4) {
          cell.alignment = { vertical: "middle", horizontal: "center" }
          cell.font = { size: 9.5 }
        } else if (cIdx === 3) {
          cell.alignment = { vertical: "middle", horizontal: "left" }
          cell.font = { bold: true, size: 9.5, color: { argb: "FF0F172A" } }
        } else if (cIdx === 5) {
          cell.alignment = { vertical: "middle", horizontal: "center" }
          cell.font = { bold: true, size: 9.5, color: { argb: "FF991B1B" } } // Dark red for batch
        } else if (cIdx === 6) {
          cell.alignment = { vertical: "middle", horizontal: "right" }
          cell.numFmt = "#,##0"
          cell.font = { bold: true, size: 9.5, color: { argb: "FF0F172A" } }
        } else {
          cell.alignment = { vertical: "middle", horizontal: "left" }
          cell.font = { size: 9 }
        }
      })
    })

    // Totals Row
    const totalsRowNum = 6 + rows.length
    const totalsRow = ws.getRow(totalsRowNum)
    totalsRow.height = 22

    ws.mergeCells(`A${totalsRowNum}:F${totalsRowNum}`)
    const totalLabelCell = totalsRow.getCell("A")
    totalLabelCell.value = "TOTAL RECALLED UNITS:"
    totalLabelCell.font = { bold: true, size: 10, color: { argb: "FF0F172A" } }
    totalLabelCell.alignment = { vertical: "middle", horizontal: "right" }

    const totalQtyCell = totalsRow.getCell("G")
    if (rows.length > 0) {
      totalQtyCell.value = { formula: `SUM(G6:G${totalsRowNum - 1})`, result: totalQuantity }
    } else {
      totalQtyCell.value = 0
    }
    totalQtyCell.font = { bold: true, size: 11, color: { argb: "FF991B1B" } }
    totalQtyCell.numFmt = "#,##0"
    totalQtyCell.alignment = { vertical: "middle", horizontal: "right" }

    // Apply border to total row
    for (let c = 1; c <= 10; c++) {
      const cell = totalsRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
      cell.border = {
        top: { style: "medium", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      }
    }

    // Set Column Widths (Auto-fitted with padding)
    const baseWidths = [6, 13, 16, 28, 16, 16, 16, 26, 22, 18]
    baseWidths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w
    })

    // Enable Excel Auto-Filter on Header
    ws.autoFilter = `A5:J5`

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `Product_Recall_Report_${month ? MONTH_NAMES[month - 1] : "All"}_${year || ""}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error("Failed to generate Product Recall Excel export:", error)
    return NextResponse.json({ error: error.message || "Failed to generate Excel export." }, { status: 500 })
  }
}

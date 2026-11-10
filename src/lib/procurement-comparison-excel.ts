import ExcelJS from "exceljs"
import { ComparisonSupplier, ComparisonItemGroup } from "@/components/procurement/comparison-constants"

export async function exportPriceComparisonToExcel(comparison: {
  title: string
  referenceNo: string
  company: string
  department: string
  suppliersData: ComparisonSupplier[]
  itemsData: ComparisonItemGroup[]
}) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Price Comparison", {
    views: [{ showGridLines: true }],
  })

  const suppliers: ComparisonSupplier[] = Array.isArray(comparison.suppliersData)
    ? comparison.suppliersData
    : []
  const items: ComparisonItemGroup[] = Array.isArray(comparison.itemsData)
    ? comparison.itemsData
    : []

  if (suppliers.length === 0) {
    throw new Error("No suppliers found in this price comparison to export.")
  }

  // Border styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  }

  // Row 1: Document Title
  const titleRow = sheet.getRow(1)
  titleRow.getCell(1).value = "PRICE COMPARISON SUPPLIER"
  titleRow.getCell(1).font = { bold: true, size: 13, underline: true }

  // Row 2: Metadata (Ref, Company, Department)
  const metaRow = sheet.getRow(2)
  metaRow.getCell(1).value = `Ref: ${comparison.referenceNo || "-"}  |  Company: ${comparison.company || "-"}  |  Dept: ${comparison.department || "-"}  |  Title: ${comparison.title || "-"}`
  metaRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF555555" } }

  // Total columns = 1 (item index) + (suppliers.length * 3)
  const totalCols = 1 + suppliers.length * 3

  // Row 4: Super Header "SUPPLIER"
  const supHeaderRow = sheet.getRow(4)
  sheet.mergeCells(4, 2, 4, totalCols)
  const supHeaderCell = supHeaderRow.getCell(2)
  supHeaderCell.value = "SUPPLIER"
  supHeaderCell.alignment = { horizontal: "center", vertical: "middle" }
  supHeaderCell.font = { bold: true, size: 11 }
  supHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F4F8" },
  }
  for (let c = 2; c <= totalCols; c++) {
    sheet.getCell(4, c).border = thinBorder
  }

  // Row 5: Supplier Names
  const supNameRow = sheet.getRow(5)
  // Col A header
  sheet.getCell(5, 1).value = "NO"
  sheet.getCell(5, 1).font = { bold: true }
  sheet.getCell(5, 1).alignment = { horizontal: "center", vertical: "middle" }
  sheet.getCell(5, 1).border = thinBorder
  sheet.getCell(5, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEBF3FB" },
  }

  suppliers.forEach((sup, idx) => {
    const startCol = 2 + idx * 3
    const endCol = startCol + 2
    sheet.mergeCells(5, startCol, 5, endCol)
    const cell = supNameRow.getCell(startCol)
    cell.value = sup.name.toUpperCase()
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.font = { bold: true, size: 10, color: { argb: "FF0B4F6C" } }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6F0FA" },
    }
    for (let c = startCol; c <= endCol; c++) {
      sheet.getCell(5, c).border = thinBorder
    }
  })

  // Row 6: Sub Headers (DESCRIPTION | UNIT PRICE | TOTAL)
  const subHeaderRow = sheet.getRow(6)
  sheet.getCell(6, 1).value = ""
  sheet.getCell(6, 1).border = thinBorder

  suppliers.forEach((_, idx) => {
    const startCol = 2 + idx * 3
    const colDesc = subHeaderRow.getCell(startCol)
    colDesc.value = "DESCRIPTION"
    colDesc.alignment = { horizontal: "center", vertical: "middle" }
    colDesc.font = { bold: true, size: 9 }
    colDesc.border = thinBorder
    colDesc.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    }

    const colUnit = subHeaderRow.getCell(startCol + 1)
    colUnit.value = "UNIT PRICE"
    colUnit.alignment = { horizontal: "center", vertical: "middle" }
    colUnit.font = { bold: true, size: 9 }
    colUnit.border = thinBorder
    colUnit.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    }

    const colTot = subHeaderRow.getCell(startCol + 2)
    colTot.value = "TOTAL"
    colTot.alignment = { horizontal: "center", vertical: "middle" }
    colTot.font = { bold: true, size: 9 }
    colTot.border = thinBorder
    colTot.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    }
  })

  let currentRowIdx = 7

  // Track grand totals per supplier
  const supplierGrandTotals: Record<string, number> = {}
  suppliers.forEach((s) => {
    supplierGrandTotals[s.id] = 0
  })

  // Iterate Item Bundles & Rows
  items.forEach((itemGroup) => {
    const groupStartRow = currentRowIdx
    const numRows = itemGroup.rows.length > 0 ? itemGroup.rows.length : 1

    itemGroup.rows.forEach((row, rIdx) => {
      const dataRow = sheet.getRow(currentRowIdx)

      // Col A: Item index
      if (rIdx === 0) {
        dataRow.getCell(1).value = itemGroup.itemIndex
        dataRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
        dataRow.getCell(1).font = { bold: true }
      }
      dataRow.getCell(1).border = thinBorder

      suppliers.forEach((sup, sIdx) => {
        const startCol = 2 + sIdx * 3
        const quote = row.quotes?.[sup.id]

        const descCell = dataRow.getCell(startCol)
        const priceCell = dataRow.getCell(startCol + 1)

        descCell.value = quote?.description || ""
        descCell.border = thinBorder
        descCell.alignment = { vertical: "middle", wrapText: true }
        descCell.font = { size: 9 }

        if (quote?.isIncluded) {
          priceCell.value = "INCLUDE"
          priceCell.font = { bold: true, size: 9, color: { argb: "FF000000" } }
          priceCell.alignment = { horizontal: "center", vertical: "middle" }
          // Highlight yellow like Excel
          priceCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFFF00" },
          }
        } else if (quote?.unitPrice !== null && quote?.unitPrice !== undefined) {
          priceCell.value = Number(quote.unitPrice)
          priceCell.numFmt = "#,##0.00"
          priceCell.font = { size: 9 }
          priceCell.alignment = { horizontal: "right", vertical: "middle" }
        } else {
          priceCell.value = ""
        }
        priceCell.border = thinBorder
      })

      currentRowIdx++
    })

    // Merge Item Index Col A if group has multiple rows
    if (numRows > 1) {
      sheet.mergeCells(groupStartRow, 1, currentRowIdx - 1, 1)
    }

    // Now calculate and fill TOTAL cell for each supplier for this item bundle
    suppliers.forEach((sup, sIdx) => {
      const totCol = 2 + sIdx * 3 + 2
      let itemTotal = 0
      let hasQuotes = false

      itemGroup.rows.forEach((r) => {
        const q = r.quotes?.[sup.id]
        if (q && q.unitPrice !== null && q.unitPrice !== undefined) {
          itemTotal += Number(q.unitPrice)
          hasQuotes = true
        } else if (q?.isIncluded) {
          hasQuotes = true
        }
      })

      supplierGrandTotals[sup.id] += itemTotal

      // Merge total cell vertically across the item bundle rows
      if (numRows > 1) {
        sheet.mergeCells(groupStartRow, totCol, currentRowIdx - 1, totCol)
      }

      const totCell = sheet.getCell(groupStartRow, totCol)
      if (hasQuotes && itemTotal > 0) {
        totCell.value = itemTotal
        totCell.numFmt = "#,##0.00"
      } else if (hasQuotes && itemTotal === 0) {
        totCell.value = "INCLUDE"
        totCell.alignment = { horizontal: "center", vertical: "middle" }
      } else {
        totCell.value = ""
      }
      totCell.font = { bold: true, size: 9 }
      totCell.alignment = { horizontal: "right", vertical: "middle" }

      for (let r = groupStartRow; r < currentRowIdx; r++) {
        sheet.getCell(r, totCol).border = thinBorder
      }
    })
  })

  // Grand Total Row
  currentRowIdx++
  const grandTotalRow = sheet.getRow(currentRowIdx)
  grandTotalRow.getCell(1).value = "TOTAL"
  grandTotalRow.getCell(1).font = { bold: true }
  grandTotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
  grandTotalRow.getCell(1).border = thinBorder

  suppliers.forEach((sup, sIdx) => {
    const startCol = 2 + sIdx * 3
    const totCol = startCol + 2
    sheet.mergeCells(currentRowIdx, startCol, currentRowIdx, startCol + 1)
    const labelCell = grandTotalRow.getCell(startCol)
    labelCell.value = "Grand Total:"
    labelCell.font = { bold: true, size: 9 }
    labelCell.alignment = { horizontal: "right", vertical: "middle" }
    labelCell.border = thinBorder

    const gTotCell = grandTotalRow.getCell(totCol)
    gTotCell.value = supplierGrandTotals[sup.id]
    gTotCell.numFmt = "#,##0.00"
    gTotCell.font = { bold: true, size: 10, color: { argb: "FF0B4F6C" } }
    gTotCell.alignment = { horizontal: "right", vertical: "middle" }
    gTotCell.border = thinBorder
    gTotCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0F7FF" },
    }
  })

  // Space before Terms & Conditions
  currentRowIdx += 2

  // Payment Terms Row
  const ptRow = sheet.getRow(currentRowIdx)
  suppliers.forEach((sup, sIdx) => {
    const startCol = 2 + sIdx * 3
    sheet.mergeCells(currentRowIdx, startCol, currentRowIdx, startCol + 2)
    const cell = ptRow.getCell(startCol)
    cell.value = `Payment Terms : ${sup.paymentTerms || "N/A"}`
    cell.font = { size: 9, bold: true }
  })

  // Lead Time / Delivery Row
  currentRowIdx++
  const ltRow = sheet.getRow(currentRowIdx)
  suppliers.forEach((sup, sIdx) => {
    const startCol = 2 + sIdx * 3
    sheet.mergeCells(currentRowIdx, startCol, currentRowIdx, startCol + 2)
    const cell = ltRow.getCell(startCol)
    cell.value = `Lead Time : ${sup.leadTime || "N/A"}`
    cell.font = { size: 9, bold: true }
  })

  // Set column widths
  sheet.getColumn(1).width = 6 // No.
  suppliers.forEach((_, sIdx) => {
    const startCol = 2 + sIdx * 3
    sheet.getColumn(startCol).width = 32 // Description
    sheet.getColumn(startCol + 1).width = 14 // Unit Price
    sheet.getColumn(startCol + 2).width = 14 // Total
  })

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${comparison.referenceNo || "Price_Comparison"}_${comparison.title.replace(/[^a-z0-9]/gi, "_")}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

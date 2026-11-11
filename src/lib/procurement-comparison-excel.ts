import * as XLSX from "xlsx"
import { ComparisonSupplier, ComparisonItemGroup } from "@/components/procurement/comparison-constants"

export interface ExportPriceComparisonParams {
  title: string
  referenceNo: string
  company: string
  department?: string
  suppliersData: ComparisonSupplier[]
  itemsData: ComparisonItemGroup[]
}

export function exportPriceComparisonToExcel(params: {
  title: string
  referenceNo: string
  company: string
  department?: string
  suppliersData: ComparisonSupplier[]
  itemsData: ComparisonItemGroup[]
}) {
  const { title, referenceNo, company, department, suppliersData = [], itemsData = [] } = params

  const rows: any[] = []

  // Metadata block
  rows.push({ "PRICE COMPARISON MATRIX": `Ref: ${referenceNo || "N/A"}` })
  rows.push({ "PRICE COMPARISON MATRIX": `Title: ${title || "Price Comparison"}` })
  rows.push({ "PRICE COMPARISON MATRIX": `Company: ${company || "N/A"} | Department: ${department || "N/A"}` })
  rows.push({ "PRICE COMPARISON MATRIX": `Export Date: ${new Date().toLocaleDateString("en-GB")}` })
  rows.push({}) // empty row

  // Table header construction
  const headerRow: Record<string, any> = {
    "ITEM #": "ITEM #",
    "DESCRIPTION": "ITEM DESCRIPTION",
  }

  suppliersData.forEach((sup, idx) => {
    const colKey = `SUPPLIER_${idx + 1}`
    headerRow[`${colKey}_DESC`] = `${sup.name} (Spec/Desc)`
    headerRow[`${colKey}_PRICE`] = `${sup.name} (Unit Price RM)`
  })

  rows.push(headerRow)

  // Item rows
  itemsData.forEach((itemGroup) => {
    const groupNum = itemGroup.itemIndex || 1
    const groupTitle = itemGroup.groupTitle || `Item ${groupNum}`

    itemGroup.rows.forEach((row, rowIdx) => {
      const dataRow: Record<string, any> = {
        "ITEM #": rowIdx === 0 ? groupNum : "",
        "DESCRIPTION": rowIdx === 0 ? groupTitle : "",
      }

      suppliersData.forEach((sup, idx) => {
        const colKey = `SUPPLIER_${idx + 1}`
        const quote = row.quotes?.[sup.id]
        if (quote) {
          dataRow[`${colKey}_DESC`] = quote.description || ""
          dataRow[`${colKey}_PRICE`] = quote.isIncluded
            ? "INCLUDE"
            : quote.unitPrice !== null && quote.unitPrice !== undefined
            ? Number(quote.unitPrice)
            : "-"
        } else {
          dataRow[`${colKey}_DESC`] = ""
          dataRow[`${colKey}_PRICE`] = "-"
        }
      })

      rows.push(dataRow)
    })
  })

  // Terms and Lead Time summary
  rows.push({})
  const termsRow: Record<string, any> = { "ITEM #": "TERMS", "DESCRIPTION": "Payment Terms" }
  const leadRow: Record<string, any> = { "ITEM #": "LEAD TIME", "DESCRIPTION": "Delivery Lead Time" }
  const phoneRow: Record<string, any> = { "ITEM #": "PHONE", "DESCRIPTION": "Phone Number" }

  suppliersData.forEach((sup, idx) => {
    const colKey = `SUPPLIER_${idx + 1}`
    termsRow[`${colKey}_DESC`] = sup.paymentTerms || "30 Days"
    leadRow[`${colKey}_DESC`] = sup.leadTime || "Ex-stock"
    phoneRow[`${colKey}_DESC`] = sup.phone || "-"
  })

  rows.push(termsRow)
  rows.push(leadRow)
  rows.push(phoneRow)

  const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: true })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison Matrix")

  const filename = `${referenceNo || "Price_Comparison"}_${company || "Matrix"}.xlsx`
  XLSX.writeFile(workbook, filename)
}

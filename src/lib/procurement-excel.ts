import * as XLSX from "xlsx"

export function exportProcurementInvoicesToExcel(
  invoices: any[],
  filenamePrefix: string = "Procurement_Invoices",
  filterSummary?: {
    company?: string
    department?: string
    status?: string
    category?: string
    supplier?: string
    dateRange?: string
  }
) {
  let totalAmount = 0

  const rows = invoices.map((inv, index) => {
    const amt = Number(inv.amount) || 0
    totalAmount += amt

    return {
      "NO": index + 1,
      "COMPANY": inv.company || "",
      "DEPARTMENT": inv.department || "",
      "SUPPLIER": inv.supplier?.name || "",
      "TERMS": inv.supplier?.terms ? inv.supplier.terms.replace(/_/g, " ") : "",
      "SUBMIT DATE": inv.submitDate ? new Date(inv.submitDate).toLocaleDateString("en-GB") : "",
      "INVOICE DATE": inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-GB") : "",
      "DUE DATE": inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB") : "CBD / Cash",
      "AMOUNT (RM)": Number(amt.toFixed(2)),
      "INV NO": inv.invoiceNumber || "",
      "PI / PO": inv.poNumber || "",
      "CATEGORY": inv.category ? inv.category.replace(/_/g, " ") : "",
      "STATUS": inv.status || "",
      "DO RECEIVED?": inv.doReceived ? "YES" : "NO",
      "ORIGINAL INVOICE RECEIVED?": inv.originalInvoiceReceived ? "YES" : "NO",
      "PAID DATE": inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-GB") : "",
      "PAYMENT REFERENCE": inv.paymentReference || "",
      "NOTES": inv.notes || "",
    }
  })

  // Append Total Row at the bottom
  if (rows.length > 0) {
    rows.push({
      "NO": "TOTAL" as any,
      "COMPANY": `${rows.length} Invoices` as any,
      "DEPARTMENT": "",
      "SUPPLIER": "",
      "TERMS": "",
      "SUBMIT DATE": "",
      "INVOICE DATE": "",
      "DUE DATE": "",
      "AMOUNT (RM)": Number(totalAmount.toFixed(2)),
      "INV NO": "",
      "PI / PO": "",
      "CATEGORY": "",
      "STATUS": "",
      "DO RECEIVED?": "",
      "ORIGINAL INVOICE RECEIVED?": "",
      "PAID DATE": "",
      "PAYMENT REFERENCE": "",
      "NOTES": "",
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-fit column widths
  const colKeys = Object.keys(rows[0] || {})
  worksheet["!cols"] = colKeys.map((key) => {
    let maxLen = key.length
    for (const r of rows) {
      const val = (r as any)[key]
      if (val !== undefined && val !== null) {
        const len = String(val).length
        if (len > maxLen) maxLen = len
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) }
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Payment_Report")

  // Generate binary Excel buffer and trigger browser download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

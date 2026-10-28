import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { MarketingStockMovementRecord } from "@/lib/excel/exportMarketingStockMovementExcel"

/**
 * Loads an image from a URL or public path and converts it to a base64 Data URL.
 */
async function getBase64Image(url: string): Promise<string | null> {
  if (typeof window === "undefined") return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn("Could not load logo for PDF generation:", e)
    return null
  }
}

export async function generateMarketingStockMovementPdf(
  records: MarketingStockMovementRecord[],
  filters?: {
    startDate?: string
    endDate?: string
    type?: string
    category?: string
    searchTerm?: string
    autoPrint?: boolean
  }
): Promise<void> {
  // A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  const contentWidth = pageWidth - margin * 2 // 277mm

  // 1. Formal Level 4 Header Box (Matching Image 1)
  const headerY = 8
  const headerHeight = 25
  const col1W = 52  // Logo & Co No
  const col2W = 62  // Document Type
  const col3W = 92  // Document Title
  const col4W = contentWidth - col1W - col2W - col3W // 71mm

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)
  // Outer rectangle
  doc.rect(margin, headerY, contentWidth, headerHeight)

  // Vertical dividers
  doc.line(margin + col1W, headerY, margin + col1W, headerY + headerHeight)
  doc.line(margin + col1W + col2W, headerY, margin + col1W + col2W, headerY + 12)
  doc.line(margin + col1W + col2W + col3W, headerY, margin + col1W + col2W + col3W, headerY + headerHeight)

  // Horizontal divider (middle)
  doc.line(margin + col1W, headerY + 12, margin + contentWidth, headerY + 12)

  // Col 1: Logo & Co No
  const logoData = await getBase64Image("/assets/BubblesO2_Logo.png")
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin + 10, headerY + 2, 32, 11)
    } catch {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.setTextColor(15, 23, 42)
      doc.text("BUBBLES O2", margin + 12, headerY + 9)
    }
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text("BUBBLES O2", margin + 12, headerY + 9)
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.5)
  doc.setTextColor(50, 50, 50)
  doc.text("Co. No. 201601013208 (1184139-H)", margin + col1W / 2, headerY + 18, { align: "center" })

  // Col 2: Document Type
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0)
  doc.text("Document Type: Level 4", margin + col1W + col2W / 2, headerY + 5, { align: "center" })
  doc.text("SUPPORTING DOCUMENTATION", margin + col1W + col2W / 2, headerY + 9.5, { align: "center" })

  // Col 3: Document Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("DOCUMENT TITLE:", margin + col1W + col2W + col3W / 2, headerY + 5, { align: "center" })
  doc.text("MARKETING STOCK MOVEMENT REPORT", margin + col1W + col2W + col3W / 2, headerY + 9.5, { align: "center" })

  // Col 4: Document Number
  const currentYear = new Date().getFullYear()
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("Document Number:", margin + col1W + col2W + col3W + col4W / 2, headerY + 5, { align: "center" })
  doc.text(`BOSB-MKT-LOG-${currentYear}`, margin + col1W + col2W + col3W + col4W / 2, headerY + 9.5, { align: "center" })

  // Row 2 Col 2+3: Department
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("HEAD OF MARKETING DEPARTMENT", margin + col1W + (col2W + col3W) / 2, headerY + 17, { align: "center" })
  doc.text("BUBBLES O2 SDN BHD (BOSB)", margin + col1W + (col2W + col3W) / 2, headerY + 21.5, { align: "center" })

  // Row 2 Col 4: Metadata (Page, Category, Date)
  const metaX = margin + col1W + col2W + col3W
  // Dividers inside meta box
  doc.line(metaX, headerY + 16.3, margin + contentWidth, headerY + 16.3)
  doc.line(metaX, headerY + 20.6, margin + contentWidth, headerY + 20.6)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.8)
  doc.text("Page:", metaX + 2, headerY + 15.2)
  doc.text("Category:", metaX + 2, headerY + 19.5)
  doc.text("Date:", metaX + 2, headerY + 23.8)

  doc.setFont("helvetica", "normal")
  doc.text("1 of 1", metaX + 16, headerY + 15.2)
  const catLabel = filters?.category && filters.category !== "ALL" ? filters.category : "All Categories"
  doc.text(catLabel, metaX + 16, headerY + 19.5)
  doc.text(new Date().toLocaleDateString("en-GB"), metaX + 16, headerY + 23.8)

  // 2. Metrics & Filter Summary Ribbon
  const periodLabel = filters?.startDate || filters?.endDate
    ? `${filters.startDate ? new Date(filters.startDate).toLocaleDateString("en-GB") : "Beginning"} to ${filters.endDate ? new Date(filters.endDate).toLocaleDateString("en-GB") : "Today"}`
    : "All Time"

  const typeFilterLabel = filters?.type && filters.type !== "ALL" ? filters.type : "All Types"

  let totalQtyIn = 0
  let totalQtyOut = 0
  let totalCostIn = 0
  let totalCostOut = 0
  let totalSellingIn = 0
  let totalSellingOut = 0

  records.forEach((rec) => {
    const q = Number(rec.quantity) || 0
    const costUnit = typeof rec.costPerUnit === "number" && rec.costPerUnit > 0
      ? rec.costPerUnit
      : (typeof rec.pricePerUnit === "number" && rec.pricePerUnit > 0 ? rec.pricePerUnit : (rec.item?.costPerUnit ?? rec.item?.pricePerUnit ?? 0))
    const costTotal = typeof rec.totalCost === "number" && rec.totalCost > 0
      ? rec.totalCost
      : (typeof rec.totalPrice === "number" && rec.totalPrice > 0 ? rec.totalPrice : (q * costUnit))
    const sellUnit = typeof rec.sellingPricePerUnit === "number" && rec.sellingPricePerUnit > 0
      ? rec.sellingPricePerUnit
      : (rec.item?.sellingPricePerUnit ?? 0)
    const sellTotal = q * sellUnit

    if (rec.type === "IN") {
      totalQtyIn += q
      totalCostIn += costTotal
      totalSellingIn += sellTotal
    } else {
      totalQtyOut += q
      totalCostOut += costTotal
      totalSellingOut += sellTotal
    }
  })

  // Summary Ribbon Box
  const ribbonY = headerY + headerHeight + 3
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(margin, ribbonY, contentWidth, 8, 1, 1, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.setTextColor(15, 23, 42)
  doc.text(`Period: ${periodLabel}`, margin + 3, ribbonY + 5.2)
  doc.text(`Movement: ${typeFilterLabel}`, margin + 55, ribbonY + 5.2)
  doc.text(`Records: ${records.length}`, margin + 95, ribbonY + 5.2)

  doc.setTextColor(16, 120, 60)
  doc.text(`Stock In: +${totalQtyIn.toLocaleString()} (Cost: RM ${totalCostIn.toFixed(2)})`, margin + 125, ribbonY + 5.2)

  doc.setTextColor(185, 28, 28)
  doc.text(`Stock Out: -${totalQtyOut.toLocaleString()} (Retail: RM ${totalSellingOut.toFixed(2)})`, margin + 190, ribbonY + 5.2)

  // 3. Table
  const tableHeaders = [
    [
      "#",
      "Date & Time",
      "Type",
      "Item Name",
      "Variant / Spec",
      "Location",
      "Qty",
      "Unit",
      "Cost/Unit",
      "Total Cost",
      "Selling/Unit",
      "Total Selling",
      "Handled By",
      "Remarks / Purpose",
    ],
  ]

  const tableData = records.map((rec, index) => {
    const formattedDate = rec.createdAt ? new Date(rec.createdAt).toLocaleString("en-GB") : "-"
    const itemName = rec.item?.name || "Unknown Item"
    const variantSpec = rec.variantName || rec.variant?.variantName || "-"
    const location = rec.item?.location || "HQ Store"
    const unit = rec.item?.unit || "pcs"

    const costUnit = typeof rec.costPerUnit === "number" && rec.costPerUnit > 0
      ? rec.costPerUnit
      : (typeof rec.pricePerUnit === "number" && rec.pricePerUnit > 0 ? rec.pricePerUnit : (rec.item?.costPerUnit ?? rec.item?.pricePerUnit ?? 0))
    const costTotal = typeof rec.totalCost === "number" && rec.totalCost > 0
      ? rec.totalCost
      : (typeof rec.totalPrice === "number" && rec.totalPrice > 0 ? rec.totalPrice : (rec.quantity * costUnit))
    const sellUnit = typeof rec.sellingPricePerUnit === "number" && rec.sellingPricePerUnit > 0
      ? rec.sellingPricePerUnit
      : (rec.item?.sellingPricePerUnit ?? 0)
    const sellTotal = rec.quantity * sellUnit

    return [
      String(index + 1),
      formattedDate,
      rec.type,
      itemName,
      variantSpec,
      location,
      rec.type === "IN" ? `+${rec.quantity}` : `-${rec.quantity}`,
      unit,
      costUnit.toFixed(2),
      costTotal.toFixed(2),
      sellUnit.toFixed(2),
      sellTotal.toFixed(2),
      rec.handledBy || "-",
      rec.remarks || "-",
    ]
  })

  autoTable(doc, {
    startY: ribbonY + 10.5,
    margin: { left: margin, right: margin, bottom: 12 },
    head: tableHeaders,
    body: tableData.length > 0 ? tableData : [["-", "-", "-", "No stock movement logs found", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      valign: "middle",
      cellPadding: 1.6,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.5,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 7 },    // #
      1: { halign: "center", cellWidth: 23 },   // Date & Time
      2: { halign: "center", cellWidth: 14, fontStyle: "bold" }, // Type (fits OUT on 1 line)
      3: { cellWidth: 28, fontStyle: "bold" },  // Item Name (adjusted smaller as requested)
      4: { cellWidth: 20 },                     // Variant / Spec
      5: { halign: "center", cellWidth: 15 },   // Location
      6: { halign: "right", cellWidth: 13, fontStyle: "bold" },  // Qty
      7: { halign: "center", cellWidth: 9 },    // Unit
      8: { halign: "right", cellWidth: 15 },    // Cost / Unit
      9: { halign: "right", cellWidth: 17, fontStyle: "bold" },  // Total Cost
      10: { halign: "right", cellWidth: 15 },   // Selling / Unit
      11: { halign: "right", cellWidth: 17, fontStyle: "bold" }, // Total Selling
      12: { cellWidth: 28 },                    // Handled By (adjusted bigger as requested)
      13: { cellWidth: "auto" },                // Remarks / Purpose
    },
    didParseCell: (data) => {
      // Color-code Type and Quantity in body
      if (data.section === "body" && data.column.index === 2) {
        const val = String(data.cell.raw).trim()
        if (val === "IN") {
          data.cell.styles.textColor = [16, 120, 60] // emerald
        } else if (val === "OUT") {
          data.cell.styles.textColor = [185, 28, 28] // red
        }
      }
      if (data.section === "body" && data.column.index === 6) {
        const val = String(data.cell.raw).trim()
        if (val.startsWith("+")) {
          data.cell.styles.textColor = [16, 120, 60]
        } else if (val.startsWith("-")) {
          data.cell.styles.textColor = [185, 28, 28]
        }
      }
    },
    didDrawPage: () => {
      const totalPages = doc.getNumberOfPages()
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

      // Running Footer
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "Bubbles O2 Confidential — Generated via All-In-One Enterprise System",
        margin,
        pageHeight - 4.5
      )
      doc.text(
        `Page ${currentPage} of ${totalPages}`,
        pageWidth - margin - 15,
        pageHeight - 4.5
      )
    },
  })

  if (filters?.autoPrint) {
    doc.autoPrint()
    const blobUrl = doc.output("bloburl")
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.src = typeof blobUrl === "string" ? blobUrl : blobUrl.toString()
    document.body.appendChild(iframe)
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (e) {
          console.error("Iframe print error:", e)
        }
      }, 300)
    }
  } else {
    const dateTag = new Date().toISOString().slice(0, 10)
    doc.save(`Marketing_Merchandise_Stock_Movement_Report_${dateTag}.pdf`)
  }
}

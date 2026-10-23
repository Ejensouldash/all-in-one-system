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
    searchTerm?: string
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
  const margin = 12

  // 1. Load Logo
  const logoData = await getBase64Image("/assets/BubblesO2_Logo.png")
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", margin, 10, 32, 14)
    } catch {
      // Fallback text if addImage fails
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42)
      doc.text("BUBBLES O2", margin, 18)
    }
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text("BUBBLES O2", margin, 18)
  }

  // Company Details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text("BUBBLES O2 MARKETING SDN. BHD.", margin + 36, 14)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text("Co. No. 201601013208 (1184139-H) | Marketing Department", margin + 36, 18.5)
  doc.text("Level 4 Supporting Documentation — Merchandise Stock Movement", margin + 36, 22.5)

  // Document Box (Right side)
  const boxX = pageWidth - margin - 75
  const boxY = 10
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(boxX, boxY, 75, 16, 1.5, 1.5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text("MARKETING STOCK REPORT", boxX + 4, boxY + 5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  const currentYear = new Date().getFullYear()
  doc.text(`Doc Ref: BOSB-MKT-LOG-${currentYear}`, boxX + 4, boxY + 9.5)
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`,
    boxX + 4,
    boxY + 13.5
  )

  // Divider Line
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(margin, 28, pageWidth - margin, 28)

  // 2. Metrics & Filter Summary Ribbon
  const periodLabel = filters?.startDate || filters?.endDate
    ? `${filters.startDate ? new Date(filters.startDate).toLocaleDateString("en-GB") : "Beginning"} to ${filters.endDate ? new Date(filters.endDate).toLocaleDateString("en-GB") : "Today"}`
    : "All Time"

  const typeFilterLabel = filters?.type && filters.type !== "ALL" ? filters.type : "All Types"

  let totalQtyIn = 0
  let totalQtyOut = 0
  let totalValIn = 0
  let totalValOut = 0

  records.forEach((rec) => {
    const q = Number(rec.quantity) || 0
    const price = typeof rec.pricePerUnit === "number" ? rec.pricePerUnit : (rec.item?.pricePerUnit ?? 0)
    const val = typeof rec.totalPrice === "number" ? rec.totalPrice : (q * price)
    if (rec.type === "IN") {
      totalQtyIn += q
      totalValIn += val
    } else {
      totalQtyOut += q
      totalValOut += val
    }
  })

  // Summary Ribbon Box
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(margin, 31, pageWidth - margin * 2, 11, 1.5, 1.5, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text(`Period: ${periodLabel}`, margin + 4, 38)
  doc.text(`Movement Type: ${typeFilterLabel}`, margin + 65, 38)
  doc.text(`Total Records: ${records.length}`, margin + 115, 38)

  doc.setTextColor(16, 120, 60)
  doc.text(`Stock In: +${totalQtyIn.toLocaleString()}`, margin + 155, 38)

  doc.setTextColor(185, 28, 28)
  doc.text(`Stock Out: -${totalQtyOut.toLocaleString()}`, margin + 195, 38)

  doc.setTextColor(30, 58, 138)
  doc.text(`Net Valuation: RM ${(totalValIn - totalValOut).toFixed(2)}`, margin + 235, 38)

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
      "Price (RM)",
      "Total (RM)",
      "Department",
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
    const unitPrice = typeof rec.pricePerUnit === "number" ? rec.pricePerUnit : (rec.item?.pricePerUnit ?? 0)
    const lineTotal = typeof rec.totalPrice === "number" ? rec.totalPrice : (rec.quantity * unitPrice)

    return [
      String(index + 1),
      formattedDate,
      rec.type,
      itemName,
      variantSpec,
      location,
      rec.type === "IN" ? `+${rec.quantity}` : `-${rec.quantity}`,
      unit,
      unitPrice.toFixed(2),
      lineTotal.toFixed(2),
      rec.department || "MARKETING",
      rec.handledBy || "-",
      rec.remarks || "-",
    ]
  })

  autoTable(doc, {
    startY: 45,
    margin: { left: margin, right: margin, bottom: 14 },
    head: tableHeaders,
    body: tableData.length > 0 ? tableData : [["-", "-", "-", "No stock logs recorded for criteria", "-", "-", "-", "-", "-", "-", "-", "-", "-"]],
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },   // #
      1: { halign: "center", cellWidth: 26 },  // Date
      2: { halign: "center", cellWidth: 14, fontStyle: "bold" },  // Type
      3: { cellWidth: 38 },                   // Item Name
      4: { cellWidth: 26 },                   // Variant
      5: { halign: "center", cellWidth: 18 },  // Location
      6: { halign: "right", cellWidth: 14, fontStyle: "bold" }, // Qty
      7: { halign: "center", cellWidth: 12 },  // Unit
      8: { halign: "right", cellWidth: 17 },   // Price
      9: { halign: "right", cellWidth: 19, fontStyle: "bold" },   // Total Value
      10: { cellWidth: 24 },                  // Department
      11: { cellWidth: 22 },                  // Handled By
      12: { cellWidth: "auto" },              // Remarks
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
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "Bubbles O2 Confidential — Generated via All-In-One Enterprise System",
        margin,
        pageHeight - 6
      )
      doc.text(
        `Page ${currentPage} of ${totalPages}`,
        pageWidth - margin - 18,
        pageHeight - 6
      )
    },
  })

  const dateTag = new Date().toISOString().slice(0, 10)
  doc.save(`Marketing_Merchandise_Stock_Movement_Report_${dateTag}.pdf`)
}

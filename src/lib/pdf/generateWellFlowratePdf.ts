import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface WellFlowratePdfRecord {
  id: string
  dateTime: string | Date
  picName: string
  well2: string | null
  well3: string | null
  well4: string | null
  well7: string | null
  well8: string | null
  well12: string | null
  remarks: string | null
  performedSignature?: string | null
  createdAt?: string | Date
}

/**
 * Loads an image from a URL or public path and converts it to a base64 Data URL.
 */
async function getBase64Image(url: string): Promise<string | null> {
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

function formatPdfDateTime(dateVal: string | Date | undefined): string {
  if (!dateVal) return "-"
  try {
    const d = new Date(dateVal)
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return String(dateVal)
  }
}

function formatPdfDateOnly(dateVal: string | Date | undefined): string {
  if (!dateVal) return "-"
  try {
    const d = new Date(dateVal)
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return String(dateVal)
  }
}

/**
 * Generates and downloads a clean vector tabular PDF for multiple Well Flowrate records.
 */
export async function generateWellFlowrateTablePdf(
  records: WellFlowratePdfRecord[],
  periodLabel: string = "All Time"
): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const logoBase64 = await getBase64Image("/assets/BubblesO2_Logo.png")

  const pageWidth = doc.internal.pageSize.getWidth() // 297mm
  const pageHeight = doc.internal.pageSize.getHeight() // 210mm
  const margin = 14

  // Draw Header
  let startHeaderY = 12
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, startHeaderY, 40, 14)
    } catch (e) {
      console.warn("Error drawing logo to PDF:", e)
    }
  }

  // Header Title Text
  const titleX = logoBase64 ? margin + 45 : margin
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("BUBBLES O2 SDN. BHD.", titleX, startHeaderY + 4)

  doc.setFontSize(15)
  doc.setTextColor(2, 132, 199) // sky-600
  doc.text("WELL FLOWRATE MONITORING REPORT", titleX, startHeaderY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(
    "Production & Utilities Division | Water Extraction & Flow Monitoring Record",
    titleX,
    startHeaderY + 15
  )

  // Top-right Metadata Box
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const metaRightX = pageWidth - margin
  doc.text(`Period: ${periodLabel}`, metaRightX, startHeaderY + 4, { align: "right" })
  doc.text(`Generated: ${formatPdfDateTime(new Date())}`, metaRightX, startHeaderY + 9, {
    align: "right",
  })
  doc.text(`Total Records: ${records.length}`, metaRightX, startHeaderY + 14, { align: "right" })

  // Decorative Horizontal Line
  const lineY = startHeaderY + 19
  doc.setDrawColor(2, 132, 199) // sky-600
  doc.setLineWidth(0.7)
  doc.line(margin, lineY, pageWidth - margin, lineY)

  // Construct Table
  const tableHeaders = [
    [
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
    ],
  ]

  const tableData = records.map((record, index) => [
    index + 1,
    formatPdfDateTime(record.dateTime),
    record.picName,
    record.well2 || "-",
    record.well3 || "-",
    record.well4 || "-",
    record.well7 || "-",
    record.well8 || "-",
    record.well12 || "-",
    record.remarks || "-",
  ])

  autoTable(doc, {
    startY: lineY + 6,
    margin: { left: margin, right: margin, bottom: 15 },
    head: tableHeaders,
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
      valign: "middle",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59], // slate-800
      cellPadding: 2.5,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "center", cellWidth: 25 },
      5: { halign: "center", cellWidth: 25 },
      6: { halign: "center", cellWidth: 25 },
      7: { halign: "center", cellWidth: 25 },
      8: { halign: "center", cellWidth: 25 },
      9: { cellWidth: "auto" },
    },
    didDrawPage: (data) => {
      // Footer
      const totalPages = doc.getNumberOfPages()
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184) // slate-400
      doc.text(
        "Bubbles O2 All-In-One System - Well Flowrate Operational Report",
        margin,
        pageHeight - 8
      )
      doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
        align: "right",
      })
    },
  })

  const timestamp = new Date().toISOString().slice(0, 10)
  doc.save(`Well_Flowrate_Report_${timestamp}.pdf`)
}

/**
 * Generates and downloads a single-record verification slip PDF with signature image.
 */
export async function generateWellFlowrateSlipPdf(record: WellFlowratePdfRecord): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const logoBase64 = await getBase64Image("/assets/BubblesO2_Logo.png")

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const margin = 16

  let curY = 16

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, curY, 44, 15)
    } catch (e) {
      console.warn("Error drawing logo to PDF:", e)
    }
  }

  // Header Titles
  const textX = logoBase64 ? margin + 50 : margin
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text("BUBBLES O2 SDN. BHD.", textX, curY + 4)

  doc.setFontSize(14)
  doc.setTextColor(2, 132, 199) // sky-600
  doc.text("WELL FLOWRATE INSPECTION SLIP", textX, curY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text("Internal Operational Monitoring Slip - Production Utilities", textX, curY + 15)

  curY += 24

  // Divider
  doc.setDrawColor(2, 132, 199)
  doc.setLineWidth(0.6)
  doc.line(margin, curY, pageWidth - margin, curY)

  curY += 8

  // Overview Info Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 30, 3, 3, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text("INSPECTION METADATA", margin + 6, curY + 7)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)

  const col1X = margin + 6
  const col2X = margin + 95

  doc.text(`Record ID:`, col1X, curY + 15)
  doc.setFont("helvetica", "bold")
  doc.text(`${record.id}`, col1X + 22, curY + 15)
  doc.setFont("helvetica", "normal")

  doc.text(`Date & Time:`, col1X, curY + 22)
  doc.setFont("helvetica", "bold")
  doc.text(`${formatPdfDateTime(record.dateTime)}`, col1X + 22, curY + 22)
  doc.setFont("helvetica", "normal")

  doc.text(`Officer (PIC):`, col2X, curY + 15)
  doc.setFont("helvetica", "bold")
  doc.text(`${record.picName}`, col2X + 25, curY + 15)
  doc.setFont("helvetica", "normal")

  doc.text(`Submitted On:`, col2X, curY + 22)
  doc.setFont("helvetica", "bold")
  doc.text(`${formatPdfDateTime(record.createdAt || record.dateTime)}`, col2X + 25, curY + 22)

  curY += 38

  // Section: Well Flowrate Readings
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text("WELL FLOWRATE READINGS", margin, curY)

  curY += 4

  const wellGridData = [
    [
      { content: "Well 2", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      { content: record.well2 || "N/A", styles: { halign: "center" as const } },
      { content: "Well 7", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      { content: record.well7 || "N/A", styles: { halign: "center" as const } },
    ],
    [
      { content: "Well 3", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      { content: record.well3 || "N/A", styles: { halign: "center" as const } },
      { content: "Well 8", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      { content: record.well8 || "N/A", styles: { halign: "center" as const } },
    ],
    [
      { content: "Well 4", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      { content: record.well4 || "N/A", styles: { halign: "center" as const } },
      { content: "Well 12", styles: { fontStyle: "bold" as const, halign: "center" as const } },
      { content: record.well12 || "N/A", styles: { halign: "center" as const } },
    ],
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: "Extraction Source", styles: { halign: "center" as const } },
        { content: "Flowrate Reading", styles: { halign: "center" as const } },
        { content: "Extraction Source", styles: { halign: "center" as const } },
        { content: "Flowrate Reading", styles: { halign: "center" as const } },
      ],
    ],
    body: wellGridData,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: [30, 41, 59],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  curY = (doc as any).lastAutoTable.finalY + 10

  // Remarks Box
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text("REMARKS / OPERATIONAL OBSERVATIONS", margin, curY)
  curY += 4

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 20, 2, 2, "FD")

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  const remarksText = record.remarks?.trim() || "No specific remarks or issues noted."
  doc.text(doc.splitTextToSize(remarksText, pageWidth - margin * 2 - 8), margin + 4, curY + 6)

  curY += 28

  // Digital Signature Block
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text("VERIFICATION & DIGITAL CERTIFICATION", margin, curY)
  curY += 4

  const signBoxWidth = 80
  const signBoxHeight = 36
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(margin, curY, signBoxWidth, signBoxHeight, 2, 2, "FD")

  if (record.performedSignature) {
    try {
      doc.addImage(record.performedSignature, "PNG", margin + 5, curY + 3, 70, 22)
    } catch (e) {
      console.warn("Could not render signature on slip:", e)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("[Digital Signature Recorded]", margin + 15, curY + 15)
    }
  } else {
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text("[No Signature Attached]", margin + 15, curY + 15)
  }

  doc.setDrawColor(148, 163, 184)
  doc.line(margin + 5, curY + 26, margin + 75, curY + 26)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.text(`${record.picName}`, margin + 6, curY + 31)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`PIC Officer | Certified Date: ${formatPdfDateOnly(record.dateTime)}`, margin + 6, curY + 35)

  // Document Footer Notice
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    "This document is an authentic operational record generated by Bubbles O2 System.",
    margin,
    285
  )
  doc.text(`Slip Reference: ${record.id}`, pageWidth - margin, 285, { align: "right" })

  doc.save(`Well_Flowrate_Slip_${record.id.slice(0, 8)}.pdf`)
}

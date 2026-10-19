import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface WaterQualityROPdfRecord {
  id: string
  dateTime: string | Date
  picName: string
  ph: string
  turbidity: string
  colour: string
  smell: string
  condBefore: number | null
  condAfter: number | null
  condPerformance: number | null
  uvIntensity: string | null
  uvOperatingHours: string | null
  uvRunningDays: string | null
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
 * Generates and downloads a clean vector tabular PDF for multiple Water Quality RO records.
 */
export async function generateWaterQualityROTablePdf(
  records: WaterQualityROPdfRecord[],
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
  const margin = 12

  // Draw Header
  let startHeaderY = 11
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, startHeaderY, 38, 13)
    } catch (e) {
      console.warn("Error drawing logo to PDF:", e)
    }
  }

  // Header Title Text
  const titleX = logoBase64 ? margin + 43 : margin
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("BUBBLES O2 SDN. BHD.", titleX, startHeaderY + 4)

  doc.setFontSize(14)
  doc.setTextColor(13, 148, 136) // teal-600
  doc.text("WATER QUALITY TESTING REPORT (RO SYSTEM)", titleX, startHeaderY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(
    "Production & Utilities Division | Reverse Osmosis Treated Water Operational Quality Record",
    titleX,
    startHeaderY + 15
  )

  // Top-right Metadata Box
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  const metaRightX = pageWidth - margin
  doc.text(`Period: ${periodLabel}`, metaRightX, startHeaderY + 4, { align: "right" })
  doc.text(`Generated: ${formatPdfDateTime(new Date())}`, metaRightX, startHeaderY + 9, {
    align: "right",
  })
  doc.text(`Total Records: ${records.length}`, metaRightX, startHeaderY + 14, { align: "right" })

  // Decorative Horizontal Line
  const lineY = startHeaderY + 18
  doc.setDrawColor(13, 148, 136) // teal-600
  doc.setLineWidth(0.6)
  doc.line(margin, lineY, pageWidth - margin, lineY)

  // Construct Table
  const tableHeaders = [
    [
      "No.",
      "Date & Time",
      "PIC Name",
      "pH",
      "Turbid",
      "Colour",
      "Smell",
      "Cond. Before",
      "Cond. After",
      "Cond. Perf %",
      "UV Intensity",
      "UV Op. Hrs",
      "UV Days",
      "Remarks",
    ],
  ]

  const tableData = records.map((record, index) => [
    index + 1,
    formatPdfDateTime(record.dateTime),
    record.picName,
    record.ph,
    record.turbidity,
    record.colour,
    record.smell,
    record.condBefore !== null ? `${record.condBefore} μS` : "-",
    record.condAfter !== null ? `${record.condAfter} μS` : "-",
    record.condPerformance !== null ? `${record.condPerformance}%` : "-",
    record.uvIntensity || "-",
    record.uvOperatingHours || "-",
    record.uvRunningDays || "-",
    record.remarks || "-",
  ])

  autoTable(doc, {
    startY: lineY + 5,
    margin: { left: margin, right: margin, bottom: 14 },
    head: tableHeaders,
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { halign: "center", cellWidth: 12 },
      4: { halign: "center", cellWidth: 14 },
      5: { halign: "center", cellWidth: 16 },
      6: { halign: "center", cellWidth: 16 },
      7: { halign: "center", cellWidth: 20 },
      8: { halign: "center", cellWidth: 20 },
      9: { halign: "center", cellWidth: 20, fontStyle: "bold" },
      10: { halign: "center", cellWidth: 20 },
      11: { halign: "center", cellWidth: 18 },
      12: { halign: "center", cellWidth: 16 },
      13: { cellWidth: "auto" },
    },
    didDrawPage: () => {
      const totalPages = doc.getNumberOfPages()
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "Bubbles O2 Production System - Reverse Osmosis Water Quality Report",
        margin,
        pageHeight - 6
      )
      doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
        align: "right",
      })
    },
  })

  const timestamp = new Date().toISOString().slice(0, 10)
  doc.save(`Water_Quality_RO_Report_${timestamp}.pdf`)
}

/**
 * Generates and downloads a single-record verification slip PDF with signature image.
 */
export async function generateWaterQualityROSlipPdf(record: WaterQualityROPdfRecord): Promise<void> {
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

  doc.setFontSize(13.5)
  doc.setTextColor(13, 148, 136) // teal-600
  doc.text("WATER QUALITY TESTING SLIP (RO)", textX, curY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text("Production RO System Treated Water Quality Inspection", textX, curY + 15)

  curY += 24

  // Divider
  doc.setDrawColor(13, 148, 136)
  doc.setLineWidth(0.6)
  doc.line(margin, curY, pageWidth - margin, curY)

  curY += 7

  // Metadata Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 28, 3, 3, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text("RECORD IDENTIFICATION", margin + 6, curY + 6)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)

  const col1X = margin + 6
  const col2X = margin + 95

  doc.text(`Record ID:`, col1X, curY + 14)
  doc.setFont("helvetica", "bold")
  doc.text(`${record.id}`, col1X + 22, curY + 14)
  doc.setFont("helvetica", "normal")

  doc.text(`Test Date & Time:`, col1X, curY + 21)
  doc.setFont("helvetica", "bold")
  doc.text(`${formatPdfDateTime(record.dateTime)}`, col1X + 26, curY + 21)
  doc.setFont("helvetica", "normal")

  doc.text(`Officer (PIC):`, col2X, curY + 14)
  doc.setFont("helvetica", "bold")
  doc.text(`${record.picName}`, col2X + 24, curY + 14)
  doc.setFont("helvetica", "normal")

  doc.text(`Logged On:`, col2X, curY + 21)
  doc.setFont("helvetica", "bold")
  doc.text(`${formatPdfDateTime(record.createdAt || record.dateTime)}`, col2X + 24, curY + 21)

  curY += 34

  // Section 1: Physical Parameters Table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(15, 23, 42)
  doc.text("1. PHYSICAL WATER QUALITY PARAMETERS", margin, curY)

  curY += 3

  const physicalData = [
    [
      { content: "pH Reading", styles: { fontStyle: "bold" as const } },
      { content: record.ph, styles: { halign: "center" as const, fontStyle: "bold" as const } },
      { content: "Turbidity", styles: { fontStyle: "bold" as const } },
      { content: record.turbidity, styles: { halign: "center" as const } },
    ],
    [
      { content: "Colour", styles: { fontStyle: "bold" as const } },
      { content: record.colour, styles: { halign: "center" as const } },
      { content: "Smell / Odour", styles: { fontStyle: "bold" as const } },
      { content: record.smell, styles: { halign: "center" as const } },
    ],
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: physicalData,
    theme: "grid",
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  curY = (doc as any).lastAutoTable.finalY + 8

  // Section 2: Conductivity & Rejection Efficiency
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(15, 23, 42)
  doc.text("2. RO CONDUCTIVITY & MEMBRANE PERFORMANCE", margin, curY)

  curY += 3

  const condData = [
    [
      { content: "Conductivity Before (Feed)", styles: { fontStyle: "bold" as const } },
      {
        content: record.condBefore !== null ? `${record.condBefore} μS/cm` : "N/A",
        styles: { halign: "center" as const },
      },
    ],
    [
      { content: "Conductivity After (Permeate)", styles: { fontStyle: "bold" as const } },
      {
        content: record.condAfter !== null ? `${record.condAfter} μS/cm` : "N/A",
        styles: { halign: "center" as const },
      },
    ],
    [
      {
        content: "Conductivity Performance Efficiency (%)",
        styles: { fontStyle: "bold" as const, fillColor: [240, 253, 250] as [number, number, number] },
      },
      {
        content:
          record.condPerformance !== null
            ? `${record.condPerformance}% (${
                record.condPerformance >= 90 ? "Optimum Rejection" : "Sub-optimal"
              })`
            : "N/A",
        styles: {
          halign: "center" as const,
          fontStyle: "bold" as const,
          fillColor: [240, 253, 250] as [number, number, number],
          textColor: [13, 148, 136] as [number, number, number],
        },
      },
    ],
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: condData,
    theme: "grid",
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
    },
  })

  curY = (doc as any).lastAutoTable.finalY + 8

  // Section 3: UV Sterilizer Status
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10.5)
  doc.setTextColor(15, 23, 42)
  doc.text("3. UV STERILIZATION SYSTEM PARAMETERS", margin, curY)

  curY += 3

  const uvData = [
    [
      { content: "UV Intensity", styles: { fontStyle: "bold" as const } },
      { content: record.uvIntensity || "N/A", styles: { halign: "center" as const } },
      { content: "UV Operating Hours", styles: { fontStyle: "bold" as const } },
      { content: record.uvOperatingHours || "N/A", styles: { halign: "center" as const } },
      { content: "UV Running Days", styles: { fontStyle: "bold" as const } },
      { content: record.uvRunningDays || "N/A", styles: { halign: "center" as const } },
    ],
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: uvData,
    theme: "grid",
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
    },
  })

  curY = (doc as any).lastAutoTable.finalY + 8

  // Section 4: Remarks
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text("REMARKS / OPERATIONAL NOTES", margin, curY)
  curY += 3

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 16, 2, 2, "FD")

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const remarksText = record.remarks?.trim() || "No adverse readings or operational issues observed."
  doc.text(doc.splitTextToSize(remarksText, pageWidth - margin * 2 - 8), margin + 4, curY + 6)

  curY += 22

  // Section 5: Signature & Sign-off
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text("VERIFICATION & SIGN-OFF", margin, curY)
  curY += 3

  const signBoxWidth = 80
  const signBoxHeight = 34
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(margin, curY, signBoxWidth, signBoxHeight, 2, 2, "FD")

  if (record.performedSignature) {
    try {
      doc.addImage(record.performedSignature, "PNG", margin + 5, curY + 2, 70, 21)
    } catch (e) {
      console.warn("Could not render signature on slip:", e)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("[Digital Signature Recorded]", margin + 15, curY + 14)
    }
  } else {
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text("[No Signature Attached]", margin + 15, curY + 14)
  }

  doc.setDrawColor(148, 163, 184)
  doc.line(margin + 5, curY + 24, margin + 75, curY + 24)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(`${record.picName}`, margin + 6, curY + 28)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`PIC Officer | Certified: ${formatPdfDateOnly(record.dateTime)}`, margin + 6, curY + 32)

  // Document Footer
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(
    "This document is an authentic operational inspection record generated by Bubbles O2 System.",
    margin,
    286
  )
  doc.text(`Slip Reference: ${record.id}`, pageWidth - margin, 286, { align: "right" })

  doc.save(`Water_Quality_RO_Slip_${record.id.slice(0, 8)}.pdf`)
}

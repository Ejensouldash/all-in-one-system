import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface UVMachinePdfRecord {
  id: string
  date: string | Date
  // Line 1
  line1Intensity?: string | null
  line1OperatingHours?: string | null
  line1RunningDays?: string | null
  line1Time?: string | null
  line1Pic?: string | null
  line1Signature?: string | null
  line1Remarks?: string | null
  // Line 2
  line2MachineStatus?: string | null
  line2Time?: string | null
  line2Pic?: string | null
  line2Signature?: string | null
  line2Remarks?: string | null
  // Supervisor Verification
  verifiedBy?: string | null
  verifiedSignature?: string | null
  verifiedAt?: string | Date | null
  createdAt?: string | Date
  updatedAt?: string | Date
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

/**
 * Generates and downloads a clean vector tabular PDF for multiple UV Machine 3 In 1 records.
 */
export async function generateUVMachineTablePdf(
  records: UVMachinePdfRecord[],
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
  // BubblesO2_Logo is 3508 x 921 -> aspect ratio ~3.81:1. At height 11mm, width is ~42mm.
  let startHeaderY = 10
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, startHeaderY, 42, 11)
    } catch (e) {
      console.warn("Error drawing logo to PDF:", e)
    }
  }

  const titleX = logoBase64 ? margin + 46 : margin
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text("BUBBLES O2 SDN. BHD.", titleX, startHeaderY + 4)

  doc.setFontSize(11)
  doc.setTextColor(30, 58, 138) // blue-900
  doc.text("UV MACHINE 3 IN 1 CHECKLIST REPORT", titleX, startHeaderY + 9)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(
    `PRODUCTION DEPARTMENT | LINE 1 (800ML) & LINE 2 (425ML) | PERIOD: ${periodLabel.toUpperCase()}`,
    titleX,
    startHeaderY + 13.5
  )

  // Top Accent Line
  doc.setDrawColor(30, 58, 138)
  doc.setLineWidth(0.6)
  doc.line(margin, startHeaderY + 16, pageWidth - margin, startHeaderY + 16)

  // Summary Metrics Banner
  const totalCount = records.length
  const line1CompletedCount = records.filter(
    (r) => (r.line1Intensity || r.line1OperatingHours || r.line1RunningDays) && r.line1Signature
  ).length
  const line2CompletedCount = records.filter((r) => r.line2MachineStatus && r.line2Signature).length
  const redAlertCount = records.filter((r) => r.line2MachineStatus === "Red Light").length
  const verifiedCount = records.filter((r) => r.verifiedBy || r.verifiedSignature).length

  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  const metaText = `Total Entries: ${totalCount}  |  Line 1 Recorded: ${line1CompletedCount}  |  Line 2 Recorded: ${line2CompletedCount}  |  Red Alerts: ${redAlertCount}  |  Supervisor Verified: ${verifiedCount}  |  Exported: ${new Date().toLocaleDateString("en-GB")}`
  doc.text(metaText, margin, startHeaderY + 21)

  // Construct Table Rows
  const tableData = records.map((r) => {
    const hasLine1 = Boolean(
      (r.line1Intensity || r.line1OperatingHours || r.line1RunningDays) &&
      r.line1Signature
    )
    const hasLine2 = Boolean(r.line2MachineStatus && r.line2Signature)

    let completionStatus = "Complete"
    if (hasLine1 && !hasLine2) completionStatus = "Line 1 Only"
    else if (!hasLine1 && hasLine2) completionStatus = "Line 2 Only"
    else if (!hasLine1 && !hasLine2) completionStatus = "Empty"

    const supervisorStatus = r.verifiedBy
      ? `${r.verifiedBy}\n(Verified)`
      : "Pending"

    return [
      formatPdfDateOnly(r.date),
      r.line1Intensity || "-",
      r.line1OperatingHours || "-",
      r.line1RunningDays || "-",
      r.line1Pic ? `${r.line1Pic}\n(${r.line1Time || "-"})` : "-",
      r.line2MachineStatus || "-",
      r.line2Pic ? `${r.line2Pic}\n(${r.line2Time || "-"})` : "-",
      completionStatus,
      supervisorStatus,
    ]
  })

  autoTable(doc, {
    startY: startHeaderY + 24,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: "Date", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: "LINE 1 (800ML) - UV STERILIZER STATUS", colSpan: 4, styles: { halign: "center" } },
        { content: "LINE 2 (425ML) - UV STATUS", colSpan: 2, styles: { halign: "center" } },
        { content: "Overall", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: "Supervisor", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
      ],
      [
        { content: "Intensity", styles: { halign: "center" } },
        { content: "Op. Hours", styles: { halign: "center" } },
        { content: "Run Days", styles: { halign: "center" } },
        { content: "PIC & Time", styles: { halign: "center" } },
        { content: "Status Lamp", styles: { halign: "center" } },
        { content: "PIC & Time", styles: { halign: "center" } },
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138], // blue-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "center",
      cellPadding: 2.2,
      lineWidth: 0.1,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 24, halign: "center" },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 36, halign: "center" },
      5: { cellWidth: 34, halign: "center" },
      6: { cellWidth: 36, halign: "center" },
      7: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      8: { cellWidth: 41, halign: "center" },
    },
    didParseCell: (data) => {
      // Highlight Red Light in Line 2 column
      if (data.section === "body" && data.column.index === 5) {
        const val = String(data.cell.raw)
        if (val.includes("Red Light")) {
          data.cell.styles.textColor = [190, 18, 60] // rose-700
          data.cell.styles.fontStyle = "bold"
        } else if (val.includes("Green Light")) {
          data.cell.styles.textColor = [15, 118, 110] // teal-700
        }
      }
      // Highlight completion status column
      if (data.section === "body" && data.column.index === 7) {
        const val = String(data.cell.raw)
        if (val === "Complete") {
          data.cell.styles.textColor = [16, 122, 63]
        } else if (val.includes("Only")) {
          data.cell.styles.textColor = [180, 83, 9] // amber-700
        }
      }
      // Highlight supervisor verification column
      if (data.section === "body" && data.column.index === 8) {
        const val = String(data.cell.raw)
        if (val.includes("Verified")) {
          data.cell.styles.textColor = [16, 122, 63]
          data.cell.styles.fontStyle = "bold"
        } else {
          data.cell.styles.textColor = [148, 163, 184]
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(str, pageWidth - margin - 20, pageHeight - 6)
      doc.text(
        "CONFIDENTIAL & PROPRIETARY — BUBBLES O2 QUALITY & PRODUCTION ASSURANCE",
        margin,
        pageHeight - 6
      )
    },
  })

  // Download PDF
  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_")
  doc.save(`BubblesO2_UV_Machine_3_in_1_${cleanPeriod}.pdf`)
}

/**
 * Generates and downloads a single-record verification slip PDF with dual operator signatures
 * and supervisor verification sign-off.
 */
export async function generateUVMachineSlipPdf(record: UVMachinePdfRecord): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const logoBase64 = await getBase64Image("/assets/BubblesO2_Logo.png")

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const margin = 16

  let curY = 14

  // Logo: 3508 x 921 -> ~3.81:1 aspect ratio. At height 11mm, width is 42mm.
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, curY, 42, 11)
    } catch (e) {
      console.warn("Error drawing logo to PDF:", e)
    }
  }

  // Header Titles
  const textX = logoBase64 ? margin + 46 : margin
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text("BUBBLES O2 SDN. BHD.", textX, curY + 4)

  doc.setFontSize(13)
  doc.setTextColor(30, 58, 138) // blue-900
  doc.text("UV MACHINE 3 IN 1 INSPECTION SLIP", textX, curY + 10)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text("Production UV Operational Checklist Verification", textX, curY + 15)

  curY += 21

  // Divider
  doc.setDrawColor(30, 58, 138)
  doc.setLineWidth(0.6)
  doc.line(margin, curY, pageWidth - margin, curY)

  curY += 6

  // Metadata Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 24, 3, 3, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text("RECORD IDENTIFICATION", margin + 6, curY + 5.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)

  const col1X = margin + 6
  const col2X = margin + 95

  doc.text(`Record ID:`, col1X, curY + 13)
  doc.setFont("helvetica", "bold")
  doc.text(`${record.id}`, col1X + 22, curY + 13)
  doc.setFont("helvetica", "normal")

  doc.text(`Inspection Date:`, col1X, curY + 19)
  doc.setFont("helvetica", "bold")
  doc.text(`${formatPdfDateOnly(record.date)}`, col1X + 26, curY + 19)
  doc.setFont("helvetica", "normal")

  doc.text(`System Generated:`, col2X, curY + 13)
  doc.setFont("helvetica", "bold")
  doc.text(`${formatPdfDateTime(new Date())}`, col2X + 30, curY + 13)
  doc.setFont("helvetica", "normal")

  curY += 29

  // Section 1: LINE 1 (800ML) - UV STERILIZER OPERATIONAL STATUS
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text("1. LINE 1 (800ML) - UV STERILIZER OPERATIONAL STATUS", margin, curY)

  curY += 3

  const line1Data = [
    [
      { content: "UV Intensity", styles: { fontStyle: "bold" as const } },
      { content: record.line1Intensity || "N/A", styles: { halign: "center" as const } },
      { content: "Inspection Time", styles: { fontStyle: "bold" as const } },
      { content: record.line1Time || "N/A", styles: { halign: "center" as const } },
    ],
    [
      { content: "UV Operating Hour", styles: { fontStyle: "bold" as const } },
      { content: record.line1OperatingHours || "N/A", styles: { halign: "center" as const } },
      { content: "Operator (PIC)", styles: { fontStyle: "bold" as const } },
      { content: record.line1Pic || "N/A", styles: { halign: "center" as const } },
    ],
    [
      { content: "UV Total Running Days", styles: { fontStyle: "bold" as const } },
      { content: record.line1RunningDays || "N/A", styles: { halign: "center" as const } },
      { content: "Operational Remarks", styles: { fontStyle: "bold" as const } },
      { content: record.line1Remarks || "None", styles: { halign: "center" as const } },
    ],
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: line1Data,
    theme: "grid",
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  curY = (doc as any).lastAutoTable.finalY + 7

  // Section 2: LINE 2 (425ML) - UV MACHINE STATUS
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text("2. LINE 2 (425ML) - UV MACHINE STATUS", margin, curY)

  curY += 3

  // Use clean ASCII text without emojis to prevent character corruption and font spacing distortion
  const isRed = record.line2MachineStatus === "Red Light"
  const statusDisplay = record.line2MachineStatus
    ? isRed
      ? "RED LIGHT (Fault / Warning)"
      : "GREEN LIGHT (Normal Operating)"
    : "N/A"

  const line2Data = [
    [
      { content: "Machine Status Lamp", styles: { fontStyle: "bold" as const } },
      {
        content: statusDisplay,
        styles: {
          halign: "center" as const,
          fontStyle: "bold" as const,
          textColor: isRed ? ([190, 18, 60] as [number, number, number]) : ([15, 118, 110] as [number, number, number]),
        },
      },
    ],
    [
      { content: "Inspection Time", styles: { fontStyle: "bold" as const } },
      { content: record.line2Time || "N/A", styles: { halign: "center" as const } },
    ],
    [
      { content: "Operator (PIC)", styles: { fontStyle: "bold" as const } },
      { content: record.line2Pic || "N/A", styles: { halign: "center" as const } },
    ],
    [
      { content: "Operational Remarks", styles: { fontStyle: "bold" as const } },
      { content: record.line2Remarks || "None", styles: { halign: "center" as const } },
    ],
  ]

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: line2Data,
    theme: "grid",
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  curY = (doc as any).lastAutoTable.finalY + 8

  // Section 3: Dual Operator Signatures
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text("3. OPERATOR DIGITAL SIGNATURES", margin, curY)
  curY += 3.5

  const boxWidth = (pageWidth - margin * 2 - 8) / 2
  const boxHeight = 34

  // Line 1 Signature Box
  const leftX = margin
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(leftX, curY, boxWidth, boxHeight, 2, 2, "FD")

  if (record.line1Signature) {
    try {
      doc.addImage(record.line1Signature, "PNG", leftX + 4, curY + 2, boxWidth - 8, 18)
    } catch (e) {
      console.warn("Could not render line 1 signature:", e)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("[Digital Signature Recorded]", leftX + 10, curY + 13)
    }
  } else {
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text("[No Signature Attached]", leftX + 14, curY + 13)
  }

  doc.setDrawColor(148, 163, 184)
  doc.line(leftX + 4, curY + 22, leftX + boxWidth - 4, curY + 22)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(`LINE 1 PIC: ${record.line1Pic || "-"}`, leftX + 5, curY + 26)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Inspection Time: ${record.line1Time || "-"}`, leftX + 5, curY + 30)

  // Line 2 Signature Box
  // Explicitly reset draw color and fill color so it does not inherit textColor
  const rightX = margin + boxWidth + 8
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(rightX, curY, boxWidth, boxHeight, 2, 2, "FD")

  if (record.line2Signature) {
    try {
      doc.addImage(record.line2Signature, "PNG", rightX + 4, curY + 2, boxWidth - 8, 18)
    } catch (e) {
      console.warn("Could not render line 2 signature:", e)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("[Digital Signature Recorded]", rightX + 10, curY + 13)
    }
  } else {
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text("[No Signature Attached]", rightX + 14, curY + 13)
  }

  doc.setDrawColor(148, 163, 184)
  doc.line(rightX + 4, curY + 22, rightX + boxWidth - 4, curY + 22)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(`LINE 2 PIC: ${record.line2Pic || "-"}`, rightX + 5, curY + 26)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Inspection Time: ${record.line2Time || "-"}`, rightX + 5, curY + 30)

  curY += boxHeight + 8

  // Section 4: Supervisor Verification & Sign-off
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text("4. SUPERVISOR VERIFICATION & SIGN-OFF", margin, curY)
  curY += 3.5

  const supBoxWidth = pageWidth - margin * 2
  const supBoxHeight = 30
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(margin, curY, supBoxWidth, supBoxHeight, 2, 2, "FD")

  const isVerified = Boolean(record.verifiedBy || record.verifiedSignature)
  if (isVerified) {
    if (record.verifiedSignature) {
      try {
        doc.addImage(record.verifiedSignature, "PNG", margin + 6, curY + 2, 55, 17)
      } catch (e) {
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text("[Supervisor Signature]", margin + 10, curY + 12)
      }
    } else {
      doc.setFontSize(8)
      doc.setTextColor(16, 122, 63)
      doc.text("[Verified Digitally via Portal]", margin + 10, curY + 12)
    }

    doc.setDrawColor(148, 163, 184)
    doc.line(margin + 6, curY + 20, margin + 65, curY + 20)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text(`VERIFIED BY: ${record.verifiedBy || "Supervisor"}`, margin + 6, curY + 24)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    const verTime = record.verifiedAt ? formatPdfDateTime(record.verifiedAt) : "Completed"
    doc.text(`Verification Timestamp: ${verTime}`, margin + 6, curY + 28)

    // Verification badge on the right
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(16, 122, 63)
    doc.text("STATUS: VERIFIED & AUDITED", pageWidth - margin - 8, curY + 16, { align: "right" })
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(180, 83, 9) // amber-700
    doc.text("PENDING SUPERVISOR VERIFICATION", margin + 8, curY + 13)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(
      "Awaiting supervisor / QC review and digital sign-off in the Maintenance Summary portal.",
      margin + 8,
      curY + 19
    )
  }

  // Document Footer
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(
    "Bubbles O2 Sdn. Bhd. — GMP Production Assurance & UV Quality Record",
    margin,
    curY + supBoxHeight + 8
  )

  const dateSlug = formatPdfDateOnly(record.date).replace(/[^a-zA-Z0-9_-]/g, "_")
  doc.save(`BubblesO2_UV_Slip_${dateSlug}.pdf`)
}

import { NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { fetchPMAuditData } from "@/lib/reminders/pm-audit-data"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["REMINDERS"]))) {
    return NextResponse.json({ error: "Tiada akses ke modul Reminders." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const equipment = searchParams.get("equipment") || ""
  const status = searchParams.get("status") || ""
  const mode = searchParams.get("mode") === "AUDITOR" ? "AUDITOR" : "INTERNAL"
  const hideInternalNotes = searchParams.get("hideInternalNotes") === "true"
  const hideOverduePending = searchParams.get("hideOverduePending") === "true"
  const hidePersonalContact = searchParams.get("hidePersonalContact") === "true"
  const hideSignatures = searchParams.get("hideSignatures") === "true"

  try {
    const data = await fetchPMAuditData(
      { userId: access.userId, isSuperAdmin: access.isSuperAdmin, name: access.name || undefined },
      {
        from,
        to,
        equipment,
        status,
        mode,
        hideInternalNotes,
        hideOverduePending,
        hidePersonalContact,
        hideSignatures,
      }
    )

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Bubbles O2 All-in-One System"
    workbook.lastModifiedBy = access.name || "Bubbles O2 User"
    workbook.created = new Date()
    workbook.modified = new Date()

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    }

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      right: { style: "thin", color: { argb: "FF0F172A" } },
    }

    // =========================================================================
    // SHEET 1: PREV. MAINTENANCE SCHEDULE 26 (Exact Original SGMP-03 Template)
    // =========================================================================
    const ws1 = workbook.addWorksheet("PREV. MAINTENANCE SCHEDULE 26")
    ws1.views = [{ showGridLines: true }]

    // Set column widths matching original template
    ws1.getColumn(1).width = 16 // DATE
    ws1.getColumn(2).width = 38 // EQUIPMENT NAME
    ws1.getColumn(3).width = 22 // SRS NUMBER
    ws1.getColumn(4).width = 18 // FREQUENCY
    ws1.getColumn(5).width = 38 // MAINTENANCE PERSONNAL RESPONSIBLE
    ws1.getColumn(6).width = 22 // STATUS

    // Header Block Rows 2 to 6
    ws1.mergeCells("A2:D2")
    const compCell = ws1.getCell("A2")
    compCell.value = "BUBBLESO2 SDN BHD"
    compCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF0F172A" } }
    compCell.alignment = { vertical: "middle", horizontal: "left" }
    ws1.getRow(2).height = 24

    ws1.mergeCells("A3:C3")
    ws1.getCell("A3").value = "KOMPLEKS AL-AMMAR,"
    ws1.getCell("A3").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("D3:F3")
    ws1.getCell("D3").value = "Rec. No            : SGMP/03/PMS"
    ws1.getCell("D3").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("A4:C4")
    ws1.getCell("A4").value = "KG KANCHONG,"
    ws1.getCell("A4").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("D4:F4")
    ws1.getCell("D4").value = "Issue No           : 1/10/2022"
    ws1.getCell("D4").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("A5:C5")
    ws1.getCell("A5").value = "71200, RANTAU"
    ws1.getCell("A5").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("D5:F5")
    ws1.getCell("D5").value = "Rev No             : 1"
    ws1.getCell("D5").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("A6:C6")
    ws1.getCell("A6").value = "NEGERI SEMBILAN"
    ws1.getCell("A6").font = { name: "Calibri", size: 9, bold: true }

    ws1.mergeCells("D6:F6")
    ws1.getCell("D6").value = "Effective date : 15/2/2023"
    ws1.getCell("D6").font = { name: "Calibri", size: 9, bold: true }

    // Row 8: Title
    ws1.mergeCells("A8:F8")
    const titleCell = ws1.getCell("A8")
    titleCell.value = "PREVENTIVE MAINTENANCE SCHEDULE"
    titleCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF0F172A" } }
    titleCell.alignment = { vertical: "middle", horizontal: "center" }
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
    ws1.getRow(8).height = 24

    // Row 10: Original 6 Column Headers
    const headersSheet1 = [
      "DATE",
      "EQUIPMENT NAME",
      "SRS NUMBER",
      "FREQUENCY",
      "MAINTENANCE PERSONNAL RESPONSIBLE",
      "STATUS",
    ]

    const headerRow1 = ws1.getRow(10)
    headerRow1.height = 26
    headersSheet1.forEach((h, idx) => {
      const cell = headerRow1.getCell(idx + 1)
      cell.value = h
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } } // slate-800
      cell.alignment = { vertical: "middle", horizontal: idx === 0 || idx === 3 || idx === 5 ? "center" : "left" }
      cell.border = headerBorder
    })

    // Populate Sheet 1 data rows
    let currentR1 = 11
    data.records.forEach((rec) => {
      const row = ws1.getRow(currentR1)
      row.height = 20

      // 1. DATE (dd/mm/yyyy format matching original)
      const dParts = rec.dueDate.split("-")
      const formattedDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : rec.dueDate
      row.getCell(1).value = formattedDate
      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

      // 2. EQUIPMENT NAME
      row.getCell(2).value = rec.equipment
      row.getCell(2).alignment = { vertical: "middle", horizontal: "left" }

      // 3. SRS NUMBER
      row.getCell(3).value = rec.srs || "-"
      row.getCell(3).alignment = { vertical: "middle", horizontal: "left" }

      // 4. FREQUENCY
      row.getCell(4).value = rec.frequency
      row.getCell(4).alignment = { vertical: "middle", horizontal: "center" }

      // 5. PIC
      row.getCell(5).value = rec.pics.join(", ") || "-"
      row.getCell(5).alignment = { vertical: "middle", horizontal: "left" }

      // 6. STATUS
      let statusLabel = "PENDING"
      let statusColor = "FF475569"
      if (rec.status === "DONE") {
        statusLabel = "OK / COMPLETED"
        statusColor = "FF15803D"
      } else if (rec.status === "ISSUE") {
        statusLabel = "ISSUE / REMARKS"
        statusColor = "FFB45309"
      } else if (rec.status === "OVERDUE") {
        statusLabel = "OVERDUE"
        statusColor = "FFB91C1C"
      }

      row.getCell(6).value = statusLabel
      row.getCell(6).font = { name: "Calibri", size: 9, bold: true, color: { argb: statusColor } }
      row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }

      for (let c = 1; c <= 6; c++) {
        row.getCell(c).border = thinBorder
      }
      currentR1++
    })

    // =========================================================================
    // SHEET 2: Detailed Log & Checklist
    // =========================================================================
    const ws2 = workbook.addWorksheet("Detailed Log & Checklist")
    ws2.views = [{ showGridLines: true }]

    ws2.columns = [
      { header: "No", key: "no", width: 6 },
      { header: "Scheduled Date", key: "dueDate", width: 14 },
      { header: "Inspected Date", key: "inspectedDate", width: 14 },
      { header: "Equipment / Machine", key: "equipment", width: 34 },
      { header: "SRS", key: "srs", width: 16 },
      { header: "Frequency", key: "freq", width: 16 },
      { header: "SOP Checklist", key: "checklist", width: 44 },
      { header: "Items Done", key: "checklistCount", width: 14 },
      { header: "Result", key: "result", width: 14 },
      { header: "Inspection Remarks", key: "notes", width: 36 },
      { header: "Assigned PIC", key: "pics", width: 28 },
    ]

    const hRow2 = ws2.getRow(1)
    hRow2.height = 26
    for (let c = 1; c <= 11; c++) {
      const cell = hRow2.getCell(c)
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } } // indigo-700
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = headerBorder
    }

    let currentR2 = 2
    data.records.forEach((rec, idx) => {
      const row = ws2.getRow(currentR2)
      row.height = 22
      const completedCount = rec.completedChecklist?.length || 0

      row.getCell(1).value = idx + 1
      row.getCell(2).value = rec.dueDate
      row.getCell(3).value = rec.inspectedDate || "-"
      row.getCell(4).value = rec.equipment
      row.getCell(5).value = rec.srs || "-"
      row.getCell(6).value = rec.frequency
      row.getCell(7).value = rec.checklist.join("\n• ") ? `• ${rec.checklist.join("\n• ")}` : "-"
      row.getCell(8).value = `${completedCount} / ${rec.checklist.length}`
      row.getCell(9).value = rec.result === "OK" ? "OK" : rec.result === "ISSUE" ? "ISSUE REPORTED" : "-"
      row.getCell(10).value = rec.notes || "-"
      row.getCell(11).value = rec.pics.join(", ") || "-"

      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(2).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(3).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(5).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(7).alignment = { vertical: "top", wrapText: true }
      row.getCell(8).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(9).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(9).font = {
        name: "Calibri",
        size: 9,
        bold: true,
        color: { argb: rec.result === "OK" ? "FF15803D" : rec.result === "ISSUE" ? "FFB45309" : "FF64748B" },
      }
      row.getCell(10).alignment = { vertical: "middle", wrapText: true }

      for (let c = 1; c <= 11; c++) {
        row.getCell(c).border = thinBorder
      }
      currentR2++
    })

    // =========================================================================
    // SHEET 3: Verification & Sign-off
    // =========================================================================
    const ws3 = workbook.addWorksheet("Verification & Sign-off")
    ws3.views = [{ showGridLines: true }]

    ws3.columns = [
      { header: "No", key: "no", width: 6 },
      { header: "Scheduled Date", key: "dueDate", width: 14 },
      { header: "Inspected Date", key: "inspectedDate", width: 16 },
      { header: "Equipment Name", key: "equipment", width: 34 },
      { header: "Inspector (Checked By)", key: "completedBy", width: 28 },
      { header: "Inspector Signature Status", key: "performedSig", width: 26 },
      { header: "Supervisor (Verified By)", key: "verifiedBy", width: 28 },
      { header: "Supervisor Signature Status", key: "verifiedSig", width: 26 },
      { header: "Verification Timestamp", key: "verifiedAt", width: 24 },
      { header: "Audit Status", key: "status", width: 18 },
    ]

    const hRow3 = ws3.getRow(1)
    hRow3.height = 26
    for (let c = 1; c <= 10; c++) {
      const cell = hRow3.getCell(c)
      cell.font = { name: "Calibri", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } } // emerald-700
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = headerBorder
    }

    let currentR3 = 2
    data.records.forEach((rec, idx) => {
      const row = ws3.getRow(currentR3)
      row.height = 20

      const isVerified = Boolean(rec.verifiedAt)

      row.getCell(1).value = idx + 1
      row.getCell(2).value = rec.dueDate
      row.getCell(3).value = rec.inspectedDate || "-"
      row.getCell(4).value = rec.equipment
      row.getCell(5).value = rec.completedBy || "Maintenance Technician"
      row.getCell(6).value = rec.performedSignature ? "Valid Digital Signature" : "-"
      row.getCell(7).value = rec.verifiedByName || (isVerified ? "Operations Supervisor" : "Pending Verification")
      row.getCell(8).value = rec.verifiedSignature ? "Supervisor Signature Valid" : isVerified ? "Digital Verified" : "-"
      row.getCell(9).value = rec.verifiedAt ? new Date(rec.verifiedAt).toLocaleString("en-GB") : "-"
      row.getCell(10).value = isVerified ? "COMPLETE & VERIFIED" : rec.status === "DONE" ? "PENDING VERIFICATION" : rec.status

      row.getCell(1).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(2).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(3).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(6).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(8).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(9).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(10).alignment = { vertical: "middle", horizontal: "center" }
      row.getCell(10).font = {
        name: "Calibri",
        size: 9,
        bold: true,
        color: { argb: isVerified ? "FF15803D" : "FFB45309" },
      }

      for (let c = 1; c <= 10; c++) {
        row.getCell(c).border = thinBorder
      }
      currentR3++
    })

    // =========================================================================
    // SHEET 4: Calendar Matrix & KPI (Monthly matrix & AI Summary)
    // =========================================================================
    const ws4 = workbook.addWorksheet("Calendar Matrix & KPI")
    ws4.views = [{ showGridLines: true }]

    // Title banner
    ws4.mergeCells("A1:Q1")
    ws4.getCell("A1").value = "BUBBLES O2 SDN. BHD. · PREVENTIVE MAINTENANCE MATRIX & KPI COMPLIANCE (SGMP-03)"
    ws4.getCell("A1").font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } }
    ws4.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    ws4.getCell("A1").alignment = { vertical: "middle", horizontal: "center" }
    ws4.getRow(1).height = 30

    // Executive Summary Block
    ws4.mergeCells("A3:Q3")
    ws4.getCell("A3").value = "EXECUTIVE SUMMARY"
    ws4.getCell("A3").font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF4338CA" } }

    ws4.mergeCells("A4:Q5")
    const execCell = ws4.getCell("A4")
    execCell.value = data.executiveSummary || "Preventive maintenance compliance report for SGMP-03 equipment."
    execCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF334155" } }
    execCell.alignment = { vertical: "top", wrapText: true }

    // KPI Summary Strip
    const kpiData = [
      { label: "Total Tasks", val: data.summary.totalTasks, color: "FF0F172A" },
      { label: "Completed (OK)", val: data.summary.completedTasks, color: "FF15803D" },
      { label: "Issues / Remarks", val: data.summary.issueTasks, color: "FFB45309" },
      { label: "Overdue", val: data.summary.overdueTasks, color: "FFB91C1C" },
      { label: "Upcoming", val: data.summary.pendingTasks, color: "FF4338CA" },
      { label: "Compliance Rate (%)", val: `${data.summary.complianceRate.toFixed(1)}%`, color: "FF15803D" },
    ]

    let kpiCol = 1
    kpiData.forEach((kpi) => {
      const colLetter = String.fromCharCode(64 + kpiCol)
      const valCell = ws4.getCell(`${colLetter}7`)
      valCell.value = kpi.val
      valCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: kpi.color } }
      valCell.alignment = { vertical: "middle", horizontal: "center" }
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      valCell.border = thinBorder

      const lblCell = ws4.getCell(`${colLetter}8`)
      lblCell.value = kpi.label
      lblCell.font = { name: "Calibri", size: 8, bold: true, color: { argb: "FF64748B" } }
      lblCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      lblCell.border = thinBorder

      ws4.getColumn(kpiCol).width = 18
      kpiCol++
    })
    ws4.getRow(7).height = 24
    ws4.getRow(8).height = 20

    // Calendar Matrix Grid Table Header (Row 11)
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    ws4.getCell("A10").value = "MONTHLY SCHEDULE MATRIX (JANUARY - DECEMBER)"
    ws4.getCell("A10").font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } }

    const mHeaderRow = ws4.getRow(11)
    mHeaderRow.height = 24
    mHeaderRow.getCell(1).value = "EQUIPMENT / MACHINE NAME"
    mHeaderRow.getCell(2).value = "SRS"
    mHeaderRow.getCell(3).value = "FREQUENCY"
    ws4.getColumn(1).width = 32
    ws4.getColumn(2).width = 14
    ws4.getColumn(3).width = 14

    for (let c = 1; c <= 3; c++) {
      const cell = mHeaderRow.getCell(c)
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = headerBorder
    }

    monthNamesShort.forEach((mName, idx) => {
      const colIdx = idx + 4
      const cell = mHeaderRow.getCell(colIdx)
      cell.value = mName
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = headerBorder
      ws4.getColumn(colIdx).width = 9
    })

    mHeaderRow.getCell(16).value = "COMPLETED"
    mHeaderRow.getCell(17).value = "TOTAL"
    for (let c = 16; c <= 17; c++) {
      const cell = mHeaderRow.getCell(c)
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = headerBorder
      ws4.getColumn(c).width = 12
    }

    // Populate Matrix Rows
    let currentR4 = 12
    data.calendarMatrix.forEach((row) => {
      const r = ws4.getRow(currentR4)
      r.height = 20

      r.getCell(1).value = row.equipment
      r.getCell(2).value = row.srs || "-"
      r.getCell(3).value = row.frequency
      r.getCell(2).alignment = { vertical: "middle", horizontal: "center" }
      r.getCell(3).alignment = { vertical: "middle", horizontal: "center" }

      for (let m = 1; m <= 12; m++) {
        const cell = row.months[m]
        const colIdx = m + 3
        const mCell = r.getCell(colIdx)

        if (cell && cell.status !== "NONE") {
          let label = cell.status === "DONE" ? "OK" : cell.status === "ISSUE" ? "ISSUE" : cell.status === "OVERDUE" ? "LATE" : "PLAN"
          if (cell.count > 1) label += `(${cell.count})`
          mCell.value = label
          mCell.font = {
            name: "Calibri",
            size: 8,
            bold: true,
            color: {
              argb:
                cell.status === "DONE"
                  ? "FF15803D"
                  : cell.status === "ISSUE"
                  ? "FFB45309"
                  : cell.status === "OVERDUE"
                  ? "FFB91C1C"
                  : "FF4338CA",
            },
          }
        } else {
          mCell.value = "-"
          mCell.font = { name: "Calibri", size: 8, color: { argb: "FFCBD5E1" } }
        }
        mCell.alignment = { vertical: "middle", horizontal: "center" }
      }

      r.getCell(16).value = row.totalCompleted
      r.getCell(16).alignment = { vertical: "middle", horizontal: "center" }
      r.getCell(16).font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF15803D" } }

      r.getCell(17).value = row.totalScheduled
      r.getCell(17).alignment = { vertical: "middle", horizontal: "center" }
      r.getCell(17).font = { name: "Calibri", size: 9, bold: true }

      for (let c = 1; c <= 17; c++) {
        r.getCell(c).border = thinBorder
      }
      currentR4++
    })

    // Generate output buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const safeFilename = `PM_Schedule_SGMP03_${data.mode}_${data.from}_to_${data.to}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    console.error("Excel Export Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to generate Excel file." }, { status: 500 })
  }
}

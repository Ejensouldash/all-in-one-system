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

  try {
    const data = await fetchPMAuditData(
      { userId: access.userId, isSuperAdmin: access.isSuperAdmin, name: access.name || undefined },
      { from, to, equipment, status }
    )

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "Bubbles O2 All-in-One System"
    workbook.lastModifiedBy = access.name || "Bubbles O2 User"
    workbook.created = new Date()
    workbook.modified = new Date()

    const monthNamesShort = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"]

    // ==========================================
    // SHEET 1: Ringkasan & Matriks Kalendar
    // ==========================================
    const wsMatrix = workbook.addWorksheet("Ringkasan & Matriks")
    wsMatrix.views = [{ showGridLines: true }]

    // Title & Header Block
    wsMatrix.mergeCells("A1:Q1")
    const titleCell = wsMatrix.getCell("A1")
    titleCell.value = "BUBBLES O2 SDN. BHD. · LAPORAN AUDIT PENYELENGGARAAN PENCEGAHAN (SGMP-03)"
    titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } }
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } } // slate-800
    titleCell.alignment = { vertical: "middle", horizontal: "center" }
    wsMatrix.getRow(1).height = 32

    wsMatrix.mergeCells("A2:Q2")
    const subCell = wsMatrix.getCell("A2")
    subCell.value = `Tempoh Audit: ${data.from} hingga ${data.to}  |  Dijana Pada: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur" })}  |  Disediakan Oleh: ${data.preparedBy}`
    subCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF475569" } }
    subCell.alignment = { vertical: "middle", horizontal: "center" }
    wsMatrix.getRow(2).height = 20

    // KPI Metrics Section
    wsMatrix.getCell("A4").value = "RINGKASAN EKSEKUTIF & KPI PEMATUHAN"
    wsMatrix.getCell("A4").font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } }

    const kpiData = [
      { label: "Jumlah Tugasan Berjadual", val: data.summary.totalTasks, color: "FF0F172A" },
      { label: "Tugasan Selesai (OK)", val: data.summary.completedTasks, color: "FF15803D" },
      { label: "Tugasan Ada Isu / Catatan", val: data.summary.issueTasks, color: "FFB45309" },
      { label: "Tugasan Tertunggak", val: data.summary.overdueTasks, color: "FFB91C1C" },
      { label: "Tugasan Akan Datang", val: data.summary.pendingTasks, color: "FF4338CA" },
      { label: "Kadar Pematuhan Audit (%)", val: `${data.summary.complianceRate.toFixed(1)}%`, color: "FF15803D" },
    ]

    let kpiCol = 1
    kpiData.forEach((kpi) => {
      const colLetter = String.fromCharCode(64 + kpiCol)
      const valCell = wsMatrix.getCell(`${colLetter}5`)
      valCell.value = kpi.val
      valCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: kpi.color } }
      valCell.alignment = { vertical: "middle", horizontal: "center" }
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      valCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      }

      const lblCell = wsMatrix.getCell(`${colLetter}6`)
      lblCell.value = kpi.label
      lblCell.font = { name: "Calibri", size: 8, bold: true, color: { argb: "FF64748B" } }
      lblCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
      lblCell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      }

      wsMatrix.getColumn(kpiCol).width = 18
      kpiCol++
    })
    wsMatrix.getRow(5).height = 24
    wsMatrix.getRow(6).height = 24

    // 12-Month Matrix Section
    const matrixStartRow = 8
    wsMatrix.getCell(`A${matrixStartRow}`).value = "MATRIKS JADUAL & PEMATUHAN TAHUNAN (12 BULAN)"
    wsMatrix.getCell(`A${matrixStartRow}`).font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1E293B" } }

    const matrixHeaderRow = matrixStartRow + 1
    const matrixCols = [
      { header: "Peralatan", key: "equipment", width: 28 },
      { header: "No. SRS", key: "srs", width: 18 },
      { header: "Kekerapan", key: "frequency", width: 14 },
      ...monthNamesShort.map((m, idx) => ({ header: m, key: `m_${idx + 1}`, width: 7 })),
      { header: "Siap", key: "done", width: 8 },
      { header: "Jumlah", key: "total", width: 8 },
      { header: "% Pematuhan", key: "rate", width: 14 },
    ]

    matrixCols.forEach((col, idx) => {
      const cell = wsMatrix.getCell(matrixHeaderRow, idx + 1)
      cell.value = col.header
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
      cell.alignment = { vertical: "middle", horizontal: idx < 3 ? "left" : "center" }
      cell.border = {
        top: { style: "thin", color: { argb: "FF64748B" } },
        bottom: { style: "thin", color: { argb: "FF64748B" } },
        left: { style: "thin", color: { argb: "FF64748B" } },
        right: { style: "thin", color: { argb: "FF64748B" } },
      }
      wsMatrix.getColumn(idx + 1).width = col.width
    })
    wsMatrix.getRow(matrixHeaderRow).height = 22

    let currRow = matrixHeaderRow + 1
    data.calendarMatrix.forEach((row, rIdx) => {
      const isEven = rIdx % 2 === 0
      const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC"

      const r = wsMatrix.getRow(currRow)
      r.height = 20

      // Equipment
      const cEquip = r.getCell(1)
      cEquip.value = row.equipment
      cEquip.font = { name: "Calibri", size: 9, bold: true }
      cEquip.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }

      // SRS
      const cSrs = r.getCell(2)
      cSrs.value = row.srs || "-"
      cSrs.font = { name: "Calibri", size: 9 }
      cSrs.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }

      // Frequency
      const cFreq = r.getCell(3)
      cFreq.value = row.frequency
      cFreq.font = { name: "Calibri", size: 9 }
      cFreq.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }

      // Months 1-12
      for (let m = 1; m <= 12; m++) {
        const cell = r.getCell(3 + m)
        const cellData = row.months[m] || { status: "NONE", count: 0 }
        let symbol = "-"
        let fgColor = "FF94A3B8"

        if (cellData.status === "DONE") {
          symbol = cellData.count > 1 ? `✓ ${cellData.count}` : "✓"
          fgColor = "FF15803D"
        } else if (cellData.status === "ISSUE") {
          symbol = cellData.count > 1 ? `! ${cellData.count}` : "!"
          fgColor = "FFB45309"
        } else if (cellData.status === "OVERDUE") {
          symbol = cellData.count > 1 ? `× ${cellData.count}` : "×"
          fgColor = "FFB91C1C"
        } else if (cellData.status === "PENDING") {
          symbol = cellData.count > 1 ? `• ${cellData.count}` : "•"
          fgColor = "FF4338CA"
        }

        cell.value = symbol
        cell.font = { name: "Calibri", size: 9, bold: symbol !== "-", color: { argb: fgColor } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }
      }

      // Siap
      const cDone = r.getCell(16)
      cDone.value = row.totalCompleted
      cDone.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF15803D" } }
      cDone.alignment = { vertical: "middle", horizontal: "center" }
      cDone.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }

      // Jumlah
      const cTotal = r.getCell(17)
      cTotal.value = row.totalScheduled
      cTotal.font = { name: "Calibri", size: 9, bold: true }
      cTotal.alignment = { vertical: "middle", horizontal: "center" }
      cTotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }

      // % Pematuhan
      const cRate = r.getCell(18)
      const rateVal = row.totalScheduled > 0 ? (row.totalCompleted / row.totalScheduled) * 100 : 100
      cRate.value = `${rateVal.toFixed(1)}%`
      cRate.font = { name: "Calibri", size: 9, bold: true, color: { argb: rateVal >= 90 ? "FF15803D" : "FFB45309" } }
      cRate.alignment = { vertical: "middle", horizontal: "center" }
      cRate.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } }

      // Thin borders
      for (let c = 1; c <= 18; c++) {
        r.getCell(c).border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
        }
      }

      currRow++
    })

    // ==========================================
    // SHEET 2: Log Rekod Pemeriksaan (100% Clean)
    // ==========================================
    const wsLog = workbook.addWorksheet("Log Rekod Pemeriksaan")
    wsLog.views = [{ state: "frozen", ySplit: 1, showGridLines: true }]

    wsLog.columns = [
      { header: "No", key: "index", width: 6 },
      { header: "Tarikh Patut", key: "dueDate", width: 14 },
      { header: "Tarikh Diperiksa", key: "inspectedDate", width: 16 },
      { header: "Peralatan", key: "equipment", width: 28 },
      { header: "No. SRS", key: "srs", width: 18 },
      { header: "Kekerapan", key: "frequency", width: 14 },
      { header: "Senarai Semak / Tugasan", key: "checklist", width: 45 },
      { header: "PIC Bertanggungjawab", key: "pics", width: 26 },
      { header: "Status Semasa", key: "status", width: 16 },
      { header: "Keputusan", key: "result", width: 14 },
      { header: "Catatan / Penemuan", key: "notes", width: 38 },
      { header: "Disahkan Oleh", key: "completedBy", width: 24 },
      { header: "Tarikh & Masa Siap", key: "completedAt", width: 22 },
    ]

    // Style Header Row
    const logHeader = wsLog.getRow(1)
    logHeader.height = 26
    logHeader.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } }
    logHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    logHeader.alignment = { vertical: "middle", horizontal: "center" }

    data.records.forEach((r) => {
      let statusLabel = "Akan Datang"
      let statusBg = "FFF1F5F9"
      let statusFg = "FF475569"

      if (r.status === "DONE") {
        statusLabel = "Selesai"
        statusBg = "FFDCFCE7"
        statusFg = "FF15803D"
      } else if (r.status === "ISSUE") {
        statusLabel = "Ada Isu"
        statusBg = "FFFEF3C7"
        statusFg = "FFB45309"
      } else if (r.status === "OVERDUE") {
        statusLabel = "Tertunggak"
        statusBg = "FFFEE2E2"
        statusFg = "FFB91C1C"
      }

      const row = wsLog.addRow({
        index: r.index,
        dueDate: r.dueDate,
        inspectedDate: r.inspectedDate || "-",
        equipment: r.equipment,
        srs: r.srs || "-",
        frequency: r.frequency,
        checklist: r.checklist.join("\n• "),
        pics: r.pics.join(", ") || "Belum ditugaskan",
        status: statusLabel,
        result: r.result || "-",
        notes: r.notes || "-",
        completedBy: r.completedBy || "-",
        completedAt: r.completedAt ? r.completedAt.replace("T", " ").slice(0, 19) : "-",
      })

      row.height = r.checklist.length > 1 ? 16 + r.checklist.length * 10 : 22
      row.font = { name: "Calibri", size: 9 }
      row.alignment = { vertical: "middle", wrapText: true }

      // Center specific columns
      row.getCell("index").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("dueDate").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("inspectedDate").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("srs").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("frequency").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("result").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("completedAt").alignment = { vertical: "middle", horizontal: "center" }

      // Color status badge cell
      const statusCell = row.getCell("status")
      statusCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: statusFg } }
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusBg } }
      statusCell.alignment = { vertical: "middle", horizontal: "center" }

      // Subtle row border
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        }
      })
    })

    // Enable auto-filter for entire log sheet
    wsLog.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.records.length + 1, column: 13 },
    }

    // ==========================================
    // SHEET 3: Jadual Induk Peralatan (17 Schedules)
    // ==========================================
    const wsSched = workbook.addWorksheet("Jadual Induk Peralatan")
    wsSched.views = [{ state: "frozen", ySplit: 1, showGridLines: true }]

    wsSched.columns = [
      { header: "No", key: "no", width: 6 },
      { header: "Nama Peralatan", key: "equipment", width: 28 },
      { header: "No. SRS", key: "srs", width: 20 },
      { header: "Kekerapan", key: "frequency", width: 16 },
      { header: "Tarikh Mula", key: "startDate", width: 14 },
      { header: "Senarai Semak SOP (Checklist)", key: "checklist", width: 55 },
      { header: "Bil. PIC Ditugaskan", key: "picCount", width: 18 },
    ]

    const schedHeader = wsSched.getRow(1)
    schedHeader.height = 26
    schedHeader.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFFFF" } }
    schedHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
    schedHeader.alignment = { vertical: "middle", horizontal: "center" }

    data.schedules.forEach((s, idx) => {
      const row = wsSched.addRow({
        no: idx + 1,
        equipment: s.equipment,
        srs: s.srs || "-",
        frequency: s.frequency,
        startDate: s.startDate,
        checklist: s.checklist.join("\n• "),
        picCount: s.picCount,
      })

      row.height = s.checklist.length > 1 ? 16 + s.checklist.length * 10 : 22
      row.font = { name: "Calibri", size: 9 }
      row.alignment = { vertical: "middle", wrapText: true }
      row.getCell("no").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("srs").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("frequency").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("startDate").alignment = { vertical: "middle", horizontal: "center" }
      row.getCell("picCount").alignment = { vertical: "middle", horizontal: "center" }

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        }
      })
    })

    wsSched.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.schedules.length + 1, column: 7 },
    }

    // Generate binary buffer
    const buffer = await workbook.xlsx.writeBuffer()
    const safeFilename = `Laporan_Audit_PM_SGMP03_${data.from}_ke_${data.to}.xlsx`

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
    return NextResponse.json({ error: err?.message || "Gagal menjana Excel." }, { status: 500 })
  }
}

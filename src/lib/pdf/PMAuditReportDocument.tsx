import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface PMAuditRecord {
  index: number
  dueDate: string
  inspectedDate: string | null
  equipment: string
  srs: string | null
  frequency: string
  checklist: string[]
  pics: string[]
  status: "DONE" | "ISSUE" | "OVERDUE" | "PENDING"
  result: string | null
  notes: string | null
  completedBy: string | null
  completedAt: string | null
}

export interface PMAuditMatrixRow {
  equipment: string
  srs: string | null
  frequency: string
  months: Record<number, { status: "DONE" | "ISSUE" | "OVERDUE" | "PENDING" | "NONE"; count: number }>
  totalCompleted: number
  totalScheduled: number
}

export interface PMAuditReportPayload {
  logo?: string
  docRef?: string
  from: string
  to: string
  preparedBy: string
  generatedAt: string
  summary: {
    totalTasks: number
    completedTasks: number
    issueTasks: number
    overdueTasks: number
    pendingTasks: number
    complianceRate: number
  }
  calendarMatrix: PMAuditMatrixRow[]
  records: PMAuditRecord[]
}

const C = {
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#cbd5e1",
  subtle: "#f8fafc",
  brand: "#4338ca",
  brandSoft: "#eef2ff",
  good: "#15803d",
  goodSoft: "#dcfce7",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  bad: "#b91c1c",
  badSoft: "#fee2e2",
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"]

const s = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 8,
    color: C.body,
    fontFamily: "Helvetica",
  },
  runHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 38,
    paddingHorizontal: 32,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  runHeaderText: {
    fontSize: 6.5,
    color: C.faint,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  runFooter: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 5,
  },
  runFooterText: {
    fontSize: 6.5,
    color: C.faint,
  },

  // Document Header Box
  headerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
    marginBottom: 12,
  },
  logo: {
    height: 32,
    objectFit: "contain",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    letterSpacing: 0.5,
  },
  companyAddress: {
    fontSize: 6.5,
    color: C.muted,
    marginTop: 1,
  },
  docTitleBlock: {
    alignItems: "flex-end",
  },
  docRef: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    backgroundColor: C.brandSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textAlign: "right",
    textTransform: "uppercase",
  },
  docSubtitle: {
    fontSize: 7,
    color: C.muted,
    textAlign: "right",
    marginTop: 2,
  },

  // Metadata Row
  metaRow: {
    flexDirection: "row",
    backgroundColor: C.subtle,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.line,
    padding: 6,
    marginBottom: 10,
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "column",
  },
  metaKey: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
  },
  metaVal: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 1,
  },

  // KPI Summary Strip
  kpiStrip: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  kpiValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  kpiLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 2,
  },

  // Section Headers
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 6,
  },
  sectionSubtitle: {
    fontSize: 6.5,
    color: C.muted,
    marginBottom: 6,
  },

  // Matrix Table
  matrixTable: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 3,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  matrixHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 3,
  },
  matrixRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 2.5,
    alignItems: "center",
  },
  matrixColEquip: {
    width: "30%",
    paddingLeft: 4,
    paddingRight: 2,
  },
  matrixColMonth: {
    width: "5%",
    textAlign: "center",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
  },
  matrixColTotal: {
    width: "10%",
    textAlign: "right",
    paddingRight: 4,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
  },
  cellDone: {
    color: C.good,
    fontFamily: "Helvetica-Bold",
  },
  cellIssue: {
    color: C.warn,
    fontFamily: "Helvetica-Bold",
  },
  cellPending: {
    color: C.brand,
  },
  cellOverdue: {
    color: C.bad,
    fontFamily: "Helvetica-Bold",
  },
  cellNone: {
    color: "#cbd5e1",
  },

  // Audit Records Table
  recordTable: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 3,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  recordHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  recordRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    minHeight: 18,
  },
  colNo: { width: "4%", textAlign: "center", fontSize: 6.5 },
  colDue: { width: "11%", fontSize: 6.5 },
  colInspected: { width: "11%", fontSize: 6.5 },
  colEquip: { width: "23%", fontSize: 6.5 },
  colTask: { width: "23%", fontSize: 6.5 },
  colPic: { width: "12%", fontSize: 6.5 },
  colStatus: { width: "16%", fontSize: 6.5 },

  statusDone: {
    backgroundColor: C.goodSoft,
    color: C.good,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 6,
    textAlign: "center",
  },
  statusIssue: {
    backgroundColor: C.warnSoft,
    color: C.warn,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 6,
    textAlign: "center",
  },
  statusOverdue: {
    backgroundColor: C.badSoft,
    color: C.bad,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontFamily: "Helvetica-Bold",
    fontSize: 6,
    textAlign: "center",
  },
  statusPending: {
    backgroundColor: "#f1f5f9",
    color: C.muted,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    fontSize: 6,
    textAlign: "center",
  },

  // Sign-off Box
  signBox: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    backgroundColor: "#ffffff",
  },
  signGrid: {
    flexDirection: "row",
    gap: 12,
  },
  signCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    padding: 6,
    backgroundColor: C.subtle,
  },
  signTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 3,
    marginBottom: 20,
  },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    marginTop: 15,
    paddingTop: 3,
  },
  signText: {
    fontSize: 6,
    color: C.muted,
    marginBottom: 2,
  },
})

export function PMAuditReportDocument({
  logo,
  docRef = "SGMP-03 / PMIR",
  from,
  to,
  preparedBy,
  generatedAt,
  summary,
  calendarMatrix,
  records,
}: PMAuditReportPayload) {
  return (
    <Document title="Laporan Audit Penyelenggaraan Pencegahan SGMP-03" author="Bubbles O2 Sdn. Bhd.">
      {/* Page 1: Header, Executive Summary & Calendar Matrix */}
      <Page size="A4" orientation="portrait" style={s.page}>
        {/* Running Header */}
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>BUBBLES O2 SDN. BHD. · SISTEM PENGURUSAN KUALITI GMP</Text>
          <Text style={s.runHeaderText}>REKOD AUDIT SGMP-03</Text>
        </View>

        {/* Official Header */}
        <View style={s.headerBox}>
          <View>
            {logo ? <Image src={logo} style={s.logo} /> : null}
            <Text style={s.companyName}>BUBBLES O2 SDN. BHD.</Text>
            <Text style={s.companyAddress}>Kilang Air Mineral Semulajadi, Kg. Pasir Mas, Rantau Panjang, Kelantan</Text>
          </View>
          <View style={s.docTitleBlock}>
            <Text style={s.docRef}>{docRef}</Text>
            <Text style={s.docTitle}>Laporan Audit Penyelenggaraan</Text>
            <Text style={s.docSubtitle}>Preventive Maintenance Compliance & Audit Trail</Text>
          </View>
        </View>

        {/* Meta Bar */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Tempoh Audit</Text>
            <Text style={s.metaVal}>{from} hingga {to}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Dijana Pada</Text>
            <Text style={s.metaVal}>{generatedAt}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Disediakan Oleh</Text>
            <Text style={s.metaVal}>{preparedBy}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Kadar Pematuhan (KPI)</Text>
            <Text style={[s.metaVal, { color: summary.complianceRate >= 90 ? C.good : C.warn }]}>
              {summary.complianceRate.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* KPI Strip */}
        <View style={s.kpiStrip}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{summary.totalTasks}</Text>
            <Text style={s.kpiLabel}>Jumlah Tugasan</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: C.goodSoft, backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.kpiValue, { color: C.good }]}>{summary.completedTasks}</Text>
            <Text style={s.kpiLabel}>Selesai (OK)</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: C.warnSoft, backgroundColor: "#fffbeb" }]}>
            <Text style={[s.kpiValue, { color: C.warn }]}>{summary.issueTasks}</Text>
            <Text style={s.kpiLabel}>Ada Isu / Catatan</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: C.badSoft, backgroundColor: "#fef2f2" }]}>
            <Text style={[s.kpiValue, { color: C.bad }]}>{summary.overdueTasks}</Text>
            <Text style={s.kpiLabel}>Tertunggak</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{summary.pendingTasks}</Text>
            <Text style={s.kpiLabel}>Akan Datang</Text>
          </View>
        </View>

        {/* Bahagian 1: Matriks Kalendar Tahunan */}
        <Text style={s.sectionTitle}>1. Matriks Jadual Penyelenggaraan Tahunan (12 Bulan)</Text>
        <Text style={s.sectionSubtitle}>
          Petunjuk status: [ ✓ ] Selesai · [ ! ] Ada Isu · [ • ] Belum Dibuat / Menunggu · [ × ] Tertunggak · [ - ] Tiada Jadual
        </Text>

        <View style={s.matrixTable}>
          <View style={s.matrixHeaderRow}>
            <Text style={[s.matrixColEquip, { fontFamily: "Helvetica-Bold" }]}>Peralatan & No. SRS</Text>
            {MONTH_NAMES_SHORT.map((m) => (
              <Text key={m} style={s.matrixColMonth}>{m}</Text>
            ))}
            <Text style={s.matrixColTotal}>Siap / Jumlah</Text>
          </View>

          {calendarMatrix.map((row, idx) => (
            <View key={idx} style={s.matrixRow}>
              <View style={s.matrixColEquip}>
                <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.ink }}>{row.equipment}</Text>
                <Text style={{ fontSize: 5.5, color: C.muted }}>{row.srs || "Tanpa SRS"} · {row.frequency}</Text>
              </View>

              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const cell = row.months[m] || { status: "NONE", count: 0 }
                let symbol = "-"
                let style = s.cellNone
                if (cell.status === "DONE") { symbol = `✓${cell.count > 1 ? cell.count : ""}`; style = s.cellDone }
                else if (cell.status === "ISSUE") { symbol = `!${cell.count > 1 ? cell.count : ""}`; style = s.cellIssue }
                else if (cell.status === "OVERDUE") { symbol = `×${cell.count > 1 ? cell.count : ""}`; style = s.cellOverdue }
                else if (cell.status === "PENDING") { symbol = `•${cell.count > 1 ? cell.count : ""}`; style = s.cellPending }

                return (
                  <Text key={m} style={[s.matrixColMonth, style]}>
                    {symbol}
                  </Text>
                )
              })}

              <Text style={s.matrixColTotal}>
                {row.totalCompleted}/{row.totalScheduled}
              </Text>
            </View>
          ))}
        </View>

        {/* Running Footer */}
        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>Borang SGMP-03 (Pindaan 2026) · Dokumen Terkawal Kualiti</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`}
          />
        </View>
      </Page>

      {/* Page 2+: Detailed Inspection Records & Sign-off Block */}
      <Page size="A4" orientation="portrait" style={s.page}>
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>BUBBLES O2 SDN. BHD. · LOG PEMERIKSAAN PM</Text>
          <Text style={s.runHeaderText}>{from} KE {to}</Text>
        </View>

        <Text style={s.sectionTitle}>2. Log Terperinci Rekod Pemeriksaan & Status Semasa</Text>
        <Text style={s.sectionSubtitle}>
          Menunjukkan rekod terperinci setiap tugasan mengikut tarikh patut, tarikh pelaksanaan, dan keputusan pemeriksaan.
        </Text>

        <View style={s.recordTable}>
          <View style={s.recordHeaderRow}>
            <Text style={[s.colNo, { fontFamily: "Helvetica-Bold" }]}>No</Text>
            <Text style={[s.colDue, { fontFamily: "Helvetica-Bold" }]}>Tarikh Patut</Text>
            <Text style={[s.colInspected, { fontFamily: "Helvetica-Bold" }]}>Tarikh Siap</Text>
            <Text style={[s.colEquip, { fontFamily: "Helvetica-Bold" }]}>Peralatan</Text>
            <Text style={[s.colTask, { fontFamily: "Helvetica-Bold" }]}>Arahan / Tugasan</Text>
            <Text style={[s.colPic, { fontFamily: "Helvetica-Bold" }]}>PIC / Pelaksana</Text>
            <Text style={[s.colStatus, { fontFamily: "Helvetica-Bold" }]}>Status & Keputusan</Text>
          </View>

          {records.length === 0 ? (
            <View style={{ padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, color: C.muted }}>Tiada rekod tugasan dalam julat tarikh yang dipilih.</Text>
            </View>
          ) : (
            records.map((r) => {
              let statusNode = <Text style={s.statusPending}>MENUNGGU</Text>
              if (r.status === "DONE") {
                statusNode = <Text style={s.statusDone}>✓ SELESAI (OK)</Text>
              } else if (r.status === "ISSUE") {
                statusNode = <Text style={s.statusIssue}>! ADA ISU</Text>
              } else if (r.status === "OVERDUE") {
                statusNode = <Text style={s.statusOverdue}>× TERTUNGGAK</Text>
              }

              return (
                <View key={r.index} style={s.recordRow} wrap={false}>
                  <Text style={s.colNo}>{r.index}</Text>
                  <Text style={s.colDue}>{r.dueDate}</Text>
                  <Text style={s.colInspected}>{r.inspectedDate || "-"}</Text>
                  <View style={s.colEquip}>
                    <Text style={{ fontFamily: "Helvetica-Bold", color: C.ink }}>{r.equipment}</Text>
                    {r.srs && <Text style={{ fontSize: 5.5, color: C.muted }}>SRS: {r.srs}</Text>}
                  </View>
                  <View style={s.colTask}>
                    <Text style={{ color: C.body }}>{r.checklist.slice(0, 2).join("; ")}</Text>
                    {r.checklist.length > 2 && (
                      <Text style={{ fontSize: 5.5, color: C.muted }}>+{r.checklist.length - 2} tugasan lagi</Text>
                    )}
                    {r.notes && (
                      <Text style={{ fontSize: 5.5, color: C.warn, marginTop: 1 }}>Catatan: {r.notes}</Text>
                    )}
                  </View>
                  <View style={s.colPic}>
                    <Text style={{ color: C.ink }}>{r.pics.join(", ") || "Belum ditugaskan"}</Text>
                    {r.completedBy && (
                      <Text style={{ fontSize: 5.5, color: C.muted }}>Disah: {r.completedBy}</Text>
                    )}
                  </View>
                  <View style={s.colStatus}>{statusNode}</View>
                </View>
              )
            })
          )}
        </View>

        {/* Bahagian 3: Pengesahan & Tandatangan Audit */}
        <View style={s.signBox} wrap={false}>
          <Text style={s.sectionTitle}>3. Pengesahan & Perakuan Audit</Text>
          <Text style={[s.sectionSubtitle, { marginBottom: 8 }]}>
            Dengan ini diperakui bahawa rekod penyelenggaraan di atas telah dilaksanakan mengikut piawaian SOP SGMP-03 dan panduan GMP yang berkuatkuasa.
          </Text>

          <View style={s.signGrid}>
            <View style={s.signCol}>
              <Text style={s.signTitle}>Disediakan Oleh</Text>
              <View style={s.signLine} />
              <Text style={s.signText}>Nama: {preparedBy}</Text>
              <Text style={s.signText}>Jawatan: Pegawai / PIC Penyelenggaraan</Text>
              <Text style={s.signText}>Tarikh: {generatedAt.split(",")[0]}</Text>
            </View>

            <View style={s.signCol}>
              <Text style={s.signTitle}>Disemak Oleh</Text>
              <View style={s.signLine} />
              <Text style={s.signText}>Nama: ________________________</Text>
              <Text style={s.signText}>Jawatan: Pengurus Kejuruteraan / Operasi</Text>
              <Text style={s.signText}>Tarikh: ________________________</Text>
            </View>

            <View style={s.signCol}>
              <Text style={s.signTitle}>Disahkan Oleh (Juruaudit)</Text>
              <View style={s.signLine} />
              <Text style={s.signText}>Nama Juruaudit: ________________</Text>
              <Text style={s.signText}>Badan / Bahagian: Quality Assurance</Text>
              <Text style={s.signText}>Status: [  ] Patuh  [  ] NCR Terbit</Text>
            </View>
          </View>
        </View>

        {/* Running Footer */}
        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>Borang SGMP-03 (Pindaan 2026) · Dokumen Terkawal Kualiti</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

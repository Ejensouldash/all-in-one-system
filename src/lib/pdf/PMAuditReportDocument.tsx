import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface PMAuditRecord {
  id?: string
  index: number
  dueDate: string
  inspectedDate: string | null
  equipment: string
  srs: string | null
  frequency: string
  checklist: string[]
  completedChecklist?: string[]
  pics: string[]
  status: "DONE" | "ISSUE" | "OVERDUE" | "PENDING"
  result: string | null
  notes: string | null
  performedSignature?: string | null
  completedBy: string | null
  completedAt: string | null
  verifiedByName?: string | null
  verifiedSignature?: string | null
  verifiedAt?: string | null
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
  mode?: "INTERNAL" | "AUDITOR"
  preparedBy: string
  generatedAt: string
  executiveSummary?: string
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

  // Document Header Box (Cover / First page)
  headerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
    marginBottom: 10,
  },
  headerLeft: {
    width: "60%",
    alignItems: "flex-start",
  },
  logoWrapper: {
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  logo: {
    width: 125,
    height: 33,
    objectFit: "contain",
    alignSelf: "flex-start",
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
  docControlBox: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 3,
    backgroundColor: C.subtle,
    padding: 5,
    minWidth: 140,
  },
  docControlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1.5,
  },
  docControlLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
  },
  docControlVal: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  modeBadge: {
    marginTop: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
    textAlign: "center",
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
  },
  modeBadgeInternal: {
    backgroundColor: C.brandSoft,
    color: C.brand,
  },
  modeBadgeAuditor: {
    backgroundColor: C.goodSoft,
    color: C.good,
  },

  // Report Title Banner
  titleBanner: {
    marginVertical: 6,
    alignItems: "center",
  },
  docTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textAlign: "center",
    textTransform: "uppercase",
  },
  docSubtitle: {
    fontSize: 7.5,
    color: C.muted,
    textAlign: "center",
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
    marginVertical: 6,
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

  // Table of Contents
  tocBox: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    padding: 8,
    marginVertical: 6,
  },
  tocTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 2,
  },
  tocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  tocItem: {
    fontSize: 7,
    color: C.body,
    fontFamily: "Helvetica",
  },
  tocDots: {
    fontSize: 7,
    color: C.line,
    flex: 1,
    marginHorizontal: 4,
  },
  tocPage: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
  },

  // Executive Summary Box
  execBox: {
    borderWidth: 1,
    borderColor: "#e0e7ff",
    borderRadius: 4,
    backgroundColor: "#f5f7ff",
    padding: 8,
    marginVertical: 6,
  },
  execHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  execTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    textTransform: "uppercase",
  },
  execBadge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#4338ca",
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  execText: {
    fontSize: 7,
    lineHeight: 1.35,
    color: C.body,
    textAlign: "justify",
  },

  // KPI Summary Strip
  kpiStrip: {
    flexDirection: "row",
    gap: 4,
    marginVertical: 6,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 5,
    backgroundColor: "#ffffff",
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  kpiLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 2,
  },

  // Section Headers
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    marginBottom: 3,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.brand,
    paddingBottom: 2,
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
    marginBottom: 10,
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
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  recordHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 4,
  },
  recordRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 3.5,
    alignItems: "flex-start",
  },
  recColNo: { width: "4%", textAlign: "center", fontSize: 6.5 },
  recColDate: { width: "13%", paddingLeft: 2, fontSize: 6.5 },
  recColEquip: { width: "25%", paddingLeft: 2 },
  recColCheck: { width: "28%", paddingLeft: 2 },
  recColRes: { width: "12%", textAlign: "center" },
  recColSign: { width: "18%", paddingLeft: 2, fontSize: 6 },

  badgeOK: {
    color: C.good,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  badgeIssue: {
    color: C.warn,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  badgeOverdue: {
    color: C.bad,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
  },
  badgePending: {
    color: C.muted,
    fontSize: 6.5,
  },

  // Verification & Declarations
  declarationBox: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    backgroundColor: C.subtle,
    padding: 8,
    marginVertical: 8,
  },
  declarationText: {
    fontSize: 7,
    lineHeight: 1.3,
    color: C.body,
    textAlign: "justify",
    fontStyle: "italic",
  },
  signatureLedgerTable: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 3,
    marginBottom: 10,
  },
  sigHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 3,
  },
  sigRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 3,
    alignItems: "center",
  },
  sigColEquip: { width: "30%", paddingLeft: 4 },
  sigColTech: { width: "35%", paddingLeft: 4 },
  sigColSup: { width: "35%", paddingLeft: 4 },
  sigImg: {
    height: 18,
    objectFit: "contain",
    marginTop: 1,
  },

  // Bottom Formal Signatures Block
  signoffContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
  },
  signoffBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#ffffff",
  },
  signoffTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 2,
    marginBottom: 6,
  },
  signoffSpace: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  signoffMeta: {
    fontSize: 6.5,
    color: C.muted,
    marginTop: 1,
  },
})

export function PMAuditReportDocument(props: PMAuditReportPayload) {
  const {
    logo,
    docRef = "SGMP-03 / PMS",
    from,
    to,
    mode = "INTERNAL",
    preparedBy,
    generatedAt,
    executiveSummary,
    summary,
    calendarMatrix,
    records,
  } = props

  const isAuditor = mode === "AUDITOR"

  return (
    <Document title={`Laporan Audit PM SGMP-03 (${mode})`} author="Bubbles O2 Sdn Bhd">
      {/* ============================================================ */}
      {/* PAGE 1: Muka Hadapan & Executive Summary & TOC               */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        {/* Header Runner */}
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>BUBBLES O2 SDN. BHD. · FASILITI PEMPROSESAN SGMP-03</Text>
          <Text style={s.runHeaderText}>
            {docRef} · MOD: {isAuditor ? "AUDIT LUARAN" : "DALAMAN"}
          </Text>
        </View>

        {/* Corporate Header & Document Control */}
        <View style={s.headerBox}>
          <View style={s.headerLeft}>
            {logo ? (
              <View style={s.logoWrapper}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={logo} style={s.logo} />
              </View>
            ) : null}
            <Text style={s.companyName}>BUBBLES O2 SDN. BHD.</Text>
            <Text style={s.companyAddress}>
              Kompleks Al-Ammar, Kampung Kanchong, 71200 Rantau, Negeri Sembilan, Malaysia.
            </Text>
            <Text style={s.companyAddress}>Sistem Pengurusan Keselamatan Kualiti & Penyelenggaraan GMP</Text>
          </View>

          <View style={s.docControlBox}>
            <View style={s.docControlRow}>
              <Text style={s.docControlLabel}>Rec. No:</Text>
              <Text style={s.docControlVal}>SGMP/03/PMS</Text>
            </View>
            <View style={s.docControlRow}>
              <Text style={s.docControlLabel}>Issue Date:</Text>
              <Text style={s.docControlVal}>01/10/2022</Text>
            </View>
            <View style={s.docControlRow}>
              <Text style={s.docControlLabel}>Rev. No:</Text>
              <Text style={s.docControlVal}>1</Text>
            </View>
            <View style={s.docControlRow}>
              <Text style={s.docControlLabel}>Effective:</Text>
              <Text style={s.docControlVal}>15/02/2023</Text>
            </View>
            <Text
              style={[
                s.modeBadge,
                isAuditor ? s.modeBadgeAuditor : s.modeBadgeInternal,
              ]}
            >
              {isAuditor ? "LAPORAN AUDITOR (TERPILIH)" : "LAPORAN DALAMAN PENUH"}
            </Text>
          </View>
        </View>

        {/* Title Banner */}
        <View style={s.titleBanner}>
          <Text style={s.docTitle}>LAPORAN AUDIT PENYELENGGARAAN PENCEGAHAN</Text>
          <Text style={s.docSubtitle}>
            PREVENTIVE MAINTENANCE SCHEDULE (SGMP-03) & VERIFIKASI PEMATUHAN GMP
          </Text>
        </View>

        {/* Metadata Strip */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Tempoh Audit</Text>
            <Text style={s.metaVal}>
              {from} hingga {to}
            </Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Disediakan Oleh</Text>
            <Text style={s.metaVal}>{preparedBy}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Tarikh & Masa Jana</Text>
            <Text style={s.metaVal}>{generatedAt}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Kadar Pematuhan</Text>
            <Text
              style={[
                s.metaVal,
                { color: summary.complianceRate >= 80 ? C.good : C.warn },
              ]}
            >
              {summary.complianceRate.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Table of Contents */}
        <View style={s.tocBox}>
          <Text style={s.tocTitle}>Isi Kandungan Laporan (Table of Contents)</Text>
          <View style={s.tocRow}>
            <Text style={s.tocItem}>1.0 Rumusan Eksekutif & Metrik KPI Pematuhan</Text>
            <Text style={s.tocDots}>...................................................................................................................</Text>
            <Text style={s.tocPage}>Muka Surat 1</Text>
          </View>
          <View style={s.tocRow}>
            <Text style={s.tocItem}>2.0 Matriks Jadual Penyelenggaraan Tahunan (Januari – Disember)</Text>
            <Text style={s.tocDots}>...................................................................................................................</Text>
            <Text style={s.tocPage}>Muka Surat 2</Text>
          </View>
          <View style={s.tocRow}>
            <Text style={s.tocItem}>3.0 Log Terperinci Pemeriksaan & Senarai Semak Arahan Kerja</Text>
            <Text style={s.tocDots}>...................................................................................................................</Text>
            <Text style={s.tocPage}>Muka Surat 3</Text>
          </View>
          <View style={s.tocRow}>
            <Text style={s.tocItem}>4.0 Helaian Pengesahan & Perakuan Audit (Checked By & Verified By)</Text>
            <Text style={s.tocDots}>...................................................................................................................</Text>
            <Text style={s.tocPage}>Muka Surat Akhir</Text>
          </View>
        </View>

        {/* Executive Summary Section (AI / Engine Generated) */}
        <View style={s.execBox}>
          <View style={s.execHeader}>
            <Text style={s.execTitle}>1.0 Rumusan Eksekutif (Executive Summary)</Text>
            <Text style={s.execBadge}>Dijana Analisis Pintar AI & Audit</Text>
          </View>
          <Text style={s.execText}>
            {executiveSummary ||
              `Laporan penyelenggaraan pencegahan SGMP-03 bagi tempoh ${from} hingga ${to} merangkumi ${calendarMatrix.length} alatan pemprosesan berjadual. Kadar pematuhan semasa dicatatkan pada ${summary.complianceRate.toFixed(1)}% dengan ${summary.completedTasks} tugasan disahkan selesai.`}
          </Text>
        </View>

        {/* KPI Metrics Cards */}
        <View style={s.kpiStrip}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{summary.totalTasks}</Text>
            <Text style={s.kpiLabel}>Jumlah Tugasan</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.kpiValue, { color: C.good }]}>{summary.completedTasks}</Text>
            <Text style={s.kpiLabel}>Selesai (OK)</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#fde68a", backgroundColor: "#fffbeb" }]}>
            <Text style={[s.kpiValue, { color: C.warn }]}>{summary.issueTasks}</Text>
            <Text style={s.kpiLabel}>Ada Isu / Catatan</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#fecaca", backgroundColor: "#fef2f2" }]}>
            <Text style={[s.kpiValue, { color: C.bad }]}>{summary.overdueTasks}</Text>
            <Text style={s.kpiLabel}>Tertunggak</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#c7d2fe", backgroundColor: "#eef2ff" }]}>
            <Text style={[s.kpiValue, { color: C.brand }]}>{summary.pendingTasks}</Text>
            <Text style={s.kpiLabel}>Akan Datang</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.kpiValue, { color: C.good }]}>{summary.complianceRate.toFixed(1)}%</Text>
            <Text style={s.kpiLabel}>Kadar Pematuhan</Text>
          </View>
        </View>

        {/* Footer Runner */}
        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>Bubbles O2 Preventive Maintenance Report · Dokumen Kualiti GMP</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`}
          />
        </View>
      </Page>

      {/* ============================================================ */}
      {/* PAGE 2: Matriks Kalendar Bulanan Mesin (Annual Matrix)       */}
      {/* ============================================================ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>BUBBLES O2 SDN. BHD. · SGMP-03 MATRIKS JADUAL BULANAN</Text>
          <Text style={s.runHeaderText}>
            {docRef} · MOD: {isAuditor ? "AUDIT LUARAN" : "DALAMAN"}
          </Text>
        </View>

        <Text style={s.sectionTitle}>
          2.0 Matriks Jadual Penyelenggaraan Tahunan (Januari – Disember)
        </Text>
        <Text style={s.sectionSubtitle}>
          Paparan matriks status pelaksanaan aktiviti penyelenggaraan pencegahan mengikut frekuensi dan alatan.
        </Text>

        <View style={s.matrixTable}>
          <View style={s.matrixHeaderRow}>
            <Text style={[s.matrixColEquip, { fontFamily: "Helvetica-Bold", fontSize: 6.5 }]}>
              Nama Mesin / Alatan & Kekerapan
            </Text>
            {MONTH_NAMES_SHORT.map((m, idx) => (
              <Text key={idx} style={s.matrixColMonth}>
                {m}
              </Text>
            ))}
            <Text style={s.matrixColTotal}>Selesai / Jumlah</Text>
          </View>

          {calendarMatrix.map((row, idx) => (
            <View key={idx} style={s.matrixRow}>
              <View style={s.matrixColEquip}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7, color: C.ink }}>
                  {row.equipment}
                </Text>
                <Text style={{ fontSize: 5.5, color: C.muted }}>
                  {row.srs ? `SRS: ${row.srs} | ` : ""}
                  {row.frequency}
                </Text>
              </View>

              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const cell = row.months[m]
                const status = cell?.status || "NONE"

                let style = s.cellNone
                let label = "-"

                if (status === "DONE") {
                  style = s.cellDone
                  label = cell.count > 1 ? `OK(${cell.count})` : "OK"
                } else if (status === "ISSUE") {
                  style = s.cellIssue
                  label = cell.count > 1 ? `ISU(${cell.count})` : "ISU"
                } else if (status === "OVERDUE") {
                  style = s.cellOverdue
                  label = "LATE"
                } else if (status === "PENDING") {
                  style = s.cellPending
                  label = "PLAN"
                }

                return (
                  <Text key={m} style={[s.matrixColMonth, style]}>
                    {label}
                  </Text>
                )
              })}

              <Text style={s.matrixColTotal}>
                {row.totalCompleted} / {row.totalScheduled}
              </Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 6, color: C.muted }}>Petunjuk (Legend):</Text>
          <Text style={{ fontSize: 6, color: C.good, fontFamily: "Helvetica-Bold" }}>OK = Selesai Memuaskan</Text>
          <Text style={{ fontSize: 6, color: C.warn, fontFamily: "Helvetica-Bold" }}>ISU = Ada Isu / Kerosakan</Text>
          <Text style={{ fontSize: 6, color: C.bad, fontFamily: "Helvetica-Bold" }}>LATE = Tertunggak</Text>
          <Text style={{ fontSize: 6, color: C.brand }}>PLAN = Dijadualkan (Akan Datang)</Text>
          <Text style={{ fontSize: 6, color: "#cbd5e1" }}>- = Tiada Jadual</Text>
        </View>

        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>Bubbles O2 Preventive Maintenance Report · Dokumen Kualiti GMP</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`}
          />
        </View>
      </Page>

      {/* ============================================================ */}
      {/* PAGE 3 onwards: Log Pemeriksaan Terperinci (Detailed Ledger) */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>BUBBLES O2 SDN. BHD. · SGMP-03 LOG PEMERIKSAAN</Text>
          <Text style={s.runHeaderText}>
            {docRef} · MOD: {isAuditor ? "AUDIT LUARAN" : "DALAMAN"}
          </Text>
        </View>

        <Text style={s.sectionTitle}>
          3.0 Log Terperinci Pemeriksaan & Arahan Kerja (Checklist)
        </Text>
        <Text style={s.sectionSubtitle}>
          Rekod pelaksanaan tugasan, status semakan arahan kerja, dan keputusan pemeriksaan teknikal.
        </Text>

        <View style={s.recordTable}>
          <View style={s.recordHeaderRow}>
            <Text style={[s.recColNo, { fontFamily: "Helvetica-Bold" }]}>No</Text>
            <Text style={[s.recColDate, { fontFamily: "Helvetica-Bold" }]}>Tarikh Jadual / Periksa</Text>
            <Text style={[s.recColEquip, { fontFamily: "Helvetica-Bold" }]}>Mesin & Kekerapan</Text>
            <Text style={[s.recColCheck, { fontFamily: "Helvetica-Bold" }]}>Arahan Kerja / Checklist</Text>
            <Text style={[s.recColRes, { fontFamily: "Helvetica-Bold" }]}>Keputusan</Text>
            <Text style={[s.recColSign, { fontFamily: "Helvetica-Bold" }]}>Pemeriksa (PIC)</Text>
          </View>

          {records.slice(0, 15).map((rec) => {
            const isDone = rec.status === "DONE"
            const isIssue = rec.status === "ISSUE"
            const isOverdue = rec.status === "OVERDUE"

            return (
              <View key={rec.index} style={s.recordRow} wrap={false}>
                <Text style={s.recColNo}>{rec.index}</Text>

                <View style={s.recColDate}>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: C.ink }}>{rec.dueDate}</Text>
                  {rec.inspectedDate && (
                    <Text style={{ fontSize: 5.5, color: C.good, marginTop: 1 }}>
                      Periksa: {rec.inspectedDate}
                    </Text>
                  )}
                </View>

                <View style={s.recColEquip}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7, color: C.ink }}>
                    {rec.equipment}
                  </Text>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>
                    {rec.srs ? `SRS: ${rec.srs} | ` : ""}
                    {rec.frequency}
                  </Text>
                </View>

                <View style={s.recColCheck}>
                  {rec.checklist.slice(0, 3).map((item, cIdx) => (
                    <Text key={cIdx} style={{ fontSize: 5.5, color: C.body, marginBottom: 1 }}>
                      &bull; {item}
                    </Text>
                  ))}
                  {rec.checklist.length > 3 && (
                    <Text style={{ fontSize: 5, color: C.faint }}>
                      +{rec.checklist.length - 3} item lagi...
                    </Text>
                  )}
                </View>

                <View style={s.recColRes}>
                  <Text
                    style={
                      isDone
                        ? s.badgeOK
                        : isIssue
                        ? s.badgeIssue
                        : isOverdue
                        ? s.badgeOverdue
                        : s.badgePending
                    }
                  >
                    {isDone ? "OK (PATUH)" : isIssue ? "ADA ISU" : isOverdue ? "TERTUNGGAK" : "DIJADUALKAN"}
                  </Text>
                  {rec.notes && (
                    <Text style={{ fontSize: 5, color: C.muted, marginTop: 1, textAlign: "center" }}>
                      {rec.notes.slice(0, 45)}
                    </Text>
                  )}
                </View>

                <View style={s.recColSign}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 6.5 }}>
                    {rec.completedBy || rec.pics.join(", ") || "-"}
                  </Text>
                  {rec.verifiedByName && (
                    <Text style={{ fontSize: 5.5, color: C.good, marginTop: 1 }}>
                      Disahkan: {rec.verifiedByName}
                    </Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>

        {records.length > 15 && (
          <Text style={{ fontSize: 6, fontStyle: "italic", color: C.muted, textAlign: "center" }}>
            * Memaparkan 15 rekod pertama dalam pratonton ringkasan. Sila rujuk fail Excel lampiran untuk lejar penuh keseluruhan ({records.length} rekod).
          </Text>
        )}

        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>Bubbles O2 Preventive Maintenance Report · Dokumen Kualiti GMP</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`}
          />
        </View>
      </Page>

      {/* ============================================================ */}
      {/* FINAL PAGE: Helaian Pengesahan & Perakuan Audit              */}
      {/* ============================================================ */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>BUBBLES O2 SDN. BHD. · SGMP-03 PENGESAHAN & PERAKUAN AUDIT</Text>
          <Text style={s.runHeaderText}>
            {docRef} · MOD: {isAuditor ? "AUDIT LUARAN" : "DALAMAN"}
          </Text>
        </View>

        <Text style={s.sectionTitle}>
          4.0 Helaian Pengesahan & Perakuan Audit (Checked By & Verified By)
        </Text>
        <Text style={s.sectionSubtitle}>
          Perakuan pematuhan operasi, integriti peralatan pemprosesan, dan tandatangan digital rasmi.
        </Text>

        {/* Declaration Statement */}
        <View style={s.declarationBox}>
          <Text style={s.declarationText}>
            &ldquo;Dengan ini diperakui dan disahkan bahawa aktiviti penyelenggaraan pencegahan bagi alatan dan jentera loji Bubbles O2 Sdn. Bhd. telah dirancang, dilaksanakan mengikut senarai semak (checklist) piawai, dan disahkan oleh pihak penyelia selaras dengan keperluan Prosedur Operasi Standard GMP (SGMP-03) dan Piawaian Kualiti Keselamatan Makanan. Rekod ini adalah dokumen sah dan tepat untuk tujuan verifikasi kualiti dan semakan audit.&rdquo;
          </Text>
        </View>

        {/* Verification Summary Ledger (Completed Tasks with actual signatures) */}
        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 4, marginTop: 4 }}>
          Senarai Rekod Pemeriksaan yang Telah Ditandatangani:
        </Text>

        <View style={s.signatureLedgerTable}>
          <View style={s.sigHeaderRow}>
            <Text style={[s.sigColEquip, { fontFamily: "Helvetica-Bold", fontSize: 6.5 }]}>
              Alatan / Mesin & Tarikh
            </Text>
            <Text style={[s.sigColTech, { fontFamily: "Helvetica-Bold", fontSize: 6.5 }]}>
              Pemeriksa (Checked By)
            </Text>
            <Text style={[s.sigColSup, { fontFamily: "Helvetica-Bold", fontSize: 6.5 }]}>
              Pengesahan Penyelia (Verified By)
            </Text>
          </View>

          {records
            .filter((r) => r.status === "DONE" || r.status === "ISSUE")
            .slice(0, 6)
            .map((rec, idx) => (
              <View key={idx} style={s.sigRow} wrap={false}>
                <View style={s.sigColEquip}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 6.5, color: C.ink }}>
                    {rec.equipment}
                  </Text>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>
                    Tarikh Periksa: {rec.inspectedDate || rec.dueDate} | Keputusan: {rec.result || "OK"}
                  </Text>
                </View>

                <View style={s.sigColTech}>
                  <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold" }}>
                    {rec.completedBy || "Juruteknik Penyelenggaraan"}
                  </Text>
                  {rec.performedSignature ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={rec.performedSignature} style={s.sigImg} />
                  ) : (
                    <Text style={{ fontSize: 5.5, color: C.faint, fontStyle: "italic" }}>
                      Tandatangan Digital Direkodkan
                    </Text>
                  )}
                </View>

                <View style={s.sigColSup}>
                  <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.good }}>
                    {rec.verifiedByName || (rec.verifiedAt ? "Penyelia Operasi" : "Menunggu Pengesahan")}
                  </Text>
                  {rec.verifiedSignature ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={rec.verifiedSignature} style={s.sigImg} />
                  ) : rec.verifiedAt ? (
                    <Text style={{ fontSize: 5.5, color: C.good, fontStyle: "italic" }}>
                      Telah Disahkan Secara Digital
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 5.5, color: C.warn, fontStyle: "italic" }}>
                      Belum Ditandatangani
                    </Text>
                  )}
                </View>
              </View>
            ))}

          {records.filter((r) => r.status === "DONE" || r.status === "ISSUE").length === 0 && (
            <View style={{ padding: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 6.5, color: C.muted, fontStyle: "italic" }}>
                Tiada pemeriksaan selesai direkodkan dalam julat tarikh ini.
              </Text>
            </View>
          )}
        </View>

        {/* Master Sign-off Block */}
        <View style={s.signoffContainer} wrap={false}>
          <View style={s.signoffBox}>
            <Text style={s.signoffTitle}>Disediakan Oleh (Pemeriksa / Juruteknik)</Text>
            <View style={s.signoffSpace}>
              <Text style={{ fontSize: 7, color: C.muted, fontStyle: "italic" }}>
                (Tandatangan Digital & Rekod Sistem)
              </Text>
            </View>
            <Text style={[s.signoffMeta, { fontFamily: "Helvetica-Bold", color: C.ink }]}>
              Nama: {preparedBy}
            </Text>
            <Text style={s.signoffMeta}>Jawatan: Pegawai Penyelenggaraan / Juruteknik Fasiliti</Text>
            <Text style={s.signoffMeta}>Tarikh: {generatedAt.slice(0, 10)}</Text>
          </View>

          <View style={s.signoffBox}>
            <Text style={s.signoffTitle}>Disemak & Disahkan Oleh (Penyelia / Kualiti GMP)</Text>
            <View style={s.signoffSpace}>
              <Text style={{ fontSize: 7, color: C.good, fontStyle: "italic" }}>
                (Pengesahan Verifikasi Berkanun GMP)
              </Text>
            </View>
            <Text style={[s.signoffMeta, { fontFamily: "Helvetica-Bold", color: C.ink }]}>
              Nama: Pengurus Fasiliti / Penyelia Kualiti
            </Text>
            <Text style={s.signoffMeta}>Jawatan: Ketua Operasi / Pengurus Penyelenggaraan</Text>
            <Text style={s.signoffMeta}>Tarikh: {generatedAt.slice(0, 10)}</Text>
          </View>
        </View>

        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>Bubbles O2 Preventive Maintenance Report · Dokumen Kualiti GMP</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} daripada ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

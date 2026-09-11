import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import { ruleLabel } from "@/lib/reminders/pm-core"

export interface PMVerificationOccurrence {
  id: string
  equipment: string
  srs: string | null
  dueDate: string
  inspectedDate: string | null
  checklist: string[]
  completedChecklist: string[]
  result: string | null
  notes: string | null
  completedByName: string
  performedSignature: string | null
  completedAt: string | Date | null
  verifiedByName: string
  verifiedSignature: string | null
  verifiedAt: string | Date | null
  schedule?: {
    intervalUnit: string
    intervalCount: number
  } | null
}

export interface PMVerificationReportPayload {
  logo?: string
  from: string
  to: string
  generatedAt: string
  preparedBy: string
  kpis: {
    totalCompleted: number
    totalVerified: number
    totalPending: number
    totalIssues: number
  }
  occurrences: PMVerificationOccurrence[]
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

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 35,
    paddingHorizontal: 28,
    fontSize: 7.5,
    color: C.body,
    fontFamily: "Helvetica",
  },
  runHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    paddingHorizontal: 28,
    paddingTop: 10,
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
    bottom: 14,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 4,
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
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
    marginBottom: 8,
  },
  headerLeft: {
    width: "65%",
    alignItems: "flex-start",
  },
  logoWrapper: {
    alignSelf: "flex-start",
    marginBottom: 3,
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
    minWidth: 155,
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
  badgeSupervisor: {
    marginTop: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
    textAlign: "center",
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    backgroundColor: C.brandSoft,
    color: C.brand,
  },

  // Title Banner
  titleBanner: {
    marginBottom: 6,
  },
  docTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  docSubtitle: {
    fontSize: 7,
    color: C.muted,
    marginTop: 1,
  },

  // KPI Strip
  kpiStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 3,
    backgroundColor: C.subtle,
    padding: 4,
    alignItems: "center",
  },
  kpiVal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  kpiLbl: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    marginTop: 1,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 3,
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  colNo: { width: "3%", textAlign: "center", fontSize: 6.5 },
  colSchedDate: { width: "9%", textAlign: "center", fontSize: 6.5 },
  colInspDate: { width: "9%", textAlign: "center", fontSize: 6.5 },
  colEquip: { width: "18%", paddingHorizontal: 3 },
  colFreq: { width: "8%", textAlign: "center", fontSize: 6.5 },
  colChecklist: { width: "23%", paddingHorizontal: 3 },
  colResult: { width: "8%", textAlign: "center" },
  colCheckedBy: { width: "11%", paddingHorizontal: 2 },
  colVerifiedBy: { width: "11%", paddingHorizontal: 2 },

  thText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    textAlign: "center",
  },

  badgeOK: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.good,
    backgroundColor: C.goodSoft,
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    borderRadius: 2,
    textAlign: "center",
  },
  badgeIssue: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.bad,
    backgroundColor: C.badSoft,
    paddingVertical: 1.5,
    paddingHorizontal: 3,
    borderRadius: 2,
    textAlign: "center",
  },

  sigImage: {
    height: 22,
    maxHeight: 22,
    objectFit: "contain",
    marginTop: 1,
    alignSelf: "flex-start",
  },

  // Declaration box
  declarationBox: {
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 3,
    backgroundColor: "#f0fdf4",
    padding: 6,
    marginBottom: 6,
  },
  declarationText: {
    fontSize: 6.5,
    fontStyle: "italic",
    color: "#166534",
    lineHeight: 1.3,
  },
})

export function PMVerificationReportDocument(props: PMVerificationReportPayload) {
  const { logo, from, to, generatedAt, preparedBy, kpis, occurrences } = props

  return (
    <Document
      title={`PM Verification Report SGMP-03 (${from} to ${to})`}
      author="Bubbles O2 Sdn Bhd"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header Runner */}
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>
            BUBBLES O2 SDN. BHD. · SGMP-03 PREVENTIVE MAINTENANCE VERIFICATION REPORT
          </Text>
          <Text style={s.runHeaderText}>
            PERIOD: {from} TO {to} · VERIFIED BY AUDIT
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
            <Text style={s.companyAddress}>
              Quality Safety & Good Manufacturing Practice (GMP) Maintenance System
            </Text>
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
            <Text style={s.badgeSupervisor}>SUPERVISOR VERIFICATION & SIGN-OFF</Text>
          </View>
        </View>

        {/* Title Banner */}
        <View style={s.titleBanner}>
          <Text style={s.docTitle}>
            PREVENTIVE MAINTENANCE VERIFICATION & SIGN-OFF REPORT (SGMP-03)
          </Text>
          <Text style={s.docSubtitle}>
            Official inspection record ledger with dual digital sign-offs (Inspector Checked By & Supervisor Verified By)
          </Text>
        </View>

        {/* KPI Strip */}
        <View style={s.kpiStrip}>
          <View style={s.kpiCard}>
            <Text style={s.kpiVal}>{kpis.totalCompleted}</Text>
            <Text style={s.kpiLbl}>Total Inspected</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }]}>
            <Text style={[s.kpiVal, { color: C.good }]}>{kpis.totalVerified}</Text>
            <Text style={s.kpiLbl}>Verified</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#fde68a", backgroundColor: "#fffbeb" }]}>
            <Text style={[s.kpiVal, { color: C.warn }]}>{kpis.totalPending}</Text>
            <Text style={s.kpiLbl}>Pending Verification</Text>
          </View>
          <View style={[s.kpiCard, { borderColor: "#fecaca", backgroundColor: "#fef2f2" }]}>
            <Text style={[s.kpiVal, { color: C.bad }]}>{kpis.totalIssues}</Text>
            <Text style={s.kpiLbl}>Issues Flagged</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiVal}>{preparedBy}</Text>
            <Text style={s.kpiLbl}>Generated By</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiVal}>{generatedAt.slice(0, 10)}</Text>
            <Text style={s.kpiLbl}>Report Date</Text>
          </View>
        </View>

        {/* Main Verification Ledger Table */}
        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <View style={s.colNo}>
              <Text style={s.thText}>No</Text>
            </View>
            <View style={s.colSchedDate}>
              <Text style={s.thText}>Scheduled</Text>
            </View>
            <View style={s.colInspDate}>
              <Text style={s.thText}>Inspected</Text>
            </View>
            <View style={s.colEquip}>
              <Text style={[s.thText, { textAlign: "left" }]}>Equipment Name & SRS</Text>
            </View>
            <View style={s.colFreq}>
              <Text style={s.thText}>Frequency</Text>
            </View>
            <View style={s.colChecklist}>
              <Text style={[s.thText, { textAlign: "left" }]}>Checklist / Remarks</Text>
            </View>
            <View style={s.colResult}>
              <Text style={s.thText}>Result</Text>
            </View>
            <View style={s.colCheckedBy}>
              <Text style={[s.thText, { textAlign: "left" }]}>Checked By</Text>
            </View>
            <View style={s.colVerifiedBy}>
              <Text style={[s.thText, { textAlign: "left" }]}>Verified By</Text>
            </View>
          </View>

          {occurrences.map((occ, idx) => {
            const freq = occ.schedule ? ruleLabel(occ.schedule) : "-"
            const isOk = occ.result === "OK"
            const isIssue = occ.result === "ISSUE"
            const isVerified = Boolean(occ.verifiedAt)

            return (
              <View key={occ.id || idx} style={s.tableRow} wrap={false}>
                <View style={s.colNo}>
                  <Text style={{ fontSize: 6.5, color: C.ink }}>{idx + 1}</Text>
                </View>

                <View style={s.colSchedDate}>
                  <Text style={{ fontSize: 6.5, color: C.ink, fontFamily: "Helvetica-Bold" }}>
                    {occ.dueDate}
                  </Text>
                </View>

                <View style={s.colInspDate}>
                  <Text style={{ fontSize: 6.5, color: C.good, fontFamily: "Helvetica-Bold" }}>
                    {occ.inspectedDate || "-"}
                  </Text>
                </View>

                <View style={s.colEquip}>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: C.ink }}>
                    {occ.equipment}
                  </Text>
                  {occ.srs && (
                    <Text style={{ fontSize: 5.5, color: C.muted, marginTop: 0.5 }}>
                      SRS: {occ.srs}
                    </Text>
                  )}
                </View>

                <View style={s.colFreq}>
                  <Text style={{ fontSize: 6, color: C.muted }}>{freq}</Text>
                </View>

                <View style={s.colChecklist}>
                  <Text style={{ fontSize: 6, color: C.body }}>
                    Checklist: {occ.completedChecklist?.length || 0} of {occ.checklist.length} done
                  </Text>
                  {occ.notes && (
                    <Text style={{ fontSize: 5.5, color: C.bad, marginTop: 1 }}>
                      Note: {occ.notes}
                    </Text>
                  )}
                </View>

                <View style={s.colResult}>
                  <Text style={isOk ? s.badgeOK : isIssue ? s.badgeIssue : s.badgeOK}>
                    {isOk ? "OK" : isIssue ? "ISSUE" : "-"}
                  </Text>
                </View>

                <View style={s.colCheckedBy}>
                  <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: C.ink }}>
                    {occ.completedByName || "Technician"}
                  </Text>
                  {occ.performedSignature ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={occ.performedSignature} style={s.sigImage} />
                  ) : (
                    <Text style={{ fontSize: 5, color: C.faint, fontStyle: "italic", marginTop: 1 }}>
                      Signed Digitally
                    </Text>
                  )}
                </View>

                <View style={s.colVerifiedBy}>
                  <Text
                    style={{
                      fontSize: 6,
                      fontFamily: "Helvetica-Bold",
                      color: isVerified ? C.good : C.warn,
                    }}
                  >
                    {occ.verifiedByName || (isVerified ? "Supervisor" : "Pending")}
                  </Text>
                  {occ.verifiedSignature ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={occ.verifiedSignature} style={s.sigImage} />
                  ) : isVerified ? (
                    <Text style={{ fontSize: 5, color: C.good, fontStyle: "italic", marginTop: 1 }}>
                      Verified Digitally
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 5, color: C.warn, fontStyle: "italic", marginTop: 1 }}>
                      Unsigned
                    </Text>
                  )}
                </View>
              </View>
            )
          })}

          {occurrences.length === 0 && (
            <View style={{ padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 7, color: C.muted, fontStyle: "italic" }}>
                No inspection records found for the selected period and criteria.
              </Text>
            </View>
          )}
        </View>

        {/* Declaration Statement */}
        <View style={s.declarationBox} wrap={false}>
          <Text style={s.declarationText}>
            &ldquo;I hereby certify and verify that all equipment preventive maintenance listed in this report has been planned, performed in accordance with standard operating procedures (SGMP-03), and verified with authentic digital signatures in compliance with Good Manufacturing Practice (GMP) quality standards.&rdquo;
          </Text>
        </View>

        {/* Footer Runner */}
        <View style={s.runFooter} fixed>
          <Text style={s.runFooterText}>
            Bubbles O2 Preventive Maintenance · SGMP-03 Supervisor Verification Report · Quality Assurance
          </Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

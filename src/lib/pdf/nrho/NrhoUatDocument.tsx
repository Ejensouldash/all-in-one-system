import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import {
  nrhoPalette,
  formatDateStr,
  BUBBLESO2_COMPANY_PROFILE,
} from "./nrho-pdf-utils"

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 36,
    paddingBottom: 38,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: nrhoPalette.body,
    backgroundColor: nrhoPalette.white,
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: nrhoPalette.navyDark,
    paddingBottom: 8,
  },
  logo: {
    width: 110,
    height: 36,
    marginBottom: 4,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    textAlign: "center",
  },
  companySub: {
    fontSize: 6.8,
    color: nrhoPalette.muted,
    textAlign: "center",
  },
  docTitleContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  docTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  docSubtitle: {
    fontSize: 7.5,
    color: nrhoPalette.blue,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  sectionTitle: {
    backgroundColor: "#FDBA74", // Orange accent header bar matching template
    borderWidth: 1,
    borderColor: "#EA580C",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#7C2D12",
    marginBottom: 0,
  },
  particularsTable: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: nrhoPalette.border,
    marginBottom: 12,
  },
  partRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  partColLeft: {
    width: "50%",
    flexDirection: "row",
    gap: 4,
  },
  partColRight: {
    width: "50%",
    flexDirection: "row",
    gap: 4,
  },
  fieldLabel: {
    width: "35%",
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
  },
  fieldValue: {
    width: "65%",
    fontSize: 7.2,
    color: nrhoPalette.body,
  },
  checklistHeader: {
    flexDirection: "row",
    backgroundColor: "#BAE6FD", // Soft blue table header matching template
    borderWidth: 1,
    borderColor: "#0284C7",
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.2,
    color: "#0369A1",
  },
  table: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: nrhoPalette.border,
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: nrhoPalette.borderLight,
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  colBil: { width: "6%", textAlign: "center" },
  colDesc: { width: "42%" },
  colInstall: { width: "18%", textAlign: "center" },
  colResult: { width: "16%", textAlign: "center" },
  colIssues: { width: "18%" },
  badgePass: {
    backgroundColor: nrhoPalette.emeraldSoft,
    color: nrhoPalette.emerald,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 3,
    textAlign: "center",
  },
  badgeFail: {
    backgroundColor: nrhoPalette.roseSoft,
    color: nrhoPalette.rose,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 3,
    textAlign: "center",
  },
  badgePending: {
    backgroundColor: nrhoPalette.bgCard,
    color: nrhoPalette.muted,
    fontSize: 6.5,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 3,
    textAlign: "center",
  },
  overallResultBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: nrhoPalette.border,
    backgroundColor: nrhoPalette.bgSubtle,
    padding: 8,
    borderRadius: 4,
    marginBottom: 14,
  },
  overallTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
  },
  overallBadge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  signGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: nrhoPalette.border,
    borderRadius: 4,
  },
  signCol: {
    width: "50%",
    padding: 8,
  },
  signColRight: {
    borderLeftWidth: 1,
    borderLeftColor: nrhoPalette.border,
  },
  signBoxTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 26,
  },
  signLine: {
    fontSize: 7,
    color: nrhoPalette.body,
    marginBottom: 3,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingTop: 6,
    fontSize: 6.5,
    color: nrhoPalette.muted,
  },
})

export interface NrhoUatDocumentProps {
  logoSource?: string
  project: {
    projectCode: string
    title: string
    siteLocation?: string | null
    clientOrDepartment?: string | null
  }
  uat: {
    testerName?: string | null
    testerPhone?: string | null
    testerLocation?: string | null
    testerAddress?: string | null
    startDate?: string | Date | null
    endDate?: string | Date | null
    overallResult?: string | null
    notes?: string | null
    testedBySign?: string | null
    testedByDate?: string | Date | null
    approvedBySign?: string | null
    approvedByDate?: string | Date | null
    items: Array<{
      id?: string
      itemDescription: string
      installationStatus: string
      testResult: string
      issues?: string | null
    }>
  }
}

export function NrhoUatDocument({ logoSource, project, uat }: NrhoUatDocumentProps) {
  const isPassed = uat.overallResult === "PASSED"
  const isFailed = uat.overallResult === "FAILED"

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoSource ? (
            <Image src={logoSource} style={styles.logo} />
          ) : (
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12 }}>BUBBLES O2</Text>
          )}
          <Text style={styles.companyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
          <Text style={styles.companySub}>
            {BUBBLESO2_COMPANY_PROFILE.addressInline} | Tel: {BUBBLESO2_COMPANY_PROFILE.phone}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.docTitleContainer}>
          <Text style={styles.docTitle}>FORM: USER ACCEPTANCE TEST (UAT)</Text>
          <Text style={styles.docSubtitle}>
            Project: {project.projectCode} — {project.title}
          </Text>
        </View>

        {/* Particulars Section (matches reference template) */}
        <Text style={styles.sectionTitle}>User &amp; Testing Particulars</Text>
        <View style={styles.particularsTable}>
          <View style={styles.partRow}>
            <View style={styles.partColLeft}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <Text style={styles.fieldValue}>{uat.testerName || "Not Specified"}</Text>
            </View>
            <View style={styles.partColRight}>
              <Text style={styles.fieldLabel}>Phone No:</Text>
              <Text style={styles.fieldValue}>{uat.testerPhone || "-"}</Text>
            </View>
          </View>

          <View style={styles.partRow}>
            <View style={styles.partColLeft}>
              <Text style={styles.fieldLabel}>Location:</Text>
              <Text style={styles.fieldValue}>{uat.testerLocation || project.siteLocation || "-"}</Text>
            </View>
            <View style={styles.partColRight}>
              <Text style={styles.fieldLabel}>Address / Dept:</Text>
              <Text style={styles.fieldValue}>
                {uat.testerAddress || project.clientOrDepartment || "-"}
              </Text>
            </View>
          </View>

          <View style={styles.partRow}>
            <View style={styles.partColLeft}>
              <Text style={styles.fieldLabel}>Start Date:</Text>
              <Text style={styles.fieldValue}>{formatDateStr(uat.startDate)}</Text>
            </View>
            <View style={styles.partColRight}>
              <Text style={styles.fieldLabel}>End Date:</Text>
              <Text style={styles.fieldValue}>{formatDateStr(uat.endDate)}</Text>
            </View>
          </View>
        </View>

        {/* Testing Table (matches reference template) */}
        <Text style={[styles.sectionTitle, { backgroundColor: "#BAE6FD", borderColor: "#0284C7", color: "#0369A1" }]}>
          Functional &amp; Deliverable Verification Checklist (Based on BQ)
        </Text>
        <View style={styles.table}>
          <View style={styles.checklistHeader}>
            <Text style={styles.colBil}>BIL</Text>
            <Text style={styles.colDesc}>VERIFICATION CHECKLIST / SPECIFICATION</Text>
            <Text style={styles.colInstall}>INSTALLATION</Text>
            <Text style={styles.colResult}>TEST RESULT</Text>
            <Text style={styles.colIssues}>ISSUES / REMARKS</Text>
          </View>

          {uat.items.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", paddingVertical: 10, color: nrhoPalette.muted }}>
                No checklist items recorded.
              </Text>
            </View>
          ) : (
            uat.items.map((it, idx) => {
              const isAlt = idx % 2 === 1
              return (
                <View key={it.id || idx} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.colBil, { color: nrhoPalette.muted }]}>{idx + 1}</Text>
                  <Text style={[styles.colDesc, { fontFamily: "Helvetica-Bold", color: nrhoPalette.navyDark }]}>
                    {it.itemDescription}
                  </Text>
                  <Text style={[styles.colInstall, { color: nrhoPalette.body }]}>
                    {it.installationStatus || "Completed"}
                  </Text>
                  <View style={styles.colResult}>
                    <Text
                      style={
                        it.testResult === "PASS"
                          ? styles.badgePass
                          : it.testResult === "FAIL"
                          ? styles.badgeFail
                          : styles.badgePending
                      }
                    >
                      {it.testResult === "PASS" ? "PASS / LULUS" : it.testResult === "FAIL" ? "FAIL / GAGAL" : it.testResult}
                    </Text>
                  </View>
                  <Text style={[styles.colIssues, { color: nrhoPalette.muted, fontSize: 6.8 }]}>
                    {it.issues || "-"}
                  </Text>
                </View>
              )
            })
          )}
        </View>

        {/* Overall Result Banner */}
        <View style={styles.overallResultBox}>
          <Text style={styles.overallTitle}>OVERALL UAT EVALUATION RESULT:</Text>
          <Text
            style={[
              styles.overallBadge,
              isPassed
                ? { backgroundColor: nrhoPalette.emeraldSoft, color: nrhoPalette.emerald }
                : isFailed
                ? { backgroundColor: nrhoPalette.roseSoft, color: nrhoPalette.rose }
                : { backgroundColor: nrhoPalette.amberSoft, color: nrhoPalette.amber },
            ]}
          >
            {uat.overallResult || "PENDING VERIFICATION"}
          </Text>
        </View>

        {/* Signatures Box (matches reference template) */}
        <View style={styles.signGrid}>
          <View style={styles.signCol}>
            <Text style={styles.signBoxTitle}>TESTER SIGNATURE (TANDATANGAN PENGUJI):</Text>
            <Text style={styles.signLine}>Signature: __________________________</Text>
            <Text style={styles.signLine}>Name: {uat.testedBySign || uat.testerName || "____________________"}</Text>
            <Text style={styles.signLine}>Date: {formatDateStr(uat.testedByDate || new Date())}</Text>
          </View>

          <View style={[styles.signCol, styles.signColRight]}>
            <Text style={styles.signBoxTitle}>VERIFIED / ACCEPTED BY CLIENT:</Text>
            <Text style={styles.signLine}>Signature: __________________________</Text>
            <Text style={styles.signLine}>Name: {uat.approvedBySign || "____________________"}</Text>
            <Text style={styles.signLine}>Date: {formatDateStr(uat.approvedByDate || new Date())}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Bubbles O2 Sdn. Bhd. — User Acceptance Test (UAT) Form</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

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
  formatRM,
  BUBBLESO2_COMPANY_PROFILE,
} from "./nrho-pdf-utils"

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 38,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: nrhoPalette.body,
    backgroundColor: nrhoPalette.white,
  },
  topAccentBar: {
    height: 3.5,
    backgroundColor: nrhoPalette.navyDark,
    borderRadius: 1.5,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: nrhoPalette.navyDark,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 320,
  },
  logo: {
    width: 105,
    height: 34,
    marginRight: 10,
    objectFit: "contain",
  },
  companyDetails: {
    width: 200,
  },
  companyName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 1,
  },
  companyText: {
    fontSize: 6.5,
    color: nrhoPalette.muted,
    lineHeight: 1.3,
  },
  headerRight: {
    width: 200,
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    textAlign: "right",
    marginBottom: 2,
  },
  docSubtitle: {
    fontSize: 7.5,
    color: nrhoPalette.blue,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginBottom: 3,
  },
  metaText: {
    fontSize: 7,
    color: nrhoPalette.muted,
    textAlign: "right",
  },
  projectBanner: {
    backgroundColor: nrhoPalette.bgSubtle,
    borderWidth: 1,
    borderColor: nrhoPalette.borderLight,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  projectTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 3,
  },
  projectDesc: {
    fontSize: 7.5,
    color: nrhoPalette.muted,
    marginBottom: 6,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: nrhoPalette.white,
    borderWidth: 1,
    borderColor: nrhoPalette.border,
    borderRadius: 4,
    padding: 6,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: nrhoPalette.muted,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  kpiVal: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: nrhoPalette.borderLight,
    paddingBottom: 3,
  },
  aiContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  aiParagraph: {
    fontSize: 7.5,
    color: nrhoPalette.body,
    lineHeight: 1.45,
    marginBottom: 6,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: nrhoPalette.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: nrhoPalette.navySoft,
    color: nrhoPalette.white,
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: nrhoPalette.bgSubtle,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 8,
  },
  signBox: {
    width: "46%",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.border,
    paddingTop: 6,
  },
  signTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 22,
  },
  signMeta: {
    fontSize: 7,
    color: nrhoPalette.body,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingTop: 6,
    fontSize: 6.5,
    color: nrhoPalette.muted,
  },
})

export interface NrhoFullReportDocumentProps {
  logoSource?: string
  project: {
    projectCode: string
    title: string
    description?: string | null
    siteLocation?: string | null
    projectManager?: string | null
    clientOrDepartment?: string | null
    startDate?: string | Date | null
    targetCompletionDate?: string | Date | null
    status: string
    totalBqAmount?: number | null
    aiSummary?: string | null
    tasks: Array<{
      id: string
      taskName: string
      assignedTo?: string | null
      plannedWeek: number
      currentWeek: number
      status: string
      progressPercent: number
    }>
    bqItems: Array<{
      id: string
      category: string
      description: string
      quantity: number
      unit: string
      unitRate: number
      amount: number
    }>
    uatSessions?: Array<{
      testerName?: string | null
      overallResult?: string | null
      startDate?: string | Date | null
      endDate?: string | Date | null
      items: Array<{
        itemDescription: string
        installationStatus: string
        testResult: string
        issues?: string | null
      }>
    }>
  }
}

export function NrhoFullReportDocument({ logoSource, project }: NrhoFullReportDocumentProps) {
  const totalTasks = project.tasks?.length || 0
  const completedTasks = project.tasks?.filter((t) => t.status === "COMPLETED").length || 0
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const totalBq = project.totalBqAmount || project.bqItems.reduce((acc, it) => acc + (it.amount || 0), 0)
  const latestUat = project.uatSessions?.[0]

  return (
    <Document>
      {/* Page 1: Executive Overview & AI Appraisal */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoSource ? (
              <Image src={logoSource} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>BUBBLES O2</Text>
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
              <Text style={styles.companyText}>{BUBBLESO2_COMPANY_PROFILE.addressInline}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>PROJECT DOSSIER REPORT</Text>
            <Text style={styles.docSubtitle}>COMPREHENSIVE EXECUTIVE AUDIT</Text>
            <Text style={styles.metaText}>Reference: {project.projectCode}</Text>
            <Text style={styles.metaText}>Date: {formatDateStr(new Date())}</Text>
          </View>
        </View>

        {/* Project Profile Banner */}
        <View style={styles.projectBanner}>
          <Text style={styles.projectTitle}>{project.title}</Text>
          {project.description && <Text style={styles.projectDesc}>{project.description}</Text>}

          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Physical Progress</Text>
              <Text style={[styles.kpiVal, { color: nrhoPalette.emerald }]}>{progressPercent}%</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>BQ Budget Total</Text>
              <Text style={styles.kpiVal}>{formatRM(totalBq)}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>Task Execution</Text>
              <Text style={styles.kpiVal}>
                {completedTasks} / {totalTasks} Done
              </Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiLabel}>UAT Sign-off</Text>
              <Text
                style={[
                  styles.kpiVal,
                  {
                    color:
                      latestUat?.overallResult === "PASSED"
                        ? nrhoPalette.emerald
                        : nrhoPalette.amber,
                  },
                ]}
              >
                {latestUat?.overallResult || "PENDING"}
              </Text>
            </View>
          </View>
        </View>

        {/* AI Executive Summary */}
        <Text style={styles.sectionTitle}>1. Executive Appraisal &amp; Performance Synthesis</Text>
        <View style={styles.aiContainer}>
          {project.aiSummary ? (
            project.aiSummary
              .split("\n\n")
              .filter((p) => p.trim().length > 0)
              .map((p, idx) => (
                <Text key={idx} style={styles.aiParagraph}>
                  {p.replace(/###?\s*/g, "")}
                </Text>
              ))
          ) : (
            <Text style={[styles.aiParagraph, { color: nrhoPalette.muted, fontStyle: "italic" }]}>
              No AI executive summary generated yet. Please trigger 'Generate / Refresh AI Summary' in the report tab to populate automated executive synthesis.
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Bubbles O2 Sdn. Bhd. — Full Project Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 2: Timeline & Task Schedule */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />
        <Text style={styles.sectionTitle}>2. Work Planning &amp; Timeline Execution</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "6%", textAlign: "center" }}>#</Text>
            <Text style={{ width: "42%" }}>Milestone Task Description</Text>
            <Text style={{ width: "20%" }}>Assigned PIC</Text>
            <Text style={{ width: "16%" }}>Week Schedule</Text>
            <Text style={{ width: "16%", textAlign: "center" }}>Status</Text>
          </View>

          {project.tasks.map((task, idx) => {
            const isAlt = idx % 2 === 1
            return (
              <View key={task.id} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={{ width: "6%", textAlign: "center", color: nrhoPalette.muted }}>
                  {idx + 1}
                </Text>
                <Text style={{ width: "42%", fontFamily: "Helvetica-Bold" }}>
                  {task.taskName}
                </Text>
                <Text style={{ width: "20%", color: nrhoPalette.body }}>
                  {task.assignedTo || "Unassigned"}
                </Text>
                <Text style={{ width: "16%", color: nrhoPalette.muted }}>
                  Week {task.currentWeek || task.plannedWeek || 1}
                </Text>
                <Text style={{ width: "16%", textAlign: "center", fontFamily: "Helvetica-Bold" }}>
                  {task.status}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Page 2: BQ Schedule */}
        <Text style={styles.sectionTitle}>3. Bill of Quantities (BQ) Financial Overview</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "6%", textAlign: "center" }}>#</Text>
            <Text style={{ width: "48%" }}>Trade Category &amp; Work Description</Text>
            <Text style={{ width: "10%", textAlign: "center" }}>Unit</Text>
            <Text style={{ width: "10%", textAlign: "center" }}>Qty</Text>
            <Text style={{ width: "13%", textAlign: "right" }}>Rate (RM)</Text>
            <Text style={{ width: "13%", textAlign: "right" }}>Total (RM)</Text>
          </View>

          {project.bqItems.map((item, idx) => {
            const isAlt = idx % 2 === 1
            return (
              <View key={item.id} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={{ width: "6%", textAlign: "center", color: nrhoPalette.muted }}>
                  {idx + 1}
                </Text>
                <View style={{ width: "48%" }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.description}</Text>
                  <Text style={{ fontSize: 6.2, color: nrhoPalette.muted }}>{item.category}</Text>
                </View>
                <Text style={{ width: "10%", textAlign: "center" }}>{item.unit}</Text>
                <Text style={{ width: "10%", textAlign: "center" }}>{item.quantity}</Text>
                <Text style={{ width: "13%", textAlign: "right" }}>{(item.unitRate || 0).toFixed(2)}</Text>
                <Text style={{ width: "13%", textAlign: "right", fontFamily: "Helvetica-Bold" }}>
                  {(item.amount || 0).toFixed(2)}
                </Text>
              </View>
            )
          })}

          <View style={[styles.tableRow, { backgroundColor: nrhoPalette.navyDark, paddingVertical: 5 }]}>
            <Text style={{ width: "74%", textAlign: "right", color: nrhoPalette.white, fontFamily: "Helvetica-Bold" }}>
              Total BQ Estimate:
            </Text>
            <Text style={{ width: "26%", textAlign: "right", color: nrhoPalette.white, fontFamily: "Helvetica-Bold", paddingRight: 4 }}>
              {formatRM(totalBq)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Bubbles O2 Sdn. Bhd. — Full Project Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Page 3: UAT Verification & Sign-off */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />
        <Text style={styles.sectionTitle}>4. User Acceptance Testing (UAT) Verification</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ width: "6%", textAlign: "center" }}>#</Text>
            <Text style={{ width: "46%" }}>Checklist Deliverable Item</Text>
            <Text style={{ width: "18%", textAlign: "center" }}>Installation</Text>
            <Text style={{ width: "15%", textAlign: "center" }}>Verification</Text>
            <Text style={{ width: "15%" }}>Remarks</Text>
          </View>

          {latestUat?.items && latestUat.items.length > 0 ? (
            latestUat.items.map((it, idx) => {
              const isAlt = idx % 2 === 1
              return (
                <View key={idx} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                  <Text style={{ width: "6%", textAlign: "center", color: nrhoPalette.muted }}>
                    {idx + 1}
                  </Text>
                  <Text style={{ width: "46%", fontFamily: "Helvetica-Bold" }}>
                    {it.itemDescription}
                  </Text>
                  <Text style={{ width: "18%", textAlign: "center" }}>
                    {it.installationStatus}
                  </Text>
                  <Text style={{ width: "15%", textAlign: "center", fontFamily: "Helvetica-Bold" }}>
                    {it.testResult}
                  </Text>
                  <Text style={{ width: "15%", color: nrhoPalette.muted, fontSize: 6.8 }}>
                    {it.issues || "-"}
                  </Text>
                </View>
              )
            })
          ) : (
            <View style={styles.tableRow}>
              <Text style={{ width: "100%", textAlign: "center", paddingVertical: 10, color: nrhoPalette.muted }}>
                UAT checklist has not been submitted yet.
              </Text>
            </View>
          )}
        </View>

        {/* Section 5: Formal Sign-off */}
        <Text style={styles.sectionTitle}>5. Project Closeout Signatures &amp; Endorsement</Text>
        <View style={styles.signatureRow}>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Prepared by Project Lead:</Text>
            <Text style={styles.signMeta}>Name: {project.projectManager || "Project Lead"}</Text>
            <Text style={styles.signMeta}>Designation: Project Manager</Text>
            <Text style={styles.signMeta}>Date: {formatDateStr(new Date())}</Text>
          </View>

          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Accepted by Department Head / Client:</Text>
            <Text style={styles.signMeta}>Name: _______________________________</Text>
            <Text style={styles.signMeta}>Designation: ________________________</Text>
            <Text style={styles.signMeta}>Date: _______________________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Bubbles O2 Sdn. Bhd. — Full Project Report</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

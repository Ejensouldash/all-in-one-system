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
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 36,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: nrhoPalette.body,
    backgroundColor: nrhoPalette.white,
  },
  topAccentBar: {
    height: 3,
    backgroundColor: nrhoPalette.blue,
    borderRadius: 1.5,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: nrhoPalette.borderLight,
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
  projectBannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  projectTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 3,
    maxWidth: 360,
  },
  projectDesc: {
    fontSize: 7.5,
    color: nrhoPalette.muted,
    marginBottom: 6,
    maxWidth: 360,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    backgroundColor: nrhoPalette.white,
    borderWidth: 1,
    borderColor: nrhoPalette.border,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navySoft,
  },
  progressBox: {
    width: 125,
    alignItems: "flex-end",
  },
  progressLabel: {
    fontSize: 6.8,
    color: nrhoPalette.muted,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  progressVal: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.emerald,
    marginBottom: 3,
  },
  progressBarBg: {
    width: "100%",
    height: 5,
    backgroundColor: nrhoPalette.borderLight,
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: nrhoPalette.emerald,
    borderRadius: 2.5,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: nrhoPalette.borderLight,
    paddingBottom: 3,
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
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: nrhoPalette.bgSubtle,
  },
  colNo: { width: "5%", textAlign: "center" },
  colTask: { width: "35%" },
  colPic: { width: "16%" },
  colDates: { width: "18%" },
  colStatus: { width: "14%", textAlign: "center" },
  colProgress: { width: "12%", textAlign: "right" },
  statusBadge: {
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  statusCompleted: {
    backgroundColor: nrhoPalette.emeraldSoft,
    color: nrhoPalette.emerald,
  },
  statusInProgress: {
    backgroundColor: nrhoPalette.blueSoft,
    color: nrhoPalette.blue,
  },
  statusDelayed: {
    backgroundColor: nrhoPalette.amberSoft,
    color: nrhoPalette.amber,
  },
  statusPending: {
    backgroundColor: nrhoPalette.bgCard,
    color: nrhoPalette.muted,
  },
  ganttWeekCol: {
    textAlign: "center",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
  },
  activeCell: {
    backgroundColor: nrhoPalette.blue,
    color: nrhoPalette.white,
    borderRadius: 2,
    textAlign: "center",
    paddingVertical: 1.5,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 10,
  },
  signBox: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.border,
    paddingTop: 6,
  },
  signTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 20,
  },
  signMeta: {
    fontSize: 7,
    color: nrhoPalette.body,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingTop: 6,
    fontSize: 6.5,
    color: nrhoPalette.muted,
  },
})

export interface NrhoTimelineDocumentProps {
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
    tasks: Array<{
      id: string
      taskName: string
      description?: string | null
      assignedTo?: string | null
      plannedWeek: number
      currentWeek: number
      startDate?: string | Date | null
      endDate?: string | Date | null
      status: string
      progressPercent: number
      rescheduleLogs?: Array<{
        fromWeek: number
        toWeek: number
        reason: string
        recordedBy: string
        createdAt: string | Date
      }>
    }>
  }
}

export function NrhoTimelineDocument({ logoSource, project }: NrhoTimelineDocumentProps) {
  const totalTasks = project.tasks?.length || 0
  const completedTasks = project.tasks?.filter((t) => t.status === "COMPLETED").length || 0
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const maxWeek = Math.max(
    4,
    ...project.tasks.map((t) => Math.max(t.plannedWeek || 1, t.currentWeek || 1))
  )
  // 12 columns still fit "100%"/"DONE" cells on A4 portrait; beyond that tasks would drop off the chart
  const weeks = Array.from({ length: Math.min(maxWeek, 12) }, (_, i) => i + 1)

  return (
    <Document>
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
              <Text style={styles.companyText}>
                Tel: {BUBBLESO2_COMPANY_PROFILE.phone} | Email: {BUBBLESO2_COMPANY_PROFILE.email}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>TIMELINE &amp; WORK PLAN</Text>
            <Text style={styles.docSubtitle}>MILESTONE SCHEDULE REPORT</Text>
            <Text style={styles.metaText}>Project Code: {project.projectCode}</Text>
            <Text style={styles.metaText}>Generated: {formatDateStr(new Date())}</Text>
          </View>
        </View>

        {/* Project Banner */}
        <View style={styles.projectBanner}>
          <View style={styles.projectBannerRow}>
            <View>
              <Text style={styles.projectTitle}>{project.title}</Text>
              {project.description && (
                <Text style={styles.projectDesc}>{project.description}</Text>
              )}
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>CODE: {project.projectCode}</Text>
                {project.siteLocation && (
                  <Text style={styles.badge}>LOCATION: {project.siteLocation}</Text>
                )}
                {project.projectManager && (
                  <Text style={styles.badge}>PIC: {project.projectManager}</Text>
                )}
                <Text style={styles.badge}>
                  SCHEDULE: {formatDateStr(project.startDate)} - {formatDateStr(project.targetCompletionDate)}
                </Text>
              </View>
            </View>

            <View style={styles.progressBox}>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressVal}>{progressPercent}%</Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, progressPercent)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.metaText, { marginTop: 3 }]}>
                {completedTasks} / {totalTasks} Tasks Done
              </Text>
            </View>
          </View>
        </View>

        {/* Gantt / Weekly Milestone Matrix */}
        <Text style={styles.sectionTitle}>1. Weekly Milestone Schedule Overview</Text>
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: nrhoPalette.navyDark }]}>
            <Text style={{ width: "4%", textAlign: "center" }}>#</Text>
            <Text style={{ width: "36%" }}>Milestone Task Description</Text>
            <Text style={{ width: "16%" }}>Assignee</Text>
            {weeks.map((w) => (
              <Text key={w} style={[{ width: `${44 / weeks.length}%` }, styles.ganttWeekCol]}>
                W{w}
              </Text>
            ))}
          </View>

          {project.tasks.map((task, idx) => {
            const isAlt = idx % 2 === 1
            const activeWeek = task.currentWeek || task.plannedWeek || 1
            return (
              <View key={task.id} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={{ width: "4%", textAlign: "center", color: nrhoPalette.muted }}>
                  {idx + 1}
                </Text>
                <Text style={{ width: "36%", fontFamily: "Helvetica-Bold" }}>
                  {task.taskName}
                </Text>
                <Text style={{ width: "16%", color: nrhoPalette.muted }}>
                  {task.assignedTo || "-"}
                </Text>
                {weeks.map((w) => {
                  const isCurrent = w === activeWeek
                  return (
                    <View
                      key={w}
                      style={{
                        width: `${44 / weeks.length}%`,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isCurrent ? (
                        <Text style={styles.activeCell}>
                          {task.status === "COMPLETED" ? "DONE" : `${task.progressPercent}%`}
                        </Text>
                      ) : (
                        <Text style={{ color: nrhoPalette.borderLight }}>·</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>

        {/* Detailed Week by Week Schedule */}
        <Text style={styles.sectionTitle}>2. Detailed Task Breakdown &amp; Execution Status</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colTask}>Task Name &amp; Scope</Text>
            <Text style={styles.colPic}>PIC</Text>
            <Text style={styles.colDates}>Schedule</Text>
            <Text style={styles.colStatus}>Status</Text>
            <Text style={styles.colProgress}>Progress</Text>
          </View>

          {project.tasks.map((task, idx) => {
            const isAlt = idx % 2 === 1
            const statusStyle =
              task.status === "COMPLETED"
                ? styles.statusCompleted
                : task.status === "IN_PROGRESS"
                ? styles.statusInProgress
                : task.status === "DELAYED"
                ? styles.statusDelayed
                : styles.statusPending

            return (
              <View key={task.id} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={[styles.colNo, { color: nrhoPalette.muted }]}>{idx + 1}</Text>
                <View style={styles.colTask}>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: nrhoPalette.navyDark }}>
                    {task.taskName}
                  </Text>
                  {task.description && (
                    <Text style={{ fontSize: 6.5, color: nrhoPalette.muted, marginTop: 1 }}>
                      {task.description}
                    </Text>
                  )}
                </View>
                <Text style={[styles.colPic, { color: nrhoPalette.body }]}>
                  {task.assignedTo || "Unassigned"}
                </Text>
                <Text style={[styles.colDates, { color: nrhoPalette.muted, fontSize: 6.8 }]}>
                  Week {task.currentWeek || task.plannedWeek || 1}
                  {task.plannedWeek !== task.currentWeek && ` (Rescheduled)`}
                </Text>
                <View style={styles.colStatus}>
                  <Text style={[styles.statusBadge, statusStyle]}>{task.status}</Text>
                </View>
                <Text style={[styles.colProgress, { fontFamily: "Helvetica-Bold" }]}>
                  {task.progressPercent || 0}%
                </Text>
              </View>
            )
          })}
        </View>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Prepared By (Project PIC):</Text>
            <Text style={styles.signMeta}>Name: {project.projectManager || "_____________________"}</Text>
            <Text style={styles.signMeta}>Date: {formatDateStr(new Date())}</Text>
          </View>

          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Acknowledged By (Management / Client):</Text>
            <Text style={styles.signMeta}>Name: _____________________</Text>
            <Text style={styles.signMeta}>Date: _____________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Bubbles O2 Project Management System — Confidential Document</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

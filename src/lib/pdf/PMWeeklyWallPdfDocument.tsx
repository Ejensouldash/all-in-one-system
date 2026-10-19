import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface PMWeeklyTask {
  id: string
  equipment: string
  srs: string | null
  frequency: string
  checklist: string[]
  picNames: string[]
  status: "DONE" | "ISSUE" | "OVERDUE" | "TODAY" | "UPCOMING"
  result?: string | null
}

export interface PMWeeklyDay {
  dayName: string
  dayNumber: number
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  tasks: PMWeeklyTask[]
}

export interface PMWeeklyWallPayload {
  logo?: string
  weekLabel: string
  dateRangeLabel: string
  days: PMWeeklyDay[]
  generatedAt: string
  totalScheduled: number
  totalCompleted: number
  totalOverdue: number
}

const C = {
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#cbd5e1",
  subtle: "#f8fafc",
  brand: "#4338ca",
  brandSoft: "#e0e7ff",
  good: "#15803d",
  goodSoft: "#dcfce7",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  bad: "#b91c1c",
  badSoft: "#fee2e2",
}

const s = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: 20,
    fontSize: 7,
    color: C.body,
    fontFamily: "Helvetica",
  },
  runHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 26,
    paddingHorizontal: 20,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  runHeaderText: {
    fontSize: 6,
    color: C.faint,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Corporate Header
  headerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: C.brand,
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 100,
    height: 26,
    objectFit: "contain",
  },
  titleGroup: {
    flexDirection: "column",
  },
  mainTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 6.5,
    color: C.muted,
    marginTop: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docCode: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
  },
  docMeta: {
    fontSize: 5.5,
    color: C.faint,
    marginTop: 1,
  },

  // Weekly Grid (7 Days)
  weekGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.line,
    flex: 1,
    minHeight: 410,
  },
  dayCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: C.line,
    padding: 3,
    backgroundColor: "#ffffff",
  },
  dayColLast: {
    borderRightWidth: 0,
  },
  dayColHeader: {
    backgroundColor: "#1e293b",
    marginHorizontal: -3,
    marginTop: -3,
    paddingVertical: 3,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  dayColHeaderText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  dayColDateText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#38bdf8",
    marginTop: 0.5,
  },

  // Task Card
  taskCard: {
    borderWidth: 0.5,
    borderColor: C.line,
    borderRadius: 2.5,
    padding: 2.5,
    marginBottom: 3,
    backgroundColor: "#fafafa",
  },
  taskEquip: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    lineHeight: 1.15,
  },
  taskMeta: {
    fontSize: 4.8,
    color: C.muted,
    marginTop: 1,
  },
  checklistRow: {
    marginTop: 1.5,
    paddingTop: 1.5,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
  },
  checklistItem: {
    fontSize: 4.5,
    color: C.body,
    lineHeight: 1.1,
    marginBottom: 0.5,
  },
  picBadge: {
    fontSize: 4.5,
    color: C.brand,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },

  pill: {
    alignSelf: "flex-start",
    paddingVertical: 0.8,
    paddingHorizontal: 2,
    borderRadius: 2,
    marginTop: 1.5,
  },
  pillText: {
    fontSize: 4.5,
    fontFamily: "Helvetica-Bold",
  },
  pillDone: { backgroundColor: C.goodSoft },
  pillDoneText: { color: C.good },
  pillIssue: { backgroundColor: C.warnSoft },
  pillIssueText: { color: C.warn },
  pillOverdue: { backgroundColor: C.badSoft },
  pillOverdueText: { color: C.bad },
  pillToday: { backgroundColor: "#fef3c7" },
  pillTodayText: { color: "#b45309" },
  pillUpcoming: { backgroundColor: C.brandSoft },
  pillUpcomingText: { color: C.brand },

  // Footer & Signatures
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 5,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  legendGroup: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  legendTitle: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendLabel: {
    fontSize: 5.5,
    color: C.body,
  },

  signoffGroup: {
    flexDirection: "row",
    gap: 20,
  },
  signoffBox: {
    width: 175,
  },
  signoffLine: {
    borderBottomWidth: 1.2,
    borderBottomColor: C.ink,
    height: 32,
    marginBottom: 3,
  },
  signoffLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.body,
    textAlign: "center",
  },
})

export function PMWeeklyWallPdfDocument(props: PMWeeklyWallPayload) {
  const { logo, weekLabel, dateRangeLabel, days, generatedAt } = props

  return (
    <Document
      title={`PM Weekly Work Schedule - ${weekLabel} (${dateRangeLabel})`}
      author="Bubbles O2 Sdn Bhd"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header Runner */}
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>
            BUBBLES O2 SDN. BHD. · SGMP-03 PREVENTIVE MAINTENANCE WEEKLY WORK SCHEDULE
          </Text>
          <Text style={s.runHeaderText}>
            EFFECTIVE: 15/02/2023 · REV: 1 · GENERATED: {generatedAt}
          </Text>
        </View>

        {/* Corporate Header */}
        <View style={s.headerBox}>
          <View style={s.headerLeft}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logo} style={s.logo} />
            ) : null}
            <View style={s.titleGroup}>
              <Text style={s.mainTitle}>
                {weekLabel} — PREVENTIVE MAINTENANCE DETAILED WORK SCHEDULE
              </Text>
              <Text style={s.subTitle}>
                Bubbles O2 Natural Mineral Water Plant · Period: {dateRangeLabel} · SOP SGMP-03
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            <Text style={s.docCode}>Rec. No: SGMP/03/PMWS</Text>
            <Text style={s.docMeta}>Noticeboard & Factory Floor Copy</Text>
          </View>
        </View>

        {/* 7-Day Columns */}
        <View style={s.weekGrid}>
          {days.map((day, dIdx) => {
            const isLast = dIdx === days.length - 1
            return (
              <View key={dIdx} style={[s.dayCol, isLast ? s.dayColLast : {}]}>
                <View style={s.dayColHeader}>
                  <Text style={s.dayColHeaderText}>{day.dayName}</Text>
                  <Text style={s.dayColDateText}>{day.dateStr.slice(5)}</Text>
                </View>

                {day.tasks.length === 0 ? (
                  <Text style={{ fontSize: 5, color: C.muted, fontStyle: "italic", textAlign: "center", marginTop: 8 }}>
                    No tasks scheduled
                  </Text>
                ) : (
                  day.tasks.map((task, tIdx) => {
                    let pillStyle = s.pillUpcoming
                    let textStyle = s.pillUpcomingText
                    if (task.status === "DONE") {
                      pillStyle = s.pillDone
                      textStyle = s.pillDoneText
                    } else if (task.status === "ISSUE") {
                      pillStyle = s.pillIssue
                      textStyle = s.pillIssueText
                    } else if (task.status === "OVERDUE") {
                      pillStyle = s.pillOverdue
                      textStyle = s.pillOverdueText
                    } else if (task.status === "TODAY") {
                      pillStyle = s.pillToday
                      textStyle = s.pillTodayText
                    }

                    return (
                      <View key={task.id || tIdx} style={s.taskCard}>
                        <Text style={s.taskEquip}>{task.equipment}</Text>
                        {task.srs && <Text style={s.taskMeta}>SRS: {task.srs}</Text>}

                        {task.checklist && task.checklist.length > 0 && (
                          <View style={s.checklistRow}>
                            {task.checklist.slice(0, 3).map((item, cIdx) => (
                              <Text key={cIdx} style={s.checklistItem}>
                                • {item.length > 32 ? item.slice(0, 30) + "…" : item}
                              </Text>
                            ))}
                            {task.checklist.length > 3 && (
                              <Text style={[s.checklistItem, { fontStyle: "italic", color: C.muted }]}>
                                +{task.checklist.length - 3} more items
                              </Text>
                            )}
                          </View>
                        )}

                        {task.picNames && task.picNames.length > 0 && (
                          <Text style={s.picBadge}>
                            PIC: {task.picNames.join(", ").length > 22
                              ? task.picNames.join(", ").slice(0, 20) + "…"
                              : task.picNames.join(", ")}
                          </Text>
                        )}

                        <View style={[s.pill, pillStyle]}>
                          <Text style={[s.pillText, textStyle]}>
                            {task.status === "DONE"
                              ? "DONE (OK)"
                              : task.status === "ISSUE"
                              ? "ISSUE"
                              : task.status === "OVERDUE"
                              ? "OVERDUE"
                              : task.status === "TODAY"
                              ? "DUE TODAY"
                              : "PLANNED"}
                          </Text>
                        </View>
                      </View>
                    )
                  })
                )}
              </View>
            )
          })}
        </View>

        {/* Footer with Legend and Sign-off Blocks */}
        <View style={s.footerContainer} wrap={false}>
          {/* Legend */}
          <View style={s.legendGroup}>
            <Text style={s.legendTitle}>Status Legend:</Text>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.good }]} />
              <Text style={s.legendLabel}>Completed</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.warn }]} />
              <Text style={s.legendLabel}>Issue</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.bad }]} />
              <Text style={s.legendLabel}>Overdue</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.brand }]} />
              <Text style={s.legendLabel}>Planned</Text>
            </View>
          </View>

          {/* Plant Sign-offs */}
          <View style={s.signoffGroup}>
            <View style={s.signoffBox}>
              <View style={s.signoffLine} />
              <Text style={s.signoffLabel}>Prepared By: Maintenance Lead</Text>
            </View>
            <View style={s.signoffBox}>
              <View style={s.signoffLine} />
              <Text style={s.signoffLabel}>Verified & Approved By: Production Manager</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

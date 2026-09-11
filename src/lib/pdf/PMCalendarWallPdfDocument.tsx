import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface PMCalendarWallTask {
  id: string
  equipment: string
  srs: string | null
  frequency: string
  status: "DONE" | "ISSUE" | "OVERDUE" | "TODAY" | "UPCOMING"
  result?: string | null
}

export interface PMCalendarWallDay {
  dayNumber: number
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  tasks: PMCalendarWallTask[]
}

export interface PMCalendarWallPayload {
  logo?: string
  year: number
  month: number
  monthName: string
  days: PMCalendarWallDay[]
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
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontSize: 7,
    color: C.body,
    fontFamily: "Helvetica",
  },
  runHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
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

  // Corporate Header Box
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
    width: 110,
    height: 29,
    objectFit: "contain",
  },
  titleGroup: {
    flexDirection: "column",
  },
  mainTitle: {
    fontSize: 13,
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

  // Weekday Header
  gridWeekHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  weekdayCol: {
    flex: 1,
    paddingVertical: 3.5,
    textAlign: "center",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },

  // Calendar Grid
  gridContainer: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  gridRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    minHeight: 62,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: C.line,
    padding: 2.5,
    backgroundColor: "#ffffff",
  },
  dayCellOtherMonth: {
    backgroundColor: "#f8fafc",
    opacity: 0.45,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  dayNum: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  dayNumToday: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: C.brand,
    borderRadius: 8,
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
  },
  taskBadgeCount: {
    fontSize: 5.5,
    color: C.faint,
    fontFamily: "Helvetica-Bold",
  },

  // Task Pill
  taskPill: {
    paddingVertical: 1.5,
    paddingHorizontal: 2.5,
    borderRadius: 2,
    marginBottom: 1.5,
  },
  taskText: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
  },

  pillDone: { backgroundColor: C.goodSoft },
  pillDoneText: { color: C.good },
  pillIssue: { backgroundColor: C.warnSoft },
  pillIssueText: { color: C.warn },
  pillOverdue: { backgroundColor: C.badSoft },
  pillOverdueText: { color: C.bad },
  pillToday: { backgroundColor: "#fef3c7", borderWidth: 0.5, borderColor: "#f59e0b" },
  pillTodayText: { color: "#b45309" },
  pillUpcoming: { backgroundColor: C.brandSoft },
  pillUpcomingText: { color: C.brand },

  // Footer & Signatures
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  legendGroup: {
    flexDirection: "row",
    gap: 10,
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
    gap: 2.5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 5.5,
    color: C.body,
  },

  signoffGroup: {
    flexDirection: "row",
    gap: 24,
  },
  signoffBox: {
    width: 140,
  },
  signoffLine: {
    borderBottomWidth: 1,
    borderBottomColor: C.muted,
    height: 14,
    marginBottom: 2,
  },
  signoffLabel: {
    fontSize: 5.5,
    color: C.muted,
    textAlign: "center",
  },
})

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

export function PMCalendarWallPdfDocument(props: PMCalendarWallPayload) {
  const { logo, year, monthName, days, generatedAt } = props

  // Partition days into 7-day weeks
  const weeks: PMCalendarWallDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <Document
      title={`PM Wall Calendar - ${monthName} ${year}`}
      author="Bubbles O2 Sdn Bhd"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Header Runner */}
        <View style={s.runHeader} fixed>
          <Text style={s.runHeaderText}>
            BUBBLES O2 SDN. BHD. · SGMP-03 PREVENTIVE MAINTENANCE DASHBOARD CALENDAR
          </Text>
          <Text style={s.runHeaderText}>
            EFFECTIVE: 15/02/2023 · REV: 1 · GENERATED: {generatedAt}
          </Text>
        </View>

        {/* Corporate Header & Month Title */}
        <View style={s.headerBox}>
          <View style={s.headerLeft}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logo} style={s.logo} />
            ) : null}
            <View style={s.titleGroup}>
              <Text style={s.mainTitle}>
                {monthName} {year} — PREVENTIVE MAINTENANCE SCHEDULE
              </Text>
              <Text style={s.subTitle}>
                Bubbles O2 Natural Mineral Water Plant · Preventive Maintenance SOP (SGMP-03)
              </Text>
            </View>
          </View>

          <View style={s.headerRight}>
            <Text style={s.docCode}>Rec. No: SGMP/03/PMS</Text>
            <Text style={s.docMeta}>Noticeboard & Factory Floor Copy</Text>
          </View>
        </View>

        {/* 7-Column Week Header */}
        <View style={s.gridWeekHeader}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={s.weekdayCol}>
              {w}
            </Text>
          ))}
        </View>

        {/* Calendar Grid Rows */}
        <View style={s.gridContainer}>
          {weeks.map((week, wIdx) => (
            <View key={wIdx} style={s.gridRow}>
              {week.map((day, dIdx) => {
                return (
                  <View
                    key={dIdx}
                    style={[
                      s.dayCell,
                      !day.isCurrentMonth ? s.dayCellOtherMonth : {},
                    ]}
                  >
                    <View style={s.dayHeader}>
                      <Text style={day.isToday ? s.dayNumToday : s.dayNum}>
                        {day.dayNumber}
                      </Text>
                      {day.tasks.length > 0 && (
                        <Text style={s.taskBadgeCount}>
                          {day.tasks.length} {day.tasks.length === 1 ? "task" : "tasks"}
                        </Text>
                      )}
                    </View>

                    {/* Task Pills */}
                    {day.tasks.slice(0, 4).map((task, tIdx) => {
                      const isDone = task.status === "DONE"
                      const isIssue = task.status === "ISSUE"
                      const isOverdue = task.status === "OVERDUE"
                      const isToday = task.status === "TODAY"

                      let pillStyle = s.pillUpcoming
                      let textStyle = s.pillUpcomingText

                      if (isDone) {
                        pillStyle = s.pillDone
                        textStyle = s.pillDoneText
                      } else if (isIssue) {
                        pillStyle = s.pillIssue
                        textStyle = s.pillIssueText
                      } else if (isOverdue) {
                        pillStyle = s.pillOverdue
                        textStyle = s.pillOverdueText
                      } else if (isToday) {
                        pillStyle = s.pillToday
                        textStyle = s.pillTodayText
                      }

                      return (
                        <View key={task.id || tIdx} style={[s.taskPill, pillStyle]}>
                          <Text style={[s.taskText, textStyle]}>
                            {task.equipment.length > 20
                              ? task.equipment.slice(0, 19) + "…"
                              : task.equipment}
                          </Text>
                        </View>
                      )
                    })}

                    {day.tasks.length > 4 && (
                      <Text style={{ fontSize: 5, color: C.muted, fontStyle: "italic" }}>
                        +{day.tasks.length - 4} more tasks
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>

        {/* Footer with Legend and Sign-off Blocks */}
        <View style={s.footerContainer} wrap={false}>
          {/* Legend */}
          <View style={s.legendGroup}>
            <Text style={s.legendTitle}>Status Legend:</Text>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.good }]} />
              <Text style={s.legendLabel}>Completed (OK)</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.warn }]} />
              <Text style={s.legendLabel}>Issue Reported</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.bad }]} />
              <Text style={s.legendLabel}>Overdue</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: C.brand }]} />
              <Text style={s.legendLabel}>Upcoming / Planned</Text>
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
              <Text style={s.signoffLabel}>Verified & Approved By: Plant QA Manager</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

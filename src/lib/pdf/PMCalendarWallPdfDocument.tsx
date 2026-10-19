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

  // Compact Dual-Column Grid for Busy Days (>4 tasks)
  compactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  compactTaskPill: {
    width: "48.5%",
    paddingVertical: 1,
    paddingHorizontal: 2,
    borderRadius: 2,
    marginBottom: 1.5,
  },
  compactTaskText: {
    fontSize: 4.6,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.05,
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
    gap: 20,
  },
  signoffBox: {
    width: 165,
  },
  signoffLine: {
    borderBottomWidth: 1.2,
    borderBottomColor: C.ink,
    height: 32,
    marginBottom: 4,
  },
  signoffLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.body,
    textAlign: "center",
  },

  // Daily Routine Reference Box in Footer
  routineRefBox: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 0.8,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  routineRefTitle: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: C.brand,
    marginBottom: 1.5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  routineRefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  routineRefItem: {
    width: "49%",
    marginBottom: 1,
  },
  routineRefZone: {
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  routineRefText: {
    fontSize: 4.6,
    color: C.body,
    lineHeight: 1.1,
  },
})

const WEEKDAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]

function getPillStyles(status: string) {
  if (status === "DONE") return { pill: s.pillDone, text: s.pillDoneText }
  if (status === "ISSUE") return { pill: s.pillIssue, text: s.pillIssueText }
  if (status === "OVERDUE") return { pill: s.pillOverdue, text: s.pillOverdueText }
  if (status === "TODAY") return { pill: s.pillToday, text: s.pillTodayText }
  return { pill: s.pillUpcoming, text: s.pillUpcomingText }
}

function processDayTasks(tasks: PMCalendarWallTask[]) {
  const routines = tasks.filter((t) => /daily routine/i.test(t.equipment))
  const periodic = tasks.filter((t) => !/daily routine/i.test(t.equipment))

  let groupedRoutine: { label: string; status: PMCalendarWallTask["status"] } | null = null
  if (routines.length >= 2) {
    const zones = Array.from(
      new Set(
        routines.map((t) => {
          const match = t.equipment.match(/zone\s*([a-z0-9]+)/i)
          return match ? match[1].toUpperCase() : t.equipment.replace(/daily routine/i, "").trim()
        })
      )
    ).filter(Boolean)

    let status: PMCalendarWallTask["status"] = "UPCOMING"
    if (routines.some((r) => r.status === "OVERDUE")) status = "OVERDUE"
    else if (routines.some((r) => r.status === "ISSUE")) status = "ISSUE"
    else if (routines.every((r) => r.status === "DONE")) status = "DONE"
    else if (routines.some((r) => r.status === "TODAY")) status = "TODAY"

    groupedRoutine = {
      label: `${routines.length}x Daily Routines (${zones.length ? `Zones ${zones.join(", ")}` : "All Zones"})`,
      status,
    }
    return { groupedRoutine, items: periodic }
  }

  return { groupedRoutine: null, items: tasks }
}

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

                    {(() => {
                      const { groupedRoutine, items } = processDayTasks(day.tasks)
                      const totalCount = (groupedRoutine ? 1 : 0) + items.length
                      const isBusy = totalCount > 4

                      return (
                        <>
                          {groupedRoutine && (
                            <View style={[s.taskPill, getPillStyles(groupedRoutine.status).pill, { marginBottom: 1.5 }]}>
                              <Text style={[s.taskText, getPillStyles(groupedRoutine.status).text, { fontSize: isBusy ? 4.8 : 5.5 }]}>
                                {groupedRoutine.label}
                              </Text>
                            </View>
                          )}

                          {isBusy ? (
                            <View style={s.compactRow}>
                              {items.slice(0, 12).map((task, tIdx) => {
                                const styles = getPillStyles(task.status)
                                return (
                                  <View key={task.id || tIdx} style={[s.compactTaskPill, styles.pill]}>
                                    <Text style={[s.compactTaskText, styles.text]}>
                                      {task.equipment.length > 18 ? task.equipment.slice(0, 17) + "…" : task.equipment}
                                    </Text>
                                  </View>
                                )
                              })}
                              {items.length > 12 && (
                                <Text style={{ width: "100%", fontSize: 4.5, color: C.muted, fontStyle: "italic", textAlign: "right" }}>
                                  +{items.length - 12} more
                                </Text>
                              )}
                            </View>
                          ) : (
                            items.map((task, tIdx) => {
                              const styles = getPillStyles(task.status)
                              return (
                                <View key={task.id || tIdx} style={[s.taskPill, styles.pill]}>
                                  <Text style={[s.taskText, styles.text]}>
                                    {task.equipment.length > 22 ? task.equipment.slice(0, 21) + "…" : task.equipment}
                                  </Text>
                                </View>
                              )
                            })
                          )}
                        </>
                      )
                    })()}
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

          {/* Daily Routine Reference Box */}
          <View style={s.routineRefBox}>
            <Text style={s.routineRefTitle}>Daily Routine Work Scope Reference (Mon – Sat):</Text>
            <View style={s.routineRefGrid}>
              <View style={s.routineRefItem}>
                <Text style={s.routineRefZone}>• Zone A (Well & Raw Tank):</Text>
                <Text style={s.routineRefText}>Crystal Ball & Sand Filter Backwash</Text>
              </View>
              <View style={s.routineRefItem}>
                <Text style={s.routineRefZone}>• Zone B (Water Filtration):</Text>
                <Text style={s.routineRefText}>Sand, Carbon, Hollow Membrane Backwash & UV Check</Text>
              </View>
              <View style={s.routineRefItem}>
                <Text style={s.routineRefZone}>• Zone D (RO System):</Text>
                <Text style={s.routineRefText}>PP RO Filter Change, Backwash & Conductivity Check</Text>
              </View>
              <View style={s.routineRefItem}>
                <Text style={s.routineRefZone}>• Zone E (Bottling Line):</Text>
                <Text style={s.routineRefText}>Autoscrambler, Rail Blower Clean & Filter Drain</Text>
              </View>
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

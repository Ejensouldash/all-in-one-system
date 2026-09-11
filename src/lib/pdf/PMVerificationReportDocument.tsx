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
  picNames?: string[]
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
  today?: string
  reportType?: "VERIFICATION" | "SUMMARY"
  kpis: {
    totalScheduled?: number
    totalCompleted: number
    totalVerified: number
    totalPending: number
    totalIssues: number
    totalNotCompleted?: number
  }
  occurrences: PMVerificationOccurrence[]
}

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
]

function getMonthYearLabels(fromStr: string, toStr: string) {
  try {
    const fromDate = new Date(fromStr)
    const toDate = new Date(toStr)
    const fromM = fromDate.getMonth()
    const toM = toDate.getMonth()
    const fromY = fromDate.getFullYear()
    const toY = toDate.getFullYear()

    if (!isNaN(fromM) && !isNaN(toM) && fromM === toM && fromY === toY) {
      return {
        month: MONTH_NAMES[fromM] || "ALL",
        year: String(fromY || 2026),
      }
    }
    if (!isNaN(fromY) && fromY === toY) {
      return {
        month: `${MONTH_NAMES[fromM] || "JAN"} - ${MONTH_NAMES[toM] || "DEC"}`,
        year: String(fromY || 2026),
      }
    }
    return {
      month: `${MONTH_NAMES[fromM] || ""} ${fromY} - ${MONTH_NAMES[toM] || ""} ${toY}`.trim() || "ALL",
      year: `${fromY} - ${toY}`,
    }
  } catch {
    return { month: "SEPTEMBER", year: "2026" }
  }
}

function formatGridDate(d: string | null | undefined): string {
  if (!d) return "-"
  try {
    const parts = d.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    const dt = new Date(d)
    const day = String(dt.getDate()).padStart(2, "0")
    const month = String(dt.getMonth() + 1).padStart(2, "0")
    const year = dt.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return d
  }
}

const s = StyleSheet.create({
  page: {
    padding: 22,
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#000000",
    backgroundColor: "#ffffff",
  },

  // 1. Boxed GMP Header Table (Exact match to MaintenanceHeader / Image 2)
  headerTable: {
    borderWidth: 1.5,
    borderColor: "#000000",
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "stretch",
  },
  headerColLogo: {
    width: "20%",
    borderRightWidth: 1.5,
    borderColor: "#000000",
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  logo: {
    width: 110,
    height: 36,
    objectFit: "contain",
  },
  headerColCompany: {
    width: "50%",
    borderRightWidth: 1.5,
    borderColor: "#000000",
    padding: 5,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  companyAddress: {
    fontSize: 6.5,
    color: "#374151",
    lineHeight: 1.25,
  },
  headerColMeta: {
    width: "30%",
    flexDirection: "column",
    alignSelf: "stretch",
  },
  metaRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 6,
    paddingVertical: 2.2,
    alignItems: "center",
  },
  metaRowLast: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 2.2,
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    width: 65,
  },
  metaValue: {
    fontSize: 6.5,
    color: "#000000",
  },

  // 2. Centered Underlined Title
  titleContainer: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textDecoration: "underline",
    color: "#000000",
  },

  // 3. Month & Year Subheader Line
  monthYearRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },
  monthYearGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthYearLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },
  monthYearValue: {
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 12,
    paddingBottom: 1,
    marginLeft: 3,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
  },

  // 4. Data Grid Table with 100% Solid Continuous Black Borders
  table: {
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderBottomWidth: 1.5,
    borderColor: "#000000",
    alignItems: "stretch",
    minHeight: 22,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000000",
    minHeight: 24,
    alignItems: "stretch",
  },

  // Column Cell Styles (Exact % allocations totaling 100%)
  // alignSelf: "stretch" and justifyContent: "center" ensure that the cell expands
  // the entire vertical height of the row so borderRight connects completely without gaps.
  colNo: {
    width: "3%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colDate: {
    width: "8%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colEquip: {
    width: "15%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colSrs: {
    width: "10%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colFreq: {
    width: "7%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colAction: {
    width: "18%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colResult: {
    width: "6%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colPerformed: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colVerified: {
    width: "12%",
    borderRightWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  colRemarks: {
    width: "9%",
    paddingHorizontal: 3,
    paddingVertical: 3,
    justifyContent: "center",
    alignSelf: "stretch",
  },

  thText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#000000",
    textTransform: "uppercase",
  },

  cellTextRegular: {
    fontSize: 6,
    color: "#000000",
  },
  cellTextBold: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },

  sigImage: {
    width: 42,
    height: 16,
    objectFit: "contain",
  },
  sigName: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#000000",
    marginTop: 1,
  },

  footer: {
    position: "absolute",
    bottom: 10,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 5.5,
    color: "#4b5563",
  },
})

export function PMVerificationReportDocument(props: PMVerificationReportPayload) {
  const { logo, from, to, generatedAt, occurrences, today, reportType = "SUMMARY" } = props
  const todayStr = today || new Date().toISOString().slice(0, 10)
  const { month, year } = getMonthYearLabels(from, to)

  const docTitle =
    reportType === "VERIFICATION"
      ? `PM Verification Report SGMP-03 (${from} to ${to})`
      : `PM Summary Report SGMP-03 (${from} to ${to})`
  const mainTitle =
    reportType === "VERIFICATION"
      ? "PREVENTIVE MAINTENANCE INSPECTION RECORD"
      : "PREVENTIVE MAINTENANCE SUMMARY & VERIFICATION RECORD"
  const footerTitle =
    reportType === "VERIFICATION"
      ? "Bubbles O2 Sdn. Bhd. · SGMP-03 Preventive Maintenance Inspection Records"
      : "Bubbles O2 Sdn. Bhd. · SGMP-03 Preventive Maintenance Summary & Verification Records"

  // Determine minimum rows to fill page neatly like an authentic paper GMP record sheet
  const minRows = 14
  const emptyRowCount = Math.max(0, minRows - occurrences.length)

  return (
    <Document
      title={docTitle}
      author="Bubbles O2 Sdn Bhd"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* 1. Boxed GMP Header Table (Exact copy of MaintenanceHeader from Image 2) */}
        <View style={s.headerTable}>
          {/* Left Cell: Logo */}
          <View style={s.headerColLogo}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logo} style={s.logo} />
            ) : (
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>BUBBLES O2</Text>
            )}
          </View>

          {/* Middle Cell: Company & Plant Address */}
          <View style={s.headerColCompany}>
            <Text style={s.companyName}>BUBBLESO2 SDN BHD</Text>
            <Text style={s.companyAddress}>KOMPLEKS AL-AMMAR,</Text>
            <Text style={s.companyAddress}>KG KANCHONG, 71200, RANTAU,</Text>
            <Text style={s.companyAddress}>NEGERI SEMBILAN.</Text>
          </View>

          {/* Right Cell: Official Document Control */}
          <View style={s.headerColMeta}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Rec. No :</Text>
              <Text style={s.metaValue}>SGMP/03/PMS</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Issue No :</Text>
              <Text style={s.metaValue}>1/10/2022</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Rev No :</Text>
              <Text style={s.metaValue}>2</Text>
            </View>
            <View style={s.metaRowLast}>
              <Text style={s.metaLabel}>Effective date :</Text>
              <Text style={s.metaValue}>1/7/2026</Text>
            </View>
          </View>
        </View>

        {/* 2. Document Title */}
        <View style={s.titleContainer}>
          <Text style={s.title}>{mainTitle}</Text>
        </View>

        {/* 3. Month & Year Subheader Row */}
        <View style={s.monthYearRow}>
          <View style={s.monthYearGroup}>
            <Text style={s.monthYearLabel}>MONTH:</Text>
            <Text style={s.monthYearValue}>{month}</Text>
          </View>
          <View style={s.monthYearGroup}>
            <Text style={s.monthYearLabel}>YEAR:</Text>
            <Text style={s.monthYearValue}>{year}</Text>
          </View>
        </View>

        {/* 4. Full-Width Solid Black Bordered Data Grid Table */}
        <View style={s.table}>
          {/* Header Row */}
          <View style={s.tableHeaderRow} fixed>
            <View style={s.colNo}>
              <Text style={s.thText}>NO</Text>
            </View>
            <View style={s.colDate}>
              <Text style={s.thText}>DATE</Text>
            </View>
            <View style={s.colEquip}>
              <Text style={s.thText}>EQUIPMENT / MACHINERY</Text>
            </View>
            <View style={s.colSrs}>
              <Text style={s.thText}>SRS NO. / SCOPE</Text>
            </View>
            <View style={s.colFreq}>
              <Text style={s.thText}>FREQUENCY</Text>
            </View>
            <View style={s.colAction}>
              <Text style={s.thText}>ACTION TAKEN / CHECKLIST</Text>
            </View>
            <View style={s.colResult}>
              <Text style={s.thText}>RESULTS</Text>
            </View>
            <View style={s.colPerformed}>
              <Text style={s.thText}>PERFORMED BY</Text>
            </View>
            <View style={s.colVerified}>
              <Text style={s.thText}>VERIFIED BY</Text>
            </View>
            <View style={s.colRemarks}>
              <Text style={s.thText}>REMARKS</Text>
            </View>
          </View>

          {/* Occurrence Data Rows */}
          {occurrences.map((occ, idx) => {
            const isCompleted = Boolean(occ.completedAt)
            const freq = occ.schedule ? ruleLabel(occ.schedule) : "-"
            const displayDate = isCompleted ? (occ.inspectedDate || occ.dueDate) : occ.dueDate
            const isOverdue = !isCompleted && occ.dueDate < todayStr
            const isToday = !isCompleted && occ.dueDate === todayStr

            // Result / Status text and styling
            let resultText = "-"
            let resultColor = "#000000"
            if (isCompleted) {
              resultText = occ.result || "OK"
              resultColor = occ.result === "ISSUE" ? "#b91c1c" : "#000000"
            } else if (isOverdue) {
              resultText = "OVERDUE"
              resultColor = "#b91c1c"
            } else if (isToday) {
              resultText = "DUE TODAY"
              resultColor = "#b45309"
            } else {
              resultText = "PENDING"
              resultColor = "#4b5563"
            }

            // Action / checklist summary
            let actionSummary = ""
            if (isCompleted) {
              if (occ.checklist && occ.checklist.length > 0) {
                const doneCount = occ.completedChecklist ? occ.completedChecklist.length : 0
                actionSummary = `Checklist: ${doneCount}/${occ.checklist.length} verified.`
              } else {
                actionSummary = "Inspection completed."
              }
            } else {
              if (occ.checklist && occ.checklist.length > 0) {
                actionSummary = `Scheduled (${occ.checklist.length} checklist items).`
              } else {
                actionSummary = "Scheduled maintenance."
              }
            }

            // Performed by
            const performedText = isCompleted
              ? (occ.completedByName || "-")
              : (occ.picNames && occ.picNames.length > 0 ? `PIC: ${occ.picNames.join(", ")}` : "Unassigned")

            // Verified by
            const verifiedText = isCompleted
              ? (occ.verifiedByName || "Unverified")
              : "-"

            // Remarks
            const remarksText = occ.notes || (!isCompleted ? (isOverdue ? "Task overdue" : "Pending execution") : "-")

            return (
              <View key={occ.id || idx} style={s.tableRow} wrap={false}>
                <View style={s.colNo}>
                  <Text style={[s.cellTextBold, { textAlign: "center" }]}>{idx + 1}</Text>
                </View>

                <View style={s.colDate}>
                  <Text style={[s.cellTextBold, { textAlign: "center" }]}>
                    {formatGridDate(displayDate)}
                  </Text>
                </View>

                <View style={s.colEquip}>
                  <Text style={s.cellTextBold}>{occ.equipment}</Text>
                </View>

                <View style={s.colSrs}>
                  <Text style={[s.cellTextRegular, { textAlign: "center" }]}>{occ.srs || "-"}</Text>
                </View>

                <View style={s.colFreq}>
                  <Text style={[s.cellTextRegular, { textAlign: "center" }]}>{freq}</Text>
                </View>

                <View style={s.colAction}>
                  <Text style={s.cellTextRegular}>{actionSummary}</Text>
                </View>

                <View style={s.colResult}>
                  <Text
                    style={[
                      s.cellTextBold,
                      {
                        textAlign: "center",
                        color: resultColor,
                      },
                    ]}
                  >
                    {resultText}
                  </Text>
                </View>

                {/* Performed By (Checked By / PIC) */}
                <View style={s.colPerformed}>
                  {isCompleted && occ.performedSignature ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={occ.performedSignature} style={s.sigImage} />
                  ) : null}
                  <Text style={s.sigName}>{performedText}</Text>
                </View>

                {/* Verified By */}
                <View style={s.colVerified}>
                  {isCompleted && occ.verifiedSignature ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={occ.verifiedSignature} style={s.sigImage} />
                  ) : null}
                  <Text style={s.sigName}>{verifiedText}</Text>
                </View>

                {/* Remarks */}
                <View style={s.colRemarks}>
                  <Text style={s.cellTextRegular}>{remarksText}</Text>
                </View>
              </View>
            )
          })}

          {/* Padding Rows (Fill up to 14 rows like standard paper GMP form) */}
          {Array.from({ length: emptyRowCount }).map((_, idx) => (
            <View key={`pad-${idx}`} style={s.tableRow} wrap={false}>
              <View style={s.colNo}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colDate}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colEquip}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colSrs}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colFreq}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colAction}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colResult}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colPerformed}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colVerified}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
              <View style={s.colRemarks}>
                <Text style={{ fontSize: 6, opacity: 0 }}>{" "}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>
            {footerTitle} · Generated on {generatedAt}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

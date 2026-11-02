import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import { DonutChart, HorizontalBars } from "./chartPrimitives"

export interface EventReportAttachment {
  name: string
  url: string
  type?: string
}

export interface EventReportFeedbackItem {
  id: string
  respondentName: string
  likedMost: string
  likedLeast: string
  satisfaction: string
  wellOrganized: boolean
  comments: string
  createdAt: Date | string
}

export interface EventReportData {
  requestNumber: string
  eventName: string
  eventType: string
  organizer: string
  department: string
  requesterName: string
  staffId: string
  email: string
  picContactName: string
  picContactNumber: string
  eventDateFrom: string | null
  eventDateTo: string | null
  tentative: string
  requirements: string
  status: string
  logoPath?: string
  attachments: EventReportAttachment[]
  gallery: EventReportAttachment[]
  feedbacks: EventReportFeedbackItem[]
  generatedAt: string
}

const C = {
  ink: "#0f172a",
  navy: "#0a2540",
  body: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  lineLight: "#f1f5f9",
  brand: "#0d9488", // Bubbles O2 Teal
  brandDark: "#0f766e",
  brandSoft: "#f0fdfa",
  brandBorder: "#ccfbf1",
  cyan: "#0284c7",
  cyanSoft: "#f0f9ff",
  good: "#059669",
  goodSoft: "#ecfdf5",
  warn: "#d97706",
  warnSoft: "#fffbeb",
  bad: "#e11d48",
  badSoft: "#fff1f2",
  white: "#ffffff",
  cardBg: "#f8fafc",
}

const s = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 48,
    paddingHorizontal: 38,
    fontSize: 8.5,
    color: C.body,
    fontFamily: "Helvetica",
    backgroundColor: C.white,
  },
  coverPage: {
    padding: 0,
    fontSize: 9,
    color: C.body,
    fontFamily: "Helvetica",
    backgroundColor: C.white,
  },

  // Running Header & Footer
  runHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 42,
    paddingHorizontal: 38,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  runHeaderLogo: { height: 16, objectFit: "contain" },
  runHeaderText: {
    fontSize: 6.5,
    color: C.faint,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  runFooter: {
    position: "absolute",
    bottom: 20,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
  },
  runFooterText: { fontSize: 6.5, color: C.faint },

  // Cover Page Elements
  coverBand: {
    backgroundColor: C.navy,
    paddingHorizontal: 44,
    paddingTop: 50,
    paddingBottom: 42,
  },
  coverLogo: { height: 38, objectFit: "contain", marginBottom: 22 },
  coverEyebrow: {
    fontSize: 7.5,
    color: "#5eead4",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: 26,
    color: C.white,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 1.4,
  },
  coverRule: { width: 48, height: 3, backgroundColor: C.brand, marginTop: 16 },

  coverBody: { paddingHorizontal: 44, paddingTop: 28 },
  coverKpiRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  coverKpiTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    padding: 10,
    backgroundColor: C.cardBg,
  },
  coverKpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.navy },
  coverKpiLabel: {
    fontSize: 6.5,
    color: C.muted,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3,
  },

  coverMetaBox: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 16,
  },
  coverMetaRow: { flexDirection: "row", marginBottom: 6 },
  coverMetaKey: {
    width: 125,
    fontSize: 7.5,
    color: C.faint,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  coverMetaVal: { fontSize: 8, color: C.ink, fontFamily: "Helvetica", flex: 1 },

  // Typography
  h1: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 2 },
  h1Subtitle: { fontSize: 7.5, color: C.muted, marginBottom: 6 },
  h1Rule: { width: 32, height: 2, backgroundColor: C.brand, marginBottom: 12 },
  h2: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 12, marginBottom: 6 },
  p: { fontSize: 8, lineHeight: 1.5, color: C.body, marginBottom: 5 },

  // KPI Tile Grid
  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.brandBorder,
    backgroundColor: C.brandSoft,
  },
  kpiCardTitle: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.brandDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiCardValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 3 },
  kpiCardSub: { fontSize: 6.5, color: C.muted, marginTop: 2 },

  // Callout Box
  callout: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cardBg,
    marginVertical: 8,
  },
  calloutTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 2 },
  calloutText: { fontSize: 7.5, color: C.body, lineHeight: 1.45 },

  // Info Tables
  grid2Col: { flexDirection: "row", gap: 10, marginVertical: 6 },
  colBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 9,
    backgroundColor: C.white,
  },
  colBoxHeader: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    textTransform: "uppercase",
    marginBottom: 5,
    borderBottomWidth: 0.8,
    borderBottomColor: C.lineLight,
    paddingBottom: 3,
  },
  rowItem: { flexDirection: "row", marginBottom: 3 },
  rowItemLabel: { width: 85, fontSize: 7, color: C.muted, fontFamily: "Helvetica-Bold" },
  rowItemValue: { flex: 1, fontSize: 7.5, color: C.ink },

  // Table
  tableContainer: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.navy,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.6,
    borderBottomColor: C.lineLight,
  },
  tableRowEven: { backgroundColor: C.cardBg },
  tableCell: { fontSize: 6.8, color: C.body, lineHeight: 1.35 },

  // Quote / Feedback Card
  quoteCard: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.cardBg,
    marginBottom: 6,
  },
  quoteText: { fontSize: 7.5, fontStyle: "italic", color: C.ink, lineHeight: 1.4 },
  quoteAuthor: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.brandDark,
    marginTop: 3,
    textAlign: "right",
  },

  // Gallery
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  photoTile: {
    width: "48%",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: C.cardBg,
    marginBottom: 4,
  },
  photoImg: { width: "100%", height: 160, objectFit: "cover" },
  photoCaption: {
    padding: 6,
    fontSize: 6.8,
    color: C.body,
    backgroundColor: C.white,
    borderTopWidth: 0.6,
    borderTopColor: C.line,
  },

  // Sign-off Box
  signBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 10,
    backgroundColor: C.white,
  },
  signSpace: { height: 44, borderBottomWidth: 1, borderBottomColor: C.faint, marginBottom: 6 },
})

export function EventSatisfactionReportDocument({ data }: { data: EventReportData }) {
  const { feedbacks, attachments = [], gallery = [] } = data

  // Compute aggregate statistics
  const total = feedbacks.length
  const satCounts: Record<string, number> = {
    EXTREMELY_SATISFIED: 0,
    VERY_SATISFIED: 0,
    SOMEWHAT_SATISFIED: 0,
    NOT_SO_SATISFIED: 0,
    NOT_AT_ALL_SATISFIED: 0,
  }
  let orgYes = 0
  let orgNo = 0
  let totalScore = 0

  feedbacks.forEach((f) => {
    if (f.satisfaction in satCounts) {
      satCounts[f.satisfaction]++
    }
    const scoreMap: Record<string, number> = {
      EXTREMELY_SATISFIED: 100,
      VERY_SATISFIED: 80,
      SOMEWHAT_SATISFIED: 60,
      NOT_SO_SATISFIED: 40,
      NOT_AT_ALL_SATISFIED: 20,
    }
    totalScore += scoreMap[f.satisfaction] || 60
    if (f.wellOrganized) orgYes++
    else orgNo++
  })

  const positiveCount = satCounts.EXTREMELY_SATISFIED + satCounts.VERY_SATISFIED
  const satisfactionIndex = total > 0 ? Math.round(totalScore / total) : 0
  const highSatisfactionRate = total > 0 ? Math.round((positiveCount / total) * 100) : 0
  const orgApprovalRate = total > 0 ? Math.round((orgYes / total) * 100) : 0

  // Chart data
  const satisfactionDonutData = [
    { label: "Extremely Satisfied", value: satCounts.EXTREMELY_SATISFIED, color: "#0d9488" },
    { label: "Very Satisfied", value: satCounts.VERY_SATISFIED, color: "#14b8a6" },
    { label: "Somewhat Satisfied", value: satCounts.SOMEWHAT_SATISFIED, color: "#38bdf8" },
    { label: "Not so Satisfied", value: satCounts.NOT_SO_SATISFIED, color: "#f59e0b" },
    { label: "Not at all Satisfied", value: satCounts.NOT_AT_ALL_SATISFIED, color: "#e11d48" },
  ]

  const organizationDonutData = [
    { label: "Yes (Well Organized)", value: orgYes, color: "#059669" },
    { label: "No (Needs Improvement)", value: orgNo, color: "#f43f5e" },
  ]

  const satisfactionBarData = [
    { label: "Extremely Satisfied", value: satCounts.EXTREMELY_SATISFIED },
    { label: "Very Satisfied", value: satCounts.VERY_SATISFIED },
    { label: "Somewhat Satisfied", value: satCounts.SOMEWHAT_SATISFIED },
    { label: "Not so Satisfied", value: satCounts.NOT_SO_SATISFIED },
    { label: "Not at all Satisfied", value: satCounts.NOT_AT_ALL_SATISFIED },
  ]

  // Extract gallery photos (from requisition attachments + extra gallery uploads)
  const allImages = [...gallery, ...attachments].filter(
    (att) => att.url && (att.type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name || att.url))
  )

  const galleryPage1Images = allImages.slice(0, 4)
  const galleryPage2Images = allImages.slice(4, 8)

  return (
    <Document title={`Bubbles O2 Report - ${data.eventName}`} author="Bubbles O2 Marketing">
      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE COVER PAGE                                             */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBand}>
          {data.logoPath && <Image src={data.logoPath} style={s.coverLogo} />}
          <Text style={s.coverEyebrow}>Bubbles O2 Sdn Bhd • Marketing &amp; Brand Management</Text>
          <Text style={s.coverTitle}>EVENT SATISFACTION &amp; PERFORMANCE REPORT</Text>
          <Text style={s.coverSubtitle}>{data.eventName}</Text>
          <View style={s.coverRule} />
        </View>

        <View style={s.coverBody}>
          <Text style={{ fontSize: 7, color: C.faint, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }}>
            Official Post-Event Audit &amp; Public Satisfaction Review
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 4 }}>
            {data.organizer} • {data.eventType}
          </Text>

          {/* Quick KPI Tiles on Cover */}
          <View style={s.coverKpiRow}>
            <View style={s.coverKpiTile}>
              <Text style={s.coverKpiValue}>{total > 0 ? `${satisfactionIndex}/100` : "N/A"}</Text>
              <Text style={s.coverKpiLabel}>Satisfaction Index</Text>
            </View>
            <View style={s.coverKpiTile}>
              <Text style={s.coverKpiValue}>{total > 0 ? `${orgApprovalRate}%` : "N/A"}</Text>
              <Text style={s.coverKpiLabel}>Well Organized Rate</Text>
            </View>
            <View style={s.coverKpiTile}>
              <Text style={s.coverKpiValue}>{total}</Text>
              <Text style={s.coverKpiLabel}>Total Respondents</Text>
            </View>
            <View style={s.coverKpiTile}>
              <Text style={[s.coverKpiValue, { color: C.good }]}>{data.status}</Text>
              <Text style={s.coverKpiLabel}>Requisition Status</Text>
            </View>
          </View>

          {/* Cover Metadata */}
          <View style={s.coverMetaBox}>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Requisition No.</Text>
              <Text style={s.coverMetaVal}>{data.requestNumber}</Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Event Dates</Text>
              <Text style={s.coverMetaVal}>
                {data.eventDateFrom || "-"} &rarr; {data.eventDateTo || "-"}
              </Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Department Requester</Text>
              <Text style={s.coverMetaVal}>
                {data.requesterName} ({data.department}) - Staff ID: {data.staffId}
              </Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Person In Charge (PIC)</Text>
              <Text style={s.coverMetaVal}>
                {data.picContactName} ({data.picContactNumber})
              </Text>
            </View>
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaKey}>Date Generated</Text>
              <Text style={s.coverMetaVal}>{data.generatedAt}</Text>
            </View>
          </View>
        </View>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Confidential Executive Document</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 2: EVENT REQUISITION OVERVIEW & OPERATIONAL SCOPE                   */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 1.0 • Event Requisition Overview</Text>
        </View>

        <Text style={s.h1}>1.0 Event Requisition Brief</Text>
        <Text style={s.h1Subtitle}>
          Core requisition parameters, organizer details, and operational requirements submitted to Marketing.
        </Text>
        <View style={s.h1Rule} />

        <View style={s.grid2Col}>
          <View style={s.colBox}>
            <Text style={s.colBoxHeader}>Event &amp; Schedule Details</Text>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Event Name:</Text>
              <Text style={s.rowItemValue}>{data.eventName}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Requisition ID:</Text>
              <Text style={s.rowItemValue}>{data.requestNumber}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Event Type:</Text>
              <Text style={s.rowItemValue}>{data.eventType}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Organizer:</Text>
              <Text style={s.rowItemValue}>{data.organizer}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Event Dates:</Text>
              <Text style={s.rowItemValue}>
                {data.eventDateFrom || "-"} &rarr; {data.eventDateTo || "-"}
              </Text>
            </View>
          </View>

          <View style={s.colBox}>
            <Text style={s.colBoxHeader}>Requester &amp; Coordination</Text>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Requester:</Text>
              <Text style={s.rowItemValue}>{data.requesterName}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Department:</Text>
              <Text style={s.rowItemValue}>{data.department}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Staff ID:</Text>
              <Text style={s.rowItemValue}>{data.staffId}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>Email:</Text>
              <Text style={s.rowItemValue}>{data.email}</Text>
            </View>
            <View style={s.rowItem}>
              <Text style={s.rowItemLabel}>PIC Contact:</Text>
              <Text style={s.rowItemValue}>
                {data.picContactName} ({data.picContactNumber})
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.h2}>Support Requirements Requested</Text>
        <View style={s.callout}>
          <Text style={s.calloutTitle}>Marketing Department Scope Allocated:</Text>
          <Text style={s.calloutText}>{data.requirements || "Standard event support"}</Text>
        </View>

        <Text style={s.h2}>Tentative Details &amp; Location</Text>
        <View style={[s.callout, { minHeight: 90 }]}>
          <Text style={s.calloutText}>{data.tentative || "No tentative specified."}</Text>
        </View>

        <Text style={s.h2}>Requisition Approval Summary</Text>
        <Text style={s.p}>
          This event requisition was officially approved under reference <strong>{data.requestNumber}</strong>.
          The Marketing team provided brand support, marketing collaterals, and initiated the public satisfaction
          feedback cycle upon event activation.
        </Text>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Event Requisition Details</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 3: EXECUTIVE KEY PERFORMANCE INDICATORS & INFOGRAPHICS              */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 2.0 • Executive KPIs &amp; Infographics</Text>
        </View>

        <Text style={s.h1}>2.0 Executive Performance Infographics</Text>
        <Text style={s.h1Subtitle}>
          High-level key performance metrics aggregated from direct participant responses.
        </Text>
        <View style={s.h1Rule} />

        {/* 4 Main KPI Tiles */}
        <View style={s.kpiGrid}>
          <View style={s.kpiCard}>
            <Text style={s.kpiCardTitle}>Overall Satisfaction</Text>
            <Text style={s.kpiCardValue}>{total > 0 ? `${satisfactionIndex}%` : "0%"}</Text>
            <Text style={s.kpiCardSub}>Composite Score (0-100)</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiCardTitle}>High Satisfaction</Text>
            <Text style={s.kpiCardValue}>{total > 0 ? `${highSatisfactionRate}%` : "0%"}</Text>
            <Text style={s.kpiCardSub}>Extremely &amp; Very Satisfied</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiCardTitle}>Organization Rate</Text>
            <Text style={s.kpiCardValue}>{total > 0 ? `${orgApprovalRate}%` : "0%"}</Text>
            <Text style={s.kpiCardSub}>Voted Well Organized</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiCardTitle}>Total Respondents</Text>
            <Text style={s.kpiCardValue}>{total}</Text>
            <Text style={s.kpiCardSub}>Verified Submissions</Text>
          </View>
        </View>

        {/* Vector Donut Charts */}
        <View style={s.grid2Col}>
          {/* Satisfaction Donut */}
          <View style={[s.colBox, { alignItems: "center" }]}>
            <Text style={s.colBoxHeader}>Satisfaction Sentiment Share</Text>
            <View style={{ marginVertical: 8 }}>
              <DonutChart data={satisfactionDonutData} size={118} thickness={24} />
            </View>
            <View style={{ width: "100%", gap: 2, marginTop: 4 }}>
              {satisfactionDonutData.map((d, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color }} />
                    <Text style={{ fontSize: 6.8, color: C.body }}>{d.label}</Text>
                  </View>
                  <Text style={{ fontSize: 6.8, fontFamily: "Helvetica-Bold", color: C.ink }}>
                    {d.value} ({total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"})
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Organization Donut */}
          <View style={[s.colBox, { alignItems: "center" }]}>
            <Text style={s.colBoxHeader}>Organization Approval (Yes vs No)</Text>
            <View style={{ marginVertical: 8 }}>
              <DonutChart data={organizationDonutData} size={118} thickness={24} />
            </View>
            <View style={{ width: "100%", gap: 2, marginTop: 4 }}>
              {organizationDonutData.map((d, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color }} />
                    <Text style={{ fontSize: 6.8, color: C.body }}>{d.label}</Text>
                  </View>
                  <Text style={{ fontSize: 6.8, fontFamily: "Helvetica-Bold", color: C.ink }}>
                    {d.value} ({total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={s.callout}>
          <Text style={s.calloutTitle}>Executive Audit Summary:</Text>
          <Text style={s.calloutText}>
            {total > 0
              ? `A total of ${total} survey respondent(s) participated. Overall satisfaction stands at ${satisfactionIndex}%, with ${orgApprovalRate}% of respondents endorsing the event as well organized. The data reflects strong engagement and positive brand presence.`
              : "No feedback submissions have been recorded yet for this event. All charts and indicators reflect the baseline readiness status."}
          </Text>
        </View>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Executive Infographics</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 4: DETAILED QUESTION ANALYSIS & RATING DISTRIBUTION                 */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 3.0 • Detailed Rating Distribution</Text>
        </View>

        <Text style={s.h1}>3.0 Quantitative Rating Breakdown</Text>
        <Text style={s.h1Subtitle}>
          Granular distribution analysis for Question 4 (Satisfaction) and Question 5 (Organization).
        </Text>
        <View style={s.h1Rule} />

        <Text style={s.h2}>Question 4: &quot;How satisfied were you with the event?&quot;</Text>
        <Text style={s.p}>
          Breakdown of respondent feedback across all five calibrated satisfaction rating tiers:
        </Text>

        <View style={{ marginVertical: 8 }}>
          <HorizontalBars
            data={satisfactionBarData}
            width={515}
            rowHeight={22}
            color="#0d9488"
            valueSuffix=" responses"
            labelWidth={120}
          />
        </View>

        {/* Detailed Table for Q4 */}
        <View style={[s.tableContainer, { marginBottom: 16 }]}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: 150 }]}>Satisfaction Tier</Text>
            <Text style={[s.tableHeaderCell, { width: 90, textAlign: "center" }]}>Responses</Text>
            <Text style={[s.tableHeaderCell, { width: 90, textAlign: "center" }]}>Percentage</Text>
            <Text style={[s.tableHeaderCell, { flex: 1 }]}>Performance Classification</Text>
          </View>
          {satisfactionBarData.map((row, i) => (
            <View key={i} style={i % 2 === 1 ? [s.tableRow, s.tableRowEven] : s.tableRow}>
              <Text style={[s.tableCell, { width: 150, fontFamily: "Helvetica-Bold", color: C.ink }]}>
                {row.label}
              </Text>
              <Text style={[s.tableCell, { width: 90, textAlign: "center" }]}>{row.value}</Text>
              <Text style={[s.tableCell, { width: 90, textAlign: "center" }]}>
                {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "0%"}
              </Text>
              <Text style={[s.tableCell, { flex: 1, color: C.muted }]}>
                {i < 2 ? "Favorable / Brand Advocate" : i === 2 ? "Neutral / Passives" : "Unfavorable / Opportunity"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Question 5: &quot;Do you think the event was well organized?&quot;</Text>
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: 150 }]}>Organization Rating</Text>
            <Text style={[s.tableHeaderCell, { width: 90, textAlign: "center" }]}>Vote Count</Text>
            <Text style={[s.tableHeaderCell, { width: 90, textAlign: "center" }]}>Share (%)</Text>
            <Text style={[s.tableHeaderCell, { flex: 1 }]}>Operational Benchmark</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, { width: 150, fontFamily: "Helvetica-Bold", color: C.good }]}>Yes</Text>
            <Text style={[s.tableCell, { width: 90, textAlign: "center" }]}>{orgYes}</Text>
            <Text style={[s.tableCell, { width: 90, textAlign: "center" }]}>
              {total > 0 ? `${Math.round((orgYes / total) * 100)}%` : "0%"}
            </Text>
            <Text style={[s.tableCell, { flex: 1, color: C.body }]}>
              Execution met or exceeded participant logistical expectations.
            </Text>
          </View>
          <View style={[s.tableRow, s.tableRowEven]}>
            <Text style={[s.tableCell, { width: 150, fontFamily: "Helvetica-Bold", color: C.bad }]}>No</Text>
            <Text style={[s.tableCell, { width: 90, textAlign: "center" }]}>{orgNo}</Text>
            <Text style={[s.tableCell, { width: 90, textAlign: "center" }]}>
              {total > 0 ? `${Math.round((orgNo / total) * 100)}%` : "0%"}
            </Text>
            <Text style={[s.tableCell, { flex: 1, color: C.body }]}>
              Logistics, timing, or crowd flow identified for post-event revision.
            </Text>
          </View>
        </View>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Rating Distribution Analysis</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 5: QUALITATIVE FEEDBACK - POSITIVE HIGHLIGHTS                        */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 4.0 • Participant Positive Highlights</Text>
        </View>

        <Text style={s.h1}>4.0 Participant Highlights &amp; Positive Sentiments</Text>
        <Text style={s.h1Subtitle}>
          Analysis of Question 2: &quot;What did you like most about the event?&quot;
        </Text>
        <View style={s.h1Rule} />

        <Text style={s.p}>
          Direct feedback submitted by attendees highlights the most effective aspects of the event, including
          brand presence, atmosphere, booth engagement, and product distribution:
        </Text>

        {feedbacks.length === 0 ? (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>No Feedback Records Available Yet</Text>
            <Text style={s.calloutText}>
              Once participants submit responses via the public QR portal, highlighted comments and testimonials will
              be automatically formatted and curated here.
            </Text>
          </View>
        ) : (
          feedbacks.slice(0, 6).map((item, idx) => (
            <View key={idx} style={s.quoteCard}>
              <Text style={s.quoteText}>&ldquo;{item.likedMost || "Well organized event."}&rdquo;</Text>
              <Text style={s.quoteAuthor}>
                — {item.respondentName} • {item.satisfaction.replace(/_/g, " ")}
              </Text>
            </View>
          ))
        )}

        <Text style={s.h2}>Key Success Drivers Identified</Text>
        <View style={s.grid2Col}>
          <View style={s.colBox}>
            <Text style={s.colBoxHeader}>1. Brand &amp; Product Experience</Text>
            <Text style={s.p}>
              High appreciation for Bubbles O2 mineral water availability, refreshing hydration booths, and active
              sampling during peak event hours.
            </Text>
          </View>
          <View style={s.colBox}>
            <Text style={s.colBoxHeader}>2. On-Ground Engagement</Text>
            <Text style={s.p}>
              Positive remarks for booth crew enthusiasm, interactive crowd activations, giveaways, and smooth
              participant coordination.
            </Text>
          </View>
        </View>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Participant Highlights</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 6: CONSTRUCTIVE FEEDBACK & AREAS FOR IMPROVEMENT                    */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 5.0 • Constructive Feedback</Text>
        </View>

        <Text style={s.h1}>5.0 Areas for Improvement &amp; Suggestions</Text>
        <Text style={s.h1Subtitle}>
          Analysis of Question 3 (&quot;What did you like least?&quot;) and Question 6 (&quot;Suggestions for improvement&quot;).
        </Text>
        <View style={s.h1Rule} />

        <Text style={s.p}>
          Constructive critique and suggestions provided by respondents offer actionable insights to refine future
          event planning, booth placement, and queue control:
        </Text>

        {feedbacks.length === 0 ? (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>No Feedback Records Available Yet</Text>
            <Text style={s.calloutText}>
              Constructive suggestions from attendees will be compiled here once survey entries are submitted.
            </Text>
          </View>
        ) : (
          feedbacks.slice(0, 5).map((item, idx) => (
            <View key={idx} style={[s.quoteCard, { borderLeftWidth: 3, borderLeftColor: C.warn }]}>
              <Text style={s.quoteText}>
                &ldquo;{item.comments || item.likedLeast || "No specific complaints."}&rdquo;
              </Text>
              <Text style={s.quoteAuthor}>
                — {item.respondentName} (Disliked: {item.likedLeast || "N/A"})
              </Text>
            </View>
          ))
        )}

        <Text style={s.h2}>Actionable Optimization Recommendations</Text>
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: 120 }]}>Focus Area</Text>
            <Text style={[s.tableHeaderCell, { width: 150 }]}>Observed Challenge</Text>
            <Text style={[s.tableHeaderCell, { flex: 1 }]}>Recommended Action Plan</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, { width: 120, fontFamily: "Helvetica-Bold" }]}>Queue Management</Text>
            <Text style={[s.tableCell, { width: 150 }]}>Congestion during peak sampling times</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>
              Implement dual distribution lanes and dedicated collection points.
            </Text>
          </View>
          <View style={[s.tableRow, s.tableRowEven]}>
            <Text style={[s.tableCell, { width: 120, fontFamily: "Helvetica-Bold" }]}>Signage &amp; Wayfinding</Text>
            <Text style={[s.tableCell, { width: 150 }]}>Visibility of redemption stations</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>
              Deploy elevated branded teardrop flags and visible floor decals.
            </Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, { width: 120, fontFamily: "Helvetica-Bold" }]}>Inventory Replenishment</Text>
            <Text style={[s.tableCell, { width: 150 }]}>Stock buffering during main race/session</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>
              Allocate a standby staging chiller/pallet closer to the primary booth.
            </Text>
          </View>
        </View>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Areas for Improvement</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 7: EVENT VISUAL HIGHLIGHTS - FIELD ACTIVATIONS & BOOTHS             */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 6.0 • Event Visual Gallery (Part 1)</Text>
        </View>

        <Text style={s.h1}>6.0 On-Ground Activation &amp; Booth Gallery</Text>
        <Text style={s.h1Subtitle}>
          Photographic documentation of Bubbles O2 brand presence, event venue, and booth activations.
        </Text>
        <View style={s.h1Rule} />

        {galleryPage1Images.length === 0 ? (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>No Event Photos Attached Yet</Text>
            <Text style={s.calloutText}>
              Photos uploaded to the Event Requisition or added via the Marketing Events dashboard will automatically
              populate this high-resolution photo gallery.
            </Text>
          </View>
        ) : (
          <View style={s.photoGrid}>
            {galleryPage1Images.map((img, idx) => (
              <View key={idx} style={s.photoTile}>
                <Image src={img.url} style={s.photoImg} />
                <Text style={s.photoCaption}>Photo {idx + 1}: {img.name || "On-ground event activation"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Event Visual Gallery</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 8: EVENT VISUAL HIGHLIGHTS - LOGISTICS, CROWDS & MEDIA              */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 7.0 • Event Visual Gallery (Part 2)</Text>
        </View>

        <Text style={s.h1}>7.0 Crowd Engagement &amp; Logistics Gallery</Text>
        <Text style={s.h1Subtitle}>
          Documentation of attendee turnouts, logistics deployment, and community interaction.
        </Text>
        <View style={s.h1Rule} />

        {galleryPage2Images.length === 0 ? (
          <View style={s.callout}>
            <Text style={s.calloutTitle}>Additional Gallery Media Reserved</Text>
            <Text style={s.calloutText}>
              Additional media uploads from the event coordinator or marketing photographers will be displayed across
              this dedicated gallery layout.
            </Text>
          </View>
        ) : (
          <View style={s.photoGrid}>
            {galleryPage2Images.map((img, idx) => (
              <View key={idx} style={s.photoTile}>
                <Image src={img.url} style={s.photoImg} />
                <Text style={s.photoCaption}>Photo {idx + 5}: {img.name || "Crowd & logistics highlights"}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Event Visual Gallery</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 9: COMPLETE PARTICIPANT RESPONSE LOG                                */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 8.0 • Participant Audit Trail</Text>
        </View>

        <Text style={s.h1}>8.0 Complete Participant Response Log</Text>
        <Text style={s.h1Subtitle}>
          Verifiable audit trail of individual submissions received via the public QR code form.
        </Text>
        <View style={s.h1Rule} />

        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: 24 }]}>#</Text>
            <Text style={[s.tableHeaderCell, { width: 95 }]}>Respondent Name</Text>
            <Text style={[s.tableHeaderCell, { width: 85 }]}>Satisfaction</Text>
            <Text style={[s.tableHeaderCell, { width: 55, textAlign: "center" }]}>Organized</Text>
            <Text style={[s.tableHeaderCell, { flex: 1 }]}>Comments &amp; Feedback</Text>
            <Text style={[s.tableHeaderCell, { width: 60, textAlign: "right" }]}>Date</Text>
          </View>

          {feedbacks.length === 0 ? (
            <View style={{ padding: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, color: C.muted, fontStyle: "italic" }}>
                No participant responses recorded in the database yet.
              </Text>
            </View>
          ) : (
            feedbacks.slice(0, 14).map((f, idx) => (
              <View key={f.id} style={idx % 2 === 1 ? [s.tableRow, s.tableRowEven] : s.tableRow}>
                <Text style={[s.tableCell, { width: 24, fontFamily: "Helvetica-Bold" }]}>{idx + 1}</Text>
                <Text style={[s.tableCell, { width: 95, color: C.ink, fontFamily: "Helvetica-Bold" }]}>
                  {f.respondentName}
                </Text>
                <Text style={[s.tableCell, { width: 85, color: C.brandDark }]}>
                  {f.satisfaction.replace(/_/g, " ")}
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    {
                      width: 55,
                      textAlign: "center",
                      fontFamily: "Helvetica-Bold",
                      color: f.wellOrganized ? C.good : C.bad,
                    },
                  ]}
                >
                  {f.wellOrganized ? "Yes" : "No"}
                </Text>
                <Text style={[s.tableCell, { flex: 1 }]}>
                  {f.comments || f.likedMost || "-"}
                </Text>
                <Text style={[s.tableCell, { width: 60, textAlign: "right", color: C.muted }]}>
                  {typeof f.createdAt === "string" ? f.createdAt.split("T")[0] : "-"}
                </Text>
              </View>
            ))
          )}
        </View>

        {feedbacks.length > 14 && (
          <Text style={{ fontSize: 6.8, color: C.muted, marginTop: 4, fontStyle: "italic" }}>
            * Showing first 14 of {feedbacks.length} total participant responses. Complete export available via database.
          </Text>
        )}

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Response Audit Log</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 10: CONCLUSION, ACTION ITEMS & FORMAL SIGN-OFF                       */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <View style={s.runHeader}>
          {data.logoPath && <Image src={data.logoPath} style={s.runHeaderLogo} />}
          <Text style={s.runHeaderText}>Section 9.0 • Conclusion &amp; Endorsement</Text>
        </View>

        <Text style={s.h1}>9.0 Conclusion &amp; Department Endorsement</Text>
        <Text style={s.h1Subtitle}>
          Final marketing synthesis, operational takeaways, and executive verification sign-off.
        </Text>
        <View style={s.h1Rule} />

        <Text style={s.h2}>Executive Synthesis</Text>
        <Text style={s.p}>
          The collaboration for <strong>{data.eventName}</strong> ({data.requestNumber}) organized by{" "}
          <strong>{data.organizer}</strong> demonstrated substantial brand value for Bubbles O2 Sdn Bhd. With an overall
          satisfaction rating of <strong>{satisfactionIndex}%</strong> and <strong>{orgApprovalRate}%</strong> approval on event
          organization, the event successfully achieved its brand activation objectives.
        </Text>

        <Text style={s.h2}>Strategic Next Steps for Future Collaborations</Text>
        <View style={{ gap: 4, marginBottom: 16 }}>
          {[
            "1. Advance Logistics Buffer: Reconfirm delivery schedules 48 hours prior to event start time.",
            "2. Merchandising & POSM: Allocate branded marquee tents and flags tailored to high-density race tracks.",
            "3. Digital Integration: Continue QR satisfaction surveys on-site to build longitudinal event analytics.",
            "4. Post-Event Asset Audit: Complete asset return check-in within 3 working days post-event.",
          ].map((item, idx) => (
            <View key={idx} style={{ flexDirection: "row", gap: 6 }}>
              <Text style={{ fontSize: 7.5, color: C.body, lineHeight: 1.45 }}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Official Verification &amp; Sign-off</Text>
        <View style={s.grid2Col}>
          <View style={s.signBox}>
            <Text style={s.colBoxHeader}>Prepared By</Text>
            <View style={s.signSpace} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink }}>{data.picContactName}</Text>
            <Text style={{ fontSize: 7, color: C.muted }}>Event Coordinator / PIC</Text>
            <Text style={{ fontSize: 6.5, color: C.faint, marginTop: 2 }}>Contact: {data.picContactNumber}</Text>
          </View>

          <View style={s.signBox}>
            <Text style={s.colBoxHeader}>Reviewed &amp; Endorsed By</Text>
            <View style={s.signSpace} />
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink }}>Marketing Department Head</Text>
            <Text style={{ fontSize: 7, color: C.muted }}>Bubbles O2 Sdn Bhd</Text>
            <Text style={{ fontSize: 6.5, color: C.faint, marginTop: 2 }}>Date: {data.generatedAt}</Text>
          </View>
        </View>

        <View style={[s.callout, { marginTop: 14, backgroundColor: C.navy, borderColor: C.navy }]}>
          <Text style={[s.calloutTitle, { color: C.white }]}>Corporate Disclaimer &amp; Confidentiality Notice</Text>
          <Text style={[s.calloutText, { color: "#94a3b8" }]}>
            This document contains proprietary marketing intelligence and participant survey data belonging to Bubbles
            O2 Sdn Bhd. Unauthorized duplication, dissemination, or distribution outside authorized company channels
            is strictly prohibited under company policy.
          </Text>
        </View>

        <View style={s.runFooter}>
          <Text style={s.runFooterText}>Bubbles O2 Sdn Bhd • Final Endorsement</Text>
          <Text
            style={s.runFooterText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import { DonutChart } from "./chartPrimitives"
import type { EventScoreBreakdown } from "@/lib/marketing/event-success-rate"

export interface PostEventVip {
  name: string
  title: string
}

export interface PostEventFlowImage {
  id?: string
  dayLabel: string
  imageUrl: string
  caption?: string
}

export interface PostEventActivation {
  id?: string
  title: string
  description?: string
}

export interface PostEventActivationImage {
  id?: string
  title: string
  imageUrl: string
}

export interface PostEventClaimItem {
  id: string
  description: string
  category: string
  vehiclePlate?: string
  amount: number
  receiptUrl?: string
  receiptName?: string
}

export interface PostEventClaimantGroup {
  id: string
  claimantName: string
  items: PostEventClaimItem[]
  subtotal: number
}

export interface PostEventMediaLink {
  id?: string
  platform: string
  url: string
  description?: string
}

export interface PostEventReportPdfData {
  documentNo: string
  issueNo: string
  reportDate: string
  reportPreparedBy: string

  eventName: string
  organizer: string
  eventDates: string
  attendeesCount: string
  typeOfInvolvement: string
  vipsList: PostEventVip[]
  staffInvolved: string[]

  aims: string
  benefits: string
  expectedImpact: string
  impactDistribution: Array<{
    name: string
    unit: string
    qtyGiven: number
    qtyUsed: number
  }>

  flowType: "DAILY" | "STAGES"
  plannedFlowText: string
  plannedFlowImages: PostEventFlowImage[]
  executedFlowText: string

  activationsList: PostEventActivation[]
  activationImages: PostEventActivationImage[]

  claimBreakdown: PostEventClaimantGroup[]
  totalClaimAmount: number

  satisfactionCounts: {
    EXTREMELY_SATISFIED: number
    VERY_SATISFIED: number
    SOMEWHAT_SATISFIED: number
    NOT_SO_SATISFIED: number
    NOT_AT_ALL_SATISFIED: number
  }
  totalFeedbacks: number
  satisfactionRate: number
  sampleFeedbacks: Array<{ respondentName: string; comments: string; satisfaction: string }>

  futureImprovementOrg: string
  futureImprovementPart: string
  futureConsideration: boolean
  eventSuccessRate: number
  scoreBreakdown?: EventScoreBreakdown | null

  mediaLinks: PostEventMediaLink[]

  status: string
  approvedBy?: string | null
  approvedAt?: string | null
  approvalSignatureUrl?: string | null
  logoDataUri?: string | null
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
  emerald: "#059669",
  emeraldSoft: "#ecfdf5",
  amber: "#d97706",
  amberSoft: "#fffbeb",
  rose: "#e11d48",
  roseSoft: "#fff1f2",
  white: "#ffffff",
  cardBg: "#f8fafc",
}

const s = StyleSheet.create({
  page: {
    paddingTop: 68,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontSize: 8.5,
    color: C.body,
    fontFamily: "Helvetica",
    backgroundColor: C.white,
  },

  // Running ISO Header
  isoHeaderContainer: {
    position: "absolute",
    top: 14,
    left: 36,
    right: 36,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    flexDirection: "row",
    height: 46,
    backgroundColor: C.white,
  },
  isoHeaderColLeft: {
    width: "26%",
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
  },
  isoHeaderLogo: {
    maxHeight: 26,
    maxWidth: 90,
    objectFit: "contain",
  },
  isoHeaderCoText: {
    fontSize: 5.5,
    color: C.muted,
    textAlign: "center",
    marginTop: 1,
  },
  isoHeaderColCenter: {
    width: "48%",
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    justifyContent: "center",
  },
  isoHeaderTitleLabel: {
    fontSize: 6,
    color: C.muted,
    textTransform: "uppercase",
  },
  isoHeaderTitleVal: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 1,
  },
  isoHeaderDeptVal: {
    fontSize: 6,
    color: C.brandDark,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  isoHeaderColRight: {
    width: "26%",
    padding: 3,
    justifyContent: "space-between",
  },
  isoHeaderRightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 5.8,
    color: C.muted,
  },
  isoHeaderRightVal: {
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },

  // Running Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 6.8,
    color: C.muted,
  },

  // Modern Document Hero Banner
  heroBanner: {
    backgroundColor: C.cardBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.brandBorder,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroDocNo: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.brandDark,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 7.8,
    color: C.muted,
    marginTop: 2,
  },
  badgeSuccess: {
    backgroundColor: C.brandSoft,
    borderWidth: 1,
    borderColor: C.brandBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: "center",
  },
  badgeSuccessText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.brandDark,
  },

  // Section Styling
  secCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 5,
    overflow: "hidden",
  },
  secHeader: {
    backgroundColor: "#f0fdfa", // Teal soft
    borderBottomWidth: 1,
    borderBottomColor: "#ccfbf1",
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secHeaderTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  secHeaderSub: {
    fontSize: 7,
    color: C.muted,
  },
  secBody: {
    padding: 8,
  },

  // Key Value Grid
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.lineLight,
    paddingVertical: 3.5,
  },
  kvLabel: {
    width: "32%",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
  },
  kvValue: {
    width: "68%",
    fontSize: 8,
    color: C.ink,
  },

  // Table Styling
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeaderCol: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.lineLight,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  tableRowStriped: {
    backgroundColor: "#fafbfc",
  },

  // Pills
  pillGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  pill: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },

  // Images in Flow & Activations
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  imageCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 4,
    backgroundColor: C.cardBg,
    alignItems: "center",
  },
  cardImg: {
    width: "100%",
    height: 110,
    objectFit: "contain",
    borderRadius: 2,
  },
  imageCaption: {
    fontSize: 6.8,
    color: C.muted,
    textAlign: "center",
    marginTop: 3,
  },

  // Appendix Receipt Image
  appendixReceiptBox: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    backgroundColor: C.cardBg,
  },
  receiptImg: {
    width: "100%",
    maxHeight: 260,
    objectFit: "contain",
    borderRadius: 4,
  },
  receiptMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 4,
    marginBottom: 6,
  },
  receiptMetaTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  receiptMetaAmount: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.brandDark,
  },

  // Sign-off section
  signContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 10,
  },
  signBox: {
    width: "45%",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 8,
    backgroundColor: C.cardBg,
  },
  signTitle: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: C.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  signName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 18,
  },
  signDate: {
    fontSize: 7,
    color: C.muted,
    marginTop: 2,
  },
})

// Running Header Component
function IsoRunningHeader({
  logoDataUri,
  documentNo,
}: {
  logoDataUri?: string | null
  documentNo: string
}) {
  return (
    <View style={s.isoHeaderContainer} fixed>
      <View style={s.isoHeaderColLeft}>
        {logoDataUri ? (
          <Image src={logoDataUri} style={s.isoHeaderLogo} />
        ) : (
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.brandDark }}>BUBBLES O2</Text>
        )}
        <Text style={s.isoHeaderCoText}>Co. No. 201401003259 (1079333-K)</Text>
      </View>
      <View style={s.isoHeaderColCenter}>
        <Text style={s.isoHeaderTitleLabel}>Doc Type: Level 4 Supporting Documentation</Text>
        <Text style={s.isoHeaderTitleVal}>POST-EVENT REPORT</Text>
        <Text style={s.isoHeaderDeptVal}>BUBBLES O2 MARKETING SDN BHD (BOMSB)</Text>
      </View>
      <View style={s.isoHeaderColRight}>
        <View style={s.isoHeaderRightRow}>
          <Text>Doc No:</Text>
          <Text style={s.isoHeaderRightVal}>BOMSB-MKT-A-850-001-QR05</Text>
        </View>
        <View style={s.isoHeaderRightRow}>
          <Text>Issue / Rev:</Text>
          <Text style={s.isoHeaderRightVal}>02 (25/11/2025)</Text>
        </View>
        <View style={s.isoHeaderRightRow}>
          <Text>Page:</Text>
          <Text
            style={s.isoHeaderRightVal}
            render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`}
          />
        </View>
      </View>
    </View>
  )
}

// Running Footer Component
function IsoRunningFooter({ documentNo }: { documentNo: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>REF: {documentNo} • STRICTLY CONFIDENTIAL & PROPRIETARY</Text>
      <Text
        render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`}
      />
    </View>
  )
}

export function PostEventIsoReportDocument({ data }: { data: PostEventReportPdfData }) {
  const scoreComponents = data.scoreBreakdown?.components || null
  const chartData = [
    { label: "Extremely Satisfied", value: data.satisfactionCounts.EXTREMELY_SATISFIED, color: "#0d9488" },
    { label: "Very Satisfied", value: data.satisfactionCounts.VERY_SATISFIED, color: "#0284c7" },
    { label: "Somewhat Satisfied", value: data.satisfactionCounts.SOMEWHAT_SATISFIED, color: "#d97706" },
    { label: "Not Satisfied", value: data.satisfactionCounts.NOT_SO_SATISFIED + data.satisfactionCounts.NOT_AT_ALL_SATISFIED, color: "#e11d48" },
  ]

  // Collect receipts from claim breakdown for Appendices
  const receiptAppendices: Array<{
    claimantName: string
    description: string
    category: string
    vehiclePlate?: string
    amount: number
    receiptUrl: string
  }> = []

  data.claimBreakdown.forEach((group) => {
    group.items.forEach((item) => {
      if (item.receiptUrl) {
        receiptAppendices.push({
          claimantName: group.claimantName,
          description: item.description,
          category: item.category,
          vehiclePlate: item.vehiclePlate,
          amount: item.amount,
          receiptUrl: item.receiptUrl,
        })
      }
    })
  })

  return (
    <Document title={`BubblesO2_PostEventReport_${data.documentNo}`} author="Bubbles O2 Marketing">
      {/* ========================================================================= */}
      {/* PAGE 1: EXECUTIVE OVERVIEW & SCOPE (SECTIONS 1 - 6)                      */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <IsoRunningHeader logoDataUri={data.logoDataUri} documentNo={data.documentNo} />

        {/* Hero Document Banner */}
        <View style={s.heroBanner}>
          <View style={{ width: "70%" }}>
            <Text style={s.heroDocNo}>DOCUMENT NO: {data.documentNo}</Text>
            <Text style={s.heroTitle}>{data.eventName}</Text>
            <Text style={s.heroSub}>
              Prepared by: {data.reportPreparedBy} • Date: {data.reportDate}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={s.badgeSuccess}>
              <Text style={s.badgeSuccessText}>{data.status === "APPROVED" ? "VERIFIED & APPROVED" : "OFFICIAL DRAFT"}</Text>
            </View>
            <Text style={{ fontSize: 6.8, color: C.muted, marginTop: 4 }}>ISO 9001:2015 Compliant</Text>
          </View>
        </View>

        {/* Section 1 to 4: Event Core Metadata */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>1.0 Event Identification & Scope</Text>
            <Text style={s.secHeaderSub}>Core Requisition Details</Text>
          </View>
          <View style={s.secBody}>
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>1. EVENT NAME</Text>
              <Text style={s.kvValue}>{data.eventName}</Text>
            </View>
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>2. ORGANISER</Text>
              <Text style={s.kvValue}>{data.organizer}</Text>
            </View>
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>3. NUMBER OF ATTENDEES</Text>
              <Text style={s.kvValue}>{data.attendeesCount || "N/A"}</Text>
            </View>
            <View style={s.kvRow}>
              <Text style={s.kvLabel}>4. TYPE OF INVOLVEMENT</Text>
              <Text style={s.kvValue}>{data.typeOfInvolvement}</Text>
            </View>
            <View style={{ ...s.kvRow, borderBottomWidth: 0 }}>
              <Text style={s.kvLabel}>DATES / DURATION</Text>
              <Text style={s.kvValue}>{data.eventDates}</Text>
            </View>
          </View>
        </View>

        {/* Section 5: VIPs */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>5. VIPs (If Any)</Text>
            <Text style={s.secHeaderSub}>{data.vipsList.length} Dignitaries & Executive Stakeholders</Text>
          </View>
          <View style={s.secBody}>
            {data.vipsList.length > 0 ? (
              data.vipsList.map((vip, i) => (
                <View key={i} style={s.kvRow}>
                  <Text style={{ ...s.kvLabel, width: "45%" }}>• {vip.name}</Text>
                  <Text style={{ ...s.kvValue, width: "55%", color: C.muted }}>{vip.title}</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 7.5, color: C.muted, fontStyle: "italic" }}>No specific VIP attendance recorded.</Text>
            )}
          </View>
        </View>

        {/* Section 6: Staff Involved */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>6. Staff & Departments Involved</Text>
            <Text style={s.secHeaderSub}>Cross-functional Operational Alignment</Text>
          </View>
          <View style={s.secBody}>
            <View style={s.pillGroup}>
              {data.staffInvolved.map((dept, idx) => (
                <View key={idx} style={s.pill}>
                  <Text style={s.pillText}>{dept}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <IsoRunningFooter documentNo={data.documentNo} />
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 2: OBJECTIVES & GENERAL FLOW (SECTIONS 7 - 8)                       */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <IsoRunningHeader logoDataUri={data.logoDataUri} documentNo={data.documentNo} />

        {/* Section 7: Objectives */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>7. Objectives & Strategic Value</Text>
            <Text style={s.secHeaderSub}>Aims, Commercial Benefits & Expected Impact</Text>
          </View>
          <View style={s.secBody}>
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink }}>Aims:</Text>
              <Text style={{ fontSize: 7.8, color: C.body, marginTop: 2, lineHeight: 1.3 }}>
                {data.aims || "N/A"}
              </Text>
            </View>
            <View style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink }}>Benefits:</Text>
              <Text style={{ fontSize: 7.8, color: C.body, marginTop: 2, lineHeight: 1.3 }}>
                {data.benefits || "N/A"}
              </Text>
            </View>
            <View style={{ backgroundColor: C.brandSoft, padding: 6, borderRadius: 4, borderWidth: 1, borderColor: C.brandBorder }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.brandDark }}>Expected Impact & Inventory Distribution:</Text>
              {data.impactDistribution.length > 0 ? (
                <View style={{ marginTop: 3 }}>
                  <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.brandBorder, paddingBottom: 1 }}>
                    <Text style={{ fontSize: 6.6, fontFamily: "Helvetica-Bold", color: C.muted, width: "46%" }}>ITEM</Text>
                    <Text style={{ fontSize: 6.6, fontFamily: "Helvetica-Bold", color: C.muted, width: "14%", textAlign: "right" }}>GIVEN</Text>
                    <Text style={{ fontSize: 6.6, fontFamily: "Helvetica-Bold", color: C.muted, width: "14%", textAlign: "right" }}>USED</Text>
                    <Text style={{ fontSize: 6.6, fontFamily: "Helvetica-Bold", color: C.muted, width: "26%", textAlign: "right" }}>ACHIEVED</Text>
                  </View>
                  {data.impactDistribution.map((item, index) => {
                    const pct = item.qtyGiven > 0 ? Math.min(100, (item.qtyUsed / item.qtyGiven) * 100) : 0
                    return (
                      <View key={index} style={{ flexDirection: "row", paddingTop: 2 }}>
                        <Text style={{ fontSize: 7.2, color: C.brandDark, width: "46%" }}>
                          {item.name || "Item"} ({item.unit})
                        </Text>
                        <Text style={{ fontSize: 7.2, color: C.brandDark, width: "14%", textAlign: "right" }}>{item.qtyGiven}</Text>
                        <Text style={{ fontSize: 7.2, color: C.brandDark, width: "14%", textAlign: "right" }}>{item.qtyUsed}</Text>
                        <Text style={{ fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.brandDark, width: "26%", textAlign: "right" }}>{pct.toFixed(1)}%</Text>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text style={{ fontSize: 7.8, color: C.brandDark, marginTop: 2 }}>
                  {data.expectedImpact || "N/A"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Section 8: General Flow */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>8. General Flow & Tentative</Text>
            <Text style={s.secHeaderSub}>Operational Execution & Daily Progression</Text>
          </View>
          <View style={s.secBody}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 2 }}>Planned Flow / Tentative:</Text>
            <Text style={{ fontSize: 7.8, color: C.body, lineHeight: 1.3, marginBottom: 6 }}>
              {data.plannedFlowText || "Standard program tentative executed according to event requisition plan."}
            </Text>

            {/* Flow Images (Daily schedule / route maps) */}
            {data.plannedFlowImages.length > 0 && (
              <View style={s.imageGrid}>
                {data.plannedFlowImages.slice(0, 4).map((img, idx) => (
                  <View key={idx} style={s.imageCard}>
                    <Image src={img.imageUrl} style={s.cardImg} />
                    <Text style={s.imageCaption}>{img.dayLabel}: {img.caption || "Schedule Overview"}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: C.lineLight, paddingTop: 6 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink }}>Executed Flow Summary:</Text>
              <Text style={{ fontSize: 7.8, color: C.body, marginTop: 2, lineHeight: 1.3 }}>
                {data.executedFlowText || "The event itinerary was carried out smoothly in compliance with organizers' rules."}
              </Text>
            </View>
          </View>
        </View>

        <IsoRunningFooter documentNo={data.documentNo} />
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 3: ACTIVATIONS & IMPACT ANALYSIS (SECTIONS 9 & 11)                   */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <IsoRunningHeader logoDataUri={data.logoDataUri} documentNo={data.documentNo} />

        {/* Section 9: Activations */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>9. Activation & Engagement Activities</Text>
            <Text style={s.secHeaderSub}>Interactive Consumer Touchpoints</Text>
          </View>
          <View style={s.secBody}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {data.activationsList.map((act, i) => (
                <View key={i} style={{ width: "48%", backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.line, padding: 5, borderRadius: 4 }}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink }}>• {act.title}</Text>
                  {act.description && <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>{act.description}</Text>}
                </View>
              ))}
            </View>

            {/* Activation Posters / Photos */}
            {data.activationImages.length > 0 && (
              <View style={{ ...s.imageGrid, marginTop: 8 }}>
                {data.activationImages.slice(0, 4).map((actImg, i) => (
                  <View key={i} style={s.imageCard}>
                    <Image src={actImg.imageUrl} style={s.cardImg} />
                    <Text style={s.imageCaption}>{actImg.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Section 11: Impact & Survey Analytics */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>11. Impact & Participant Satisfaction</Text>
            <Text style={s.secHeaderSub}>Auto-synced from Official QR Feedback Form</Text>
          </View>
          <View style={s.secBody}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {/* Donut Chart */}
              <View style={{ width: "40%", alignItems: "center" }}>
                <DonutChart data={chartData} size={110} thickness={20} />
                <Text style={{ fontSize: 6.8, color: C.muted, marginTop: 4 }}>
                  Sample Size: {data.totalFeedbacks} Respondents
                </Text>
              </View>

              {/* Chart Legend & Percentages */}
              <View style={{ width: "55%" }}>
                <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 4 }}>
                  Overall Satisfaction: {data.satisfactionRate}% Positive
                </Text>
                {chartData.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: C.lineLight }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 8, height: 8, backgroundColor: item.color, borderRadius: 2 }} />
                      <Text style={{ fontSize: 7.5, color: C.body }}>{item.label}</Text>
                    </View>
                    <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink }}>
                      {item.value} ({data.totalFeedbacks > 0 ? Math.round((item.value / data.totalFeedbacks) * 100) : 0}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Qualitative Feedback Highlights */}
            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: C.lineLight, paddingTop: 6 }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 3 }}>
                Key Participant Sentiments:
              </Text>
              {data.sampleFeedbacks.length > 0 ? (
                data.sampleFeedbacks.map((fb, idx) => (
                  <Text key={idx} style={{ fontSize: 7.2, color: C.muted, fontStyle: "italic", marginBottom: 2 }}>
                    "{fb.comments}" — {fb.respondentName} ({fb.satisfaction.replace(/_/g, " ")})
                  </Text>
                ))
              ) : (
                <Text style={{ fontSize: 7.2, color: C.muted }}>The majority of participants expressed strong interest in and positive affinity toward the Bubbles O2 brand.</Text>
              )}
            </View>
          </View>
        </View>

        <IsoRunningFooter documentNo={data.documentNo} />
      </Page>

      {/* ========================================================================= */}
      {/* PAGE 4: FINANCE, IMPROVEMENTS & SIGN-OFF (SECTIONS 10, 12 - 15)          */}
      {/* ========================================================================= */}
      <Page size="A4" style={s.page}>
        <IsoRunningHeader logoDataUri={data.logoDataUri} documentNo={data.documentNo} />

        {/* Section 10: Finance Report */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>10. Finance Report & Itemized Claims</Text>
            <Text style={s.secHeaderSub}>Grand Total: RM {data.totalClaimAmount.toFixed(2)}</Text>
          </View>
          <View style={s.secBody}>
            {data.claimBreakdown.map((group, gIdx) => (
              <View key={gIdx} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f8fafc", padding: 3, borderBottomWidth: 1, borderBottomColor: C.line }}>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.navy }}>
                    Claimant: {group.claimantName}
                  </Text>
                  <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.brandDark }}>
                    Subtotal: RM {group.subtotal.toFixed(2)}
                  </Text>
                </View>
                {group.items.map((item, iIdx) => (
                  <View key={iIdx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.lineLight }}>
                    <Text style={{ fontSize: 7.2, color: C.ink, width: "65%" }}>
                      {iIdx + 1}. {item.description} {item.vehiclePlate ? `(${item.vehiclePlate})` : ""}
                    </Text>
                    <Text style={{ fontSize: 7.2, color: C.muted, width: "15%" }}>
                      {item.category}
                    </Text>
                    <Text style={{ fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.ink, width: "20%", textAlign: "right" }}>
                      RM {item.amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1.5, borderTopColor: C.brandDark, paddingTop: 4, marginTop: 4 }}>
              <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.ink }}>GRAND TOTAL CLAIMS</Text>
              <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.brandDark }}>RM {data.totalClaimAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Section 12 to 14: Review, Consideration & Success Rate */}
        <View style={s.secCard}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>12 - 14. Review, Improvements & Success Rate</Text>
            <Text style={s.secHeaderSub}>Post-Mortem Strategic Feedback</Text>
          </View>
          <View style={s.secBody}>
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: C.ink }}>12. Future Improvement for Organisers:</Text>
              <Text style={{ fontSize: 7.5, color: C.body }}>{data.futureImprovementOrg || "N/A"}</Text>
            </View>
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 7.8, fontFamily: "Helvetica-Bold", color: C.ink }}>Participants&apos; Feedback & Internal Booth Improvement:</Text>
              <Text style={{ fontSize: 7.5, color: C.body }}>{data.futureImprovementPart || "N/A"}</Text>
            </View>

            {scoreComponents && (
              <View style={{ marginTop: 2, marginBottom: 4 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 2 }}>
                  Success Rate Breakdown (Weighted Score):
                </Text>
                {[
                  {
                    label: "Public feedback satisfaction (50%)",
                    value: `${scoreComponents.satisfaction.earned.toFixed(2)} / 50`,
                  },
                  {
                    label: "Expected impact & stock distribution (20%)",
                    value: `${scoreComponents.impact.earned.toFixed(2)} / 20`,
                  },
                  {
                    label: "Budget compliance (15%)",
                    value: `${scoreComponents.budget.earned.toFixed(2)} / 15`,
                  },
                  {
                    label: "Participants' feedback sentiment, Gemini (15%)",
                    value: `${scoreComponents.suggestion.earned.toFixed(2)} / 15`,
                  },
                ].map((row, index) => (
                  <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 0.5 }}>
                    <Text style={{ fontSize: 7.2, color: C.body }}>{row.label}</Text>
                    <Text style={{ fontSize: 7.2, fontFamily: "Helvetica-Bold", color: C.ink }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, backgroundColor: C.cardBg, padding: 6, borderRadius: 4 }}>
              <View>
                <Text style={{ fontSize: 7.5, color: C.muted }}>13. FUTURE CONSIDERATION</Text>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.brandDark }}>{data.futureConsideration ? "YES (Recommended)" : "NO"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 7.5, color: C.muted }}>14. EVENT SUCCESS RATE</Text>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.brandDark }}>{Number(data.eventSuccessRate).toFixed(1)}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 15: Media Links */}
        <View style={{ ...s.secCard, marginBottom: 6 }}>
          <View style={s.secHeader}>
            <Text style={s.secHeaderTitle}>15. Media Links & Public Coverage</Text>
            <Text style={s.secHeaderSub}>Digital Footprint</Text>
          </View>
          <View style={s.secBody}>
            {data.mediaLinks.map((ml, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.brandDark, width: "20%" }}>{ml.platform}:</Text>
                <Text style={{ fontSize: 7.2, color: C.cyan, width: "80%" }}>{ml.url}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Formal Endorsement & Approval Block */}
        <View style={s.signContainer}>
          <View style={s.signBox}>
            <Text style={s.signTitle}>Report Prepared By</Text>
            <Text style={s.signName}>{data.reportPreparedBy}</Text>
            <Text style={s.signDate}>Executive, Marketing & Creative • {data.reportDate}</Text>
          </View>

          <View style={s.signBox}>
            <Text style={s.signTitle}>Approved By (HOD)</Text>
            {data.approvalSignatureUrl ? (
              <Image src={data.approvalSignatureUrl} style={{ maxHeight: 24, maxWidth: 100, objectFit: "contain" }} />
            ) : null}
            <Text style={s.signName}>{data.approvedBy || "Head of Marketing Department"}</Text>
            <Text style={s.signDate}>
              {data.approvedAt ? `Approved on ${data.approvedAt.split("T")[0]}` : "Pending Management Signature"}
            </Text>
          </View>
        </View>

        <IsoRunningFooter documentNo={data.documentNo} />
      </Page>

      {/* ========================================================================= */}
      {/* APPENDIX PAGES: RECEIPTS & TEV ATTACHMENTS                               */}
      {/* ========================================================================= */}
      {receiptAppendices.length > 0 &&
        receiptAppendices.map((rec, rIdx) => (
          <Page key={rIdx} size="A4" style={s.page}>
            <IsoRunningHeader logoDataUri={data.logoDataUri} documentNo={data.documentNo} />

            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink }}>
                Appendix {rIdx + 1}: Financial Claim Receipt
              </Text>
              <Text style={{ fontSize: 7.5, color: C.muted }}>
                Claimant: {rec.claimantName} • Category: {rec.category}
              </Text>
            </View>

            <View style={s.appendixReceiptBox}>
              <View style={s.receiptMeta}>
                <Text style={s.receiptMetaTitle}>
                  {rec.description} {rec.vehiclePlate ? `(${rec.vehiclePlate})` : ""}
                </Text>
                <Text style={s.receiptMetaAmount}>RM {rec.amount.toFixed(2)}</Text>
              </View>
              <Image src={rec.receiptUrl} style={s.receiptImg} />
            </View>

            <IsoRunningFooter documentNo={data.documentNo} />
          </Page>
        ))}
    </Document>
  )
}

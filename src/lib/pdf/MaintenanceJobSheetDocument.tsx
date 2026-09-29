import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface JobSheetCostLine {
  category: string
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

export interface MaintenanceJobSheetPdfData {
  jobSheetNumber: string
  ticketNumber: string
  title: string
  reasonOfWork?: string | null
  ticketType: string
  priority: string
  location: string
  specificArea?: string | null
  requesterName: string
  requesterPhone: string
  requesterEmail?: string | null
  picName: string
  technicianName: string
  startedAt?: string | null
  completedAt?: string | null
  closedAt: string
  kpiStatus?: string | null
  kpiRepairHours?: number | null
  rootCause?: string | null
  resolution?: string | null
  noPhotoReason?: string | null
  beforePhotoUrl?: string | null
  afterPhotoUrl?: string | null
  costs: JobSheetCostLine[]
  totalCost: number
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  headerBox: {
    borderWidth: 1,
    borderColor: "#0f172a",
    flexDirection: "row",
    marginBottom: 10,
  },
  headerLeft: {
    width: "25%",
    borderRightWidth: 1,
    borderRightColor: "#0f172a",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    maxHeight: 36,
    objectFit: "contain",
  },
  headerCenter: {
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: "#0f172a",
    padding: 6,
    justifyContent: "center",
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  docTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "#0369a1",
    marginTop: 2,
  },
  docSubtitle: {
    fontSize: 7.5,
    color: "#475569",
    marginTop: 1,
  },
  headerRight: {
    width: "25%",
    padding: 5,
    justifyContent: "center",
    fontSize: 7.5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  metaLabel: {
    color: "#64748b",
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    backgroundColor: "#f1f5f9",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
    marginBottom: 5,
    marginTop: 6,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  gridCol2: {
    width: "50%",
    paddingRight: 6,
    marginBottom: 4,
  },
  gridCol3: {
    width: "33.3%",
    paddingRight: 6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
  },
  fieldValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
    marginTop: 1,
  },
  fieldValueBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  blockText: {
    backgroundColor: "#f8fafc",
    padding: 5,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    fontSize: 8,
    lineHeight: 1.3,
    marginTop: 2,
  },
  photoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  photoBox: {
    width: "48%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 4,
    alignItems: "center",
  },
  photoCaption: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    marginBottom: 3,
    color: "#334155",
  },
  photoImg: {
    width: "100%",
    height: 90,
    objectFit: "cover",
    borderRadius: 2,
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f1f5f9",
    fontSize: 7.5,
    paddingVertical: 3,
  },
  colNo: { width: "6%", textAlign: "center" },
  colCategory: { width: "16%", paddingLeft: 4 },
  colItem: { width: "38%", paddingLeft: 4 },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "8%", textAlign: "center" },
  colPrice: { width: "11%", textAlign: "right", paddingRight: 4 },
  colTotal: { width: "11%", textAlign: "right", paddingRight: 4 },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    paddingVertical: 4,
  },
  signOffBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 8,
  },
  signCol: {
    width: "31%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 6,
    height: 65,
    justifyContent: "space-between",
  },
  signHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#475569",
    textTransform: "uppercase",
  },
  signStatus: {
    fontSize: 7.5,
    color: "#16a34a",
    fontFamily: "Helvetica-Bold",
  },
  signFooter: {
    fontSize: 7,
    color: "#64748b",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 2,
  },
})

export function MaintenanceJobSheetDocument({ data }: { data: MaintenanceJobSheetPdfData }) {
  return (
    <Document title={`Job Sheet - ${data.jobSheetNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header Document Control */}
        <View style={styles.headerBox}>
          <View style={styles.headerLeft}>
            {data.logoUrl ? (
              <Image src={data.logoUrl} style={styles.logo} />
            ) : (
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, color: "#0284c7" }}>BUBBLESO2</Text>
            )}
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.companyName}>Bubbles O2 Sdn. Bhd.</Text>
            <Text style={styles.docTitle}>Plant Maintenance Job Sheet &amp; Billing Memo</Text>
            <Text style={styles.docSubtitle}>SOP: BOSB-PFMD-850-001 (QR01 Work Request)</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ref No:</Text>
              <Text style={styles.metaValue}>{data.jobSheetNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Ticket Log:</Text>
              <Text style={styles.metaValue}>{data.ticketNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date Closed:</Text>
              <Text style={styles.metaValue}>{data.closedAt}</Text>
            </View>
          </View>
        </View>

        {/* Section 1: Work Request Information */}
        <Text style={styles.sectionTitle}>1. Work Request Information</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol3}>
            <Text style={styles.fieldLabel}>Requester Name</Text>
            <Text style={styles.fieldValueBold}>{data.requesterName}</Text>
          </View>
          <View style={styles.gridCol3}>
            <Text style={styles.fieldLabel}>Contact / Phone</Text>
            <Text style={styles.fieldValue}>{data.requesterPhone}</Text>
          </View>
          <View style={styles.gridCol3}>
            <Text style={styles.fieldLabel}>Category &amp; Priority</Text>
            <Text style={styles.fieldValueBold}>{data.ticketType} • {data.priority}</Text>
          </View>
          <View style={styles.gridCol2}>
            <Text style={styles.fieldLabel}>Plant Location</Text>
            <Text style={styles.fieldValue}>{data.location}</Text>
          </View>
          <View style={styles.gridCol2}>
            <Text style={styles.fieldLabel}>Specific Machine / Area</Text>
            <Text style={styles.fieldValue}>{data.specificArea || "General Area"}</Text>
          </View>
        </View>
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.fieldLabel}>Work Description / Reported Issue</Text>
          <Text style={styles.blockText}>{data.title} {data.reasonOfWork ? `\nSymptoms: ${data.reasonOfWork}` : ""}</Text>
        </View>

        {/* Section 2: Technical Execution & Actions Taken */}
        <Text style={styles.sectionTitle}>2. Technical Execution &amp; Resolution</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol3}>
            <Text style={styles.fieldLabel}>Assigned Technician / Contractor</Text>
            <Text style={styles.fieldValueBold}>{data.technicianName}</Text>
          </View>
          <View style={styles.gridCol3}>
            <Text style={styles.fieldLabel}>Supervisor / PIC</Text>
            <Text style={styles.fieldValueBold}>{data.picName}</Text>
          </View>
          <View style={styles.gridCol3}>
            <Text style={styles.fieldLabel}>SLA KPI Performance</Text>
            <Text style={[styles.fieldValueBold, { color: data.kpiStatus === "Delay" ? "#dc2626" : "#16a34a" }]}>
              {data.kpiStatus || "On Time"} {data.kpiRepairHours ? `(${data.kpiRepairHours}h repair time)` : ""}
            </Text>
          </View>
          <View style={styles.gridCol2}>
            <Text style={styles.fieldLabel}>Started Date/Time</Text>
            <Text style={styles.fieldValue}>{data.startedAt || "Not recorded"}</Text>
          </View>
          <View style={styles.gridCol2}>
            <Text style={styles.fieldLabel}>Work Completed Date/Time</Text>
            <Text style={styles.fieldValue}>{data.completedAt || data.closedAt}</Text>
          </View>
        </View>
        {data.rootCause && (
          <View style={{ marginBottom: 3 }}>
            <Text style={styles.fieldLabel}>Identified Root Cause</Text>
            <Text style={styles.blockText}>{data.rootCause}</Text>
          </View>
        )}
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.fieldLabel}>Technical Resolution &amp; Actions Carried Out</Text>
          <Text style={styles.blockText}>{data.resolution || "Completed standard maintenance inspection and functional testing."}</Text>
        </View>

        {/* Section 3: Photo Evidence */}
        <Text style={styles.sectionTitle}>3. Photographic Evidence (Before &amp; After)</Text>
        {data.noPhotoReason ? (
          <Text style={[styles.blockText, { fontStyle: "italic", color: "#475569" }]}>
            Photo Exemption: {data.noPhotoReason}
          </Text>
        ) : (
          <View style={styles.photoContainer}>
            <View style={styles.photoBox}>
              <Text style={styles.photoCaption}>BEFORE REPAIR</Text>
              {data.beforePhotoUrl ? (
                <Image src={data.beforePhotoUrl} style={styles.photoImg} />
              ) : (
                <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 35 }}>No before photo uploaded</Text>
              )}
            </View>
            <View style={styles.photoBox}>
              <Text style={styles.photoCaption}>AFTER REPAIR / RESTORATION</Text>
              {data.afterPhotoUrl ? (
                <Image src={data.afterPhotoUrl} style={styles.photoImg} />
              ) : (
                <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 35 }}>No after photo uploaded</Text>
              )}
            </View>
          </View>
        )}

        {/* Section 4: Parts, Labour & Cost Summary */}
        <Text style={styles.sectionTitle}>4. Spare Parts, Labour &amp; Maintenance Costing</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>No</Text>
            <Text style={styles.colCategory}>Category</Text>
            <Text style={styles.colItem}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colPrice}>Rate (RM)</Text>
            <Text style={styles.colTotal}>Total (RM)</Text>
          </View>
          {data.costs.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.colNo, { width: "100%", textAlign: "center", color: "#64748b" }]}>
                No chargeable spare parts or external contractor costs recorded (Internal In-house Labour).
              </Text>
            </View>
          ) : (
            data.costs.map((c, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colNo}>{idx + 1}</Text>
                <Text style={styles.colCategory}>{c.category}</Text>
                <Text style={styles.colItem}>{c.itemName}</Text>
                <Text style={styles.colQty}>{c.quantity}</Text>
                <Text style={styles.colUnit}>{c.unit}</Text>
                <Text style={styles.colPrice}>{c.unitPrice.toFixed(2)}</Text>
                <Text style={styles.colTotal}>{c.amount.toFixed(2)}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={{ width: "89%", textAlign: "right", paddingRight: 6 }}>TOTAL MAINTENANCE COST (MYR):</Text>
            <Text style={styles.colTotal}>RM {data.totalCost.toFixed(2)}</Text>
          </View>
        </View>

        {/* Section 5: Authorization & Sign-Offs */}
        <View style={styles.signOffBox}>
          <View style={styles.signCol}>
            <Text style={styles.signHeader}>1. Technician / Contractor</Text>
            <Text style={styles.signStatus}>[ WORK COMPLETED ]</Text>
            <Text style={styles.signFooter}>{data.technicianName} • {data.completedAt || data.closedAt}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signHeader}>2. Requester Verification</Text>
            <Text style={styles.signStatus}>[ WORK VERIFIED ]</Text>
            <Text style={styles.signFooter}>{data.requesterName} • Satisfactory</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signHeader}>3. PIC / HOD Sign-off</Text>
            <Text style={styles.signStatus}>[ APPROVED &amp; CLOSED ]</Text>
            <Text style={styles.signFooter}>{data.picName} • {data.closedAt}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

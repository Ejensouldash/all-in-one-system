import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface PrPdfItemLine {
  no: number
  itemRequested: string
  brand?: string | null
  stockBalance: number
  quantityRequest: number
  projectMachine: string
}

export interface MaintenancePurchaseRequestPdfData {
  prNumber: string
  company: string
  department: string
  date: string
  dateRequired: string
  requesterName: string
  requesterDepartment: string
  requesterSignature?: string | null
  approvedByName?: string | null
  approverDepartment?: string | null
  approverSignature?: string | null
  approvedDate?: string | null
  receivedByName?: string | null
  receiverDepartment?: string | null
  receiverSignature?: string | null
  receivedDate?: string | null
  items: PrPdfItemLine[]
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    width: "40%",
  },
  logo: {
    maxHeight: 46,
    maxWidth: 160,
    objectFit: "contain",
  },
  titleContainer: {
    width: "60%",
    alignItems: "flex-end",
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    textDecoration: "underline",
    letterSpacing: 0.5,
  },
  companyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    minHeight: 18,
    alignItems: "center",
  },
  tableRowLast: {
    flexDirection: "row",
    minHeight: 18,
    alignItems: "center",
  },
  colNo: {
    width: "7%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    textAlign: "center",
    paddingVertical: 3,
    fontSize: 7.5,
  },
  colItem: {
    width: "47%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 7.5,
  },
  colStock: {
    width: "14%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    textAlign: "center",
    paddingVertical: 3,
    fontSize: 7.5,
  },
  colQty: {
    width: "14%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    textAlign: "center",
    paddingVertical: 3,
    fontSize: 7.5,
  },
  colProject: {
    width: "18%",
    textAlign: "center",
    paddingHorizontal: 4,
    paddingVertical: 3,
    fontSize: 7.5,
  },
  sectionBox: {
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 10,
  },
  sectionHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    backgroundColor: "#ffffff",
    textDecoration: "underline",
  },
  sectionBody: {
    flexDirection: "row",
    minHeight: 52,
  },
  sectionDetails: {
    width: "65%",
    borderRightWidth: 1,
    borderRightColor: "#000000",
    padding: 4,
    justifyContent: "space-between",
  },
  sectionSignature: {
    width: "35%",
    padding: 3,
    alignItems: "center",
    justifyContent: "space-between",
  },
  sigLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  signatureImg: {
    maxHeight: 34,
    maxWidth: 130,
    objectFit: "contain",
  },
  termsSection: {
    marginTop: 6,
    fontSize: 6.8,
    color: "#000000",
    lineHeight: 1.3,
  },
  termsTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
})

export function MaintenancePurchaseRequestDocument({
  data,
}: {
  data: MaintenancePurchaseRequestPdfData
}) {
  // Ensure table fills at least 8 rows for a crisp, balanced template aesthetic
  const minRows = 8
  const emptyRowsCount = Math.max(0, minRows - data.items.length)
  const emptyRows = Array.from({ length: emptyRowsCount }, (_, i) => i)

  return (
    <Document title={`Purchase Requisition ${data.prNumber}`} author="BubblesO2 FMS">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {data.logoUrl ? (
              <Image src={data.logoUrl} style={styles.logo} />
            ) : (
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, color: "#0284c7" }}>
                BubblesO2
              </Text>
            )}
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>PURCHASE REQUISITION</Text>
          </View>
        </View>

        {/* Company & Meta */}
        <View style={styles.companyRow}>
          <Text>COMPANY: {data.company || "BUBBLES O2 SDN BHD"}</Text>
          <Text>PR NO: {data.prNumber}</Text>
        </View>

        {/* Requisition Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>NO</Text>
            <Text style={styles.colItem}>ITEM REQUESTED</Text>
            <Text style={styles.colStock}>STOCK{"\n"}BALANCE</Text>
            <Text style={styles.colQty}>QUANTITY{"\n"}REQUEST</Text>
            <Text style={styles.colProject}>PROJECT /{"\n"}MACHINE</Text>
          </View>

          {data.items.map((item, idx) => (
            <View
              key={idx}
              style={idx === data.items.length - 1 && emptyRowsCount === 0 ? styles.tableRowLast : styles.tableRow}
            >
              <Text style={styles.colNo}>{item.no}</Text>
              <Text style={styles.colItem}>
                {item.itemRequested}
                {item.brand ? ` (BRAND: ${item.brand})` : ""}
              </Text>
              <Text style={styles.colStock}>{item.stockBalance}</Text>
              <Text style={styles.colQty}>{item.quantityRequest}</Text>
              <Text style={styles.colProject}>{item.projectMachine || "-"}</Text>
            </View>
          ))}

          {/* Fill remaining empty rows to match official form grid */}
          {emptyRows.map((_, idx) => (
            <View
              key={`empty-${idx}`}
              style={idx === emptyRows.length - 1 ? styles.tableRowLast : styles.tableRow}
            >
              <Text style={styles.colNo}>{data.items.length + idx + 1}</Text>
              <Text style={styles.colItem}> </Text>
              <Text style={styles.colStock}> </Text>
              <Text style={styles.colQty}> </Text>
              <Text style={styles.colProject}> </Text>
            </View>
          ))}
        </View>

        {/* Box 1: REQUESTER */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>REQUESTER</Text>
          <View style={styles.sectionBody}>
            <View style={styles.sectionDetails}>
              <Text>REQUEST BY: {data.requesterName}</Text>
              <Text>DEPARTMENT: {data.requesterDepartment || data.department}</Text>
              <Text>DATE: {data.date}</Text>
              <Text>DATE REQUIRED: {data.dateRequired}</Text>
            </View>
            <View style={styles.sectionSignature}>
              <Text style={styles.sigLabel}>SIGNATURE</Text>
              {data.requesterSignature ? (
                <Image src={data.requesterSignature} style={styles.signatureImg} />
              ) : (
                <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 12 }}>Pending Signature</Text>
              )}
            </View>
          </View>
        </View>

        {/* Box 2: APPROVAL */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>APPROVAL</Text>
          <View style={styles.sectionBody}>
            <View style={styles.sectionDetails}>
              <Text>APPROVE BY: {data.approvedByName || ""}</Text>
              <Text>DATE: {data.approvedDate || ""}</Text>
              <Text>DEPARTMENT: {data.approverDepartment || ""}</Text>
            </View>
            <View style={styles.sectionSignature}>
              <Text style={styles.sigLabel}>SIGNATURE</Text>
              {data.approverSignature ? (
                <Image src={data.approverSignature} style={styles.signatureImg} />
              ) : (
                <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 12 }}>Pending Approval</Text>
              )}
            </View>
          </View>
        </View>

        {/* Box 3: RECEIVE */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>RECEIVE</Text>
          <View style={styles.sectionBody}>
            <View style={styles.sectionDetails}>
              <Text>NAME: {data.receivedByName || ""}</Text>
              <Text>DATE: {data.receivedDate || ""}</Text>
              <Text>DEPARTMENT: {data.receiverDepartment || ""}</Text>
            </View>
            <View style={styles.sectionSignature}>
              <Text style={styles.sigLabel}>SIGNATURE</Text>
              {data.receiverSignature ? (
                <Image src={data.receiverSignature} style={styles.signatureImg} />
              ) : (
                <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 12 }}>Pending Receive</Text>
              )}
            </View>
          </View>
        </View>

        {/* Terms & Conditions (Verbatim from template) */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms &amp; Conditions</Text>
          <Text>1.Lead Time: Standard lead time is 1 week, unless otherwise stated.</Text>
          <Text>2.PR Approval:The Company reserves the right to reject any incomplete, inaccurate, or non-compliant PR.</Text>
          <Text>3.Changes:Any changes to quantity, specification, after approval require re-approval, where applicable.</Text>
          <Text>4.Cancellation: Any cancellation of an approved PR must be communicated as early as possible to avoid unnecessary costs.</Text>
        </View>
      </Page>
    </Document>
  )
}

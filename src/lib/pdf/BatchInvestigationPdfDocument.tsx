import React from "react"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { formatProductPackaging } from "@/lib/customer-care/sku-mapper"
import { decodeBottleBatchNumber } from "@/lib/customer-care/batch-decoder"

export interface BatchInvestigationPdfData {
  caseNumber: string
  createdAtStr: string
  status: string
  picDepartment: string
  companyName: string
  outletName?: string | null
  contactName: string
  contactPhone: string
  state: string
  goodsLocationAddress: string
  categories: string[]
  otherIssueDescription?: string | null
  items: Array<{
    productSize: string
    reportedQtyBottles: number
    reportedBatchNo: string | null
    cleanBatchNo: string | null
    matchStatus: string
    matchRemarks?: string | null
    matches: Array<{
      bottleBatchNo: string
      productionOutputBatchNo: string
      productionQuantityBoxes: number
      productionType: string
      productPacking: string
      productionDateStr: string
      shift: string
      line: string
      reportStatus: string
      dailyReportRef: string
      preparedBy: string
      verifiedBy: string | null
    }>
  }>
  logoUrl?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  headerBox: {
    borderWidth: 1.5,
    borderColor: "#0f172a",
    borderRadius: 4,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 60,
    maxHeight: 35,
    objectFit: "contain",
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  companyTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#0f172a",
    textTransform: "uppercase",
  },
  reportTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#0284c7",
    marginTop: 2,
  },
  docMeta: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    padding: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    padding: 4,
    borderRadius: 3,
  },
  infoCol: {
    width: "50%",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 8.5,
    color: "#0f172a",
    marginTop: 1,
  },
  disclaimer: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Oblique",
    color: "#b45309",
    backgroundColor: "#fef3c7",
    padding: 3,
    marginTop: 2,
    borderRadius: 2,
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    marginTop: 4,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3,
    fontSize: 8,
  },
  colNo: { width: "6%", textAlign: "center" },
  colDate: { width: "14%", textAlign: "center" },
  colLorry: { width: "18%", textAlign: "center" },
  colDO: { width: "18%", textAlign: "center" },
  colQty: { width: "16%", textAlign: "center" },
  colDest: { width: "28%", paddingHorizontal: 2 },

  colBottleBatch: { width: "16%", fontFamily: "Helvetica-Bold", color: "#065f46" },
  colProdBatch: { width: "16%", fontFamily: "Helvetica-Bold", color: "#1e1b4b" },
  colProdPack: { width: "16%" },
  colProdDate: { width: "13%", textAlign: "center" },
  colProdShift: { width: "10%", textAlign: "center" },
  colProdLine: { width: "14%", textAlign: "center" },
  colProdQty: { width: "15%", textAlign: "center", fontFamily: "Helvetica-Bold" },

  worksheetBox: {
    borderWidth: 0.5,
    borderColor: "#94a3b8",
    borderRadius: 3,
    padding: 6,
    marginTop: 4,
    backgroundColor: "#fafafa",
  },
  blankLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    marginTop: 14,
    marginBottom: 4,
  },
  signBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  signCol: {
    width: "45%",
  },
})

export function BatchInvestigationPdfDocument({ data }: { data: BatchInvestigationPdfData }) {
  return (
    <Document title={`Batch Investigation Report - ${data.caseNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBox}>
          {data.logoUrl ? <Image src={data.logoUrl} style={styles.logo} /> : null}
          <View style={styles.headerTextContainer}>
            <Text style={styles.companyTitle}>BUBBLES O2 SDN. BHD.</Text>
            <Text style={styles.reportTitle}>CUSTOMER CARE — BATCH INVESTIGATION REPORT</Text>
            <Text style={styles.docMeta}>
              Doc No: {data.caseNumber}  |  Generated: {data.createdAtStr}  |  Status: {data.status}  |  PIC: {data.picDepartment}
            </Text>
          </View>
        </View>

        {/* 1. Customer & Incident Details */}
        <Text style={styles.sectionTitle}>1. Customer & Incident Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>COMPANY / OUTLET:</Text>
            <Text style={styles.infoValue}>
              {data.companyName} {data.outletName ? `(${data.outletName})` : ""}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>CONTACT PERSON & PHONE:</Text>
            <Text style={styles.infoValue}>{data.contactName} ({data.contactPhone})</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>STATE:</Text>
            <Text style={styles.infoValue}>{data.state || "N/A"}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>DEFECT CATEGORIES:</Text>
            <Text style={styles.infoValue}>{data.categories.join(", ") || "None specified"}</Text>
          </View>
          <View style={{ width: "100%", paddingHorizontal: 4, marginTop: 2 }}>
            <Text style={styles.infoLabel}>GOODS LOCATION ADDRESS:</Text>
            <Text style={styles.infoValue}>{data.goodsLocationAddress || "N/A"}</Text>
            <Text style={styles.disclaimer}>
              * Notice: Address above is customer-reported goods location; not proof of original DO delivery route.
            </Text>
          </View>
          {data.otherIssueDescription && (
            <View style={{ width: "100%", paddingHorizontal: 4, marginTop: 4 }}>
              <Text style={styles.infoLabel}>DEFECT / ISSUE DESCRIPTION:</Text>
              <Text style={styles.infoValue}>{data.otherIssueDescription}</Text>
            </View>
          )}
        </View>

        {/* 2. Reported Complaint & Matched Production Output */}
        <Text style={styles.sectionTitle}>2. Reported Complaint & Production Output Match</Text>
        {data.items.map((item, idx) => {
          const itemDecoded = decodeBottleBatchNumber(item.reportedBatchNo)
          return (
          <View key={idx} style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f8fafc", padding: 3, borderWidth: 0.5, borderColor: "#e2e8f0" }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8 }}>
                PRODUCT: {item.productSize}  |  REPORTED DEFECTIVE: {item.reportedQtyBottles} BOTTLES (PCS)
              </Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, color: item.matchStatus === "MATCHED" ? "#16a34a" : item.matchStatus === "UNMATCHED" ? "#dc2626" : "#b45309" }}>
                BATCH: {item.reportedBatchNo || "N/A"}{itemDecoded?.isValid ? ` (${itemDecoded.summary})` : ""} [{item.matchStatus}]
              </Text>
            </View>

            {item.matches && item.matches.length > 0 ? (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.colBottleBatch}>1. Bottle Batch</Text>
                  <Text style={styles.colProdBatch}>2. Output Batch</Text>
                  <Text style={styles.colProdPack}>Packing Config</Text>
                  <Text style={styles.colProdDate}>Prod Date</Text>
                  <Text style={styles.colProdShift}>Shift</Text>
                  <Text style={styles.colProdLine}>Line</Text>
                  <Text style={styles.colProdQty}>Boxes Produced</Text>
                </View>
                {item.matches.map((m, mIdx) => {
                  const mDecoded = decodeBottleBatchNumber(m.bottleBatchNo || item.reportedBatchNo)
                  return (
                  <View key={mIdx} style={styles.tableRow}>
                    <Text style={styles.colBottleBatch}>
                      {m.bottleBatchNo || item.reportedBatchNo || "-"}
                      {mDecoded?.isValid ? `\n${mDecoded.summary}` : ""}
                    </Text>
                    <Text style={styles.colProdBatch}>{m.productionOutputBatchNo || "-"}</Text>
                    <Text style={styles.colProdPack}>{formatProductPackaging(m.productPacking)}</Text>
                    <Text style={styles.colProdDate}>{m.productionDateStr}</Text>
                    <Text style={styles.colProdShift}>{m.shift}</Text>
                    <Text style={styles.colProdLine}>{m.line}</Text>
                    <Text style={styles.colProdQty}>{m.productionQuantityBoxes} BOXES</Text>
                  </View>
                  )
                })}
              </View>
            ) : (
              <View style={{ padding: 4, backgroundColor: "#fff1f2", borderWidth: 0.5, borderColor: "#fecdd3" }}>
                <Text style={{ fontSize: 7.5, color: "#be123c" }}>
                  {item.matchRemarks || "No matching production output found in Daily Production Reports."}
                </Text>
              </View>
            )}
          </View>
          )
        })}

        {/* 3. Manual Warehouse Investigation Worksheet */}
        <Text style={styles.sectionTitle}>3. Manual Warehouse Investigation Worksheet (Via Warehouse Excel)</Text>
        <View style={styles.worksheetBox}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8 }}>
            PHYSICAL BALANCE REMAINING IN WAREHOUSE:  [  __________________  ] BOXES
          </Text>
          <Text style={{ fontSize: 7, color: "#64748b", marginTop: 2, marginBottom: 4 }}>
            Record all dispatch movements identified from warehouse Excel registers for the matched batch:
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colNo}>No</Text>
              <Text style={styles.colDate}>Dispatch Date</Text>
              <Text style={styles.colLorry}>Lorry / Reg No</Text>
              <Text style={styles.colDO}>DO / Ref No</Text>
              <Text style={styles.colQty}>Qty Dispatched</Text>
              <Text style={styles.colDest}>Destination / Consignee</Text>
            </View>
            {[1, 2, 3, 4].map((num) => (
              <View key={num} style={styles.tableRow}>
                <Text style={styles.colNo}>{num}</Text>
                <Text style={styles.colDate}>___ / ___ / 202_</Text>
                <Text style={styles.colLorry}>_________________</Text>
                <Text style={styles.colDO}>_________________</Text>
                <Text style={styles.colQty}>________ BOXES</Text>
                <Text style={styles.colDest}>_________________________________</Text>
              </View>
            ))}
          </View>

          <View style={styles.signBlock}>
            <View style={styles.signCol}>
              <Text style={styles.infoLabel}>WAREHOUSE INVESTIGATOR:</Text>
              <View style={styles.blankLine} />
              <Text style={{ fontSize: 7.5 }}>Name & Signature / Date</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.infoLabel}>WAREHOUSE REMARKS / RECONCILIATION:</Text>
              <View style={styles.blankLine} />
              <Text style={{ fontSize: 7.5 }}>Stock status / Physical variance noted</Text>
            </View>
          </View>
        </View>

        {/* 4. Production & QC Operational Follow-up */}
        <Text style={styles.sectionTitle}>4. Production / QC Disposition & Verification</Text>
        <View style={styles.worksheetBox}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ fontSize: 8 }}>[   ] No Defect / Standard Replacement</Text>
            <Text style={{ fontSize: 8 }}>[   ] Quarantine Warehouse Stock</Text>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#b91c1c" }}>[   ] PRODUCT RECALL INITIATED</Text>
          </View>
          <View style={styles.signBlock}>
            <View style={styles.signCol}>
              <Text style={styles.infoLabel}>QC / PRODUCTION REVIEWER:</Text>
              <View style={styles.blankLine} />
              <Text style={{ fontSize: 7.5 }}>Signature / Date</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.infoLabel}>ACTION TAKEN / ROOT CAUSE:</Text>
              <View style={styles.blankLine} />
              <Text style={{ fontSize: 7.5 }}>Corrective action or customer resolution</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

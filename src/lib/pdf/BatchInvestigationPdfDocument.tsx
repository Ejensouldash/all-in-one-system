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
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#0284c7",
    paddingBottom: 8,
    marginBottom: 8,
  },
  logo: {
    width: 65,
    maxHeight: 38,
    objectFit: "contain",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  companyTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#0284c7",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  docMeta: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 3,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
    borderTopWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
    marginTop: 6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    padding: 5,
    borderRadius: 2,
    backgroundColor: "#fafcff",
  },
  infoCol: {
    width: "50%",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 8,
    color: "#0f172a",
    marginTop: 1,
  },
  disclaimer: {
    fontSize: 7,
    fontFamily: "Helvetica-Oblique",
    color: "#b45309",
    backgroundColor: "#fffbeb",
    borderWidth: 0.5,
    borderColor: "#fde68a",
    padding: 3,
    marginTop: 3,
    borderRadius: 2,
  },
  
  // Section 2: Match Item Styles
  itemContainer: {
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 2,
    overflow: "hidden",
  },
  itemHeaderBar: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  itemHeaderTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#0f172a",
  },
  itemHeaderDate: {
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#0369a1",
    marginTop: 1.5,
  },
  itemBatchCode: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#0f172a",
    textAlign: "right",
  },
  itemMatchStatus: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    marginTop: 1,
    textAlign: "right",
  },

  // Tables
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#475569",
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3.5,
    paddingHorizontal: 2,
    fontSize: 7.5,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#fbfcfd",
  },

  // Column widths for Match Table
  colBottleBatch: { width: "15%", fontFamily: "Helvetica-Bold", color: "#065f46" },
  colProdBatch: { width: "15%", fontFamily: "Helvetica-Bold", color: "#1e1b4b" },
  colProdPack: { width: "19%", fontFamily: "Helvetica-Bold", color: "#334155" },
  colProdDate: { width: "13%", textAlign: "center" },
  colProdShift: { width: "8%", textAlign: "center" },
  colProdLine: { width: "15%", textAlign: "center" },
  colProdQty: { width: "15%", textAlign: "right", fontFamily: "Helvetica-Bold", paddingRight: 4 },

  noMatchAlert: {
    padding: 6,
    backgroundColor: "#fff1f2",
    fontSize: 7.5,
    color: "#be123c",
  },

  // Section 3: Worksheet Table & Columns
  worksheetBox: {
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 2,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  colWNo: { width: "5%", textAlign: "center" },
  colWDate: { width: "16%", textAlign: "center" },
  colWLorry: { width: "18%", textAlign: "center" },
  colWDO: { width: "18%", textAlign: "center" },
  colWQty: { width: "15%", textAlign: "center" },
  colWDest: { width: "28%", paddingHorizontal: 3 },

  blankLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    marginTop: 15,
    marginBottom: 3,
  },
  signBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  signCol: {
    width: "47%",
  },

  // Page Footer
  pageFooter: {
    position: "absolute",
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 4,
  },
  footerBrand: {
    fontSize: 6.5,
    color: "#64748b",
  },
  footerPage: {
    fontSize: 6.5,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
  },
})

export function BatchInvestigationPdfDocument({ data }: { data: BatchInvestigationPdfData }) {
  return (
    <Document title={`Batch Investigation Report - ${data.caseNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          {data.logoUrl ? <Image src={data.logoUrl} style={styles.logo} /> : null}
          <View style={styles.headerTextContainer}>
            <Text style={styles.companyTitle}>BUBBLES O2 SDN. BHD.</Text>
            <Text style={styles.reportTitle}>CUSTOMER CARE — BATCH INVESTIGATION REPORT</Text>
            <Text style={styles.docMeta}>
              Doc Ref: {data.caseNumber}  |  Generated: {data.createdAtStr}  |  Status: {data.status}  |  PIC Dept: {data.picDepartment}
            </Text>
          </View>
        </View>

        {/* 1. Customer & Incident Information */}
        <Text style={styles.sectionTitle}>1. Customer & Incident Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Company / Outlet:</Text>
            <Text style={styles.infoValue}>
              {data.companyName} {data.outletName ? `(${data.outletName})` : ""}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Contact Person & Phone:</Text>
            <Text style={styles.infoValue}>{data.contactName} ({data.contactPhone})</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>State / Region:</Text>
            <Text style={styles.infoValue}>{data.state || "N/A"}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Defect Categories:</Text>
            <Text style={styles.infoValue}>{data.categories.join(", ") || "None specified"}</Text>
          </View>
          <View style={{ width: "100%", paddingHorizontal: 4, marginTop: 2 }}>
            <Text style={styles.infoLabel}>Goods Location Address:</Text>
            <Text style={styles.infoValue}>{data.goodsLocationAddress || "N/A"}</Text>
            <Text style={styles.disclaimer}>
              * Notice: The address above is the customer-reported location of goods; it is not proof of the original DO delivery route.
            </Text>
          </View>
          {data.otherIssueDescription && (
            <View style={{ width: "100%", paddingHorizontal: 4, marginTop: 3 }}>
              <Text style={styles.infoLabel}>Defect / Issue Description:</Text>
              <Text style={styles.infoValue}>{data.otherIssueDescription}</Text>
            </View>
          )}
        </View>

        {/* 2. Reported Complaint & Production Output Match */}
        <Text style={styles.sectionTitle}>2. Reported Complaint & Production Output Match</Text>
        {data.items.map((item, idx) => {
          const itemDecoded = decodeBottleBatchNumber(item.reportedBatchNo)
          const statusColor =
            item.matchStatus === "MATCHED"
              ? "#16a34a"
              : item.matchStatus === "UNMATCHED"
              ? "#dc2626"
              : item.matchStatus === "MULTI_MATCH"
              ? "#b45309"
              : "#64748b"

          return (
            <View key={idx} style={styles.itemContainer} wrap={false}>
              <View style={styles.itemHeaderBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemHeaderTitle}>
                    PRODUCT: {item.productSize}  |  REPORTED DEFECTIVE: {item.reportedQtyBottles} BOTTLES (PCS)
                  </Text>
                  {itemDecoded?.isValid && (
                    <Text style={styles.itemHeaderDate}>
                      Decoded Bottle Date: {itemDecoded.fullDate} · {itemDecoded.shiftName || "Standard Shift"} (ISO Week {itemDecoded.isoWeek})
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.itemBatchCode}>
                    BATCH: {item.reportedBatchNo || "N/A"}
                  </Text>
                  <Text style={[styles.itemMatchStatus, { color: statusColor }]}>
                    [{item.matchStatus}]
                  </Text>
                </View>
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
                  {item.matches.map((m, mIdx) => (
                    <View
                      key={mIdx}
                      style={[styles.tableRow, mIdx % 2 === 1 ? styles.tableRowAlt : {}]}
                    >
                      <Text style={styles.colBottleBatch}>
                        {m.bottleBatchNo || item.reportedBatchNo || "-"}
                      </Text>
                      <Text style={styles.colProdBatch}>
                        {m.productionOutputBatchNo || "-"}
                      </Text>
                      <Text style={styles.colProdPack}>
                        {formatProductPackaging(m.productPacking)}
                      </Text>
                      <Text style={styles.colProdDate}>{m.productionDateStr}</Text>
                      <Text style={styles.colProdShift}>{m.shift}</Text>
                      <Text style={styles.colProdLine}>{m.line}</Text>
                      <Text style={styles.colProdQty}>
                        {m.productionQuantityBoxes.toLocaleString()} BOXES
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noMatchAlert}>
                  <Text>
                    {item.matchRemarks || "No matching production output found in Daily Production Reports."}
                  </Text>
                </View>
              )}
            </View>
          )
        })}

        {/* 3. Manual Warehouse Investigation Worksheet */}
        <View wrap={false} style={{ marginTop: 4 }}>
          <Text style={styles.sectionTitle}>3. Manual Warehouse Investigation Worksheet (Via Warehouse Excel)</Text>
          <View style={styles.worksheetBox}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#0f172a" }}>
              PHYSICAL BALANCE REMAINING IN WAREHOUSE:  [  __________________  ] BOXES
            </Text>
            <Text style={{ fontSize: 7, color: "#64748b", marginTop: 2, marginBottom: 4 }}>
              Record all dispatch movements identified from warehouse Excel registers for the matched batch:
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colWNo}>No</Text>
                <Text style={styles.colWDate}>Dispatch Date</Text>
                <Text style={styles.colWLorry}>Lorry / Vehicle Reg</Text>
                <Text style={styles.colWDO}>DO / Ref No</Text>
                <Text style={styles.colWQty}>Qty Dispatched</Text>
                <Text style={styles.colWDest}>Destination / Consignee</Text>
              </View>
              {[1, 2, 3, 4].map((num) => (
                <View key={num} style={[styles.tableRow, num % 2 === 0 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.colWNo}>{num}</Text>
                  <Text style={styles.colWDate}>___ / ___ / 202_</Text>
                  <Text style={styles.colWLorry}>_________________</Text>
                  <Text style={styles.colWDO}>_________________</Text>
                  <Text style={styles.colWQty}>________ BOXES</Text>
                  <Text style={styles.colWDest}>_________________________________</Text>
                </View>
              ))}
            </View>

            <View style={styles.signBlock}>
              <View style={styles.signCol}>
                <Text style={styles.infoLabel}>Warehouse Investigator:</Text>
                <View style={styles.blankLine} />
                <Text style={{ fontSize: 7, color: "#64748b" }}>Name & Signature / Date</Text>
              </View>
              <View style={styles.signCol}>
                <Text style={styles.infoLabel}>Warehouse Remarks / Reconciliation:</Text>
                <View style={styles.blankLine} />
                <Text style={{ fontSize: 7, color: "#64748b" }}>Physical stock count / variance noted</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Production & QC Operational Follow-up */}
        <View wrap={false} style={{ marginTop: 4 }}>
          <Text style={styles.sectionTitle}>4. Production / QC Disposition & Verification</Text>
          <View style={styles.worksheetBox}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 7.5, color: "#0f172a" }}>[   ] No Defect / Standard Replacement</Text>
              <Text style={{ fontSize: 7.5, color: "#0f172a" }}>[   ] Quarantine Warehouse Stock</Text>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#b91c1c" }}>
                [   ] PRODUCT RECALL INITIATED
              </Text>
            </View>
            <View style={styles.signBlock}>
              <View style={styles.signCol}>
                <Text style={styles.infoLabel}>QC / Production Reviewer:</Text>
                <View style={styles.blankLine} />
                <Text style={{ fontSize: 7, color: "#64748b" }}>Signature / Date</Text>
              </View>
              <View style={styles.signCol}>
                <Text style={styles.infoLabel}>Action Taken / Root Cause Investigation:</Text>
                <View style={styles.blankLine} />
                <Text style={{ fontSize: 7, color: "#64748b" }}>Corrective action or customer resolution</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fixed Footer */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerBrand}>
            BUBBLES O2 SDN. BHD. · Quality Assurance & Customer Care Batch Investigation · Confidential
          </Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

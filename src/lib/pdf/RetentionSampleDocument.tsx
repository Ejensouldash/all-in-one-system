import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"

export interface RetentionSamplePdfRow {
  id: string
  dateTimeStr: string
  sku: string
  amountSample: number
  batchNo: string
  preparedByName: string
  status: string
}

export interface RetentionSamplePdfPayload {
  monthName: string
  year: number
  logoUrl?: string
  rows: RetentionSamplePdfRow[]
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  // Document control box
  headerTable: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#000000",
    flexDirection: "row",
    marginBottom: 8,
  },
  headerColLogo: {
    width: "22%",
    borderRightWidth: 1.5,
    borderRightColor: "#000000",
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    maxHeight: 36,
    objectFit: "contain",
  },
  headerColCompany: {
    width: "48%",
    borderRightWidth: 1.5,
    borderRightColor: "#000000",
    padding: 6,
    justifyContent: "center",
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 7.5,
    lineHeight: 1.25,
    color: "#333333",
  },
  headerColDocControl: {
    width: "30%",
    flexDirection: "column",
  },
  docControlRow: {
    flexDirection: "row",
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  docControlRowLast: {
    flexDirection: "row",
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  docControlLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    width: "45%",
  },
  docControlValue: {
    fontSize: 8,
    width: "55%",
  },
  // Title & Month
  titleContainer: {
    textAlign: "center",
    marginBottom: 8,
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textDecoration: "underline",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  monthText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textTransform: "uppercase",
  },
  // Main Data Table
  dataTable: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    minHeight: 18,
    alignItems: "center",
  },
  tableRowVoided: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    minHeight: 18,
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    padding: 4,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#000000",
  },
  td: {
    fontSize: 8,
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    textAlign: "center",
  },
  colDateTime: { width: "25%" },
  colSku: { width: "16%" },
  colAmount: { width: "15%" },
  colBatch: { width: "22%" },
  colPrepared: { width: "22%", borderRightWidth: 0 },
  footerNote: {
    marginTop: 8,
    fontSize: 7,
    color: "#666666",
    textAlign: "right",
  },
})

export function RetentionSampleDocument({ payload }: { payload: RetentionSamplePdfPayload }) {
  const { monthName, year, logoUrl, rows } = payload

  // Pad empty lines up to 14 rows if few items exist, matching physical printed lines
  const minRows = 14
  const emptyRowsCount = Math.max(0, minRows - rows.length)
  const emptyRows = Array.from({ length: emptyRowsCount })

  return (
    <Document title={`Retention_Sample_Record_${monthName}_${year}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Document Header & Document Control Box */}
        <View style={styles.headerTable}>
          {/* Logo */}
          <View style={styles.headerColLogo}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: "#00838f" }}>
                BUBBLES O2
              </Text>
            )}
          </View>

          {/* Company Name & Address */}
          <View style={styles.headerColCompany}>
            <Text style={styles.companyName}>BUBBLES O2 SDN BHD</Text>
            <Text style={styles.companyAddress}>KOMPLEKS AL AMMAR</Text>
            <Text style={styles.companyAddress}>KG KANCHONG</Text>
            <Text style={styles.companyAddress}>71200 RANTAU, NEGERI SEMBILAN</Text>
          </View>

          {/* Document Control Box */}
          <View style={styles.headerColDocControl}>
            <View style={styles.docControlRow}>
              <Text style={styles.docControlLabel}>Rec. No :</Text>
              <Text style={styles.docControlValue}>SGMP/21/RSR</Text>
            </View>
            <View style={styles.docControlRow}>
              <Text style={styles.docControlLabel}>Issue No :</Text>
              <Text style={styles.docControlValue}>20/05/2025</Text>
            </View>
            <View style={styles.docControlRow}>
              <Text style={styles.docControlLabel}>Rev No :</Text>
              <Text style={styles.docControlValue}>1</Text>
            </View>
            <View style={styles.docControlRowLast}>
              <Text style={styles.docControlLabel}>Effective Date :</Text>
              <Text style={styles.docControlValue}>21/09/2026</Text>
            </View>
          </View>
        </View>

        {/* Form Title & Selected Month */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>RETENTION SAMPLE RECORD</Text>
          <Text style={styles.monthText}>
            MONTH: {monthName} {year}
          </Text>
        </View>

        {/* Data Table */}
        <View style={styles.dataTable}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colDateTime]}>DATE &amp; TIME</Text>
            <Text style={[styles.th, styles.colSku]}>SKU</Text>
            <Text style={[styles.th, styles.colAmount]}>AMOUNT SAMPLE</Text>
            <Text style={[styles.th, styles.colBatch]}>NO BATCH</Text>
            <Text style={[styles.th, styles.colPrepared]}>PREPARED BY</Text>
          </View>

          {/* Data Rows */}
          {rows.map((r, idx) => (
            <View key={r.id || idx} style={r.status === "VOID" ? styles.tableRowVoided : styles.tableRow}>
              <Text style={[styles.td, styles.colDateTime]}>
                {r.dateTimeStr} {r.status === "VOID" ? "(VOID)" : ""}
              </Text>
              <Text style={[styles.td, styles.colSku, { fontFamily: "Helvetica-Bold" }]}>
                {r.sku}
              </Text>
              <Text style={[styles.td, styles.colAmount]}>
                {r.amountSample}
              </Text>
              <Text style={[styles.td, styles.colBatch, { fontFamily: "Helvetica-Bold" }]}>
                {r.batchNo}
              </Text>
              <Text style={[styles.td, styles.colPrepared]}>
                {r.preparedByName}
              </Text>
            </View>
          ))}

          {/* Empty Ruled Lines for aesthetic parity with paper log */}
          {emptyRows.map((_, i) => (
            <View key={`empty-${i}`} style={styles.tableRow}>
              <Text style={[styles.td, styles.colDateTime]}> </Text>
              <Text style={[styles.td, styles.colSku]}> </Text>
              <Text style={[styles.td, styles.colAmount]}> </Text>
              <Text style={[styles.td, styles.colBatch]}> </Text>
              <Text style={[styles.td, styles.colPrepared]}> </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          Dokumen Kualiti Bubbles O2 • Dijana secara automatik melalui AIO System
        </Text>
      </Page>
    </Document>
  )
}

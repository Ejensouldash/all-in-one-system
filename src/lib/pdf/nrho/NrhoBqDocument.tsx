import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer"
import {
  nrhoPalette,
  formatDateStr,
  formatRM,
  BUBBLESO2_COMPANY_PROFILE,
} from "./nrho-pdf-utils"

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 38,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: nrhoPalette.body,
    backgroundColor: nrhoPalette.white,
  },
  headerGrid: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#000000",
    marginBottom: 0,
  },
  headerBoxLeft: {
    width: "25%",
    borderRightWidth: 1.5,
    borderRightColor: "#000000",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 95,
    height: 32,
    objectFit: "contain",
  },
  headerBoxCenter: {
    width: "55%",
    borderRightWidth: 1.5,
    borderRightColor: "#000000",
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    textAlign: "center",
  },
  companyReg: {
    fontSize: 7,
    color: nrhoPalette.muted,
    marginTop: 1,
  },
  headerBoxRight: {
    width: "20%",
    padding: 6,
    justifyContent: "center",
  },
  metaItem: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  projectBanner: {
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: "#000000",
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textAlign: "center",
  },
  bannerSubtitle: {
    fontSize: 7,
    color: nrhoPalette.muted,
    marginTop: 1,
    textAlign: "center",
  },
  table: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#000000",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.2,
    color: "#000000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  colBil: { width: "6%", textAlign: "center", borderRightWidth: 1, borderRightColor: "#CBD5E1" },
  colDesc: { width: "46%", borderRightWidth: 1, borderRightColor: "#CBD5E1", paddingHorizontal: 4 },
  colUnit: { width: "10%", textAlign: "center", borderRightWidth: 1, borderRightColor: "#CBD5E1" },
  colQty: { width: "10%", textAlign: "center", borderRightWidth: 1, borderRightColor: "#CBD5E1" },
  colRate: { width: "14%", textAlign: "right", borderRightWidth: 1, borderRightColor: "#CBD5E1", paddingRight: 4 },
  colTotal: { width: "14%", textAlign: "right", paddingRight: 4 },
  footerRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderTopColor: "#000000",
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  footerLabel: {
    width: "72%",
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#000000",
    paddingRight: 8,
  },
  footerAmount: {
    width: "28%",
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#000000",
    paddingRight: 4,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 8,
  },
  signBox: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 6,
  },
  signTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 22,
  },
  signMeta: {
    fontSize: 7,
    color: nrhoPalette.body,
    marginTop: 2,
  },
  pageFooter: {
    position: "absolute",
    bottom: 16,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingTop: 6,
    fontSize: 6.5,
    color: nrhoPalette.muted,
  },
})

export interface NrhoBqDocumentProps {
  logoSource?: string
  hidePricing?: boolean
  project: {
    projectCode: string
    title: string
    clientOrDepartment?: string | null
    siteLocation?: string | null
    projectManager?: string | null
    bqItems: Array<{
      id: string
      category: string
      description: string
      quantity: number
      unit: string
      unitRate: number
      amount: number
    }>
  }
}

export function NrhoBqDocument({ logoSource, hidePricing = false, project }: NrhoBqDocumentProps) {
  const totalAmount = project.bqItems.reduce((acc, it) => acc + (it.amount || 0), 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Grid matching template */}
        <View style={styles.headerGrid}>
          <View style={styles.headerBoxLeft}>
            {logoSource ? (
              <Image src={logoSource} style={styles.logo} />
            ) : (
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>BUBBLES O2</Text>
            )}
          </View>

          <View style={styles.headerBoxCenter}>
            <Text style={styles.companyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
            <Text style={styles.companyReg}>REG. NO: {BUBBLESO2_COMPANY_PROFILE.registrationNo}</Text>
            <Text style={[styles.companyReg, { fontSize: 6.2 }]}>
              {BUBBLESO2_COMPANY_PROFILE.addressInline}
            </Text>
          </View>

          <View style={styles.headerBoxRight}>
            <Text style={styles.metaItem}>BILL NO: 1</Text>
            <Text style={styles.metaItem}>REF: {project.projectCode}</Text>
            <Text style={[styles.metaItem, { fontSize: 6.5, color: nrhoPalette.muted }]}>
              DATE: {formatDateStr(new Date())}
            </Text>
          </View>
        </View>

        {/* Project Banner */}
        <View style={styles.projectBanner}>
          <Text style={styles.bannerTitle}>
            BILL OF QUANTITIES: {project.title.toUpperCase()}
          </Text>
          <Text style={styles.bannerSubtitle}>
            Location: {project.siteLocation || "Headquarters"} | Division: {project.clientOrDepartment || "Internal"}
          </Text>
        </View>

        {/* BQ Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colBil}>BIL</Text>
            <Text style={styles.colDesc}>DESCRIPTION &amp; SPECIFICATION OF WORKS</Text>
            <Text style={styles.colUnit}>UNIT</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colRate}>{hidePricing ? "RATE" : "RATE (RM)"}</Text>
            <Text style={styles.colTotal}>{hidePricing ? "AMOUNT" : "TOTAL (RM)"}</Text>
          </View>

          {project.bqItems.map((item, idx) => {
            const isAlt = idx % 2 === 1
            return (
              <View key={item.id || idx} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={styles.colBil}>{idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: "#000000" }}>
                    {item.description}
                  </Text>
                  {item.category && (
                    <Text style={{ fontSize: 6.2, color: nrhoPalette.muted }}>
                      Trade: {item.category}
                    </Text>
                  )}
                </View>
                <Text style={styles.colUnit}>{item.unit}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colRate}>
                  {hidePricing ? "-" : (item.unitRate || 0).toFixed(2)}
                </Text>
                <Text style={[styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                  {hidePricing ? "-" : (item.amount || 0).toFixed(2)}
                </Text>
              </View>
            )
          })}

          {/* Grand Total carried forward */}
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>
              TOTAL AMOUNT CARRIED TO SUMMARY / GRAND TOTAL:
            </Text>
            <Text style={styles.footerAmount}>
              {hidePricing ? "TENDER SUBMISSION" : formatRM(totalAmount)}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Prepared By (Project Engineer / QS):</Text>
            <Text style={styles.signMeta}>Name: {project.projectManager || "_____________________"}</Text>
            <Text style={styles.signMeta}>Date: {formatDateStr(new Date())}</Text>
          </View>

          <View style={styles.signBox}>
            <Text style={styles.signTitle}>Verified &amp; Approved By (Management):</Text>
            <Text style={styles.signMeta}>Name: _____________________</Text>
            <Text style={styles.signMeta}>Date: _____________________</Text>
          </View>
        </View>

        {/* Page Footer */}
        <View style={styles.pageFooter} fixed>
          <Text>Bubbles O2 Sdn. Bhd. — Official Bill of Quantities</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

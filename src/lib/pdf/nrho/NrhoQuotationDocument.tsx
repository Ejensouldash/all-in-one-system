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
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 40,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: nrhoPalette.body,
    backgroundColor: nrhoPalette.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#DC2626", // Red accent bar matching quotation template
    marginBottom: 14,
  },
  headerLeft: {
    width: 320,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logo: {
    width: 110,
    height: 36,
    marginRight: 12,
    objectFit: "contain",
  },
  companyDetails: {
    width: 190,
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 1,
  },
  companyReg: {
    fontSize: 6.8,
    color: nrhoPalette.muted,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  companyText: {
    fontSize: 6.5,
    color: nrhoPalette.muted,
    lineHeight: 1.35,
  },
  headerRight: {
    width: 180,
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#DC2626", // Bright red bold title like reference image
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
  },
  metaValue: {
    fontSize: 7.5,
    color: nrhoPalette.body,
  },
  recipientSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    backgroundColor: nrhoPalette.bgSubtle,
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: nrhoPalette.borderLight,
  },
  recipientLeft: {
    width: "60%",
  },
  recipientRight: {
    width: "38%",
    alignItems: "flex-end",
  },
  sectionHeading: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  clientName: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 2,
  },
  clientText: {
    fontSize: 7.5,
    color: nrhoPalette.body,
    lineHeight: 1.3,
  },
  validityBadge: {
    backgroundColor: nrhoPalette.amberSoft,
    borderWidth: 1,
    borderColor: nrhoPalette.amberBorder,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 4,
  },
  validityText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.amber,
    textAlign: "right",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#000000", // Black table header matching template
    color: nrhoPalette.white,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingVertical: 5.5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  colNo: { width: "6%", textAlign: "center" },
  colDesc: { width: "48%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "10%", textAlign: "center" },
  colRate: { width: "13%", textAlign: "right" },
  colTotal: { width: "13%", textAlign: "right" },
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  totalBox: {
    width: 250,
    borderWidth: 1,
    borderColor: nrhoPalette.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: nrhoPalette.borderLight,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: nrhoPalette.navyDark,
    color: nrhoPalette.white,
  },
  grandTotalLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.white,
  },
  grandTotalVal: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.white,
  },
  termsSection: {
    borderWidth: 1,
    borderColor: nrhoPalette.borderLight,
    borderRadius: 4,
    padding: 8,
    backgroundColor: nrhoPalette.bgSubtle,
    marginBottom: 16,
  },
  termsTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 4,
  },
  termsItem: {
    fontSize: 6.8,
    color: nrhoPalette.muted,
    lineHeight: 1.35,
    marginBottom: 2,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  signBox: {
    width: "46%",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.border,
    paddingTop: 8,
  },
  signTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: nrhoPalette.navyDark,
    marginBottom: 26,
  },
  signField: {
    fontSize: 7,
    color: nrhoPalette.body,
    marginBottom: 3,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: nrhoPalette.borderLight,
    paddingTop: 6,
    fontSize: 6.5,
    color: nrhoPalette.muted,
  },
})

export interface NrhoQuotationDocumentProps {
  logoSource?: string
  project: {
    projectCode: string
    title: string
    clientOrDepartment?: string | null
    siteLocation?: string | null
    projectManager?: string | null
    startDate?: string | Date | null
    targetCompletionDate?: string | Date | null
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

export function NrhoQuotationDocument({ logoSource, project }: NrhoQuotationDocumentProps) {
  const totalAmount = project.bqItems.reduce((acc, it) => acc + (it.amount || 0), 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoSource ? (
              <Image src={logoSource} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>BUBBLES O2</Text>
            )}
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
              <Text style={styles.companyReg}>Registration No: {BUBBLESO2_COMPANY_PROFILE.registrationNo}</Text>
              <Text style={styles.companyText}>{BUBBLESO2_COMPANY_PROFILE.addressInline}</Text>
              <Text style={styles.companyText}>
                Tel: {BUBBLESO2_COMPANY_PROFILE.phone} | Email: {BUBBLESO2_COMPANY_PROFILE.email}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>QUOTATION</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Quote No:</Text>
              <Text style={styles.metaValue}>QUO-{project.projectCode}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDateStr(new Date())}</Text>
            </View>
          </View>
        </View>

        {/* Client & Validity Section */}
        <View style={styles.recipientSection}>
          <View style={styles.recipientLeft}>
            <Text style={styles.sectionHeading}>Attn To / Client:</Text>
            <Text style={styles.clientName}>{project.clientOrDepartment || "Internal Department"}</Text>
            <Text style={styles.clientText}>Project: {project.title}</Text>
            {project.siteLocation && (
              <Text style={styles.clientText}>Site Location: {project.siteLocation}</Text>
            )}
            {project.projectManager && (
              <Text style={styles.clientText}>Manager In-Charge: {project.projectManager}</Text>
            )}
          </View>

          <View style={styles.recipientRight}>
            <Text style={styles.sectionHeading}>Validity &amp; Terms:</Text>
            <View style={styles.validityBadge}>
              <Text style={styles.validityText}>VALIDITY: 90 DAYS FROM DATE OF ISSUANCE</Text>
            </View>
            <Text style={[styles.clientText, { marginTop: 4, textAlign: "right" }]}>
              Delivery Period: {formatDateStr(project.startDate)} - {formatDateStr(project.targetCompletionDate)}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>NO</Text>
            <Text style={styles.colDesc}>WORK DESCRIPTION &amp; SPECIFICATIONS</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colUnit}>UNIT</Text>
            <Text style={styles.colRate}>RATE (RM)</Text>
            <Text style={styles.colTotal}>AMOUNT (RM)</Text>
          </View>

          {project.bqItems.map((item, idx) => {
            const isAlt = idx % 2 === 1
            return (
              <View key={item.id || idx} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                <Text style={[styles.colNo, { color: nrhoPalette.muted }]}>{idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={{ fontFamily: "Helvetica-Bold", color: nrhoPalette.navyDark }}>
                    {item.description}
                  </Text>
                  {item.category && (
                    <Text style={{ fontSize: 6.2, color: nrhoPalette.muted }}>
                      Category: {item.category}
                    </Text>
                  )}
                </View>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colUnit}>{item.unit}</Text>
                <Text style={styles.colRate}>
                  {(item.unitRate || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                  {(item.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Total Summary */}
        <View style={styles.totalSection}>
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={{ fontSize: 7.5, color: nrhoPalette.muted }}>Subtotal (Excl. SST):</Text>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>{formatRM(totalAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={{ fontSize: 7.5, color: nrhoPalette.muted }}>SST (0% / Exempted):</Text>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold" }}>RM 0.00</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL AMOUNT:</Text>
              <Text style={styles.grandTotalVal}>{formatRM(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Terms &amp; Conditions:</Text>
          <Text style={styles.termsItem}>
            1. All prices are quoted in Ringgit Malaysia (MYR) and strictly valid for 90 calendar days.
          </Text>
          <Text style={styles.termsItem}>
            2. Payment terms: 30 days net from invoice date or according to formal contract milestones.
          </Text>
          <Text style={styles.termsItem}>
            3. Warranty: 12 months comprehensive defects liability for supplied goods and installations.
          </Text>
        </View>

        {/* Signature Blocks */}
        <View style={styles.signatureRow}>
          <View style={styles.signBox}>
            <Text style={styles.signTitle}>ISSUED BY (BUBBLES O2 SDN. BHD.):</Text>
            <Text style={styles.signField}>Authorized Signature: _______________________</Text>
            <Text style={styles.signField}>Name: {project.projectManager || "Project PIC"}</Text>
            <Text style={styles.signField}>Date: {formatDateStr(new Date())}</Text>
          </View>

          <View style={styles.signBox}>
            <Text style={styles.signTitle}>CONFIRMED &amp; ACCEPTED BY CLIENT:</Text>
            <Text style={styles.signField}>Authorized Signature: _______________________</Text>
            <Text style={styles.signField}>Name &amp; IC: _______________________________</Text>
            <Text style={styles.signField}>Date &amp; Stamp: ____________________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Bubbles O2 Sdn. Bhd. — Official Quotation</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

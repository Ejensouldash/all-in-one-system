import React from "react"
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import { BUBBLESO2_COMPANY_PROFILE } from "@/lib/company-profile"

export type EInvoiceLineItem = {
  sku?: string | null
  itemCode?: string | null
  barcode?: string | null
  description: string
  uom: string
  quantity: number
  unitPrice: number
  amount: number
}

export type EInvoicePdfData = {
  documentNumber: string
  documentDate: string
  customerName: string
  fullName?: string | null
  icNumber?: string | null
  phone?: string | null
  email?: string | null
  deliveryAddress: string
  deliveryMode?: string | null
  currency?: string
  lines: EInvoiceLineItem[]
  subtotal: number
  taxTotal?: number
  freightTotal?: number
  grandTotal: number
  remarks?: string | null
  createdAt?: string | Date
}

const palette = {
  navyDark: "#0A192F",
  navy: "#0F172A",
  navySoft: "#1E293B",
  slateBody: "#334155",
  slateMuted: "#64748B",
  slateFaint: "#94A3B8",
  border: "#CBD5E1",
  borderLight: "#E2E8F0",
  bgSubtle: "#F8FAFC",
  bgCard: "#F1F5F9",
  cyan: "#0891B2",
  cyanDark: "#0E7490",
  cyanSoft: "#ECFEFF",
  cyanBorder: "#A5F3FC",
  purple: "#7C3AED",
  purpleSoft: "#F5F3FF",
  purpleBorder: "#DDD6FE",
  green: "#059669",
  greenSoft: "#ECFDF5",
  greenBorder: "#A7F3D0",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 36,
    paddingBottom: 40,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: palette.slateBody,
    backgroundColor: palette.white,
  },
  topAccentBar: {
    height: 4,
    backgroundColor: palette.purple,
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: 320,
  },
  logo: {
    width: 105,
    height: 40,
    marginRight: 12,
    objectFit: "contain",
  },
  companyInfo: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: 7.5,
    color: palette.slateMuted,
    lineHeight: 1.35,
  },
  headerRight: {
    width: 190,
    alignItems: "flex-end",
  },
  docTitleBadge: {
    backgroundColor: palette.purpleSoft,
    borderWidth: 1,
    borderColor: palette.purpleBorder,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  docTitleText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: palette.purple,
    letterSpacing: 0.5,
  },
  docNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    marginBottom: 2,
  },
  docSubText: {
    fontSize: 8,
    color: palette.slateMuted,
    lineHeight: 1.3,
  },

  // Recipient / Customer Card
  customerSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  customerCard: {
    flex: 2,
    backgroundColor: palette.bgSubtle,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: 6,
    padding: 10,
  },
  deliveryCard: {
    flex: 1,
    backgroundColor: palette.purpleSoft,
    borderWidth: 1,
    borderColor: palette.purpleBorder,
    borderRadius: 6,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: palette.slateMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  customerName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    marginBottom: 4,
  },
  icBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  icBadge: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.purpleBorder,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  icBadgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: palette.purple,
  },
  customerDetailText: {
    fontSize: 8,
    color: palette.slateBody,
    lineHeight: 1.4,
  },

  // Delivery Card elements
  deliveryModeBadge: {
    backgroundColor: palette.purple,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  deliveryModeText: {
    color: palette.white,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },

  // Items Table
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: palette.navyDark,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: palette.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: palette.bgSubtle,
  },
  tableCell: {
    fontSize: 8,
    color: palette.slateBody,
  },
  colNo: { width: "5%", textAlign: "center" },
  colSku: { width: "20%" },
  colDesc: { width: "40%" },
  colQty: { width: "10%", textAlign: "center" },
  colPrice: { width: "12%", textAlign: "right" },
  colAmount: { width: "13%", textAlign: "right" },

  // Summary & Totals
  summarySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  remarksBox: {
    width: "55%",
    backgroundColor: palette.bgSubtle,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: 6,
    padding: 8,
  },
  totalsBox: {
    width: "40%",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: 6,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 4.5,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: palette.navyDark,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  totalLabel: {
    fontSize: 8,
    color: palette.slateMuted,
  },
  totalValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: palette.slateBody,
  },
  grandTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: palette.white,
  },
  grandTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: palette.cyanBorder,
  },

  // Footer & Compliance Notice
  complianceBox: {
    backgroundColor: palette.bgSubtle,
    borderLeftWidth: 3,
    borderLeftColor: palette.purple,
    padding: 8,
    borderRadius: 3,
    marginBottom: 12,
  },
  complianceText: {
    fontSize: 7,
    color: palette.slateMuted,
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: palette.slateFaint,
  },
})

function formatMoney(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function EInvoiceDocument({
  data,
  logoSource,
}: {
  data: EInvoicePdfData
  logoSource?: string
}) {
  const lineItems = data.lines && data.lines.length > 0 ? data.lines : []
  const subtotal = data.subtotal || lineItems.reduce((acc, item) => acc + item.amount, 0)
  const grandTotal = data.grandTotal || subtotal

  return (
    <Document title={`E-Invoice - ${data.documentNumber}`} author="BubblesO2 All-in-One System">
      <Page size="A4" style={styles.page}>
        {/* Top Purple Accent Line */}
        <View style={styles.topAccentBar} />

        {/* Corporate Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoSource && <Image style={styles.logo} src={logoSource} />}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
              <Text style={styles.companyMeta}>Reg No: {BUBBLESO2_COMPANY_PROFILE.registrationNo}</Text>
              <Text style={styles.companyMeta}>SST No: {BUBBLESO2_COMPANY_PROFILE.salesTaxRegistrationNo}</Text>
              <Text style={styles.companyMeta}>TIN: {BUBBLESO2_COMPANY_PROFILE.tin}</Text>
              <Text style={styles.companyMeta}>{BUBBLESO2_COMPANY_PROFILE.phone} · {BUBBLESO2_COMPANY_PROFILE.email}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.docTitleBadge}>
              <Text style={styles.docTitleText}>E-INVOICE / DIRECT DELIVERY</Text>
            </View>
            <Text style={styles.docNumber}>{data.documentNumber}</Text>
            <Text style={styles.docSubText}>Issue Date: {data.documentDate || "N/A"}</Text>
            <Text style={styles.docSubText}>Payment Terms: CASH / PRE-PAID</Text>
            <Text style={styles.docSubText}>Currency: {data.currency || "MYR"}</Text>
          </View>
        </View>

        {/* Customer & Delivery Cards */}
        <View style={styles.customerSection}>
          <View style={styles.customerCard}>
            <Text style={styles.sectionTitle}>Billed & Delivered To (Customer Details)</Text>
            <Text style={styles.customerName}>{data.fullName || data.customerName || "Customer"}</Text>
            
            {data.icNumber && (
              <View style={styles.icBadgeContainer}>
                <View style={styles.icBadge}>
                  <Text style={styles.icBadgeText}>NRIC / IC NO: {data.icNumber}</Text>
                </View>
              </View>
            )}

            <Text style={styles.customerDetailText}>
              Phone: {data.phone || "N/A"}  |  Email: {data.email || "N/A"}
            </Text>
            <Text style={[styles.customerDetailText, { marginTop: 4 }]}>
              Address: {data.deliveryAddress || "N/A"}
            </Text>
          </View>

          <View style={styles.deliveryCard}>
            <Text style={[styles.sectionTitle, { color: palette.purple }]}>Fulfillment Method</Text>
            <View style={styles.deliveryModeBadge}>
              <Text style={styles.deliveryModeText}>{data.deliveryMode || "DIRECT DELIVERY"}</Text>
            </View>
            <Text style={[styles.customerDetailText, { fontSize: 7.5, color: palette.slateMuted }]}>
              Dispatched directly from central depot to specified customer location.
            </Text>
          </View>
        </View>

        {/* Itemized Order Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colNo]}>No</Text>
            <Text style={[styles.tableHeaderCell, styles.colSku]}>Product SKU</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty (CTN)</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price (RM)</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Total (RM)</Text>
          </View>

          {lineItems.map((line, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, styles.colNo]}>{idx + 1}</Text>
              <View style={[styles.colSku]}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8 }}>{line.sku || line.itemCode || "-"}</Text>
                {line.barcode && <Text style={{ fontSize: 7, color: palette.slateFaint }}>{line.barcode}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.colDesc]}>{line.description}</Text>
              <Text style={[styles.tableCell, styles.colQty, { fontFamily: "Helvetica-Bold" }]}>{line.quantity} {line.uom}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{formatMoney(line.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.colAmount, { fontFamily: "Helvetica-Bold" }]}>{formatMoney(line.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Summary & Totals */}
        <View style={styles.summarySection}>
          <View style={styles.remarksBox}>
            <Text style={styles.sectionTitle}>Notes & Remarks</Text>
            <Text style={{ fontSize: 8, color: palette.slateBody, lineHeight: 1.4 }}>
              {data.remarks || "Standard direct delivery order processed via BubblesO2 AIO Digital Forms."}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatMoney(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sales Tax / SST (0%)</Text>
              <Text style={styles.totalValue}>{formatMoney(data.taxTotal || 0)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Direct Freight / Delivery</Text>
              <Text style={styles.totalValue}>{formatMoney(data.freightTotal || 0)}</Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={styles.grandTotalLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* e-Invoice Legal & Audit Notice */}
        <View style={styles.complianceBox}>
          <Text style={styles.complianceText}>
            • LHDN E-Invoice Notice: This transaction is recorded under Malaysian e-Invoicing guidelines for B2C/Corporate Direct Delivery.
          </Text>
          <Text style={styles.complianceText}>
            • This is an official computer-generated document from BubblesO2 All-in-One (AIO) Platform. No signature is required.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            BubblesO2 All-in-One System · Ref: {data.documentNumber}
          </Text>
          <Text style={styles.footerText}>
            Page 1 of 1 · Generated on {new Date().toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

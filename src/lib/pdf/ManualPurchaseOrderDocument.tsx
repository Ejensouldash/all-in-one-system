import React from "react"
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import { normalizeExtractedDocument } from "@/lib/sales-ordering/types"

type CustomerAddress = {
  fullAddress: string | null
  attentionTo: string | null
  phone: string | null
  isDefaultDelivery: boolean
  isDefaultBilling: boolean
}

type MatchedCustomer = {
  customerCode: string
  legalName: string
  pic: string | null
  phonePrimary: string | null
  creditTermsRaw: string | null
  addresses: CustomerAddress[]
}

export type ManualPurchaseOrderData = {
  id: string
  createdAt: Date
  extractedData: unknown
  uploadedBy: { name: string } | null
  matchedCustomer: MatchedCustomer | null
}

const palette = {
  ink: "#102A43",
  muted: "#627D98",
  faint: "#F5F8FA",
  line: "#D9E2EC",
  cyan: "#0EA5B7",
  cyanDark: "#087F8C",
  cyanSoft: "#E8F8FA",
  green: "#2BB653",
  amber: "#B7791F",
  amberSoft: "#FFF8E7",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 46,
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: palette.ink,
    backgroundColor: palette.white,
  },
  brandRule: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.cyan,
    marginBottom: 17,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  logo: { width: 126, height: 32, objectFit: "contain" },
  titleBlock: { alignItems: "flex-end" },
  kicker: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 1.6,
    color: palette.cyanDark,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: 700, letterSpacing: 0.8, color: palette.ink },
  statusPill: {
    marginTop: 7,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: palette.amberSoft,
    color: palette.amber,
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.7,
  },
  metaStrip: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 7,
    backgroundColor: palette.faint,
    marginBottom: 15,
    overflow: "hidden",
  },
  metaCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 9 },
  metaDivider: { borderLeftWidth: 1, borderLeftColor: palette.line },
  label: {
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: palette.muted,
    marginBottom: 3,
  },
  metaValue: { fontSize: 8.5, fontWeight: 700, color: palette.ink },
  partyGrid: { flexDirection: "row", gap: 10, marginBottom: 15 },
  partyCard: {
    flex: 1,
    minHeight: 102,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    padding: 11,
  },
  partyAccent: { borderTopWidth: 3, borderTopColor: palette.cyan },
  partyAccentGreen: { borderTopWidth: 3, borderTopColor: palette.green },
  sectionEyebrow: {
    fontSize: 6.5,
    fontWeight: 700,
    letterSpacing: 0.9,
    color: palette.cyanDark,
    marginBottom: 6,
  },
  partyName: { fontSize: 10.5, fontWeight: 700, color: palette.ink, marginBottom: 5 },
  partyText: { fontSize: 7.6, lineHeight: 1.45, color: palette.muted },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  contactText: { fontSize: 7.1, color: palette.ink, marginRight: 10, marginBottom: 2 },
  table: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 26,
    paddingHorizontal: 7,
    backgroundColor: palette.ink,
  },
  tableHeaderText: { fontSize: 6.5, fontWeight: 700, letterSpacing: 0.55, color: palette.white },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    paddingHorizontal: 7,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  tableRowLast: { borderBottomWidth: 0 },
  colNo: { width: "5%", textAlign: "center" },
  colItem: { width: "37%", paddingRight: 7 },
  colQty: { width: "11%", textAlign: "center" },
  colUom: { width: "9%", textAlign: "center" },
  colPrice: { width: "14%", textAlign: "right" },
  colAdjust: { width: "11%", textAlign: "right" },
  colAmount: { width: "13%", textAlign: "right" },
  itemSku: { fontSize: 8, fontWeight: 700, color: palette.ink, marginBottom: 2 },
  itemDescription: { fontSize: 7.2, color: palette.muted, lineHeight: 1.35 },
  itemBarcode: { fontSize: 6.5, color: "#829AB1", marginTop: 2 },
  cellText: { fontSize: 7.6, color: palette.ink },
  cellMuted: { fontSize: 6.7, color: palette.muted, marginTop: 2 },
  cellStrong: { fontSize: 7.8, fontWeight: 700, color: palette.ink },
  emptyRow: { paddingVertical: 16, textAlign: "center", color: palette.muted },
  lowerGrid: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  notesColumn: { flex: 1 },
  notesCard: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  notesTitle: { fontSize: 7, fontWeight: 700, letterSpacing: 0.6, color: palette.ink, marginBottom: 5 },
  notesText: { fontSize: 7.2, lineHeight: 1.45, color: palette.muted },
  approvalCard: {
    borderRadius: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: palette.cyanSoft,
  },
  approvalTitle: { fontSize: 7.2, fontWeight: 700, color: palette.cyanDark, marginBottom: 2 },
  approvalText: { fontSize: 6.8, lineHeight: 1.35, color: palette.muted },
  totalsCard: {
    width: 205,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  totalLabel: { fontSize: 7.2, color: palette.muted },
  totalValue: { fontSize: 7.5, fontWeight: 700, color: palette.ink },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 9,
    marginTop: 2,
    backgroundColor: palette.ink,
  },
  grandTotalLabel: { fontSize: 7.2, fontWeight: 700, letterSpacing: 0.5, color: palette.white },
  grandTotalValue: { fontSize: 12, fontWeight: 700, color: palette.white },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 20,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6.2, color: "#829AB1" },
  footerPage: { fontSize: 6.2, fontWeight: 700, color: palette.muted },
})

function valueOrDash(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized || "-"
}

function formatDate(value: string) {
  if (!value) return "-"
  const parts = value.slice(0, 10).split("-")
  if (parts.length !== 3) return value
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function money(value: unknown, currency = "MYR") {
  const amount = Number(value) || 0
  const prefix = currency === "MYR" ? "RM" : currency
  return `${prefix} ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function preferredAddress(customer: MatchedCustomer | null) {
  if (!customer) return ""
  return customer.addresses.find(address => address.isDefaultDelivery)?.fullAddress
    || customer.addresses.find(address => address.isDefaultBilling)?.fullAddress
    || customer.addresses[0]?.fullAddress
    || ""
}

export function ManualPurchaseOrderDocument({
  data,
  logoSource,
}: {
  data: ManualPurchaseOrderData
  logoSource: string
}): React.ReactElement<React.ComponentProps<typeof Document>> {
  const document = normalizeExtractedDocument(data.extractedData)
  const customer = data.matchedCustomer
  const lines = [...document.lines, ...document.charges]
  const customerName = document.customerName || customer?.legalName || "Pelanggan belum dipadankan"
  const customerCode = document.customerReference || customer?.customerCode || "-"
  const address = document.deliveryAddress || document.billingAddress || preferredAddress(customer)
  const contact = document.deliveryContact || customer?.pic || "-"
  const phone = document.deliveryPhone || customer?.phonePrimary || "-"
  const paymentTerms = document.paymentTermsRaw || customer?.creditTermsRaw || "-"
  const currency = document.currency || "MYR"
  const remarks = document.remarks.replace(/^\[Google Form Submission\]\s*/i, "")

  return (
    <Document title={`Manual PO ${document.poNumber || data.id}`} author="BubblesO2 AIO System">
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRule} />

        <View style={styles.header}>
          {/* React-PDF Image does not expose the browser alt attribute. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={logoSource} style={styles.logo} />
          <View style={styles.titleBlock}>
            <Text style={styles.kicker}>MANUAL ORDER</Text>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <Text style={styles.statusPill}>PENDING SOA REVIEW</Text>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <View style={styles.metaCell}>
            <Text style={styles.label}>PO NUMBER</Text>
            <Text style={styles.metaValue}>{valueOrDash(document.poNumber)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.label}>ORDER DATE</Text>
            <Text style={styles.metaValue}>{formatDate(document.documentDate)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.label}>DELIVERY DATE</Text>
            <Text style={styles.metaValue}>{formatDate(document.requestedDeliveryDate)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.label}>PAYMENT TERMS</Text>
            <Text style={styles.metaValue}>{valueOrDash(paymentTerms)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.label}>CURRENCY</Text>
            <Text style={styles.metaValue}>{currency}</Text>
          </View>
        </View>

        <View style={styles.partyGrid}>
          <View style={[styles.partyCard, styles.partyAccent]}>
            <Text style={styles.sectionEyebrow}>SUPPLIER</Text>
            <Text style={styles.partyName}>BUBBLESO2 SDN BHD</Text>
            <Text style={styles.partyText}>Sales and SOA Management</Text>
            <Text style={styles.partyText}>All-in-One Internal Order System</Text>
            <View style={styles.contactRow}>
              <Text style={styles.contactText}>Source: Google Form Manual Intake</Text>
            </View>
          </View>

          <View style={[styles.partyCard, styles.partyAccentGreen]}>
            <Text style={styles.sectionEyebrow}>CUSTOMER / APPLICANT</Text>
            <Text style={styles.partyName}>{customerName}</Text>
            <Text style={styles.partyText}>Customer Code: {customerCode}</Text>
            <Text style={styles.partyText}>{valueOrDash(address)}</Text>
            <View style={styles.contactRow}>
              <Text style={styles.contactText}>PIC: {valueOrDash(contact)}</Text>
              <Text style={styles.contactText}>Tel: {valueOrDash(phone)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <View style={styles.colNo}><Text style={styles.tableHeaderText}>NO.</Text></View>
            <View style={styles.colItem}><Text style={styles.tableHeaderText}>ITEM DETAILS</Text></View>
            <View style={styles.colQty}><Text style={styles.tableHeaderText}>QTY</Text></View>
            <View style={styles.colUom}><Text style={styles.tableHeaderText}>UOM</Text></View>
            <View style={styles.colPrice}><Text style={styles.tableHeaderText}>UNIT PRICE</Text></View>
            <View style={styles.colAdjust}><Text style={styles.tableHeaderText}>DISC / TAX</Text></View>
            <View style={styles.colAmount}><Text style={styles.tableHeaderText}>AMOUNT</Text></View>
          </View>

          {lines.length ? lines.map((line, index) => (
            <View
              key={`${line.sku || line.itemCode || "item"}-${index}`}
              style={[styles.tableRow, index === lines.length - 1 ? styles.tableRowLast : {}]}
              wrap={false}
            >
              <View style={styles.colNo}><Text style={styles.cellText}>{index + 1}</Text></View>
              <View style={styles.colItem}>
                <Text style={styles.itemSku}>{valueOrDash(line.sku || line.itemCode)}</Text>
                <Text style={styles.itemDescription}>{valueOrDash(line.description)}</Text>
                <Text style={styles.itemBarcode}>Barcode: {valueOrDash(line.barcode)}</Text>
              </View>
              <View style={styles.colQty}><Text style={styles.cellStrong}>{line.quantity}</Text></View>
              <View style={styles.colUom}><Text style={styles.cellText}>{valueOrDash(line.uom)}</Text></View>
              <View style={styles.colPrice}><Text style={styles.cellText}>{money(line.unitPrice, currency)}</Text></View>
              <View style={styles.colAdjust}>
                <Text style={styles.cellText}>{money(line.discount, currency)}</Text>
                <Text style={styles.cellMuted}>Tax {money(line.tax, currency)}</Text>
              </View>
              <View style={styles.colAmount}><Text style={styles.cellStrong}>{money(line.amount, currency)}</Text></View>
            </View>
          )) : (
            <Text style={styles.emptyRow}>No order items recorded.</Text>
          )}
        </View>

        <View style={styles.lowerGrid} wrap={false}>
          <View style={styles.notesColumn}>
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>REMARKS</Text>
              <Text style={styles.notesText}>{valueOrDash(remarks)}</Text>
            </View>
            <View style={styles.approvalCard}>
              <Text style={styles.approvalTitle}>Approval requirement</Text>
              <Text style={styles.approvalText}>This manual order is subject to SOA and credit review before stock fulfilment.</Text>
              <Text style={styles.approvalText}>Prepared through the AIO manual order workflow.</Text>
            </View>
          </View>

          <View style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{money(document.totals.subtotal, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>- {money(document.totals.discount, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Freight</Text>
              <Text style={styles.totalValue}>{money(document.totals.freight, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{money(document.totals.tax, currency)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>{money(document.totals.grandTotal, currency)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>BubblesO2 AIO System | Computer-generated manual purchase order</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

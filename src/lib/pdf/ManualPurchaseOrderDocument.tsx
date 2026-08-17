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
import { normalizeExtractedDocument } from "@/lib/sales-ordering/types"

export type ManualPoVariant = "internal" | "external"

export type CustomerAddress = {
  fullAddress: string | null
  attentionTo: string | null
  phone: string | null
  isDefaultDelivery: boolean
  isDefaultBilling: boolean
}

export type MatchedCustomer = {
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
  reviewedBy?: { name: string } | null
  reviewedAt?: Date | null
  matchedCustomer: MatchedCustomer | null
}

const palette = {
  navyDark: "#0A192F",
  navy: "#0F172A",
  navySoft: "#1E293B",
  body: "#334155",
  muted: "#64748B",
  slateMuted: "#64748B",
  faint: "#94A3B8",
  slateFaint: "#94A3B8",
  border: "#CBD5E1",
  borderLight: "#E2E8F0",
  bgSubtle: "#F8FAFC",
  bgCard: "#F1F5F9",
  cyan: "#0891B2",
  cyanDark: "#0E7490",
  cyanSoft: "#ECFEFF",
  cyanBorder: "#A5F3FC",
  green: "#059669",
  greenSoft: "#ECFDF5",
  greenBorder: "#A7F3D0",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  amberBorder: "#FDE68A",
  white: "#FFFFFF",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 15,
    paddingHorizontal: 24,
    paddingBottom: 26,
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: palette.body,
    backgroundColor: palette.white,
  },
  topAccentBar: {
    height: 2.5,
    backgroundColor: palette.cyan,
    borderRadius: 1,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.8,
    borderBottomColor: palette.borderLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: 350,
    gap: 8,
  },
  logo: {
    width: 90,
    height: 28,
    objectFit: "contain",
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    marginBottom: 1,
  },
  companyReg: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: palette.slateMuted,
    marginBottom: 1,
  },
  companyText: {
    fontSize: 5.6,
    color: palette.muted,
    lineHeight: 1.2,
  },
  companyMetaRow: {
    fontSize: 5.6,
    color: palette.muted,
    marginTop: 0.8,
    lineHeight: 1.2,
  },
  headerRight: {
    alignItems: "flex-end",
    minWidth: 145,
  },
  docTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    color: palette.navyDark,
  },
  docVariantPill: {
    marginTop: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: palette.cyanSoft,
    borderWidth: 0.8,
    borderColor: palette.cyanBorder,
  },
  docVariantText: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: palette.cyanDark,
  },
  statusPill: {
    marginTop: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: palette.amberSoft,
    borderWidth: 0.8,
    borderColor: palette.amberBorder,
  },
  statusPillText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: palette.amber,
  },
  metaStrip: {
    flexDirection: "row",
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    backgroundColor: palette.bgSubtle,
    marginBottom: 7,
    overflow: "hidden",
  },
  metaCell: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
  },
  metaDivider: {
    borderLeftWidth: 0.8,
    borderLeftColor: palette.border,
  },
  metaLabel: {
    fontSize: 5.4,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: palette.slateMuted,
    marginBottom: 1.5,
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 7.2,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
  },
  partyGrid: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  partyCard: {
    flex: 1,
    minHeight: 58,
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    padding: 5,
    backgroundColor: palette.white,
  },
  partyAccentSupplier: {
    borderTopWidth: 2,
    borderTopColor: palette.cyan,
  },
  partyAccentCustomer: {
    borderTopWidth: 2,
    borderTopColor: palette.navySoft,
  },
  partyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2.5,
    borderBottomWidth: 0.6,
    borderBottomColor: palette.borderLight,
    paddingBottom: 1.5,
  },
  partyRole: {
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    color: palette.cyanDark,
    textTransform: "uppercase",
  },
  partyCode: {
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    color: palette.slateMuted,
  },
  partyName: {
    fontSize: 7.6,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    marginBottom: 1.5,
  },
  partyAddress: {
    fontSize: 5.8,
    color: palette.body,
    lineHeight: 1.25,
    marginBottom: 2.5,
  },
  partyContactGrid: {
    marginTop: "auto",
    paddingTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: palette.borderLight,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  partyContactItem: {
    fontSize: 5.6,
    color: palette.muted,
  },
  partyContactBold: {
    fontFamily: "Helvetica-Bold",
    color: palette.navySoft,
  },
  table: {
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 17,
    paddingHorizontal: 5,
    backgroundColor: palette.navy,
  },
  tableHeaderText: {
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: palette.white,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 22,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderBottomWidth: 0.6,
    borderBottomColor: palette.borderLight,
    backgroundColor: palette.white,
  },
  tableRowAlt: {
    backgroundColor: palette.bgSubtle,
  },
  tableRowCharge: {
    backgroundColor: palette.cyanSoft,
  },
  colNo: {
    width: "4.5%",
    textAlign: "center",
  },
  colItem: {
    width: "38.5%",
    paddingRight: 5,
  },
  colQty: {
    width: "10%",
    textAlign: "center",
  },
  colUom: {
    width: "8%",
    textAlign: "center",
  },
  colPrice: {
    width: "13%",
    textAlign: "right",
  },
  colAdjust: {
    width: "11%",
    textAlign: "right",
  },
  colAmount: {
    width: "15%",
    textAlign: "right",
  },
  itemSku: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    marginBottom: 1,
  },
  itemDescription: {
    fontSize: 6.1,
    color: palette.body,
    lineHeight: 1.25,
  },
  itemBarcode: {
    fontSize: 5.4,
    color: palette.muted,
    marginTop: 1,
  },
  chargeBadge: {
    fontSize: 5.4,
    fontFamily: "Helvetica-Bold",
    color: palette.cyanDark,
    marginTop: 1,
  },
  cellText: {
    fontSize: 6.6,
    color: palette.body,
  },
  cellMuted: {
    fontSize: 5.6,
    color: palette.muted,
    marginTop: 1,
  },
  cellBold: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
  },
  tableSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 3.5,
    backgroundColor: palette.bgCard,
    borderTopWidth: 0.8,
    borderTopColor: palette.border,
  },
  tableSummaryLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    textTransform: "uppercase",
  },
  tableSummaryValue: {
    fontSize: 6.8,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
  },
  lowerSection: {
    marginBottom: 4,
  },
  lowerGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  notesColumn: {
    flex: 1,
    gap: 4.5,
  },
  card: {
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    padding: 5,
    backgroundColor: palette.white,
  },
  cardTitle: {
    fontSize: 5.8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: palette.navyDark,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  cardContent: {
    fontSize: 6.1,
    color: palette.body,
    lineHeight: 1.3,
  },
  amountWordsBox: {
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    padding: 5,
    backgroundColor: palette.bgSubtle,
  },
  amountWordsLabel: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: palette.slateMuted,
    marginBottom: 1.5,
    textTransform: "uppercase",
  },
  amountWordsText: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    lineHeight: 1.25,
  },
  totalsColumn: {
    width: 180,
  },
  totalsCard: {
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: palette.white,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2.8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.borderLight,
  },
  totalLabel: {
    fontSize: 6.2,
    color: palette.muted,
  },
  totalValue: {
    fontSize: 6.6,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: palette.navy,
  },
  grandTotalLabel: {
    fontSize: 6.4,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    color: palette.white,
    textTransform: "uppercase",
  },
  grandTotalValue: {
    fontSize: 9.2,
    fontFamily: "Helvetica-Bold",
    color: palette.white,
  },
  // Internal Copy Audit Section
  internalAuditSection: {
    marginTop: 4.5,
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    backgroundColor: palette.white,
    padding: 4.5,
  },
  internalNoticeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 2.5,
    marginBottom: 3,
    borderBottomWidth: 0.6,
    borderBottomColor: palette.borderLight,
  },
  internalNoticeTitle: {
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    color: palette.cyanDark,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  internalNoticeSubtitle: {
    fontSize: 5,
    color: palette.muted,
  },
  auditGrid: {
    flexDirection: "row",
    gap: 5,
  },
  auditCell: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: palette.borderLight,
    borderRadius: 3,
    padding: 3.5,
    backgroundColor: palette.bgSubtle,
  },
  auditCellTitle: {
    fontSize: 5.2,
    fontFamily: "Helvetica-Bold",
    color: palette.slateMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: palette.borderLight,
    paddingBottom: 1,
  },
  auditCellRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  auditCellLabel: {
    fontSize: 5.2,
    color: palette.muted,
  },
  auditCellValue: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    textAlign: "right",
  },
  auditSignLine: {
    marginTop: 5,
    borderTopWidth: 0.6,
    borderTopColor: palette.border,
    paddingTop: 1,
    textAlign: "center",
    fontSize: 4.8,
    color: palette.muted,
  },
  // External Copy Signature Section
  externalSignSection: {
    marginTop: 4.5,
    borderWidth: 0.8,
    borderColor: palette.border,
    borderRadius: 4,
    backgroundColor: palette.white,
    padding: 4.5,
  },
  signGrid: {
    flexDirection: "row",
    gap: 7,
  },
  signBox: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: palette.borderLight,
    borderRadius: 3,
    padding: 4,
    backgroundColor: palette.bgSubtle,
  },
  signBoxHeader: {
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    color: palette.navyDark,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  signBoxSub: {
    fontSize: 4.8,
    color: palette.muted,
    marginBottom: 3,
  },
  stampArea: {
    height: 20,
    borderWidth: 0.6,
    borderColor: palette.border,
    borderStyle: "dashed",
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3.5,
    backgroundColor: palette.white,
  },
  stampText: {
    fontSize: 4.8,
    color: palette.faint,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  signLineContainer: {
    gap: 2,
  },
  signFieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  signFieldLabel: {
    width: 40,
    fontSize: 5.2,
    color: palette.muted,
  },
  signFieldLine: {
    flex: 1,
    borderBottomWidth: 0.6,
    borderBottomColor: palette.border,
    minHeight: 6,
  },
  footer: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 12,
    paddingTop: 4,
    borderTopWidth: 0.6,
    borderTopColor: palette.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 5.4,
    color: palette.faint,
  },
  footerPage: {
    fontSize: 5.8,
    fontFamily: "Helvetica-Bold",
    color: palette.muted,
  },
})

// Amount in Words Engine
const ONES = [
  "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN",
]

const TENS = [
  "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY",
]

function convertGroup(n: number): string {
  let str = ""
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} HUNDRED `
    n %= 100
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)]
    if (n % 10 > 0) {
      str += `-${ONES[n % 10]}`
    }
    str += " "
  } else if (n > 0) {
    str += `${ONES[n]} `
  }
  return str.trim()
}

export function numberToWords(num: number): string {
  if (num === 0) return "ZERO"
  const integer = Math.floor(Math.abs(num))
  if (integer === 0) return "ZERO"

  const chunks: { value: number; unit: string }[] = [
    { value: 1_000_000_000, unit: "BILLION" },
    { value: 1_000_000, unit: "MILLION" },
    { value: 1_000, unit: "THOUSAND" },
    { value: 1, unit: "" },
  ]

  let rem = integer
  const parts: string[] = []

  for (const chunk of chunks) {
    const count = Math.floor(rem / chunk.value)
    if (count > 0) {
      const words = convertGroup(count)
      if (chunk.unit) {
        parts.push(`${words} ${chunk.unit}`)
      } else {
        parts.push(words)
      }
      rem %= chunk.value
    }
  }

  return parts.join(" ").trim()
}

export function formatAmountInWords(amount: number, currency = "MYR"): string {
  const num = Number(amount) || 0
  const rounded = Math.round(num * 100) / 100
  const isNegative = rounded < 0
  const absAmount = Math.abs(rounded)
  const integerPart = Math.floor(absAmount)
  const centsPart = Math.round((absAmount - integerPart) * 100)

  const normalizedCurrency = (currency || "MYR").toUpperCase().trim()

  const integerWords = integerPart > 0 ? numberToWords(integerPart) : (centsPart > 0 ? "" : "ZERO")
  const centsWords = centsPart > 0 ? numberToWords(centsPart) : ""

  const prefix = isNegative ? "MINUS " : ""

  if (normalizedCurrency === "MYR") {
    if (integerWords && centsWords) {
      return `RINGGIT MALAYSIA: ${prefix}${integerWords} AND SEN ${centsWords} ONLY`
    }
    if (integerWords) {
      return `RINGGIT MALAYSIA: ${prefix}${integerWords} ONLY`
    }
    if (centsWords) {
      return `RINGGIT MALAYSIA: ${prefix}SEN ${centsWords} ONLY`
    }
    return `RINGGIT MALAYSIA: ZERO ONLY`
  }

  // Non-MYR currency
  if (integerWords && centsWords) {
    return `${normalizedCurrency}: ${prefix}${integerWords} AND CENTS ${centsWords} ONLY`
  }
  if (integerWords) {
    return `${normalizedCurrency}: ${prefix}${integerWords} ONLY`
  }
  if (centsWords) {
    return `${normalizedCurrency}: ${prefix}CENTS ${centsWords} ONLY`
  }
  return `${normalizedCurrency}: ZERO ONLY`
}

function valueOrDash(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized || "-"
}

function formatDate(value: unknown) {
  if (!value) return "-"
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, "0")
    const m = String(value.getMonth() + 1).padStart(2, "0")
    const y = value.getFullYear()
    return `${d}/${m}/${y}`
  }
  const str = String(value)
  const parts = str.slice(0, 10).split("-")
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return str
}

function formatMoney(value: unknown, currency = "MYR") {
  const amount = Number(value) || 0
  const prefix = currency === "MYR" ? "RM" : currency
  return `${prefix} ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function preferredAddress(customer: MatchedCustomer | null) {
  if (!customer) return ""
  return (
    customer.addresses.find(address => address.isDefaultDelivery)?.fullAddress ||
    customer.addresses.find(address => address.isDefaultBilling)?.fullAddress ||
    customer.addresses[0]?.fullAddress ||
    ""
  )
}

export function ManualPurchaseOrderDocument({
  data,
  logoSource,
  variant = "internal",
}: {
  data: ManualPurchaseOrderData
  logoSource: string
  variant?: ManualPoVariant
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
  const remarks = document.remarks.replace(/^\[Google Form Submission\]\s*/i, "").trim()

  const totalQuantity = lines.reduce((acc, line) => acc + (Number(line.quantity) || 0), 0)
  const isInternal = variant === "internal"
  const amountInWords = formatAmountInWords(document.totals.grandTotal, currency)

  return (
    <Document
      title={`Manual PO ${document.poNumber || data.id} (${isInternal ? "Internal" : "External"})`}
      author="BubblesO2 AIO System"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.topAccentBar} />

        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* React-PDF Image alt attribute is not supported */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSource} style={styles.logo} />
            <View style={styles.companyDetails}>
              <Text style={styles.companyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
              <Text style={styles.companyReg}>Registration No: {BUBBLESO2_COMPANY_PROFILE.registrationNo}</Text>
              <Text style={styles.companyText}>{BUBBLESO2_COMPANY_PROFILE.addressInline}</Text>
              <Text style={styles.companyMetaRow}>
                Tel: {BUBBLESO2_COMPANY_PROFILE.phone} | Email: {BUBBLESO2_COMPANY_PROFILE.email}
              </Text>
              <Text style={styles.companyMetaRow}>
                TIN: {BUBBLESO2_COMPANY_PROFILE.tin} | Sales Tax No: {BUBBLESO2_COMPANY_PROFILE.salesTaxRegistrationNo}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>PURCHASE ORDER</Text>
            {isInternal ? (
              <>
                <View style={styles.docVariantPill}>
                  <Text style={styles.docVariantText}>INTERNAL COPY</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>
                    {data.reviewedBy ? "SOA REVIEWED" : "PENDING SOA REVIEW"}
                  </Text>
                </View>
              </>
            ) : (
              <View style={[styles.docVariantPill, { backgroundColor: palette.bgSubtle, borderColor: palette.border }]}>
                <Text style={[styles.docVariantText, { color: palette.navySoft }]}>OFFICIAL ORDER</Text>
              </View>
            )}
          </View>
        </View>

        {/* Metadata Strip */}
        <View style={styles.metaStrip}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>PO NUMBER</Text>
            <Text style={styles.metaValue}>{valueOrDash(document.poNumber)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.metaLabel}>ORDER DATE</Text>
            <Text style={styles.metaValue}>{formatDate(document.documentDate)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.metaLabel}>DELIVERY DATE</Text>
            <Text style={styles.metaValue}>{formatDate(document.requestedDeliveryDate)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.metaLabel}>PAYMENT TERMS</Text>
            <Text style={styles.metaValue}>{valueOrDash(paymentTerms)}</Text>
          </View>
          <View style={[styles.metaCell, styles.metaDivider]}>
            <Text style={styles.metaLabel}>CURRENCY</Text>
            <Text style={styles.metaValue}>{currency}</Text>
          </View>
        </View>

        {/* Parties Grid */}
        <View style={styles.partyGrid}>
          {/* Supplier */}
          <View style={[styles.partyCard, styles.partyAccentSupplier]}>
            <View style={styles.partyHeader}>
              <Text style={styles.partyRole}>SUPPLIER</Text>
              <Text style={styles.partyCode}>BUBBLESO2 HQ</Text>
            </View>
            <Text style={styles.partyName}>{BUBBLESO2_COMPANY_PROFILE.legalName}</Text>
            <Text style={styles.partyAddress}>{BUBBLESO2_COMPANY_PROFILE.addressInline}</Text>
            <View style={styles.partyContactGrid}>
              <Text style={styles.partyContactItem}>
                Tel: <Text style={styles.partyContactBold}>{BUBBLESO2_COMPANY_PROFILE.phone}</Text>
              </Text>
              {isInternal && (
                <Text style={styles.partyContactItem}>
                  Intake: <Text style={styles.partyContactBold}>Google Form Manual Order</Text>
                </Text>
              )}
            </View>
          </View>

          {/* Customer */}
          <View style={[styles.partyCard, styles.partyAccentCustomer]}>
            <View style={styles.partyHeader}>
              <Text style={[styles.partyRole, { color: palette.navySoft }]}>CUSTOMER / BUYER</Text>
              <Text style={styles.partyCode}>A/C: {customerCode}</Text>
            </View>
            <Text style={styles.partyName}>{customerName}</Text>
            <Text style={styles.partyAddress}>{valueOrDash(address)}</Text>
            <View style={styles.partyContactGrid}>
              <Text style={styles.partyContactItem}>
                PIC: <Text style={styles.partyContactBold}>{valueOrDash(contact)}</Text>
              </Text>
              <Text style={styles.partyContactItem}>
                Tel: <Text style={styles.partyContactBold}>{valueOrDash(phone)}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <View style={styles.colNo}><Text style={styles.tableHeaderText}>NO.</Text></View>
            <View style={styles.colItem}><Text style={styles.tableHeaderText}>ITEM DETAILS & SPECIFICATIONS</Text></View>
            <View style={styles.colQty}><Text style={styles.tableHeaderText}>QTY</Text></View>
            <View style={styles.colUom}><Text style={styles.tableHeaderText}>UOM</Text></View>
            <View style={styles.colPrice}><Text style={styles.tableHeaderText}>UNIT PRICE</Text></View>
            <View style={styles.colAdjust}><Text style={styles.tableHeaderText}>DISC / TAX</Text></View>
            <View style={styles.colAmount}><Text style={styles.tableHeaderText}>AMOUNT</Text></View>
          </View>

          {lines.length > 0 ? (
            lines.map((line, index) => {
              const isCharge = Boolean(line.isServiceCharge)
              const isEven = index % 2 === 1
              return (
                <View
                  key={`${line.sku || line.itemCode || "item"}-${index}`}
                  style={[
                    styles.tableRow,
                    isEven ? styles.tableRowAlt : {},
                    isCharge ? styles.tableRowCharge : {},
                  ]}
                  wrap={false}
                >
                  <View style={styles.colNo}>
                    <Text style={styles.cellText}>{index + 1}</Text>
                  </View>
                  <View style={styles.colItem}>
                    <Text style={styles.itemSku}>{valueOrDash(line.sku || line.itemCode)}</Text>
                    <Text style={styles.itemDescription}>{valueOrDash(line.description)}</Text>
                    {line.barcode ? (
                      <Text style={styles.itemBarcode}>Barcode: {line.barcode}</Text>
                    ) : null}
                    {isCharge ? (
                      <Text style={styles.chargeBadge}>* Service / Additional Charge</Text>
                    ) : null}
                  </View>
                  <View style={styles.colQty}>
                    <Text style={styles.cellBold}>{line.quantity}</Text>
                  </View>
                  <View style={styles.colUom}>
                    <Text style={styles.cellText}>{valueOrDash(line.uom)}</Text>
                  </View>
                  <View style={styles.colPrice}>
                    <Text style={styles.cellText}>{formatMoney(line.unitPrice, currency)}</Text>
                  </View>
                  <View style={styles.colAdjust}>
                    <Text style={styles.cellText}>{formatMoney(line.discount, currency)}</Text>
                    {line.tax > 0 ? (
                      <Text style={styles.cellMuted}>Tax {formatMoney(line.tax, currency)}</Text>
                    ) : null}
                  </View>
                  <View style={styles.colAmount}>
                    <Text style={styles.cellBold}>{formatMoney(line.amount, currency)}</Text>
                  </View>
                </View>
              )
            })
          ) : (
            <View style={[styles.tableRow, { justifyContent: "center", minHeight: 30 }]}>
              <Text style={styles.cellMuted}>Tiada item pesanan direkodkan.</Text>
            </View>
          )}

          {/* Table Total Quantity Row */}
          {lines.length > 0 && (
            <View style={styles.tableSummaryRow} wrap={false}>
              <View style={{ width: "43%", paddingLeft: 5 }}>
                <Text style={styles.tableSummaryLabel}>TOTAL ORDERED QUANTITY</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.tableSummaryValue}>{totalQuantity}</Text>
              </View>
              <View style={{ width: "47%" }} />
            </View>
          )}
        </View>

        {/* Lower Summary Section (Intact on final page) */}
        <View style={styles.lowerSection} wrap={false}>
          <View style={styles.lowerGrid}>
            <View style={styles.notesColumn}>
              {remarks ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>REMARKS / DELIVERY NOTES</Text>
                  <Text style={styles.cardContent}>{remarks}</Text>
                </View>
              ) : null}

              {/* Amount in Words */}
              <View style={styles.amountWordsBox}>
                <Text style={styles.amountWordsLabel}>AMOUNT IN WORDS</Text>
                <Text style={styles.amountWordsText}>{amountInWords}</Text>
              </View>
            </View>

            {/* Totals Summary */}
            <View style={styles.totalsColumn}>
              <View style={styles.totalsCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatMoney(document.totals.subtotal, currency)}</Text>
                </View>
                {document.totals.discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <Text style={styles.totalValue}>- {formatMoney(document.totals.discount, currency)}</Text>
                  </View>
                )}
                {document.totals.freight > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Freight / Handling</Text>
                    <Text style={styles.totalValue}>{formatMoney(document.totals.freight, currency)}</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax / SST</Text>
                  <Text style={styles.totalValue}>{formatMoney(document.totals.tax, currency)}</Text>
                </View>
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                  <Text style={styles.grandTotalValue}>{formatMoney(document.totals.grandTotal, currency)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Internal Audit Grid vs External Signatures Grid */}
          {isInternal ? (
            <View style={styles.internalAuditSection}>
              <View style={styles.internalNoticeBar}>
                <Text style={styles.internalNoticeTitle}>INTERNAL VERIFICATION & SOA AUDIT TRAIL</Text>
                <Text style={styles.internalNoticeSubtitle}>
                  Order subject to credit compliance and SOA verification prior to fulfillment
                </Text>
              </View>

              <View style={styles.auditGrid}>
                {/* Prepared By */}
                <View style={styles.auditCell}>
                  <Text style={styles.auditCellTitle}>1. PREPARED BY</Text>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Name:</Text>
                    <Text style={styles.auditCellValue}>{data.uploadedBy?.name || "System User"}</Text>
                  </View>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Date:</Text>
                    <Text style={styles.auditCellValue}>{formatDate(data.createdAt)}</Text>
                  </View>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Channel:</Text>
                    <Text style={styles.auditCellValue}>Sales Ordering Intake</Text>
                  </View>
                </View>

                {/* SOA / Credit Checked By */}
                <View style={styles.auditCell}>
                  <Text style={styles.auditCellTitle}>2. SOA / CREDIT CHECKED BY</Text>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Officer:</Text>
                    <Text style={styles.auditCellValue}>
                      {data.reviewedBy?.name ? data.reviewedBy.name : "Pending Review"}
                    </Text>
                  </View>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Date:</Text>
                    <Text style={styles.auditCellValue}>
                      {data.reviewedAt ? formatDate(data.reviewedAt) : "-"}
                    </Text>
                  </View>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.auditCellValue,
                        { color: data.reviewedBy ? palette.green : palette.amber },
                      ]}
                    >
                      {data.reviewedBy ? "COMPLETED" : "PENDING"}
                    </Text>
                  </View>
                </View>

                {/* Authorized By */}
                <View style={styles.auditCell}>
                  <Text style={styles.auditCellTitle}>3. AUTHORIZED BY</Text>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Name:</Text>
                    <Text style={styles.auditCellValue}>___________________</Text>
                  </View>
                  <View style={styles.auditCellRow}>
                    <Text style={styles.auditCellLabel}>Date:</Text>
                    <Text style={styles.auditCellValue}>____ / ____ / 20___</Text>
                  </View>
                  <Text style={styles.auditSignLine}>(Management / Finance Signature)</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.externalSignSection}>
              <View style={styles.signGrid}>
                {/* Authorized Signature (BubblesO2) */}
                <View style={styles.signBox}>
                  <Text style={styles.signBoxHeader}>AUTHORIZED SIGNATURE(S)</Text>
                  <Text style={styles.signBoxSub}>For and on behalf of BUBBLES O2 SDN. BHD.</Text>
                  <View style={styles.stampArea}>
                    <Text style={styles.stampText}>COMPANY STAMP / AUTHORIZED SIGNATURE</Text>
                  </View>
                  <View style={styles.signLineContainer}>
                    <View style={styles.signFieldRow}>
                      <Text style={styles.signFieldLabel}>Name:</Text>
                      <View style={styles.signFieldLine} />
                    </View>
                    <View style={styles.signFieldRow}>
                      <Text style={styles.signFieldLabel}>Date:</Text>
                      <View style={styles.signFieldLine} />
                    </View>
                  </View>
                </View>

                {/* Received & Acknowledged By (Customer) */}
                <View style={styles.signBox}>
                  <Text style={styles.signBoxHeader}>RECEIVED & ACKNOWLEDGED BY</Text>
                  <Text style={styles.signBoxSub}>Customer Confirmation & Acceptance</Text>
                  <View style={styles.stampArea}>
                    <Text style={styles.stampText}>CUSTOMER COMPANY STAMP / SIGNATURE</Text>
                  </View>
                  <View style={styles.signLineContainer}>
                    <View style={styles.signFieldRow}>
                      <Text style={styles.signFieldLabel}>Name / IC:</Text>
                      <View style={styles.signFieldLine} />
                    </View>
                    <View style={styles.signFieldRow}>
                      <Text style={styles.signFieldLabel}>Date:</Text>
                      <View style={styles.signFieldLine} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            BubblesO2 AIO System | {isInternal ? "Internal Purchase Order Document" : "Official Purchase Order Document"}
          </Text>
          <Text style={styles.footerText}>PO No: {valueOrDash(document.poNumber)}</Text>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} OF ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

export type ExtractedSalesLine = {
  barcode: string
  itemCode: string
  sku: string
  description: string
  quantity: number
  uom: string
  unitPrice: number
  discount: number
  tax: number
  amount: number
  isServiceCharge?: boolean
}

export type ExtractedSalesDocument = {
  documentType: string
  documentNumber: string
  poNumber: string
  documentDate: string
  requestedDeliveryDate: string
  customerReference: string
  customerName: string
  paymentTermsRaw: string
  billingAddress: string
  deliveryAddress: string
  deliveryContact: string
  deliveryPhone: string
  currency: string
  lines: ExtractedSalesLine[]
  charges: ExtractedSalesLine[]
  totals: {
    subtotal: number
    discount: number
    freight: number
    tax: number
    grandTotal: number
  }
  remarks: string
  confidence: number
  warnings: string[]
}

export type SalesValidationIssue = {
  code: string
  severity: "WARNING" | "ERROR"
  message: string
  field?: string
}

const text = (value: unknown) => typeof value === "string" ? value.trim() : ""
const number = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

function line(value: unknown): ExtractedSalesLine {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {}
  return {
    barcode: text(source.barcode),
    itemCode: text(source.itemCode),
    sku: text(source.sku) || text(source.itemCode),
    description: text(source.description),
    quantity: Math.max(0, number(source.quantity)),
    uom: text(source.uom) || "CTN",
    unitPrice: Math.max(0, number(source.unitPrice)),
    discount: Math.max(0, number(source.discount)),
    tax: Math.max(0, number(source.tax)),
    amount: Math.max(0, number(source.amount)),
    isServiceCharge: Boolean(source.isServiceCharge),
  }
}

export function normalizeExtractedDocument(value: unknown): ExtractedSalesDocument {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const totals = source.totals && typeof source.totals === "object"
    ? source.totals as Record<string, unknown>
    : {}

  return {
    documentType: text(source.documentType) || "UNKNOWN",
    documentNumber: text(source.documentNumber),
    poNumber: text(source.poNumber),
    documentDate: text(source.documentDate),
    requestedDeliveryDate: text(source.requestedDeliveryDate),
    customerReference: text(source.customerReference),
    customerName: text(source.customerName),
    paymentTermsRaw: text(source.paymentTermsRaw),
    billingAddress: text(source.billingAddress),
    deliveryAddress: text(source.deliveryAddress),
    deliveryContact: text(source.deliveryContact),
    deliveryPhone: text(source.deliveryPhone),
    currency: text(source.currency) || "MYR",
    lines: Array.isArray(source.lines) ? source.lines.map(line) : [],
    charges: Array.isArray(source.charges)
      ? source.charges.map(item => ({ ...line(item), isServiceCharge: true }))
      : [],
    totals: {
      subtotal: Math.max(0, number(totals.subtotal)),
      discount: Math.max(0, number(totals.discount)),
      freight: Math.max(0, number(totals.freight)),
      tax: Math.max(0, number(totals.tax)),
      grandTotal: Math.max(0, number(totals.grandTotal)),
    },
    remarks: text(source.remarks),
    confidence: Math.min(1, Math.max(0, number(source.confidence))),
    warnings: Array.isArray(source.warnings) ? source.warnings.map(text).filter(Boolean) : [],
  }
}


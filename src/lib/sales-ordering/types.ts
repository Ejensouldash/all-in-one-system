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

export type ExtractedSubPo = {
  poNumber: string
  documentNumber?: string
  documentDate?: string
  requestedDeliveryDate?: string
  deliveryAddress?: string
  deliveryContact?: string
  deliveryPhone?: string
  storeCode?: string
  lines: ExtractedSalesLine[]
  charges?: ExtractedSalesLine[]
  subtotal: number
  grandTotal: number
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
  isMultiPo?: boolean
  subPos?: ExtractedSubPo[]
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
  fullName?: string
  icNumber?: string
  companyName?: string
  ssmCert?: string
  ssmNumber?: string
  picPhone?: string
  deliveryMode?: string
  deliveryEmail?: string
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

function normalizeSubPo(value: unknown): ExtractedSubPo {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const lines = Array.isArray(source.lines) ? source.lines.map(line) : []
  const charges = Array.isArray(source.charges)
    ? source.charges.map(item => ({ ...line(item), isServiceCharge: true }))
    : []
  const calculatedSubtotal = lines.reduce((sum, l) => sum + l.amount, 0)
  const explicitSubtotal = Math.max(0, number(source.subtotal))
  const explicitGrandTotal = Math.max(0, number(source.grandTotal))

  return {
    poNumber: text(source.poNumber) || text(source.documentNumber),
    documentNumber: text(source.documentNumber),
    documentDate: text(source.documentDate),
    requestedDeliveryDate: text(source.requestedDeliveryDate),
    deliveryAddress: text(source.deliveryAddress),
    deliveryContact: text(source.deliveryContact),
    deliveryPhone: text(source.deliveryPhone),
    storeCode: text(source.storeCode),
    lines,
    charges,
    subtotal: explicitSubtotal > 0 ? explicitSubtotal : calculatedSubtotal,
    grandTotal: explicitGrandTotal > 0 ? explicitGrandTotal : (explicitSubtotal > 0 ? explicitSubtotal : calculatedSubtotal),
  }
}

export function normalizeExtractedDocument(value: unknown): ExtractedSalesDocument {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const totals = source.totals && typeof source.totals === "object"
    ? source.totals as Record<string, unknown>
    : {}

  const rawSubPos = Array.isArray(source.subPos) ? source.subPos.map(normalizeSubPo) : []
  const isMultiPo = Boolean(source.isMultiPo || rawSubPos.length > 1)

  let lines = Array.isArray(source.lines) ? source.lines.map(line) : []
  let charges = Array.isArray(source.charges)
    ? source.charges.map(item => ({ ...line(item), isServiceCharge: true }))
    : []

  // If top-level lines are empty but subPos has lines, aggregate lines from subPos
  if (lines.length === 0 && rawSubPos.length > 0) {
    lines = rawSubPos.flatMap(sub => sub.lines)
    charges = rawSubPos.flatMap(sub => (sub.charges || []).map(c => ({ ...c, isServiceCharge: true })))
  }

  let subtotal = Math.max(0, number(totals.subtotal))
  let grandTotal = Math.max(0, number(totals.grandTotal))

  // If grandTotal is 0 but subPos has amounts, calculate grandTotal from subPos
  if (grandTotal === 0 && rawSubPos.length > 0) {
    grandTotal = rawSubPos.reduce((sum, sub) => sum + sub.grandTotal, 0)
    if (subtotal === 0) {
      subtotal = rawSubPos.reduce((sum, sub) => sum + sub.subtotal, 0)
    }
  }

  // If grandTotal is still 0 but lines have amounts, sum lines
  if (grandTotal === 0 && lines.length > 0) {
    const linesTotal = lines.reduce((sum, l) => sum + l.amount, 0)
    subtotal = subtotal > 0 ? subtotal : linesTotal
    grandTotal = linesTotal
  }

  let poNumber = text(source.poNumber) || text(source.documentNumber)
  if (isMultiPo && rawSubPos.length > 0) {
    const poList = rawSubPos.map(s => s.poNumber).filter(Boolean)
    if (poList.length > 1) {
      poNumber = `${poList[0]} (+${poList.length - 1} lagi)`
    } else if (poList.length === 1) {
      poNumber = poList[0]
    }
  }

  return {
    documentType: text(source.documentType) || (isMultiPo ? "PURCHASE_ORDER_BATCH" : "PURCHASE_ORDER"),
    documentNumber: text(source.documentNumber),
    poNumber,
    documentDate: text(source.documentDate) || (rawSubPos[0]?.documentDate || ""),
    requestedDeliveryDate: text(source.requestedDeliveryDate) || (rawSubPos[0]?.requestedDeliveryDate || ""),
    customerReference: text(source.customerReference),
    customerName: text(source.customerName),
    paymentTermsRaw: text(source.paymentTermsRaw),
    billingAddress: text(source.billingAddress),
    deliveryAddress: text(source.deliveryAddress) || (rawSubPos[0]?.deliveryAddress || ""),
    deliveryContact: text(source.deliveryContact) || (rawSubPos[0]?.deliveryContact || ""),
    deliveryPhone: text(source.deliveryPhone) || (rawSubPos[0]?.deliveryPhone || ""),
    currency: text(source.currency) || "MYR",
    isMultiPo,
    subPos: rawSubPos,
    lines,
    charges,
    totals: {
      subtotal,
      discount: Math.max(0, number(totals.discount)),
      freight: Math.max(0, number(totals.freight)),
      tax: Math.max(0, number(totals.tax)),
      grandTotal,
    },
    remarks: text(source.remarks),
    confidence: Math.min(1, Math.max(0, number(source.confidence))),
    warnings: Array.isArray(source.warnings) ? source.warnings.map(text).filter(Boolean) : [],
    fullName: text(source.fullName) || text(source.customerName) || undefined,
    icNumber: text(source.icNumber) || text(source.customerIc) || undefined,
    companyName: text(source.companyName) || undefined,
    ssmCert: text(source.ssmCert) || text(source.ssmNumber) || undefined,
    ssmNumber: text(source.ssmNumber) || text(source.ssmCert) || undefined,
    picPhone: text(source.picPhone) || undefined,
    deliveryMode: text(source.deliveryMode) || undefined,
    deliveryEmail: text(source.deliveryEmail) || undefined,
  }
}


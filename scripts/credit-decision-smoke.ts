import assert from "node:assert/strict"
import { decideCreditCheck } from "../src/lib/sales-ordering/decision-engine"
import type { ExtractedSalesDocument } from "../src/lib/sales-ordering/types"
import type { SoaExtract } from "../src/lib/sales-ordering/credit-check"

const po = (overrides: Partial<ExtractedSalesDocument> = {}): ExtractedSalesDocument => ({
  documentType: "PURCHASE_ORDER",
  documentNumber: "PO-1",
  poNumber: "PO-1",
  documentDate: "2026-08-18",
  requestedDeliveryDate: "2026-09-01",
  customerReference: "",
  customerName: "3001/412 - JOSLINA CAFE",
  paymentTermsRaw: "CASH",
  billingAddress: "",
  deliveryAddress: "",
  deliveryContact: "",
  deliveryPhone: "",
  currency: "MYR",
  lines: [],
  charges: [],
  totals: { subtotal: 1200, discount: 0, freight: 0, tax: 0, grandTotal: 1200 },
  remarks: "",
  confidence: 0.95,
  warnings: [],
  ...overrides
})

const soa = (invoices: SoaExtract["invoices"], overrides: Partial<SoaExtract> = {}): SoaExtract => ({
  accountName: "JOSLINA CAFE",
  stationName: "",
  supplierName: "BUBBLES O2 MARKETING SDN. BHD.",
  statementDate: "2026-08-31",
  paymentTermsRaw: "CASH",
  creditTermDays: 0,
  creditLimit: null,
  closingBalance: overrides.closingBalance !== undefined
    ? overrides.closingBalance
    : invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
  invoices,
  warnings: [],
  ...overrides
})

const invoice = (amount: number, overrides: Partial<SoaExtract["invoices"][number]> = {}) => ({
  invoiceNumber: "INV-1",
  invoiceDate: "2026-07-27",
  amount,
  settledDate: "",
  ...overrides
})

// Test 1: Joslina Cafe case - CASH terms, negative advance balance (-1320), historical invoices all settled -> APPROVE
const joslinaResult = decideCreditCheck(
  po(),
  soa([
    invoice(1320, { invoiceDate: "2025-07-01", invoiceNumber: "INV2504291" }),
    invoice(660, { invoiceDate: "2025-07-22", invoiceNumber: "INV2504648" }),
    invoice(1320, { invoiceDate: "2026-07-27", invoiceNumber: "INV2516571" }),
  ], { closingBalance: -1320.00, creditTermDays: 0, paymentTermsRaw: "CASH" })
)
assert.equal(joslinaResult.recommendation, "APPROVE")
assert.equal(joslinaResult.overdueTotal, 0)
assert.equal(joslinaResult.outstandingAtPoDate, 0)
assert.equal(joslinaResult.aging.every(i => i.statusAtPoDate === "Selesai dibayar"), true)
assert.equal(joslinaResult.checks.find(c => c.code === "DATA_CONFIDENCE")?.severity, "PASS")

// Test 2: Standard 30-day term account with active non-overdue invoice -> APPROVE
const standardActive = decideCreditCheck(
  po({ customerName: "Dorani Multi Idea", paymentTermsRaw: "30 days" }),
  soa([invoice(1200, { invoiceDate: "2026-08-15" })], {
    accountName: "Dorani Multi Idea",
    paymentTermsRaw: "30 DAYS",
    creditTermDays: 30,
    closingBalance: 1200
  })
)
assert.equal(standardActive.recommendation, "APPROVE")
assert.equal(standardActive.overdueTotal, 0)

// Test 3: Standard 30-day term account with strictly overdue invoice (>30 days overdue) -> REJECT
const overdueResult = decideCreditCheck(
  po({ customerName: "Dorani Multi Idea", paymentTermsRaw: "30 days" }),
  soa([invoice(1200, { invoiceDate: "2026-05-01" })], {
    accountName: "Dorani Multi Idea",
    paymentTermsRaw: "30 DAYS",
    creditTermDays: 30,
    closingBalance: 1200,
    statementDate: "2026-08-31"
  })
)
assert.equal(overdueResult.recommendation, "REJECT")
assert.equal(overdueResult.overdueTotal, 1200)

// Test 4: Grace period tolerance (within 30 days past due date) -> APPROVE
const graceResult = decideCreditCheck(
  po({ customerName: "Dorani Multi Idea", paymentTermsRaw: "30 days" }),
  soa([invoice(1200, { invoiceDate: "2026-07-20" })], {
    accountName: "Dorani Multi Idea",
    paymentTermsRaw: "30 DAYS",
    creditTermDays: 30,
    closingBalance: 1200,
    statementDate: "2026-08-31"
  })
)
assert.equal(graceResult.recommendation, "APPROVE")
assert.equal(graceResult.overdueTotal, 0)

// Test 5: Credit Limit Breach -> REJECT
const limitBreachResult = decideCreditCheck(
  po({ customerName: "Dorani Multi Idea", totals: { subtotal: 5000, discount: 0, freight: 0, tax: 0, grandTotal: 5000 } }),
  soa([invoice(6000, { invoiceDate: "2026-08-25" })], {
    accountName: "Dorani Multi Idea",
    creditTermDays: 30,
    creditLimit: 10000,
    closingBalance: 6000,
    statementDate: "2026-08-31"
  })
)
assert.equal(limitBreachResult.recommendation, "REJECT")
assert.equal(limitBreachResult.checks.find(c => c.code === "CREDIT_LIMIT_BREACH")?.severity, "REJECT")

// Test 6: Customer Name Mismatch -> REJECT
const mismatchResult = decideCreditCheck(
  po({ customerName: "Syarikat Maju Jaya" }),
  soa([invoice(100)], { accountName: "Syarikat Lain Berhad" })
)
assert.equal(mismatchResult.recommendation, "REJECT")
assert.equal(mismatchResult.checks.find(c => c.code === "CUSTOMER_MATCH")?.severity, "REJECT")

// Test 8: Multi-PO Normalization (Giant PO 4-sub-POs batch)
import { normalizeExtractedDocument } from "../src/lib/sales-ordering/types"

const giantRawMultiPo = {
  documentType: "PURCHASE_ORDER_BATCH",
  customerName: "GCH RETAIL (MALAYSIA) SDN.BHD.",
  isMultiPo: true,
  subPos: [
    {
      poNumber: "HQPO260807778",
      documentDate: "2026-08-21",
      requestedDeliveryDate: "2026-08-28",
      deliveryAddress: "DC SEPANG...",
      storeCode: "9010",
      lines: [
        { barcode: "9555978700274", itemCode: "5031798", sku: "5031798", description: "BUBBLES O2 MINERAL WATER 800ML", quantity: 400, uom: "CV", unitPrice: 60, discount: 0, tax: 0, amount: 24000 },
        { barcode: "9555978700267", itemCode: "5031797", sku: "5031797", description: "BUBBLES O2 MINERAL WATER 425ML", quantity: 220, uom: "CV", unitPrice: 48, discount: 0, tax: 0, amount: 10560 }
      ],
      subtotal: 34560,
      grandTotal: 34560
    },
    {
      poNumber: "HQPO260807784",
      documentDate: "2026-08-21",
      requestedDeliveryDate: "2026-08-28",
      deliveryAddress: "DC SEPANG...",
      storeCode: "9010",
      lines: [
        { barcode: "9555978700274", itemCode: "5031798", sku: "5031798", description: "BUBBLES O2 MINERAL WATER 800ML", quantity: 1200, uom: "CV", unitPrice: 60, discount: 0, tax: 0, amount: 72000 }
      ],
      subtotal: 72000,
      grandTotal: 72000
    },
    {
      poNumber: "HQPO260807786",
      documentDate: "2026-08-21",
      requestedDeliveryDate: "2026-08-28",
      deliveryAddress: "DC SEPANG...",
      storeCode: "9010",
      lines: [
        { barcode: "9555978700274", itemCode: "5031798", sku: "5031798", description: "BUBBLES O2 MINERAL WATER 800ML", quantity: 700, uom: "CV", unitPrice: 60, discount: 0, tax: 0, amount: 42000 },
        { barcode: "9555978700267", itemCode: "5031797", sku: "5031797", description: "BUBBLES O2 MINERAL WATER 425ML", quantity: 600, uom: "CV", unitPrice: 48, discount: 0, tax: 0, amount: 28800 }
      ],
      subtotal: 70800,
      grandTotal: 70800
    },
    {
      poNumber: "HQPO260807785",
      documentDate: "2026-08-21",
      requestedDeliveryDate: "2026-08-28",
      deliveryAddress: "DC SEPANG...",
      storeCode: "9010",
      lines: [
        { barcode: "9555978700267", itemCode: "5031797", sku: "5031797", description: "BUBBLES O2 MINERAL WATER 425ML", quantity: 1440, uom: "CV", unitPrice: 48, discount: 0, tax: 0, amount: 69120 }
      ],
      subtotal: 69120,
      grandTotal: 69120
    }
  ],
  confidence: 0.95,
  totals: { grandTotal: 0 } // Simulated AI 0 grandTotal fallback
}

const giantNormalized = normalizeExtractedDocument(giantRawMultiPo)
assert.equal(giantNormalized.isMultiPo, true)
assert.equal(giantNormalized.subPos?.length, 4)
assert.equal(giantNormalized.totals.grandTotal, 246480.00)
assert.equal(giantNormalized.lines.length, 6)
assert.equal(giantNormalized.poNumber, "HQPO260807778 (+3 lagi)")

// Test 9: Multi-PO Batch PO-SOA credit decision (Giant batch within limit -> APPROVE)
const giantCreditPass = decideCreditCheck(
  giantNormalized,
  soa([], {
    accountName: "GCH RETAIL (MALAYSIA) SDN.BHD.",
    creditTermDays: 60,
    creditLimit: 300000.00,
    closingBalance: 0,
    statementDate: "2026-08-31"
  })
)
assert.equal(giantCreditPass.recommendation, "APPROVE")
assert.equal(giantCreditPass.outstandingAtPoDate, 0)
assert.equal(giantCreditPass.checks.find(c => c.code === "PO_AMOUNT_MATCH")?.severity, "PASS")
assert.match(giantCreditPass.checks.find(c => c.code === "PO_AMOUNT_MATCH")!.evidence, /246480\.00/)

// Test 10: Multi-PO Batch PO-SOA credit decision (Giant batch breaches limit -> REJECT)
const giantCreditLimitBreach = decideCreditCheck(
  giantNormalized,
  soa([], {
    accountName: "GCH RETAIL (MALAYSIA) SDN.BHD.",
    creditTermDays: 60,
    creditLimit: 200000.00, // Limit is 200k, Batch is 246.48k -> Breached!
    closingBalance: 0,
    statementDate: "2026-08-31"
  })
)
assert.equal(giantCreditLimitBreach.recommendation, "REJECT")
assert.equal(giantCreditLimitBreach.checks.find(c => c.code === "CREDIT_LIMIT_BREACH")?.severity, "REJECT")

console.log("All PO-SOA decision smoke tests passed successfully!")

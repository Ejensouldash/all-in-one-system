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

// Test 7: Invoice vs SOA Reconciliation mode
const reconPass = decideCreditCheck(
  po({ documentType: "INVOICE", totals: { subtotal: 1320, discount: 0, freight: 0, tax: 0, grandTotal: 1320 } }),
  soa([invoice(1320, { invoiceNumber: "INV-99", invoiceDate: "2026-08-18" })], { creditTermDays: 30, paymentTermsRaw: "30 DAYS" }),
  "INVOICE_SOA_RECONCILIATION"
)
assert.equal(reconPass.recommendation, "APPROVE")

const reconFail = decideCreditCheck(
  po({ documentType: "INVOICE", totals: { subtotal: 999, discount: 0, freight: 0, tax: 0, grandTotal: 999 } }),
  soa([invoice(1320, { invoiceNumber: "INV-99" })]),
  "INVOICE_SOA_RECONCILIATION"
)
assert.equal(reconFail.recommendation, "REJECT")

console.log("All PO-SOA decision smoke tests passed successfully!")

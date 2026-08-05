import assert from "node:assert/strict"
import { decideCreditCheck } from "../src/lib/sales-ordering/decision-engine"
import type { ExtractedSalesDocument } from "../src/lib/sales-ordering/types"
import type { SoaExtract } from "../src/lib/sales-ordering/credit-check"

const po = (overrides: Partial<ExtractedSalesDocument> = {}): ExtractedSalesDocument => ({ documentType: "PURCHASE_ORDER", documentNumber: "PO-1", poNumber: "PO-1", documentDate: "2026-08-03", requestedDeliveryDate: "", customerReference: "", customerName: "Dorani Multi Idea Resources", paymentTermsRaw: "30 days", billingAddress: "", deliveryAddress: "", deliveryContact: "", deliveryPhone: "", currency: "MYR", lines: [], charges: [], totals: { subtotal: 100, discount: 0, freight: 0, tax: 0, grandTotal: 100 }, remarks: "", confidence: 0.95, warnings: [], ...overrides })
const soa = (invoices: SoaExtract["invoices"], overrides: Partial<SoaExtract> = {}): SoaExtract => ({ accountName: "Dorani Multi Idea Resources", stationName: "", supplierName: "", statementDate: "2026-08-03", creditTermDays: 30, closingBalance: invoices.reduce((sum, invoice) => sum + invoice.amount, 0), invoices, warnings: [], ...overrides })
const invoice = (amount: number, overrides: Partial<SoaExtract["invoices"][number]> = {}) => ({ invoiceNumber: "INV-1", invoiceDate: "2026-08-01", amount, settledDate: "", ...overrides })

assert.equal(decideCreditCheck(po(), soa([invoice(100, { invoiceDate: "2026-08-03" })])).recommendation, "APPROVE")
assert.equal(decideCreditCheck(po(), soa([invoice(99)])).recommendation, "REJECT")
assert.equal(decideCreditCheck(po(), soa([invoice(100, { invoiceDate: "2026-08-02" })])).recommendation, "HOLD")
assert.equal(decideCreditCheck(po(), soa([invoice(100), invoice(50, { invoiceDate: "2026-06-01" })])).recommendation, "REJECT")
assert.equal(decideCreditCheck(po({ customerName: "Other Company" }), soa([invoice(100)])).recommendation, "REJECT")
assert.equal(decideCreditCheck(po(), soa([invoice(100)], { warnings: ["OCR warning"] })).recommendation, "HOLD")
assert.equal(decideCreditCheck(po(), soa([invoice(100, { settledDate: "2026-07-20", invoiceDate: "2026-06-01" })])).recommendation, "HOLD")
assert.equal(decideCreditCheck(po({ totals: { subtotal: 100, discount: 0, freight: 0, tax: 0, grandTotal: 100.02 } }), soa([invoice(100, { invoiceDate: "2026-08-03" })])).recommendation, "APPROVE")
console.log("PO-SOA decision smoke tests passed")

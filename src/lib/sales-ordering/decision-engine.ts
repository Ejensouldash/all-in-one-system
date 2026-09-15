import type { ExtractedSalesDocument } from "./types"
import type { SoaExtract, SoaInvoice } from "./credit-check"

export const CREDIT_RULE_VERSION = "PO-SOA-V3"
export type CheckMode = "PO_CREDIT_CHECK" | "INVOICE_SOA_RECONCILIATION"
export type CheckSeverity = "PASS" | "REJECT" | "HOLD"
export type CreditCheckCode = "CUSTOMER_MATCH" | "PO_AMOUNT_MATCH" | "OVERDUE_BALANCE" | "CREDIT_LIMIT_BREACH" | "RETROSPECTIVE_PO" | "DATA_CONFIDENCE"
export type CreditCheckItem = { code: CreditCheckCode; label: string; severity: CheckSeverity; evidence: string; requiredAction: string }
export type CreditDecision = "APPROVE" | "HOLD" | "REJECT"

export type AgingSummary = {
  current: number
  month1: number
  month2: number
  month3Plus: number
  totalOutstanding: number
  totalOverdue: number
}

export type DecisionResult = {
  checkMode: CheckMode
  recommendation: CreditDecision
  primaryReason: string
  reasons: string[]
  checks: CreditCheckItem[]
  ruleVersion: string
  identityMatch: boolean
  identityConfidence: "CLEAR" | "AMBIGUOUS" | "MISMATCH" | "UNKNOWN"
  amountMatchInvoice: string | null
  aging: Array<SoaInvoice & { dueDate: string; statusAtPoDate: string }>
  agingSummary: AgingSummary
  outstandingAtPoDate: number
  overdueTotal: number
}

const money = (value: number) => value.toFixed(2)
const compact = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "")
const tokens = (value: string) => value.toUpperCase().split(/[^A-Z0-9]+/).filter(token => token.length >= 4)
const addDays = (source: string, days: number) => { const value = new Date(`${source}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10) }

function compareIdentity(poName: string, soaNames: string[]) {
  if (!poName || soaNames.length === 0) return { status: "UNKNOWN" as const, match: false }
  const poCompact = compact(poName)
  if (soaNames.some(name => { const candidate = compact(name); return candidate === poCompact || candidate.includes(poCompact) || poCompact.includes(candidate) })) return { status: "CLEAR" as const, match: true }
  const poTokens = new Set(tokens(poName))
  const overlap = soaNames.some(name => { const candidate = tokens(name); return candidate.length > 1 && candidate.filter(token => poTokens.has(token)).length >= Math.ceil(candidate.length / 2) })
  return overlap ? { status: "AMBIGUOUS" as const, match: false } : { status: "MISMATCH" as const, match: false }
}

export function decideCreditCheck(
  po: ExtractedSalesDocument,
  soa: SoaExtract,
  checkMode: CheckMode = "PO_CREDIT_CHECK"
): DecisionResult {
  const poDate = /^\d{4}-\d{2}-\d{2}$/.test(po.documentDate) ? po.documentDate : ""
  const evalDate = soa.statementDate || new Date().toISOString().slice(0, 10)
  
  const paymentTermsUpper = (soa.paymentTermsRaw || "").toUpperCase()
  const isCashTerms = soa.creditTermDays === 0 || /CASH|COD|C\.O\.D/.test(paymentTermsUpper)
  const terms = isCashTerms ? 0 : (soa.creditTermDays > 0 ? soa.creditTermDays : 30)
  
  const identity = compareIdentity(po.customerName, [soa.accountName, soa.stationName, soa.supplierName].filter(Boolean))
  const closingBalance = Number.isFinite(soa.closingBalance) ? soa.closingBalance : 0

  // 1. Accounting Reconciliation Check:
  // If closing balance <= 0 (all invoices paid / customer has advance credit balance)
  // or if all aging overdue buckets in SOA agingSummary are <= 0, then all invoices are settled!
  const isCreditOrZeroBalance = closingBalance <= 0 || (
    soa.agingSummary != null &&
    soa.agingSummary.total <= 0 &&
    soa.agingSummary.month1 <= 0 &&
    soa.agingSummary.month2 <= 0 &&
    soa.agingSummary.month3 <= 0 &&
    soa.agingSummary.month4 <= 0 &&
    soa.agingSummary.month5Plus <= 0
  )

  // 2. FIFO Allocation if closingBalance > 0 and invoice-level outstanding amounts are missing
  let totalPaymentsAvailable = isCreditOrZeroBalance
    ? 999999999
    : Math.max(0, soa.invoices.reduce((sum, inv) => sum + inv.amount, 0) - closingBalance)

  const aging = soa.invoices.map(invoice => {
    const effectiveTerm = terms
    const dueDate = effectiveTerm > 0 ? addDays(invoice.invoiceDate, effectiveTerm) : invoice.invoiceDate
    
    let isSettled = false
    let remainingUnpaid = invoice.amount

    if (isCreditOrZeroBalance || invoice.status === "PAID" || invoice.outstandingAmount === 0) {
      isSettled = true
      remainingUnpaid = 0
    } else if (invoice.settledDate && invoice.settledDate <= evalDate) {
      isSettled = true
      remainingUnpaid = 0
    } else if (typeof invoice.outstandingAmount === "number" && invoice.outstandingAmount >= 0) {
      remainingUnpaid = invoice.outstandingAmount
      isSettled = remainingUnpaid === 0
    } else {
      // FIFO Knock-off against available payments
      if (totalPaymentsAvailable >= invoice.amount) {
        totalPaymentsAvailable -= invoice.amount
        isSettled = true
        remainingUnpaid = 0
      } else if (totalPaymentsAvailable > 0) {
        remainingUnpaid = invoice.amount - totalPaymentsAvailable
        totalPaymentsAvailable = 0
        isSettled = false
      } else {
        remainingUnpaid = invoice.amount
        isSettled = false
      }
    }
    
    const evalDateTime = new Date(`${evalDate}T00:00:00Z`).getTime()
    const dueDateTime = new Date(`${dueDate}T00:00:00Z`).getTime()
    const daysOverdue = Math.max(0, Math.floor((evalDateTime - dueDateTime) / (1000 * 60 * 60 * 24)))
    
    let statusAtPoDate = "Current"
    if (isSettled) {
      statusAtPoDate = "Paid in full"
    } else if (daysOverdue > 0) {
      if (effectiveTerm === 0) {
        // For cash terms, any overdue days past invoice date is strictly overdue
        statusAtPoDate = "Strictly Overdue"
      } else {
        statusAtPoDate = daysOverdue > effectiveTerm ? "Strictly Overdue" : "Tolerated (Grace Period)"
      }
    }
    
    return {
      ...invoice,
      dueDate,
      statusAtPoDate,
      daysOverdue: isSettled ? 0 : daysOverdue,
      outstandingAmount: remainingUnpaid
    }
  })

  const active = aging.filter(invoice => invoice.statusAtPoDate !== "Paid in full" && invoice.statusAtPoDate !== "Selesai dibayar")
  const outstandingAtPoDate = isCreditOrZeroBalance
    ? 0
    : (closingBalance > 0 ? closingBalance : active.reduce((total, invoice) => total + (invoice.outstandingAmount ?? invoice.amount), 0))
  const overdueInvoices = active.filter(invoice => invoice.statusAtPoDate === "Strictly Overdue")
  const overdueTotal = isCreditOrZeroBalance
    ? 0
    : overdueInvoices.reduce((total, invoice) => total + (invoice.outstandingAmount ?? invoice.amount), 0)

  // Calculate Aging Summary
  let current = 0
  let month1 = 0
  let month2 = 0
  let month3Plus = 0

  if (isCreditOrZeroBalance) {
    current = closingBalance // can be negative (e.g. -1320)
    month1 = 0
    month2 = 0
    month3Plus = 0
  } else if (soa.agingSummary) {
    current = soa.agingSummary.current
    month1 = soa.agingSummary.month1
    month2 = soa.agingSummary.month2
    month3Plus = (soa.agingSummary.month3 || 0) + (soa.agingSummary.month4 || 0) + (soa.agingSummary.month5Plus || 0)
  } else {
    active.forEach(inv => {
      const amt = inv.outstandingAmount ?? inv.amount
      const daysOverdue = inv.daysOverdue ?? 0
      if (daysOverdue === 0) {
        current += amt
      } else if (daysOverdue <= 30) {
        month1 += amt
      } else if (daysOverdue <= 60) {
        month2 += amt
      } else {
        month3Plus += amt
      }
    })
  }

  const agingSummary: AgingSummary = {
    current,
    month1,
    month2,
    month3Plus,
    totalOutstanding: outstandingAtPoDate,
    totalOverdue: overdueTotal,
  }

  const amountCandidate = soa.invoices.find(invoice => Math.abs(invoice.amount - po.totals.grandTotal) <= 0.02 || (po.poNumber && invoice.invoiceNumber.toLowerCase().includes(po.poNumber.toLowerCase()))) || null
  const checks: CreditCheckItem[] = []

  // Check 1: Customer Identity Match
  checks.push(identity.status === "CLEAR"
    ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "PASS", evidence: "Customer name and SOA account match.", requiredAction: "No action required." }
    : identity.status === "AMBIGUOUS"
      ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "HOLD", evidence: "Customer name is similar but requires manual verification.", requiredAction: "Verify legal/trading name against original documents." }
      : identity.status === "UNKNOWN"
        ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "HOLD", evidence: "Customer name or SOA account could not be read.", requiredAction: "Check identity fields." }
        : { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "REJECT", evidence: "Customer name does not match the account in the SOA.", requiredAction: "Use the correct SOA / customer." })

  // Check 2: PO Amount vs SOA Invoices / Mode Evaluation
  if (checkMode === "INVOICE_SOA_RECONCILIATION") {
    checks.push(amountCandidate
      ? { code: "PO_AMOUNT_MATCH", label: "Invoice vs SOA Match", severity: "PASS", evidence: `Invoice RM ${money(po.totals.grandTotal)} matches record ${amountCandidate.invoiceNumber} in SOA exactly.`, requiredAction: "No action required." }
      : { code: "PO_AMOUNT_MATCH", label: "Invoice vs SOA Match", severity: "REJECT", evidence: `Invoice RM ${money(po.totals.grandTotal)} not found in SOA ledger.`, requiredAction: "Re-check invoice document or SOA." })
  } else {
    // Mode: PO_CREDIT_CHECK (New Sales Order Release)
    const isMultiPo = Boolean(po.isMultiPo || (po.subPos && po.subPos.length > 1))
    const multiPoDesc = isMultiPo && po.subPos && po.subPos.length > 1
      ? `PO Batch totaling RM ${money(po.totals.grandTotal)} (contains ${po.subPos.length} individual POs)`
      : `New PO totaling RM ${money(po.totals.grandTotal)}`

    checks.push(po.totals.grandTotal > 0
      ? { code: "PO_AMOUNT_MATCH", label: "PO Amount & Exposure", severity: "PASS", evidence: `${multiPoDesc} accepted for credit evaluation. Total exposure: RM ${money(outstandingAtPoDate + po.totals.grandTotal)}.`, requiredAction: "No action required." }
      : { code: "PO_AMOUNT_MATCH", label: "PO Amount & Exposure", severity: "HOLD", evidence: "PO amount could not be read with certainty.", requiredAction: "Check amount on original PO." })
  }

  // Check 3: Overdue Balance Assessment
  if (checkMode === "PO_CREDIT_CHECK") {
    if (overdueTotal > 0) {
      checks.push({ code: "OVERDUE_BALANCE", label: "Overdue on PO Date", severity: "REJECT", evidence: `Found ${overdueInvoices.length} invoices exceeding tolerance (Strictly Overdue) totaling RM ${money(overdueTotal)}.`, requiredAction: "Hold Sales Order release until overdue debt is cleared." })
    } else {
      const zeroEvidence = closingBalance < 0
        ? `No overdue debt. Account has an advance/credit balance of RM ${money(Math.abs(closingBalance))}.`
        : "No overdue debt exceeding tolerance (Grace Period)."
      checks.push({ code: "OVERDUE_BALANCE", label: "Overdue on PO Date", severity: "PASS", evidence: zeroEvidence, requiredAction: "No action required." })
    }
  } else {
    // Mode: INVOICE_SOA_RECONCILIATION
    checks.push(overdueTotal > 0
      ? { code: "OVERDUE_BALANCE", label: "Account Overdue Status", severity: "HOLD", evidence: `Invoice matches, but account has strictly overdue debt of RM ${money(overdueTotal)}.`, requiredAction: "Check customer account credit status." }
      : { code: "OVERDUE_BALANCE", label: "Account Overdue Status", severity: "PASS", evidence: "Account has no overdue debt exceeding tolerance.", requiredAction: "No action required." })
  }

  // Check 3.5: Credit Limit Assessment
  if (soa.creditLimit !== null && soa.creditLimit > 0) {
    const projectedExposure = outstandingAtPoDate + (checkMode === "PO_CREDIT_CHECK" ? po.totals.grandTotal : 0)
    checks.push(projectedExposure > soa.creditLimit
      ? { code: "CREDIT_LIMIT_BREACH", label: "Credit Limit Check", severity: "REJECT", evidence: `Exposure (RM ${money(projectedExposure)}) exceeds Credit Limit (RM ${money(soa.creditLimit)}).`, requiredAction: "Reject transaction or request management exception." }
      : { code: "CREDIT_LIMIT_BREACH", label: "Credit Limit Check", severity: "PASS", evidence: `Exposure (RM ${money(projectedExposure)}) is within Credit Limit (RM ${money(soa.creditLimit)}).`, requiredAction: "No action required." })
  }

  // Check 4: Retrospective PO Check
  const retrospective = checkMode === "INVOICE_SOA_RECONCILIATION" && amountCandidate && poDate && amountCandidate.invoiceDate < poDate
  checks.push(retrospective
    ? { code: "RETROSPECTIVE_PO", label: "Invoice date vs PO date", severity: "HOLD", evidence: `Invoice ${amountCandidate.invoiceNumber} is dated ${amountCandidate.invoiceDate}, which predates PO ${poDate}.`, requiredAction: "Obtain retrospective PO justification." }
    : { code: "RETROSPECTIVE_PO", label: "Invoice date vs PO date", severity: "PASS", evidence: "No invoice/PO date inconsistencies.", requiredAction: "No action required." })

  // Check 5: Data Confidence Check
  const missingTerms = !isCashTerms && (soa.creditTermDays === undefined || soa.creditTermDays <= 0) && !soa.paymentTermsRaw
  const uncertain = !poDate || po.confidence < 0.75 || soa.warnings.length > 0 || !soa.statementDate || missingTerms
  checks.push(uncertain
    ? { code: "DATA_CONFIDENCE", label: "Data confidence", severity: "HOLD", evidence: soa.warnings[0] || "Date, credit terms, or document confidence incomplete.", requiredAction: "Check flagged fields on original PDF." }
    : { code: "DATA_CONFIDENCE", label: "Data confidence", severity: "PASS", evidence: "Key fields extracted with sufficient confidence.", requiredAction: "No action required." })

  const rejected = checks.filter(check => check.severity === "REJECT")
  const held = checks.filter(check => check.severity === "HOLD")
  const recommendation: CreditDecision = rejected.length ? "REJECT" : held.length ? "HOLD" : "APPROVE"
  const primary = (rejected[0] || held[0])?.evidence || (
    closingBalance < 0
      ? `All primary checks passed. Account has an advance/credit balance of RM ${money(Math.abs(closingBalance))} and is ready for processing.`
      : "All primary checks passed. Account is overdue-free and documents match."
  )

  return {
    checkMode,
    recommendation,
    primaryReason: primary,
    reasons: (rejected.length ? rejected : held).map(check => check.evidence),
    checks,
    ruleVersion: CREDIT_RULE_VERSION,
    identityMatch: identity.status === "CLEAR",
    identityConfidence: identity.status,
    amountMatchInvoice: amountCandidate?.invoiceNumber || null,
    aging,
    agingSummary,
    outstandingAtPoDate,
    overdueTotal
  }
}


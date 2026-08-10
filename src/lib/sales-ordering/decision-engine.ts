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
  const terms = soa.creditTermDays || 30
  const identity = compareIdentity(po.customerName, [soa.accountName, soa.stationName, soa.supplierName].filter(Boolean))
  
  const aging = soa.invoices.map(invoice => {
    const dueDate = addDays(invoice.invoiceDate, terms)
    const settled = Boolean(invoice.settledDate && invoice.settledDate <= evalDate)
    
    const evalDateTime = new Date(`${evalDate}T00:00:00Z`).getTime()
    const dueDateTime = new Date(`${dueDate}T00:00:00Z`).getTime()
    const daysOverdue = Math.max(0, Math.floor((evalDateTime - dueDateTime) / (1000 * 60 * 60 * 24)))
    
    let statusAtPoDate = "Belum matang"
    if (settled) {
      statusAtPoDate = "Selesai dibayar"
    } else if (daysOverdue > 0) {
      statusAtPoDate = daysOverdue > terms ? "Strictly Overdue" : "Tolerated (Grace Period)"
    }
    
    return { ...invoice, dueDate, statusAtPoDate, daysOverdue }
  })

  const active = aging.filter(invoice => invoice.statusAtPoDate !== "Selesai dibayar")
  const outstandingAtPoDate = active.reduce((total, invoice) => total + invoice.amount, 0)
  const overdueInvoices = active.filter(invoice => invoice.statusAtPoDate === "Strictly Overdue")
  const overdueTotal = overdueInvoices.reduce((total, invoice) => total + invoice.amount, 0)

  // Calculate Aging Summary
  let current = 0
  let month1 = 0
  let month2 = 0
  let month3Plus = 0

  active.forEach(inv => {
    const daysOverdue = inv.daysOverdue ?? 0
    if (daysOverdue === 0) {
      current += inv.amount
    } else if (daysOverdue <= 30) {
      month1 += inv.amount
    } else if (daysOverdue <= 60) {
      month2 += inv.amount
    } else {
      month3Plus += inv.amount
    }
  })


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
    ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "PASS", evidence: "Nama customer dan akaun SOA sepadan.", requiredAction: "Tiada tindakan." }
    : identity.status === "AMBIGUOUS"
      ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "HOLD", evidence: "Nama customer hampir sama tetapi memerlukan pengesahan.", requiredAction: "Semak nama legal/trading pada dokumen asal." }
      : identity.status === "UNKNOWN"
        ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "HOLD", evidence: "Nama customer atau akaun SOA tidak dapat dibaca.", requiredAction: "Semak semula field identiti." }
        : { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "REJECT", evidence: "Nama customer tidak sepadan dengan akaun dalam SOA.", requiredAction: "Gunakan SOA/customer yang betul." })

  // Check 2: PO Amount vs SOA Invoices / Mode Evaluation
  if (checkMode === "INVOICE_SOA_RECONCILIATION") {
    checks.push(amountCandidate
      ? { code: "PO_AMOUNT_MATCH", label: "Invoice vs SOA Match", severity: "PASS", evidence: `Invois RM ${money(po.totals.grandTotal)} padan tepat dengan rekod ${amountCandidate.invoiceNumber} di SOA.`, requiredAction: "Tiada tindakan." }
      : { code: "PO_AMOUNT_MATCH", label: "Invoice vs SOA Match", severity: "REJECT", evidence: `Invois RM ${money(po.totals.grandTotal)} tidak ditemui di lejar SOA.`, requiredAction: "Semak semula dokumen invois atau SOA." })
  } else {
    // Mode: PO_CREDIT_CHECK (New Sales Order Release)
    checks.push(po.totals.grandTotal > 0
      ? { code: "PO_AMOUNT_MATCH", label: "PO Amount & Exposure", severity: "PASS", evidence: `PO Baharu bernilai RM ${money(po.totals.grandTotal)} diterima untuk penilaian kredit. Total pajanan: RM ${money(outstandingAtPoDate + po.totals.grandTotal)}.`, requiredAction: "Tiada tindakan." }
      : { code: "PO_AMOUNT_MATCH", label: "PO Amount & Exposure", severity: "HOLD", evidence: "Jumlah PO tidak dapat dibaca dengan pasti.", requiredAction: "Semak jumlah pada PO asal." })
  }

  // Check 3: Overdue Balance Assessment
  if (checkMode === "PO_CREDIT_CHECK") {
    checks.push(overdueTotal > 0
      ? { code: "OVERDUE_BALANCE", label: "Overdue pada tarikh PO", severity: "REJECT", evidence: `Terdapat ${overdueInvoices.length} invois yang melebihi had toleransi (Strictly Overdue) bertotal RM ${money(overdueTotal)}.`, requiredAction: "Tolak pelepasan Sales Order sehingga overdue dijelaskan." }
      : { code: "OVERDUE_BALANCE", label: "Overdue pada tarikh PO", severity: "PASS", evidence: "Tiada tunggakan yang melebihi tempoh toleransi (Grace Period).", requiredAction: "Tiada tindakan." })
  } else {
    // Mode: INVOICE_SOA_RECONCILIATION
    checks.push(overdueTotal > 0
      ? { code: "OVERDUE_BALANCE", label: "Status Tunggakan Akaun", severity: "HOLD", evidence: `Invois padan, tetapi akaun mempunyai tunggakan strictly overdue RM ${money(overdueTotal)}.`, requiredAction: "Semak status kredit akaun pelanggan." }
      : { code: "OVERDUE_BALANCE", label: "Status Tunggakan Akaun", severity: "PASS", evidence: "Akaun tiada sebarang tunggakan yang melebihi toleransi.", requiredAction: "Tiada tindakan." })
  }

  // Check 3.5: Credit Limit Assessment
  if (soa.creditLimit !== null && soa.creditLimit > 0) {
    const projectedExposure = outstandingAtPoDate + (checkMode === "PO_CREDIT_CHECK" ? po.totals.grandTotal : 0)
    checks.push(projectedExposure > soa.creditLimit
      ? { code: "CREDIT_LIMIT_BREACH", label: "Semakan Had Kredit", severity: "REJECT", evidence: `Pajanan (RM ${money(projectedExposure)}) melebihi Had Kredit (RM ${money(soa.creditLimit)}).`, requiredAction: "Tolak transaksi atau minta kelulusan pengurusan." }
      : { code: "CREDIT_LIMIT_BREACH", label: "Semakan Had Kredit", severity: "PASS", evidence: `Pajanan (RM ${money(projectedExposure)}) berada dalam Had Kredit (RM ${money(soa.creditLimit)}).`, requiredAction: "Tiada tindakan." })
  }

  // Check 4: Retrospective PO Check
  const retrospective = checkMode === "INVOICE_SOA_RECONCILIATION" && amountCandidate && poDate && amountCandidate.invoiceDate < poDate
  checks.push(retrospective
    ? { code: "RETROSPECTIVE_PO", label: "Invoice date vs PO date", severity: "HOLD", evidence: `Invoice ${amountCandidate.invoiceNumber} bertarikh ${amountCandidate.invoiceDate}, sebelum PO ${poDate}.`, requiredAction: "Dapatkan justification retrospective PO." }
    : { code: "RETROSPECTIVE_PO", label: "Invoice date vs PO date", severity: "PASS", evidence: "Tiada kekeliruan tarikh invois/PO.", requiredAction: "Tiada tindakan." })

  // Check 5: Data Confidence Check
  const uncertain = !poDate || po.confidence < 0.75 || soa.warnings.length > 0 || !soa.statementDate || soa.creditTermDays <= 0
  checks.push(uncertain
    ? { code: "DATA_CONFIDENCE", label: "Data confidence", severity: "HOLD", evidence: soa.warnings[0] || "Tarikh, credit term atau confidence dokumen tidak lengkap.", requiredAction: "Semak field yang ditanda pada PDF asal." }
    : { code: "DATA_CONFIDENCE", label: "Data confidence", severity: "PASS", evidence: "Field penting dibaca dengan confidence yang mencukupi.", requiredAction: "Tiada tindakan." })

  const rejected = checks.filter(check => check.severity === "REJECT")
  const held = checks.filter(check => check.severity === "HOLD")
  const recommendation: CreditDecision = rejected.length ? "REJECT" : held.length ? "HOLD" : "APPROVE"
  const primary = (rejected[0] || held[0])?.evidence || "Semua semakan utama lulus. Akaun bebas overdue dan dokumen padan."

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


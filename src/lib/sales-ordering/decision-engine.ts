import type { ExtractedSalesDocument } from "./types"
import type { SoaExtract, SoaInvoice } from "./credit-check"

export const CREDIT_RULE_VERSION = "PO-SOA-V2"
export type CheckSeverity = "PASS" | "REJECT" | "HOLD"
export type CreditCheckCode = "CUSTOMER_MATCH" | "PO_AMOUNT_MATCH" | "OVERDUE_BALANCE" | "RETROSPECTIVE_PO" | "DATA_CONFIDENCE"
export type CreditCheckItem = { code: CreditCheckCode; label: string; severity: CheckSeverity; evidence: string; requiredAction: string }
export type CreditDecision = "APPROVE" | "HOLD" | "REJECT"

export type DecisionResult = {
  recommendation: CreditDecision
  primaryReason: string
  reasons: string[]
  checks: CreditCheckItem[]
  ruleVersion: string
  identityMatch: boolean
  identityConfidence: "CLEAR" | "AMBIGUOUS" | "MISMATCH" | "UNKNOWN"
  amountMatchInvoice: string | null
  aging: Array<SoaInvoice & { dueDate: string; statusAtPoDate: string }>
  outstandingAtPoDate: number
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

export function decideCreditCheck(po: ExtractedSalesDocument, soa: SoaExtract): DecisionResult {
  const poDate = /^\d{4}-\d{2}-\d{2}$/.test(po.documentDate) ? po.documentDate : ""
  const terms = soa.creditTermDays || 30
  const identity = compareIdentity(po.customerName, [soa.accountName, soa.stationName, soa.supplierName].filter(Boolean))
  const aging = soa.invoices.map(invoice => {
    const dueDate = addDays(invoice.invoiceDate, terms)
    const settledBeforePo = Boolean(invoice.settledDate && poDate && invoice.settledDate <= poDate)
    return { ...invoice, dueDate, statusAtPoDate: settledBeforePo ? "Selesai dibayar" : dueDate > poDate ? "Belum matang" : "Overdue" }
  })
  const active = aging.filter(invoice => invoice.statusAtPoDate !== "Selesai dibayar")
  const outstandingAtPoDate = active.reduce((total, invoice) => total + invoice.amount, 0)
  const amountCandidate = soa.invoices.find(invoice => Math.abs(invoice.amount - po.totals.grandTotal) <= 0.02) || null
  const overdueAmount = active.filter(invoice => invoice.statusAtPoDate === "Overdue").reduce((total, invoice) => total + invoice.amount, 0)
  const checks: CreditCheckItem[] = []

  checks.push(identity.status === "CLEAR"
    ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "PASS", evidence: "Nama customer dan akaun SOA sepadan.", requiredAction: "Tiada tindakan." }
    : identity.status === "AMBIGUOUS"
      ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "HOLD", evidence: "Nama customer hampir sama tetapi tidak cukup yakin.", requiredAction: "Semak nama legal/trading pada dokumen asal." }
      : identity.status === "UNKNOWN"
        ? { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "HOLD", evidence: "Nama customer atau akaun SOA tidak dapat dibaca.", requiredAction: "Semak semula field identiti." }
        : { code: "CUSTOMER_MATCH", label: "Customer / account match", severity: "REJECT", evidence: "Nama customer tidak sepadan dengan akaun dalam SOA.", requiredAction: "Gunakan SOA/customer yang betul." })

  checks.push(amountCandidate
    ? { code: "PO_AMOUNT_MATCH", label: "PO amount vs SOA invoice", severity: "PASS", evidence: `PO RM ${money(po.totals.grandTotal)} sepadan dengan ${amountCandidate.invoiceNumber}.`, requiredAction: "Tiada tindakan." }
    : soa.invoices.length === 0 || po.totals.grandTotal <= 0
      ? { code: "PO_AMOUNT_MATCH", label: "PO amount vs SOA invoice", severity: "HOLD", evidence: "Jumlah PO atau senarai invoice tidak dapat dibaca dengan yakin.", requiredAction: "Semak jumlah dan invoice asal." }
      : { code: "PO_AMOUNT_MATCH", label: "PO amount vs SOA invoice", severity: "REJECT", evidence: `PO RM ${money(po.totals.grandTotal)} tidak sepadan dengan mana-mana invoice SOA.`, requiredAction: "Semak PO/SOA atau tolak kes." })

  checks.push(overdueAmount > 0
    ? { code: "OVERDUE_BALANCE", label: "Overdue pada tarikh PO", severity: "REJECT", evidence: `Terdapat overdue RM ${money(overdueAmount)} pada tarikh PO.`, requiredAction: "Selesaikan overdue atau tolak PO." }
    : { code: "OVERDUE_BALANCE", label: "Overdue pada tarikh PO", severity: "PASS", evidence: "Tiada invoice overdue pada tarikh PO.", requiredAction: "Tiada tindakan." })

  const retrospective = amountCandidate && poDate && amountCandidate.invoiceDate < poDate
  checks.push(retrospective
    ? { code: "RETROSPECTIVE_PO", label: "Invoice date vs PO date", severity: "HOLD", evidence: `Invoice ${amountCandidate.invoiceNumber} bertarikh ${amountCandidate.invoiceDate}, sebelum PO ${poDate}.`, requiredAction: "Dapatkan justification retrospective PO." }
    : { code: "RETROSPECTIVE_PO", label: "Invoice date vs PO date", severity: "PASS", evidence: "Tiada invoice matched yang bertarikh sebelum PO.", requiredAction: "Tiada tindakan." })

  const uncertain = !poDate || po.confidence < 0.75 || soa.warnings.length > 0 || !soa.statementDate || soa.creditTermDays <= 0
  checks.push(uncertain
    ? { code: "DATA_CONFIDENCE", label: "Data confidence", severity: "HOLD", evidence: soa.warnings[0] || "Tarikh, credit term atau confidence dokumen tidak lengkap.", requiredAction: "Semak field yang ditanda pada PDF asal." }
    : { code: "DATA_CONFIDENCE", label: "Data confidence", severity: "PASS", evidence: "Field penting dibaca dengan confidence yang mencukupi.", requiredAction: "Tiada tindakan." })

  const rejected = checks.filter(check => check.severity === "REJECT")
  const held = checks.filter(check => check.severity === "HOLD")
  const recommendation: CreditDecision = rejected.length ? "REJECT" : held.length ? "HOLD" : "APPROVE"
  const primary = (rejected[0] || held[0])?.evidence || "Semua semakan utama lulus."
  return { recommendation, primaryReason: primary, reasons: (rejected.length ? rejected : held).map(check => check.evidence), checks, ruleVersion: CREDIT_RULE_VERSION, identityMatch: identity.status === "CLEAR", identityConfidence: identity.status, amountMatchInvoice: amountCandidate?.invoiceNumber || null, aging, outstandingAtPoDate }
}

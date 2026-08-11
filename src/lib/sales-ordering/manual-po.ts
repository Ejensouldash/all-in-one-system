import { createHash } from "node:crypto"
import { normalizeExtractedDocument, type ExtractedSalesDocument } from "@/lib/sales-ordering/types"

const MANUAL_PO_PREFIX = "google-form-submissions/"

export function isManualPoObjectKey(value: string) {
  return value.startsWith(MANUAL_PO_PREFIX)
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function documentWithoutGeneratedNumber(value: unknown) {
  const document = normalizeExtractedDocument(value)
  return {
    ...document,
    documentNumber: "",
    poNumber: "",
  }
}

export function manualPoContentHash(value: unknown) {
  return hash(JSON.stringify(documentWithoutGeneratedNumber(value)))
}

export function manualPoSubmissionHash(value: unknown, submissionId?: string) {
  const normalizedSubmissionId = submissionId?.trim()
  return normalizedSubmissionId
    ? hash(`google-form-submission:${normalizedSubmissionId}`)
    : manualPoContentHash(value)
}

export function manualPoObjectKey(submissionHash: string) {
  return `${MANUAL_PO_PREFIX}submission-${submissionHash}.json`
}

export function getManualPoNumber(value: unknown) {
  return normalizeExtractedDocument(value).poNumber
}

export function nextManualPoNumber(documents: unknown[], orderDate: Date) {
  const year = orderDate.getFullYear()
  const month = String(orderDate.getMonth() + 1).padStart(2, "0")
  const prefix = `${year}/${month}/`
  const pattern = new RegExp(`^${year}/${month}/(\\d+)$`)

  const highestSequence = documents.reduce<number>((highest, value) => {
    const poNumber = normalizeExtractedDocument(value).poNumber
    const match = poNumber.match(pattern)
    if (!match) return highest
    const sequence = Number(match[1])
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest
  }, 0)

  return `${prefix}${String(highestSequence + 1).padStart(3, "0")}`
}

export function withManualPoNumber(value: unknown, poNumber: string): ExtractedSalesDocument {
  return {
    ...normalizeExtractedDocument(value),
    documentNumber: poNumber,
    poNumber,
  }
}

export const RETENTION_SKU_OPTIONS = [
  { value: "425", label: "425 (425ml Standard)", line: "Line 2", pack: "Bottle" },
  { value: "800", label: "800 (800ml Standard)", line: "Line 1", pack: "Bottle" },
  { value: "425 ML X 24", label: "425 ML X 24 (Carton 24s)", line: "Line 2", pack: "Carton" },
  { value: "425 ML X 6", label: "425 ML X 6 (Pack 6s)", line: "Line 2", pack: "Pack" },
  { value: "800 ML X 12", label: "800 ML X 12 (Carton 12s)", line: "Line 1", pack: "Carton" },
  { value: "800 ML X 20", label: "800 ML X 20 (Carton 20s)", line: "Line 1", pack: "Carton" },
] as const

export type RetentionSampleRecordDTO = {
  id: string
  sampleDateTime: string
  sku: string
  skuLabel: string | null
  amountSample: number
  batchNo: string
  preparedById: string
  preparedByName: string
  remarks: string | null
  status: string
  voidedAt: string | null
  voidedById: string | null
  voidReason: string | null
  editedAt: string | null
  editedById: string | null
  editReason: string | null
  performedSignature?: string | null
  verifiedBy?: string | null
  verifiedSignature?: string | null
  verifiedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type RetentionSampleFilterParams = {
  month: number // 1-12
  year: number
  search?: string
  sku?: string
  includeVoided?: boolean
}

/**
 * Validates batch number against strict factory format:
 * 6 digits (date code) followed by hyphen and 2 digits (batch run), e.g. "013526-01"
 */
export function isValidBatchFormat(batchNo: string): boolean {
  return /^\d{6}-\d{2}$/.test(batchNo.trim())
}

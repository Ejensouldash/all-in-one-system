export type SensoryAttributeResult = "NORMAL" | "ABNORMAL"
export type OverallResult = "PASS" | "FAIL_SUSPECT"
export type QCAction = "RECOMMEND_QA_RELEASE" | "CONTINUE_QC_HOLD"

export interface SampleEvaluation {
  sampleNo: number // 1, 2, 3
  appearance: SensoryAttributeResult
  odour: SensoryAttributeResult
  taste: SensoryAttributeResult
}

export interface BatchRecord {
  batchNo: string
  productSize: string
  sampleQuantity: string
  productionDate: string
  evaluationDate: string
  hold72HoursCompleted: boolean
}

export interface BatchEvaluation extends BatchRecord {
  samples: SampleEvaluation[]
  overallResult: OverallResult
  action: QCAction
}

export interface SEFRecord {
  id: string
  date: Date | string
  batches: BatchEvaluation[]
  remarks?: string | null
  checkedBy: string
  performedSignature?: string | null
  verifiedBy?: string | null
  verifiedSignature?: string | null
  verifiedAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

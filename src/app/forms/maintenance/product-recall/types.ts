export interface ProductRecallItemInput {
  id?: string
  customer: string
  sku: string
  batchNumber: string
  quantity: number
  remarks?: string
}

export interface ProductRecallFormInput {
  recallDate: string
  reason?: string
  remarks?: string
  items: ProductRecallItemInput[]
}

export interface ProductRecallItemDTO {
  id: string
  recallId: string
  customer: string
  sku: string
  batchNumber: string
  quantity: number
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductRecallDTO {
  id: string
  recallNo: string | null
  recallDate: string
  reason: string | null
  remarks: string | null
  preparedById: string | null
  preparedByName: string
  createdAt: string
  updatedAt: string
  items: ProductRecallItemDTO[]
}

export interface ProductRecallFilterParams {
  month?: number // 1-12
  year?: number
  search?: string
}

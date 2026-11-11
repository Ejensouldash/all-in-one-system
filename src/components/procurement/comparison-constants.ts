export interface ComparisonSupplier {
  id: string
  name: string
  supplierId?: string
  paymentTerms: string
  leadTime: string
  quotationRef?: string
  notes?: string
}

export interface ComparisonQuoteCell {
  description: string
  unitPrice: number | null
  isIncluded?: boolean // Renders "INCLUDE" highlighted in yellow like Excel
  notes?: string
}

export interface ComparisonRow {
  rowId: string
  quotes: Record<string, ComparisonQuoteCell>
}

export interface ComparisonItemGroup {
  itemIndex: number
  groupTitle?: string
  rows: ComparisonRow[]
}

export const COMPARISON_STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  COMPLETED: {
    label: "Awarded / Completed",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
}

export function createDefaultComparisonData(): {
  suppliers: ComparisonSupplier[]
  items: ComparisonItemGroup[]
} {
  const sup1Id = "sup_" + Math.random().toString(36).substring(2, 7)
  const sup2Id = "sup_" + Math.random().toString(36).substring(2, 7)
  const sup3Id = "sup_" + Math.random().toString(36).substring(2, 7)

  return {
    suppliers: [
      { id: sup1Id, name: "Supplier A", paymentTerms: "30 Days", leadTime: "Ex-stock" },
      { id: sup2Id, name: "Supplier B", paymentTerms: "Cash", leadTime: "2 Weeks" },
      { id: sup3Id, name: "Supplier C", paymentTerms: "50% Upon PO", leadTime: "4-6 Weeks" },
    ],
    items: [
      {
        itemIndex: 1,
        groupTitle: "Item 1",
        rows: [
          {
            rowId: "row_1_1",
            quotes: {
              [sup1Id]: { description: "", unitPrice: null, isIncluded: false },
              [sup2Id]: { description: "", unitPrice: null, isIncluded: false },
              [sup3Id]: { description: "", unitPrice: null, isIncluded: false },
            },
          },
        ],
      },
    ],
  }
}

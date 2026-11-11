"use client"

import { useState, useMemo } from "react"
import {
  Calendar,
  Building2,
  Package,
  Layers,
  DollarSign,
  Edit2,
  Trash2,
  ArrowUpDown,
  Search,
  AlertCircle,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from "lucide-react"

interface PurchaseRecord {
  id: string
  purchaseDate: string | Date
  itemDescription: string
  supplierId?: string | null
  supplierName: string
  supplier?: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
  } | null
  quantity: number
  uom: string
  unitPrice: number
  total: number
  company: string
  department?: string | null
  remarks?: string | null
  createdBy?: {
    id: string
    name: string
    email: string
  } | null
  createdAt?: string | Date
}

interface PurchaseTableProps {
  purchases: PurchaseRecord[]
  loading: boolean
  onEdit: (purchase: PurchaseRecord) => void
  onDelete: (id: string, description: string) => void
  deletingId: string | null
}

type SortField =
  | "purchaseDate"
  | "itemDescription"
  | "supplierName"
  | "quantity"
  | "unitPrice"
  | "total"
  | "company"
  | "department"
type SortOrder = "asc" | "desc"

export function PurchaseTable({
  purchases,
  loading,
  onEdit,
  onDelete,
  deletingId,
}: PurchaseTableProps) {
  const [sortField, setSortField] = useState<SortField>("purchaseDate")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder(field === "purchaseDate" || field === "total" ? "desc" : "asc")
    }
  }

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (sortField === "purchaseDate") {
        valA = new Date(valA).getTime()
        valB = new Date(valB).getTime()
      } else if (sortField === "total" || sortField === "unitPrice" || sortField === "quantity") {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else {
        valA = String(valA || "").toLowerCase()
        valB = String(valB || "").toLowerCase()
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [purchases, sortField, sortOrder])

  // Pagination calculation
  const totalPages = Math.ceil(sortedPurchases.length / pageSize) || 1
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedPurchases.slice(start, start + pageSize)
  }, [sortedPurchases, currentPage, pageSize])

  const formatDate = (val: string | Date) => {
    try {
      const d = new Date(val)
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return String(val)
    }
  }

  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getCompanyBadgeClass = (company: string) => {
    const c = (company || "").toUpperCase()
    if (c === "BOSB") return "bg-blue-50 text-blue-700 border-blue-200"
    if (c === "BOMSB") return "bg-indigo-50 text-indigo-700 border-indigo-200"
    if (c === "NRHO") return "bg-purple-50 text-purple-700 border-purple-200"
    if (c === "BODG") return "bg-amber-50 text-amber-700 border-amber-200"
    return "bg-slate-50 text-slate-700 border-slate-200"
  }

  if (loading && purchases.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold">Loading purchases data...</p>
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          No Purchases Found
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          No procurement purchase records match your search criteria or none have been recorded yet.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] tracking-wider select-none">
              {/* Date of Purchase */}
              <th
                onClick={() => handleSort("purchaseDate")}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Company */}
              <th
                onClick={() => handleSort("company")}
                className="py-3.5 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors whitespace-nowrap text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Company</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Department */}
              <th
                onClick={() => handleSort("department")}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors min-w-[150px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Department</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Description of the Item */}
              <th
                onClick={() => handleSort("itemDescription")}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors min-w-[200px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Description of Item</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Supplier */}
              <th
                onClick={() => handleSort("supplierName")}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors min-w-[150px]"
              >
                <div className="flex items-center gap-1.5">
                  <span>Supplier</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Quantity */}
              <th
                onClick={() => handleSort("quantity")}
                className="py-3.5 px-3 cursor-pointer hover:bg-slate-100/70 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Quantity</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* UOM */}
              <th className="py-3.5 px-3 text-center whitespace-nowrap">
                <span>UOM</span>
              </th>

              {/* Unit Price */}
              <th
                onClick={() => handleSort("unitPrice")}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Unit Price</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              {/* Total */}
              <th
                onClick={() => handleSort("total")}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/70 transition-colors text-right whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1.5 text-blue-600 font-extrabold">
                  <span>Total (RM)</span>
                  <ArrowUpDown className="w-3 h-3 text-blue-500" />
                </div>
              </th>

              {/* Actions */}
              <th className="py-3.5 px-3 text-center whitespace-nowrap">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedPurchases.map((row) => {
              const comp = (row.company || "").toUpperCase()

              return (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Date of Purchase */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(row.purchaseDate)}</span>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[11px] font-extrabold border ${getCompanyBadgeClass(
                        comp
                      )}`}
                    >
                      {comp || "-"}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="py-3.5 px-4">
                    <div
                      className="font-medium text-slate-700 text-xs truncate max-w-[170px]"
                      title={row.department || "No Department"}
                    >
                      {row.department || <span className="text-slate-400 italic">None</span>}
                    </div>
                  </td>

                  {/* Description of the Item */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 text-xs">
                      {row.itemDescription}
                    </div>
                    {row.remarks && (
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                        {row.remarks}
                      </div>
                    )}
                  </td>

                  {/* Supplier */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[170px]" title={row.supplierName}>
                        {row.supplierName}
                      </span>
                    </div>
                    {row.supplier?.phone && (
                      <div className="text-[10px] text-slate-400 pl-5">
                        {row.supplier.phone}
                      </div>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap font-bold text-slate-800">
                    {Number(row.quantity).toLocaleString(undefined, {
                      minimumFractionDigits: Number.isInteger(row.quantity) ? 0 : 2,
                      maximumFractionDigits: 3,
                    })}
                  </td>

                  {/* UOM */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                      {row.uom || "PCS"}
                    </span>
                  </td>

                  {/* Unit Price */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap font-medium text-slate-700">
                    RM {formatCurrency(row.unitPrice)}
                  </td>

                  {/* Total */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-blue-700">
                    RM {formatCurrency(row.total)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit purchase record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDelete(row.id, row.itemDescription)}
                        disabled={deletingId === row.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete purchase record"
                      >
                        {deletingId === row.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Summary Bar */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{" "}
          <span className="font-bold text-slate-900">
            {Math.min((currentPage - 1) * pageSize + 1, sortedPurchases.length)}
          </span>{" "}
          to{" "}
          <span className="font-bold text-slate-900">
            {Math.min(currentPage * pageSize, sortedPurchases.length)}
          </span>{" "}
          of <span className="font-bold text-slate-900">{sortedPurchases.length}</span>{" "}
          records
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback, useTransition } from "react"
import Link from "next/link"
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Building,
  Boxes,
  Users,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  X
} from "lucide-react"
import * as XLSX from "xlsx"
import { getProductRecallReport } from "./actions"
import { deleteProductRecall } from "../../product-recall/actions"
import type { ProductRecallDTO } from "../../product-recall/types"

interface ProductRecallReportClientProps {
  initialRecords: ProductRecallDTO[]
  initialSummary: {
    totalRecalls: number
    totalItems: number
    totalQuantity: number
    uniqueCustomersCount: number
    uniqueBatchesCount: number
  } | null
  initialMonth: number
  initialYear: number
  canManage: boolean
  userName: string
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function ProductRecallReportClient({
  initialRecords,
  initialSummary,
  initialMonth,
  initialYear,
  canManage,
  userName,
}: ProductRecallReportClientProps) {
  const [records, setRecords] = useState<ProductRecallDTO[]>(initialRecords)
  const [summary, setSummary] = useState(initialSummary)
  const [month, setMonth] = useState<number>(initialMonth)
  const [year, setYear] = useState<number>(initialYear)
  const [search, setSearch] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  // Deletion modal state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingRecallNo, setDeletingRecallNo] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Notification state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Refetch records when filters change
  const refreshReport = useCallback(() => {
    startTransition(async () => {
      const res = await getProductRecallReport({
        month,
        year,
        search: search.trim() || undefined,
      })
      if (res.success && res.data) {
        setRecords(res.data)
        setSummary(res.summary)
      } else if (res.error) {
        showFeedback("error", res.error)
      }
    })
  }, [month, year, search])

  useEffect(() => {
    refreshReport()
  }, [month, year])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    refreshReport()
  }

  const handleResetFilters = () => {
    setSearch("")
    setMonth(initialMonth)
    setYear(initialYear)
  }

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // Flattened line items for the main report table and Excel export
  const flatLineItems = records.flatMap((recall, rIdx) =>
    recall.items.map((item, iIdx) => ({
      recallId: recall.id,
      recallNo: recall.recallNo || `PR-${recall.id.slice(0, 6)}`,
      recallDate: new Date(recall.recallDate).toLocaleDateString("en-GB"),
      customer: item.customer,
      sku: item.sku,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      reason: recall.reason || "-",
      remarks: item.remarks || recall.remarks || "-",
      preparedByName: recall.preparedByName,
      isFirstInGroup: iIdx === 0,
      groupRowCount: recall.items.length,
    }))
  )

  // Export to Excel handler
  const handleExportExcel = () => {
    if (flatLineItems.length === 0) {
      showFeedback("error", "No data available to export.")
      return
    }

    const exportRows = flatLineItems.map((row, idx) => ({
      "No": idx + 1,
      "Reference No": row.recallNo,
      "Recall Date": row.recallDate,
      "Customer": row.customer,
      "SKU": row.sku,
      "Batch Number": row.batchNumber,
      "Quantity": row.quantity,
      "Reason for Recall": row.reason,
      "Remarks / Notes": row.remarks,
      "Prepared By": row.preparedByName,
    }))

    const ws = XLSX.utils.json_to_sheet(exportRows)

    // Set column widths
    ws["!cols"] = [
      { wch: 6 },  // No
      { wch: 16 }, // Reference No
      { wch: 14 }, // Recall Date
      { wch: 28 }, // Customer
      { wch: 20 }, // SKU
      { wch: 18 }, // Batch Number
      { wch: 12 }, // Quantity
      { wch: 30 }, // Reason
      { wch: 30 }, // Remarks
      { wch: 20 }, // Prepared By
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Product Recall")

    const fileName = `Product_Recall_Report_${MONTH_NAMES[month - 1]}_${year}.xlsx`
    XLSX.writeFile(wb, fileName)
    showFeedback("success", `Report exported as ${fileName}`)
  }

  // Print Report Handler
  const handlePrint = () => {
    window.print()
  }

  // Delete Record Handler
  const confirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    const res = await deleteProductRecall(deletingId)
    setIsDeleting(false)
    setDeletingId(null)
    setDeletingRecallNo(null)

    if (res.success) {
      showFeedback("success", res.message || "Record deleted.")
      refreshReport()
    } else {
      showFeedback("error", res.error || "Failed to delete record.")
    }
  }

  return (
    <div className="space-y-8">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-sm font-bold text-white transition-all ${
            feedback.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-gray-900 text-center mb-1">Delete Product Recall</h3>
            <p className="text-xs text-gray-500 text-center mb-4">
              Are you sure you want to delete recall record{" "}
              <span className="font-bold text-gray-800">{deletingRecallNo}</span>? All associated line items will also be removed.
            </p>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null)
                  setDeletingRecallNo(null)
                }}
                disabled={isDeleting}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation & Action Header */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/forms/maintenance/reports"
            className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Reports Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider mb-0.5">
                SGMP/22/PR
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Product Recall Report</h1>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/forms/maintenance/product-recall"
            className="inline-flex items-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Recall Entry
          </Link>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Printable Official Header (Shown Only When Printing) */}
      <div className="hidden print:block mb-6">
        <div className="w-full border-2 border-black font-sans text-black">
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              <tr>
                <td className="border-2 border-black p-3 text-center w-[20%] align-middle" rowSpan={4}>
                  <img
                    src="/assets/BubblesO2_Logo.png"
                    alt="BubblesO2 Logo"
                    className="h-10 mx-auto object-contain"
                  />
                </td>
                <td className="border-2 border-black p-2 font-bold w-[50%] align-middle" rowSpan={4}>
                  BUBBLESO2 SDN BHD<br />
                  <span className="font-normal text-[9px] text-gray-500 leading-tight block mt-1">
                    KOMPLEKS AL-AMMAR,<br />
                    KG KANCHONG, 71200, RANTAU,<br />
                    NEGERI SEMBILAN.
                  </span>
                </td>
                <td className="border-2 border-black px-2 py-0.5 font-bold w-[30%]">
                  Rec. No : <span className="font-normal ml-1">SGMP/22/PR</span>
                </td>
              </tr>
              <tr>
                <td className="border-2 border-black px-2 py-0.5 font-bold">
                  Issue No : <span className="font-normal ml-1">1/10/2022</span>
                </td>
              </tr>
              <tr>
                <td className="border-2 border-black px-2 py-0.5 font-bold">
                  Rev No : <span className="font-normal ml-1">0</span>
                </td>
              </tr>
              <tr>
                <td className="border-2 border-black px-2 py-0.5 font-bold">
                  Effective date : <span className="font-normal ml-1">1/7/2026</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="text-center py-2 bg-gray-50 border-t border-black">
            <h2 className="text-sm font-black uppercase tracking-wider underline decoration-2">
              MONTHLY PRODUCT RECALL SUMMARY ({MONTH_NAMES[month - 1].toUpperCase()} {year})
            </h2>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recalls */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Recalls</span>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{summary?.totalRecalls ?? 0}</p>
          </div>
        </div>

        {/* Total Items */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Batch Entries</span>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{summary?.totalItems ?? 0}</p>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recalled Units</span>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">
              {(summary?.totalQuantity ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Unique Customers */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customers</span>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{summary?.uniqueCustomersCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="print:hidden bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month / Year Navigator */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Customer, SKU, Batch No..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("")
                    refreshReport()
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Search
            </button>
            {(search || month !== initialMonth || year !== initialYear) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
              >
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[11px] print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
                <th className="p-3 w-10 text-center border-r border-slate-700 print:border-black">#</th>
                <th className="p-3 min-w-[130px] border-r border-slate-700 print:border-black">REF NO</th>
                <th className="p-3 min-w-[110px] border-r border-slate-700 print:border-black">DATE</th>
                <th className="p-3 min-w-[180px] border-r border-slate-700 print:border-black">CUSTOMER</th>
                <th className="p-3 min-w-[160px] border-r border-slate-700 print:border-black">SKU</th>
                <th className="p-3 min-w-[150px] border-r border-slate-700 print:border-black">BATCH NUMBER</th>
                <th className="p-3 min-w-[110px] text-right border-r border-slate-700 print:border-black">QUANTITY</th>
                <th className="p-3 min-w-[180px] border-r border-slate-700 print:border-black">REASON / NOTES</th>
                <th className="p-3 min-w-[130px] border-r border-slate-700 print:border-black">PREPARED BY</th>
                <th className="p-3 w-16 text-center print:hidden">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 print:divide-gray-400">
              {flatLineItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <RotateCcw className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-sm text-gray-500">No Product Recall records found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No records match the current period ({MONTH_NAMES[month - 1]} {year}) or search term.
                    </p>
                    <Link
                      href="/forms/maintenance/product-recall"
                      className="inline-flex items-center mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Product Recall
                    </Link>
                  </td>
                </tr>
              ) : (
                flatLineItems.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 transition-colors text-gray-800 print:border-b print:border-gray-300"
                  >
                    {/* Index */}
                    <td className="p-3 text-center font-bold text-gray-400 bg-gray-50 border-r border-gray-200 print:bg-white print:border-black">
                      {idx + 1}
                    </td>

                    {/* Reference No */}
                    <td className="p-3 font-mono font-bold text-slate-800 border-r border-gray-200 print:border-black">
                      {row.recallNo}
                    </td>

                    {/* Recall Date */}
                    <td className="p-3 font-semibold text-gray-600 border-r border-gray-200 whitespace-nowrap print:border-black">
                      {row.recallDate}
                    </td>

                    {/* Customer */}
                    <td className="p-3 font-bold text-gray-900 border-r border-gray-200 print:border-black">
                      {row.customer}
                    </td>

                    {/* SKU */}
                    <td className="p-3 font-medium text-gray-800 border-r border-gray-200 print:border-black">
                      {row.sku}
                    </td>

                    {/* Batch Number */}
                    <td className="p-3 font-mono font-bold text-rose-800 border-r border-gray-200 uppercase print:border-black">
                      {row.batchNumber}
                    </td>

                    {/* Quantity */}
                    <td className="p-3 font-mono font-black text-right text-gray-900 border-r border-gray-200 print:border-black">
                      {row.quantity.toLocaleString()}
                    </td>

                    {/* Reason / Remarks */}
                    <td className="p-3 text-gray-600 border-r border-gray-200 print:border-black">
                      <div className="font-semibold text-gray-800">{row.reason}</div>
                      {row.remarks && row.remarks !== "-" && row.remarks !== row.reason && (
                        <div className="text-[11px] text-gray-500 mt-0.5">{row.remarks}</div>
                      )}
                    </td>

                    {/* Prepared By */}
                    <td className="p-3 text-gray-600 font-medium border-r border-gray-200 whitespace-nowrap print:border-black">
                      {row.preparedByName}
                    </td>

                    {/* Action (Delete) */}
                    <td className="p-3 text-center print:hidden">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingId(row.recallId)
                            setDeletingRecallNo(row.recallNo)
                          }}
                          title="Delete Recall Event"
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer */}
            {flatLineItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-black text-gray-900 border-t-2 border-black print:border-t-2 print:border-black">
                  <td colSpan={6} className="p-3 text-right uppercase tracking-wider text-xs">
                    Total Recalled Units:
                  </td>
                  <td className="p-3 text-right font-mono text-sm text-rose-700 border-r border-gray-300 print:border-black">
                    {(summary?.totalQuantity ?? 0).toLocaleString()}
                  </td>
                  <td colSpan={3} className="p-3 print:border-black"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print Signature Block (Print Mode Only) */}
      <div className="hidden print:block mt-12 pt-6 border-t-2 border-black">
        <div className="grid grid-cols-2 gap-12 text-xs">
          <div>
            <p className="font-bold uppercase tracking-wider text-gray-700">Prepared By (QC Inspector):</p>
            <div className="h-16 border-b border-black mt-2"></div>
            <p className="mt-1 font-semibold">Name: {userName}</p>
            <p className="text-gray-500">Date: ____________________</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-gray-700">Verified By (QA / Factory Manager):</p>
            <div className="h-16 border-b border-black mt-2"></div>
            <p className="mt-1 font-semibold">Name: ____________________</p>
            <p className="text-gray-500">Date: ____________________</p>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback, useTransition, useRef } from "react"
import Link from "next/link"
import {
  FileSpreadsheet,
  Printer,
  Search,
  Calendar,
  ChevronLeft,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X
} from "lucide-react"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
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
  const printRef = useRef<HTMLDivElement>(null)

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

  // Print Handler
  const handlePrint = () => {
    const origTitle = document.title
    document.title = `PRODUCT RECALL RECORD SGMP-22-PR ${MONTH_NAMES[month - 1].toUpperCase()} ${year}`
    window.print()
    document.title = origTitle
  }

  // Export to Excel using pre-formatted, cleaned server endpoint
  const handleExportExcel = () => {
    const params = new URLSearchParams()
    if (month) params.set("month", String(month))
    if (year) params.set("year", String(year))
    if (search.trim()) params.set("search", search.trim())

    const url = `/api/forms/maintenance/product-recall/export?${params.toString()}`
    window.open(url, "_blank")
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

  // Flattened row items for table display
  const flatRows = records.flatMap((recall) => {
    const d = new Date(recall.recallDate)
    const dateFormatted = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    return recall.items.map((item) => ({
      recallId: recall.id,
      recallNo: recall.recallNo || `PR-${recall.id.slice(0, 6).toUpperCase()}`,
      date: dateFormatted,
      customer: item.customer.trim().toUpperCase(),
      sku: item.sku.trim(),
      batchNumber: item.batchNumber.trim().toUpperCase(),
      quantity: item.quantity,
      reason: recall.reason || "-",
      remarks: item.remarks || recall.remarks || "-",
      preparedByName: recall.preparedByName,
    }))
  })

  const totalQuantity = flatRows.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Feedback */}
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
              <span className="font-bold text-gray-800">{deletingRecallNo}</span>?
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

      {/* Controls Bar (Matching other GMP reports, hidden during print) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 print:hidden flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Header and Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/forms/maintenance/reports"
            className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-700 transition-colors"
            title="Back to Reports"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center text-rose-700">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl text-gray-900">
                Product Recall Report
              </h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                SGMP/22/PR
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month / Year Selector */}
          <div className="flex items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500 ml-2 mr-3" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-gray-300 mx-2">|</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer pr-2"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Customer, Batch, SKU..."
                className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 md:w-56"
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Reset Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* New Entry Link */}
          <Link
            href="/forms/maintenance/product-recall"
            className="inline-flex items-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Entry
          </Link>

          {/* Export Excel (Formatted Table via ExcelJS) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-xs"
            title="Download fully styled and cleaned Excel sheet"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Export Excel
          </button>

          {/* Print PDF */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={flatRows.length === 0}
            className="inline-flex items-center px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-colors shadow-xs disabled:opacity-50"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print PDF
          </button>
        </div>
      </div>

      {/* Main Printable Document Section (Formatted exactly like standard GMP physical inspection sheet) */}
      <div
        ref={printRef}
        className="bg-white p-6 sm:p-10 shadow-sm border border-gray-100 rounded-2xl mb-8 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none"
      >
        {/* Official Header */}
        <MaintenanceHeader
          title="PRODUCT RECALL RECORD"
          recNo="SGMP/22/PR"
          issueNo="1/10/2022"
          revNo="0"
          effectiveDate="1/7/2026"
        />

        {/* Period Details Bar */}
        <div className="flex justify-between items-center mb-4 text-xs font-bold text-black font-sans uppercase">
          <div>
            MONTH : <span className="underline ml-1 px-2">{MONTH_NAMES[month - 1]} {year}</span>
          </div>
          <div>
            TOTAL RECALLED : <span className="underline ml-1 px-2">{totalQuantity.toLocaleString()} UNITS</span>
          </div>
        </div>

        {/* Data Table */}
        <table className="w-full text-xs border-collapse border-2 border-black text-left font-sans">
          <thead>
            <tr className="bg-gray-200 print:bg-gray-200 text-black font-black uppercase text-center border-b border-black">
              <th className="border border-black p-2 w-[4%]">NO</th>
              <th className="border border-black p-2 w-[11%]">DATE</th>
              <th className="border border-black p-2 w-[28%] text-left">CUSTOMER</th>
              <th className="border border-black p-2 w-[16%]">SKU</th>
              <th className="border border-black p-2 w-[16%]">BATCH NUMBER</th>
              <th className="border border-black p-2 w-[10%] text-right">QUANTITY</th>
              <th className="border border-black p-2 w-[15%] text-left">REASON / REMARKS</th>
              <th className="border border-black p-2 w-[6%] text-center print:hidden">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td colSpan={8} className="border border-black py-12 text-center text-gray-500 font-bold uppercase tracking-wider">
                  Loading recall records...
                </td>
              </tr>
            ) : flatRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black py-12 text-center text-gray-500 font-medium">
                  No product recall records found for {MONTH_NAMES[month - 1]} {year}.
                </td>
              </tr>
            ) : (
              flatRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  {/* Row No */}
                  <td className="border border-black p-2 text-center font-bold text-gray-600">
                    {idx + 1}
                  </td>

                  {/* Date */}
                  <td className="border border-black p-2 text-center font-medium whitespace-nowrap">
                    {row.date}
                  </td>

                  {/* Customer */}
                  <td className="border border-black p-2 text-left font-bold text-gray-900">
                    {row.customer}
                  </td>

                  {/* SKU */}
                  <td className="border border-black p-2 text-center font-semibold text-gray-800">
                    {row.sku}
                  </td>

                  {/* Batch Number */}
                  <td className="border border-black p-2 text-center font-mono font-bold tracking-wider text-rose-800">
                    {row.batchNumber}
                  </td>

                  {/* Quantity */}
                  <td className="border border-black p-2 text-right font-mono font-bold text-gray-900">
                    {row.quantity.toLocaleString()}
                  </td>

                  {/* Reason / Remarks */}
                  <td className="border border-black p-2 text-left">
                    <div className="font-medium text-gray-800">{row.reason}</div>
                    {row.remarks && row.remarks !== "-" && row.remarks !== row.reason && (
                      <div className="text-[10px] text-gray-500 italic mt-0.5">{row.remarks}</div>
                    )}
                  </td>

                  {/* Action (Hidden in print) */}
                  <td className="border border-black p-2 text-center print:hidden">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingId(row.recallId)
                          setDeletingRecallNo(row.recallNo)
                        }}
                        title="Delete Record"
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Table Footer with Summary Total */}
          <tfoot>
            <tr className="bg-gray-100 print:bg-gray-100 font-black text-black border-t-2 border-black">
              <td colSpan={5} className="border border-black p-2 text-right uppercase tracking-wider text-xs">
                TOTAL RECALLED UNITS:
              </td>
              <td className="border border-black p-2 text-right font-mono font-bold text-sm text-rose-700">
                {totalQuantity.toLocaleString()}
              </td>
              <td colSpan={2} className="border border-black p-2 print:border-r"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

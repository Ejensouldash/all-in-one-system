"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Search,
  FileDown,
  Printer,
  Plus,
  Droplets,
  Calendar,
  Filter,
  FileText,
  Loader2,
  Check,
  Eye,
} from "lucide-react"
import {
  generateWellFlowrateTablePdf,
  generateWellFlowrateSlipPdf,
  type WellFlowratePdfRecord,
} from "@/lib/pdf/generateWellFlowratePdf"

interface WellFlowrateRecord {
  id: string
  dateTime: Date | string
  picName: string
  well2: string | null
  well3: string | null
  well4: string | null
  well7: string | null
  well8: string | null
  well12: string | null
  remarks: string | null
  performedSignature: string | null
  createdAt: Date | string
}

interface WellFlowrateReportClientProps {
  initialRecords: WellFlowrateRecord[]
}

const MONTH_NAMES = [
  "All Months",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function WellFlowrateReportClient({ initialRecords }: WellFlowrateReportClientProps) {
  const [records] = useState<WellFlowrateRecord[]>(initialRecords)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<number>(0) // 0 = all
  const [selectedYear, setSelectedYear] = useState<string>("ALL")
  const [isExportingTable, setIsExportingTable] = useState(false)
  const [exportingSlipId, setExportingSlipId] = useState<string | null>(null)
  const [previewRecord, setPreviewRecord] = useState<WellFlowrateRecord | null>(null)

  // Get available years from records
  const availableYears = useMemo(() => {
    const years = new Set<string>()
    records.forEach((r) => {
      try {
        const y = new Date(r.dateTime).getFullYear().toString()
        years.add(y)
      } catch {}
    })
    const currentYear = new Date().getFullYear().toString()
    years.add(currentYear)
    return Array.from(years).sort().reverse()
  }, [records])

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const recordDate = new Date(record.dateTime)
      const recordMonth = recordDate.getMonth() + 1
      const recordYear = recordDate.getFullYear().toString()

      // Month filter
      if (selectedMonth !== 0 && recordMonth !== selectedMonth) {
        return false
      }

      // Year filter
      if (selectedYear !== "ALL" && recordYear !== selectedYear) {
        return false
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesPic = record.picName?.toLowerCase().includes(q)
        const matchesRemarks = record.remarks?.toLowerCase().includes(q)
        const matchesWells =
          record.well2?.toLowerCase().includes(q) ||
          record.well3?.toLowerCase().includes(q) ||
          record.well4?.toLowerCase().includes(q) ||
          record.well7?.toLowerCase().includes(q) ||
          record.well8?.toLowerCase().includes(q) ||
          record.well12?.toLowerCase().includes(q)

        return matchesPic || matchesRemarks || matchesWells
      }

      return true
    })
  }, [records, searchTerm, selectedMonth, selectedYear])

  // Label for current filter period
  const filterPeriodLabel = useMemo(() => {
    if (selectedMonth === 0 && selectedYear === "ALL") return "All Time Records"
    if (selectedMonth !== 0 && selectedYear !== "ALL") {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    }
    if (selectedMonth !== 0) return `${MONTH_NAMES[selectedMonth]} (All Years)`
    return `Year ${selectedYear}`
  }, [selectedMonth, selectedYear])

  // Export Table PDF handler
  const handleExportTablePdf = async () => {
    try {
      setIsExportingTable(true)
      await generateWellFlowrateTablePdf(filteredRecords as WellFlowratePdfRecord[], filterPeriodLabel)
    } catch (err) {
      console.error("Failed to generate Table PDF:", err)
      alert("Failed to export Table PDF. Please try again.")
    } finally {
      setIsExportingTable(false)
    }
  }

  // Export Individual Slip PDF handler
  const handleExportSlipPdf = async (record: WellFlowrateRecord) => {
    try {
      setExportingSlipId(record.id)
      await generateWellFlowrateSlipPdf(record as WellFlowratePdfRecord)
    } catch (err) {
      console.error("Failed to generate Slip PDF:", err)
      alert("Failed to export Slip PDF. Please try again.")
    } finally {
      setExportingSlipId(null)
    }
  }

  const formatDisplayDateTime = (dateVal: string | Date) => {
    try {
      const d = new Date(dateVal)
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return String(dateVal)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href="/forms/maintenance/reports"
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Back to Reports Dashboard"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black uppercase tracking-widest">
                  <Droplets className="w-3.5 h-3.5 mr-1.5" /> PRODUCTION / UTILITIES
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Well Flowrate Reports
              </h1>
              <p className="text-slate-600 font-medium mt-1">
                View, monitor, and export water extraction flowrates for Wells 2, 3, 4, 7, 8, and 12.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Link
                href="/forms/maintenance/well-flowrate"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Entry
              </Link>

              <button
                type="button"
                onClick={handleExportTablePdf}
                disabled={isExportingTable || filteredRecords.length === 0}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm transition-all shadow-md shadow-sky-600/20 disabled:opacity-50"
              >
                {isExportingTable ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-1.5" /> Download Table PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search PIC, remarks, or readings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-800"
              />
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {(searchTerm || selectedMonth !== 0 || selectedYear !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedMonth(0)
                    setSelectedYear("ALL")
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold underline ml-2"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{filteredRecords.length}</strong> of{" "}
              <strong className="text-slate-800">{records.length}</strong> total records
            </span>
            <span className="bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-600 font-semibold">
              Filter: {filterPeriodLabel}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                  <th className="p-4 whitespace-nowrap">Date &amp; Time</th>
                  <th className="p-4 whitespace-nowrap">PIC Name</th>
                  <th className="p-4 text-center whitespace-nowrap">Well 2</th>
                  <th className="p-4 text-center whitespace-nowrap">Well 3</th>
                  <th className="p-4 text-center whitespace-nowrap">Well 4</th>
                  <th className="p-4 text-center whitespace-nowrap">Well 7</th>
                  <th className="p-4 text-center whitespace-nowrap">Well 8</th>
                  <th className="p-4 text-center whitespace-nowrap">Well 12</th>
                  <th className="p-4 min-w-[180px]">Remarks</th>
                  <th className="p-4 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-bold text-slate-700 text-base">No Well Flowrate Records Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try adjusting your search criteria or record a new flowrate entry.
                        </p>
                        <Link
                          href="/forms/maintenance/well-flowrate"
                          className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          Record Flowrate Now
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="p-4 whitespace-nowrap font-bold text-slate-900">
                        {formatDisplayDateTime(record.dateTime)}
                      </td>
                      <td className="p-4 whitespace-nowrap font-semibold text-slate-700">
                        {record.picName}
                      </td>
                      <td className="p-4 text-center font-bold text-sky-800">
                        {record.well2 || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-center font-bold text-sky-800">
                        {record.well3 || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-center font-bold text-sky-800">
                        {record.well4 || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-center font-bold text-sky-800">
                        {record.well7 || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-center font-bold text-sky-800">
                        {record.well8 || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-center font-bold text-sky-800">
                        {record.well12 || <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="p-4 text-slate-600 font-medium text-xs">
                        {record.remarks || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewRecord(record)}
                            title="Quick View Details"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSlipPdf(record)}
                            disabled={exportingSlipId === record.id}
                            title="Export Individual Slip PDF"
                            className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all"
                          >
                            {exportingSlipId === record.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Printer className="w-3.5 h-3.5 mr-1" /> Slip
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick View Modal */}
        {previewRecord && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Well Flowrate Entry</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDisplayDateTime(previewRecord.dateTime)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl space-y-1 text-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold">Officer In Charge</p>
                  <p className="font-bold text-slate-800">{previewRecord.picName}</p>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                    Well Readings
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                      <span className="text-xs text-sky-600 font-bold block">Well 2</span>
                      <strong className="text-slate-800">{previewRecord.well2 || "N/A"}</strong>
                    </div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                      <span className="text-xs text-sky-600 font-bold block">Well 3</span>
                      <strong className="text-slate-800">{previewRecord.well3 || "N/A"}</strong>
                    </div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                      <span className="text-xs text-sky-600 font-bold block">Well 4</span>
                      <strong className="text-slate-800">{previewRecord.well4 || "N/A"}</strong>
                    </div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                      <span className="text-xs text-sky-600 font-bold block">Well 7</span>
                      <strong className="text-slate-800">{previewRecord.well7 || "N/A"}</strong>
                    </div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                      <span className="text-xs text-sky-600 font-bold block">Well 8</span>
                      <strong className="text-slate-800">{previewRecord.well8 || "N/A"}</strong>
                    </div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                      <span className="text-xs text-sky-600 font-bold block">Well 12</span>
                      <strong className="text-slate-800">{previewRecord.well12 || "N/A"}</strong>
                    </div>
                  </div>
                </div>

                {previewRecord.remarks && (
                  <div className="space-y-1 text-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold">Remarks</p>
                    <p className="p-3 bg-slate-50 rounded-xl text-slate-700 font-medium">
                      {previewRecord.remarks}
                    </p>
                  </div>
                )}

                {previewRecord.performedSignature && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase font-bold">Digital Signature</p>
                    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewRecord.performedSignature}
                        alt="PIC Signature"
                        className="h-16 max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSlipPdf(previewRecord)}
                  disabled={exportingSlipId === previewRecord.id}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm inline-flex items-center"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Download Slip PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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
  Eye,
  CheckCircle2,
  ShieldAlert,
  Zap,
} from "lucide-react"
import {
  generateWaterQualityROTablePdf,
  generateWaterQualityROSlipPdf,
  type WaterQualityROPdfRecord,
} from "@/lib/pdf/generateWaterQualityROPdf"

interface WaterQualityRORecord {
  id: string
  dateTime: Date | string
  picName: string
  ph: string
  turbidity: string
  colour: string
  smell: string
  condBefore: number | null
  condAfter: number | null
  condPerformance: number | null
  uvIntensity: string | null
  uvOperatingHours: string | null
  uvRunningDays: string | null
  remarks: string | null
  performedSignature: string | null
  createdAt: Date | string
}

interface WaterQualityROReportClientProps {
  initialRecords: WaterQualityRORecord[]
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

export function WaterQualityROReportClient({ initialRecords }: WaterQualityROReportClientProps) {
  const [records] = useState<WaterQualityRORecord[]>(initialRecords)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<number>(0)
  const [selectedYear, setSelectedYear] = useState<string>("ALL")
  const [isExportingTable, setIsExportingTable] = useState(false)
  const [exportingSlipId, setExportingSlipId] = useState<string | null>(null)
  const [previewRecord, setPreviewRecord] = useState<WaterQualityRORecord | null>(null)

  // Extract years
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

      if (selectedMonth !== 0 && recordMonth !== selectedMonth) return false
      if (selectedYear !== "ALL" && recordYear !== selectedYear) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesPic = record.picName?.toLowerCase().includes(q)
        const matchesPh = record.ph?.toLowerCase().includes(q)
        const matchesRemarks = record.remarks?.toLowerCase().includes(q)
        const matchesColour = record.colour?.toLowerCase().includes(q)
        const matchesSmell = record.smell?.toLowerCase().includes(q)

        return matchesPic || matchesPh || matchesRemarks || matchesColour || matchesSmell
      }

      return true
    })
  }, [records, searchTerm, selectedMonth, selectedYear])

  const filterPeriodLabel = useMemo(() => {
    if (selectedMonth === 0 && selectedYear === "ALL") return "All Time Records"
    if (selectedMonth !== 0 && selectedYear !== "ALL") {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
    }
    if (selectedMonth !== 0) return `${MONTH_NAMES[selectedMonth]} (All Years)`
    return `Year ${selectedYear}`
  }, [selectedMonth, selectedYear])

  const handleExportTablePdf = async () => {
    try {
      setIsExportingTable(true)
      await generateWaterQualityROTablePdf(filteredRecords as WaterQualityROPdfRecord[], filterPeriodLabel)
    } catch (err) {
      console.error("Failed to generate Table PDF:", err)
      alert("Failed to export Table PDF. Please try again.")
    } finally {
      setIsExportingTable(false)
    }
  }

  const handleExportSlipPdf = async (record: WaterQualityRORecord) => {
    try {
      setExportingSlipId(record.id)
      await generateWaterQualityROSlipPdf(record as WaterQualityROPdfRecord)
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
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

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
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-widest">
                  <Droplets className="w-3.5 h-3.5 mr-1.5" /> PRODUCTION / RO SYSTEM
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Water Quality Testing Reports (RO)
              </h1>
              <p className="text-slate-600 font-medium mt-1">
                Monitor and verify RO treated water physical attributes, conductivity rejection performance, and UV parameters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Link
                href="/forms/maintenance/water-quality-ro"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Entry
              </Link>

              <button
                type="button"
                onClick={handleExportTablePdf}
                disabled={isExportingTable || filteredRecords.length === 0}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
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

        {/* Toolbar & Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search PIC, pH, odour, colour, remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800"
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
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase tracking-wider">
                  <th className="p-3.5 whitespace-nowrap">Date &amp; Time</th>
                  <th className="p-3.5 whitespace-nowrap">PIC Name</th>
                  <th className="p-3.5 text-center whitespace-nowrap">pH</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Turbidity</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Colour</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Smell</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Cond. Before</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Cond. After</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Performance %</th>
                  <th className="p-3.5 text-center whitespace-nowrap">UV Intensity</th>
                  <th className="p-3.5 min-w-[140px]">Remarks</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="font-bold text-slate-700 text-base">No Testing Records Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try adjusting your search criteria or submit a new RO water test.
                        </p>
                        <Link
                          href="/forms/maintenance/water-quality-ro"
                          className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all"
                        >
                          Record New Test
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const perf = record.condPerformance
                    return (
                      <tr key={record.id} className="hover:bg-teal-50/40 transition-colors">
                        <td className="p-3.5 whitespace-nowrap font-bold text-slate-900">
                          {formatDisplayDateTime(record.dateTime)}
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-semibold text-slate-700">
                          {record.picName}
                        </td>
                        <td className="p-3.5 text-center font-bold text-teal-800">
                          {record.ph}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              record.turbidity === "No"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {record.turbidity === "No" ? "No" : "Yes"}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-medium text-slate-700">
                          {record.colour}
                        </td>
                        <td className="p-3.5 text-center font-medium text-slate-700">
                          {record.smell}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-800">
                          {record.condBefore !== null ? `${record.condBefore} μS` : "-"}
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-800">
                          {record.condAfter !== null ? `${record.condAfter} μS` : "-"}
                        </td>
                        <td className="p-3.5 text-center">
                          {perf !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-black text-xs ${
                                perf >= 90
                                  ? "bg-emerald-100 text-emerald-800"
                                  : perf >= 80
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {perf.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center text-slate-600 font-medium">
                          {record.uvIntensity || "-"}
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">
                          {record.remarks || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
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
                              className="inline-flex items-center px-2 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all"
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
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick View Modal */}
        {previewRecord && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">RO Water Quality Record</h3>
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

              <div className="space-y-4 text-xs">
                {/* Officer & Metadata */}
                <div className="bg-slate-50 p-3.5 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Analyst / PIC
                    </span>
                    <strong className="text-slate-900 text-sm">{previewRecord.picName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Status
                    </span>
                    <span className="inline-flex items-center text-teal-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verified
                    </span>
                  </div>
                </div>

                {/* Physical Parameters */}
                <div>
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    Physical Characteristics
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-100">
                      <span className="text-[10px] text-teal-700 font-bold block">pH</span>
                      <strong className="text-slate-900 text-sm">{previewRecord.ph}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Turbidity</span>
                      <strong className="text-slate-900">{previewRecord.turbidity}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Colour</span>
                      <strong className="text-slate-900">{previewRecord.colour}</strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Smell</span>
                      <strong className="text-slate-900">{previewRecord.smell}</strong>
                    </div>
                  </div>
                </div>

                {/* Conductivity & Formula */}
                <div>
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    Conductivity Performance
                  </h4>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Feed (Before)</span>
                      <strong className="text-slate-800">
                        {previewRecord.condBefore !== null ? `${previewRecord.condBefore} μS` : "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold block">Permeate (After)</span>
                      <strong className="text-slate-800">
                        {previewRecord.condAfter !== null ? `${previewRecord.condAfter} μS` : "-"}
                      </strong>
                    </div>
                    <div className="bg-white p-1 rounded-lg border border-teal-200">
                      <span className="text-[10px] text-teal-700 font-bold block">Performance</span>
                      <strong className="text-teal-800 font-black text-sm">
                        {previewRecord.condPerformance !== null
                          ? `${previewRecord.condPerformance}%`
                          : "-"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* UV System */}
                <div>
                  <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                    UV Disinfection System
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Intensity</span>
                      <strong className="text-slate-800">{previewRecord.uvIntensity || "N/A"}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Operating Hours</span>
                      <strong className="text-slate-800">{previewRecord.uvOperatingHours || "N/A"}</strong>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">Running Days</span>
                      <strong className="text-slate-800">{previewRecord.uvRunningDays || "N/A"}</strong>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {previewRecord.remarks && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Remarks
                    </span>
                    <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700 font-medium">
                      {previewRecord.remarks}
                    </p>
                  </div>
                )}

                {/* Signature */}
                {previewRecord.performedSignature && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                      Digital Signature
                    </span>
                    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewRecord.performedSignature}
                        alt="PIC Signature"
                        className="h-14 max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPreviewRecord(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSlipPdf(previewRecord)}
                  disabled={exportingSlipId === previewRecord.id}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs inline-flex items-center"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Download Slip PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

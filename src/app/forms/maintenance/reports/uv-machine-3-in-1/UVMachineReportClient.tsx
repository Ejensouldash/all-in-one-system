"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Zap,
  ArrowLeft,
  Calendar,
  Search,
  FileDown,
  FileSpreadsheet,
  Printer,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Lightbulb,
} from "lucide-react"
import {
  generateUVMachineTablePdf,
  generateUVMachineSlipPdf,
  type UVMachinePdfRecord,
} from "@/lib/pdf/generateUVMachinePdf"
import { exportUVMachineToExcel } from "@/lib/excel/exportUVMachineExcel"
import { deleteUVMachineRecord } from "../../uv-machine-3-in-1/actions"

export interface SerializedUVMachineRecord {
  id: string
  date: string
  line1Intensity: string | null
  line1OperatingHours: string | null
  line1RunningDays: string | null
  line1Time: string | null
  line1Pic: string | null
  line1Signature: string | null
  line1Remarks: string | null

  line2MachineStatus: string | null
  line2Time: string | null
  line2Pic: string | null
  line2Signature: string | null
  line2Remarks: string | null

  verifiedBy?: string | null
  verifiedSignature?: string | null
  verifiedAt?: string | null

  createdAt: string
  updatedAt: string
}

interface UVMachineReportClientProps {
  initialRecords: SerializedUVMachineRecord[]
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function UVMachineReportClient({ initialRecords }: UVMachineReportClientProps) {
  const router = useRouter()
  const [records, setRecords] = useState<SerializedUVMachineRecord[]>(initialRecords)

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL")
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [useDateRange, setUseDateRange] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // State
  const [isExportingTable, setIsExportingTable] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [exportingSlipId, setExportingSlipId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewRecord, setPreviewRecord] = useState<SerializedUVMachineRecord | null>(null)

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const recDate = new Date(r.date)

      if (useDateRange) {
        if (startDate && recDate < new Date(`${startDate}T00:00:00.000Z`)) return false
        if (endDate && recDate > new Date(`${endDate}T23:59:59.999Z`)) return false
      } else {
        if (selectedYear !== "ALL" && recDate.getFullYear() !== parseInt(selectedYear, 10)) {
          return false
        }
        if (selectedMonth !== "ALL" && recDate.getMonth() + 1 !== parseInt(selectedMonth, 10)) {
          return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchL1Pic = r.line1Pic?.toLowerCase().includes(q)
        const matchL2Pic = r.line2Pic?.toLowerCase().includes(q)
        const matchIntensity = r.line1Intensity?.toLowerCase().includes(q)
        const matchStatus = r.line2MachineStatus?.toLowerCase().includes(q)
        const matchL1Remarks = r.line1Remarks?.toLowerCase().includes(q)
        const matchL2Remarks = r.line2Remarks?.toLowerCase().includes(q)
        if (!matchL1Pic && !matchL2Pic && !matchIntensity && !matchStatus && !matchL1Remarks && !matchL2Remarks) {
          return false
        }
      }

      return true
    })
  }, [records, selectedMonth, selectedYear, useDateRange, startDate, endDate, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = filteredRecords.length
    const fullyComplete = filteredRecords.filter(
      (r) =>
        Boolean((r.line1Intensity || r.line1OperatingHours || r.line1RunningDays) && r.line1Signature) &&
        Boolean(r.line2MachineStatus && r.line2Signature)
    ).length
    const line1Only = filteredRecords.filter(
      (r) =>
        Boolean((r.line1Intensity || r.line1OperatingHours || r.line1RunningDays) && r.line1Signature) &&
        !Boolean(r.line2MachineStatus && r.line2Signature)
    ).length
    const redAlerts = filteredRecords.filter((r) => r.line2MachineStatus === "Red Light").length

    return { total, fullyComplete, line1Only, redAlerts }
  }, [filteredRecords])

  const filterPeriodLabel = useMemo(() => {
    if (useDateRange && (startDate || endDate)) {
      return `${startDate || "Earliest"} to ${endDate || "Latest"}`
    }
    if (selectedMonth === "ALL" && selectedYear === "ALL") return "All Time"
    if (selectedMonth === "ALL") return `Year ${selectedYear}`
    return `${MONTHS[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`
  }, [useDateRange, startDate, endDate, selectedMonth, selectedYear])

  // Handlers
  const handleExportTablePdf = async () => {
    try {
      setIsExportingTable(true)
      await generateUVMachineTablePdf(filteredRecords as UVMachinePdfRecord[], filterPeriodLabel)
    } catch (err) {
      console.error("Failed to generate Table PDF:", err)
      alert("Failed to export Table PDF. Please try again.")
    } finally {
      setIsExportingTable(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true)
      await exportUVMachineToExcel(filteredRecords as UVMachinePdfRecord[], filterPeriodLabel)
    } catch (err) {
      console.error("Failed to export Excel:", err)
      alert("Failed to export Excel file. Please try again.")
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportSlipPdf = async (record: SerializedUVMachineRecord) => {
    try {
      setExportingSlipId(record.id)
      await generateUVMachineSlipPdf(record as UVMachinePdfRecord)
    } catch (err) {
      console.error("Failed to generate Slip PDF:", err)
      alert("Failed to export Slip PDF. Please try again.")
    } finally {
      setExportingSlipId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this record? This action cannot be undone.")) {
      return
    }

    try {
      setDeletingId(id)
      const res = await deleteUVMachineRecord(id)
      if (res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== id))
        if (previewRecord?.id === id) setPreviewRecord(null)
      } else {
        alert(res.error || "Failed to delete record.")
      }
    } catch (err) {
      console.error("Delete error:", err)
      alert("Could not delete record.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/forms/maintenance/reports"
            className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to GMP Reports
          </Link>
          <Link
            href="/forms/maintenance/uv-machine-3-in-1"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Fill New UV Checklist
          </Link>
        </div>

        {/* Header Title Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-black uppercase tracking-widest">
              PRODUCTION RECORDS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center tracking-tight">
              <Zap className="w-8 h-8 mr-3 text-blue-600 shrink-0" />
              UV Machine 3 In 1 Reports
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Daily inspection logs for Line 1 (800ML) UV Sterilizer parameters &amp; Line 2 (425ML) UV Machine Status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportTablePdf}
              disabled={isExportingTable || filteredRecords.length === 0}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-all shadow-md shadow-blue-700/20 disabled:opacity-50"
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

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || filteredRecords.length === 0}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Exporting Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Export Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
            <div className="text-2xl font-black text-slate-900">{metrics.total}</div>
            <p className="text-[11px] text-slate-500">In selected filter period</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Fully Complete
            </span>
            <div className="text-2xl font-black text-emerald-700">{metrics.fullyComplete}</div>
            <p className="text-[11px] text-slate-500">Both Line 1 &amp; Line 2 recorded</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center">
              <AlertCircle className="w-3.5 h-3.5 mr-1" /> Line 1 Only
            </span>
            <div className="text-2xl font-black text-amber-600">{metrics.line1Only}</div>
            <p className="text-[11px] text-slate-500">Pending Line 2 inspection</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center">
              <Lightbulb className="w-3.5 h-3.5 mr-1" /> Red Lamp Warnings
            </span>
            <div className="text-2xl font-black text-rose-700">{metrics.redAlerts}</div>
            <p className="text-[11px] text-slate-500">Fault / attention alerts recorded</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by PIC name, intensity, machine status, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Date Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setUseDateRange(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  !useDateRange
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Monthly Filter
              </button>
              <button
                type="button"
                onClick={() => setUseDateRange(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  useDateRange
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Custom Date Range
              </button>
            </div>
          </div>

          {/* Filter Inputs */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            {!useDateRange ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white outline-none"
                  >
                    <option value="ALL">All Months</option>
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={String(idx + 1)}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white outline-none"
                  >
                    <option value="ALL">All Years</option>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white outline-none"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedMonth("ALL")
                setSelectedYear(String(new Date().getFullYear()))
                setUseDateRange(false)
                setStartDate("")
                setEndDate("")
                setSearchQuery("")
              }}
              className="ml-auto inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Reset
            </button>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Showing {filteredRecords.length} records ({filterPeriodLabel})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4">Inspection Date</th>
                  <th className="py-3 px-4">Line 1 (800ML) UV Operational</th>
                  <th className="py-3 px-4">Line 1 PIC</th>
                  <th className="py-3 px-4">Line 2 (425ML) UV Status</th>
                  <th className="py-3 px-4">Line 2 PIC</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Supervisor</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      No UV Machine Checklist records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => {
                    const hasLine1 = Boolean(
                      (r.line1Intensity || r.line1OperatingHours || r.line1RunningDays) &&
                      r.line1Signature
                    )
                    const hasLine2 = Boolean(r.line2MachineStatus && r.line2Signature)
                    const isFullyComplete = hasLine1 && hasLine2

                    const d = new Date(r.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {d}
                        </td>

                        {/* Line 1 Summary */}
                        <td className="py-3.5 px-4">
                          {hasLine1 ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800">
                                Intensity: <span className="font-bold text-blue-700">{r.line1Intensity || "-"}</span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Run Hours: {r.line1OperatingHours || "-"} | Days: {r.line1RunningDays || "-"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not recorded</span>
                          )}
                        </td>

                        {/* Line 1 PIC */}
                        <td className="py-3.5 px-4">
                          {r.line1Pic ? (
                            <div>
                              <div className="font-semibold text-slate-800">{r.line1Pic}</div>
                              <div className="text-[11px] text-slate-400">{r.line1Time || "-"}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Line 2 Status */}
                        <td className="py-3.5 px-4">
                          {r.line2MachineStatus ? (
                            <div className="inline-flex items-center">
                              {r.line2MachineStatus === "Red Light" ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                  <span className="w-2 h-2 rounded-full bg-rose-600 mr-1.5 animate-pulse" />
                                  Red Light
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5" />
                                  Green Light
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not recorded</span>
                          )}
                        </td>

                        {/* Line 2 PIC */}
                        <td className="py-3.5 px-4">
                          {r.line2Pic ? (
                            <div>
                              <div className="font-semibold text-slate-800">{r.line2Pic}</div>
                              <div className="text-[11px] text-slate-400">{r.line2Time || "-"}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Overall Completion */}
                        <td className="py-3.5 px-4 text-center">
                          {isFullyComplete ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Complete
                            </span>
                          ) : hasLine1 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              Line 1 Only
                            </span>
                          ) : hasLine2 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              Line 2 Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-500">
                              Empty
                            </span>
                          )}
                        </td>

                        {/* Supervisor Verification */}
                        <td className="py-3.5 px-4 text-center">
                          {r.verifiedBy ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                              {r.verifiedBy}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewRecord(r)}
                              title="View details & slip"
                              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExportSlipPdf(r)}
                              disabled={exportingSlipId === r.id}
                              title="Download Individual Slip PDF"
                              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {exportingSlipId === r.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              ) : (
                                <Printer className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              title="Delete record"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingId === r.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Slip Modal Preview */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                  INSPECTION SLIP PREVIEW
                </span>
                <h3 className="text-lg font-black text-white">
                  UV Machine 3 In 1 Record (
                  {new Date(previewRecord.date).toLocaleDateString("en-GB")})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* LINE 1 Preview */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-blue-900 block">
                  Line 1 (800ML) — UV Sterilizer Operational Status
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">UV Intensity:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line1Intensity || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Operating Hours:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line1OperatingHours || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Running Days:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line1RunningDays || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Inspection Time:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line1Time || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">PIC Officer:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line1Pic || "N/A"}</span>
                  </div>
                </div>
                {previewRecord.line1Remarks && (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                    <strong>Remarks:</strong> {previewRecord.line1Remarks}
                  </div>
                )}
                {previewRecord.line1Signature && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Line 1 Operator Signature:
                    </span>
                    <div className="w-48 h-20 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center">
                      <img
                        src={previewRecord.line1Signature}
                        alt="Line 1 Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* LINE 2 Preview */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900 block">
                  Line 2 (425ML) — UV Machine Status
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Machine Status Lamp:</span>
                    <span className="font-black text-sm">
                      {previewRecord.line2MachineStatus === "Red Light" ? (
                        <span className="text-rose-600">🔴 Red Light</span>
                      ) : (
                        <span className="text-emerald-600">🟢 Green Light</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Inspection Time:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line2Time || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">PIC Officer:</span>
                    <span className="font-bold text-slate-800">{previewRecord.line2Pic || "N/A"}</span>
                  </div>
                </div>
                {previewRecord.line2Remarks && (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                    <strong>Remarks:</strong> {previewRecord.line2Remarks}
                  </div>
                )}
                {previewRecord.line2Signature && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Line 2 Operator Signature:
                    </span>
                    <div className="w-48 h-20 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center">
                      <img
                        src={previewRecord.line2Signature}
                        alt="Line 2 Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Supervisor Verification Preview */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 block">
                  Supervisor Verification & QC Sign-Off
                </span>
                {previewRecord.verifiedBy || previewRecord.verifiedSignature ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Supervisor Name:</span>
                        <span className="font-bold text-slate-800">{previewRecord.verifiedBy || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Verified Date:</span>
                        <span className="font-bold text-slate-800">
                          {previewRecord.verifiedAt
                            ? new Date(previewRecord.verifiedAt).toLocaleString("en-GB")
                            : "-"}
                        </span>
                      </div>
                    </div>
                    {previewRecord.verifiedSignature && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1">
                          Supervisor Signature:
                        </span>
                        <div className="w-48 h-20 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center">
                          <img
                            src={previewRecord.verifiedSignature}
                            alt="Supervisor Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                    Pending Supervisor Verification. Verification and digital sign-off can be completed in the{" "}
                    <Link href="/forms/maintenance/summary" className="underline font-bold text-amber-900">
                      Maintenance Summary portal
                    </Link>.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewRecord(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleExportSlipPdf(previewRecord)}
                disabled={exportingSlipId === previewRecord.id}
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition-all disabled:opacity-50"
              >
                {exportingSlipId === previewRecord.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating Slip...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-1.5" /> Download Slip PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { getISOWeeksForYear, getCurrentISOWeek } from "@/lib/analytics/isoWeek"

interface BatchTraceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BatchTraceModal({ isOpen, onClose }: BatchTraceModalProps) {
  const current = useMemo(() => getCurrentISOWeek(), [])
  const [selectedYear, setSelectedYear] = useState<number>(current.year)
  const [selectedWeek, setSelectedWeek] = useState<number>(current.week)
  const [selectedLine, setSelectedLine] = useState<string>("ALL")
  const [batchNoFilter, setBatchNoFilter] = useState<string>("")

  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Compute available weeks whenever the selected year changes
  const availableWeeks = useMemo(() => {
    return getISOWeeksForYear(selectedYear)
  }, [selectedYear])

  // Reset to valid week when changing year
  useEffect(() => {
    if (selectedWeek > availableWeeks.length) {
      setSelectedWeek(availableWeeks.length || 1)
    }
  }, [selectedYear, availableWeeks.length, selectedWeek])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isExportingExcel) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isExportingExcel, onClose])

  if (!isOpen) return null

  const selectedWeekObj = availableWeeks.find(w => w.week === selectedWeek)

  const handleSelectThisWeek = () => {
    setSelectedYear(current.year)
    setSelectedWeek(current.week)
  }

  const handleSelectLastWeek = () => {
    if (current.week > 1) {
      setSelectedYear(current.year)
      setSelectedWeek(current.week - 1)
    } else {
      setSelectedYear(current.year - 1)
      const lastYearWeeks = getISOWeeksForYear(current.year - 1)
      setSelectedWeek(lastYearWeeks.length || 52)
    }
  }

  const handleExportExcel = async () => {
    if (isExportingExcel) return
    setIsExportingExcel(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/analytics/traceability-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: selectedYear,
          week: selectedWeek,
          line: selectedLine,
          batchNo: batchNoFilter.trim(),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Failed to export Excel (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `BubblesO2_Batch_Traceability_${selectedYear}_W${String(selectedWeek).padStart(2, "0")}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setSuccess("Batch Traceability Excel downloaded successfully.")
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err?.message || "Failed to download Excel Traceability report.")
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleBatchPrintPDF = () => {
    const params = new URLSearchParams({
      year: String(selectedYear),
      week: String(selectedWeek),
      line: selectedLine,
    })
    if (batchNoFilter.trim()) {
      params.set("batchNo", batchNoFilter.trim())
    }
    window.open(`/forms/production/daily-report/batch-print?${params.toString()}`, "_blank")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-trace-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 id="batch-trace-title" className="text-base font-black uppercase tracking-tight">
                Batch Traceability &amp; DPR Export
              </h2>
              <p className="text-[11px] text-emerald-200 font-medium">
                Bottle-to-box traceability Excel &amp; batch print Daily Production Reports
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExportingExcel}
            className="text-emerald-300 hover:text-white transition-colors p-1 rounded-lg hover:bg-emerald-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-slate-800">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Year and Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                disabled={isExportingExcel}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>
                    {y} {y === current.year ? "(Current Year)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectThisWeek}
                disabled={isExportingExcel}
                className="flex-1 text-[11px] font-bold uppercase py-2 px-2.5 rounded-lg border border-slate-300 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-800 transition-colors text-center text-slate-700 cursor-pointer"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={handleSelectLastWeek}
                disabled={isExportingExcel}
                className="flex-1 text-[11px] font-bold uppercase py-2 px-2.5 rounded-lg border border-slate-300 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-800 transition-colors text-center text-slate-700 cursor-pointer"
              >
                Last Week
              </button>
            </div>
          </div>

          {/* ISO 8601 Week Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>ISO 8601 Week</span>
              </label>
              {selectedWeekObj && (
                <span className="text-[11px] font-semibold text-emerald-700">
                  {selectedWeekObj.rangeLabel}
                </span>
              )}
            </div>
            <select
              value={selectedWeek}
              onChange={e => setSelectedWeek(Number(e.target.value))}
              disabled={isExportingExcel}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableWeeks.map(w => (
                <option key={w.week} value={w.week}>
                  {w.label} ({w.rangeLabel}) {w.isCurrent ? "★ This Week" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Production Line Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Production Line
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "ALL", label: "All Lines" },
                { id: "LINE 1", label: "LINE 1 (800ml)" },
                { id: "LINE 2", label: "LINE 2 (425ml)" },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedLine(opt.id)}
                  disabled={isExportingExcel}
                  className={`text-xs font-bold py-2 px-2 rounded-lg border transition-all cursor-pointer text-center ${
                    selectedLine === opt.id
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Number Search (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Batch Number Filter{" "}
              <span className="text-[10px] font-normal text-slate-400 normal-case">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={batchNoFilter}
                onChange={e => setBatchNoFilter(e.target.value)}
                disabled={isExportingExcel}
                placeholder="e.g. 123456-01 (Leave empty for all)"
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
              {batchNoFilter && (
                <button
                  type="button"
                  onClick={() => setBatchNoFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Filters either Bottle Usage Batch or Box Production Output Batch.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExportingExcel}
            className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider px-4 py-2.5 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Batch Print PDF Button */}
            <button
              type="button"
              onClick={handleBatchPrintPDF}
              disabled={isExportingExcel}
              title="Open all Daily Production Reports for this week in a printable view with page breaks"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print DPR (PDF)</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Export Excel</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

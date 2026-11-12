"use client"

import { useState, useEffect, useMemo } from "react"
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Clock,
  Search,
  Plus,
  Trash2,
  ClipboardPaste,
  Layers,
} from "lucide-react"
import { getISOWeeksForYear, getCurrentISOWeek } from "@/lib/analytics/isoWeek"
import type { BatchCategory, BatchFilterCriteria } from "@/lib/analytics/batchTraceability"

interface BatchTraceModalProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORY_CONFIG: Record<
  BatchCategory,
  { label: string; shortLabel: string; badgeCls: string }
> = {
  ALL: {
    label: "All Categories (Any)",
    shortLabel: "ALL",
    badgeCls: "bg-slate-100 text-slate-800 border-slate-300",
  },
  OUTPUT: {
    label: "Production Output (FG Box)",
    shortLabel: "OUTPUT",
    badgeCls: "bg-amber-100 text-amber-900 border-amber-300",
  },
  BOTTLE: {
    label: "Bottle (Botol)",
    shortLabel: "BOTTLE",
    badgeCls: "bg-blue-100 text-blue-900 border-blue-300",
  },
  CAP: {
    label: "Cap (Penutup)",
    shortLabel: "CAP",
    badgeCls: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  CARTON: {
    label: "Carton / Box (Kotak)",
    shortLabel: "CARTON",
    badgeCls: "bg-orange-100 text-orange-900 border-orange-300",
  },
  LABEL: {
    label: "Label",
    shortLabel: "LABEL",
    badgeCls: "bg-purple-100 text-purple-900 border-purple-300",
  },
}

export function BatchTraceModal({ isOpen, onClose }: BatchTraceModalProps) {
  const current = useMemo(() => getCurrentISOWeek(), [])
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])

  // Mode: "ISO_WEEK", "CUSTOM", or "BATCH_LIST"
  const [dateMode, setDateMode] = useState<"ISO_WEEK" | "CUSTOM" | "BATCH_LIST">("ISO_WEEK")

  // ISO Week States
  const [selectedYear, setSelectedYear] = useState<number>(current.year)
  const [selectedWeek, setSelectedWeek] = useState<number>(current.week)

  // Custom Date States
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split("T")[0]
  })
  const [customTo, setCustomTo] = useState<string>(todayStr)

  // Multi-Batch States (For BY BATCH NUMBER tab)
  const [batchList, setBatchList] = useState<Array<{ id: string; category: BatchCategory; batchNo: string }>>([])
  const [inputCategory, setInputCategory] = useState<BatchCategory>("ALL")
  const [inputBatchNo, setInputBatchNo] = useState<string>("")
  const [isPasteOpen, setIsPasteOpen] = useState(false)
  const [pasteCategory, setPasteCategory] = useState<BatchCategory>("ALL")
  const [pasteText, setPasteText] = useState("")

  // Optional date range for BATCH_LIST mode
  const [enableDateRange, setEnableDateRange] = useState(false)
  const [batchFrom, setBatchFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().split("T")[0]
  })
  const [batchTo, setBatchTo] = useState<string>(todayStr)

  // Common Filters
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
        if (isPasteOpen) {
          setIsPasteOpen(false)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isExportingExcel, isPasteOpen, onClose])

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

  const handleApplyPreset = (
    preset: "TODAY" | "LAST_7" | "THIS_MONTH" | "LAST_30",
    target: "custom" | "batch" = "custom"
  ) => {
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    let fromDate = today
    if (preset === "LAST_7") {
      const d = new Date()
      d.setDate(d.getDate() - 6)
      fromDate = d.toISOString().split("T")[0]
    } else if (preset === "THIS_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      fromDate = first.toISOString().split("T")[0]
    } else if (preset === "LAST_30") {
      const d = new Date()
      d.setDate(d.getDate() - 29)
      fromDate = d.toISOString().split("T")[0]
    }

    if (target === "custom") {
      setCustomFrom(fromDate)
      setCustomTo(today)
    } else {
      setBatchFrom(fromDate)
      setBatchTo(today)
    }
  }

  const handleAddBatch = () => {
    const clean = inputBatchNo.trim().toUpperCase()
    if (!clean) return

    // Avoid duplicate in current list
    const exists = batchList.some(
      b => b.category === inputCategory && b.batchNo === clean
    )
    if (!exists) {
      setBatchList(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          category: inputCategory,
          batchNo: clean,
        },
      ])
    }
    setInputBatchNo("")
  }

  const handleRemoveBatch = (id: string) => {
    setBatchList(prev => prev.filter(b => b.id !== id))
  }

  const handleClearAllBatches = () => {
    setBatchList([])
  }

  const handleApplyPaste = () => {
    const tokens = pasteText
      .split(/[\r\n,;]+/)
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0)

    if (tokens.length === 0) {
      setIsPasteOpen(false)
      return
    }

    setBatchList(prev => {
      const next = [...prev]
      for (const tok of tokens) {
        if (!next.some(b => b.category === pasteCategory && b.batchNo === tok)) {
          next.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            category: pasteCategory,
            batchNo: tok,
          })
        }
      }
      return next
    })

    setPasteText("")
    setIsPasteOpen(false)
  }

  const handleExportExcel = async () => {
    if (isExportingExcel) return
    setIsExportingExcel(true)
    setError(null)
    setSuccess(null)

    try {
      const payload: any = {
        dateMode,
        line: selectedLine,
      }

      if (dateMode === "BATCH_LIST") {
        const allBatches = [...batchList]
        if (inputBatchNo.trim()) {
          const autoAdd = inputBatchNo.trim().toUpperCase()
          if (!allBatches.some(b => b.category === inputCategory && b.batchNo === autoAdd)) {
            allBatches.push({
              id: `auto-${Date.now()}`,
              category: inputCategory,
              batchNo: autoAdd,
            })
          }
        }
        if (allBatches.length === 0) {
          throw new Error("Please enter or add at least one batch number to trace.")
        }
        payload.batchFilters = allBatches.map(b => ({
          category: b.category,
          batchNo: b.batchNo,
        }))

        if (enableDateRange) {
          if (!batchFrom || !batchTo) {
            throw new Error("Please specify both From and To dates.")
          }
          payload.from = batchFrom
          payload.to = batchTo
        }
      } else if (dateMode === "CUSTOM") {
        if (!customFrom || !customTo) {
          throw new Error("Please specify both From and To dates.")
        }
        payload.from = customFrom
        payload.to = customTo
        payload.batchNo = batchNoFilter.trim()
      } else {
        payload.year = selectedYear
        payload.week = selectedWeek
        payload.batchNo = batchNoFilter.trim()
      }

      const res = await fetch("/api/analytics/traceability-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to export Excel (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const fileName =
        dateMode === "BATCH_LIST"
          ? `BubblesO2_Multi_Batch_Traceability_${payload.batchFilters?.length || 1}_items.xlsx`
          : dateMode === "CUSTOM"
          ? `BubblesO2_Batch_Traceability_${customFrom}_to_${customTo}.xlsx`
          : `BubblesO2_Batch_Traceability_${selectedYear}_W${String(selectedWeek).padStart(2, "0")}.xlsx`

      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      const successMsg =
        dateMode === "BATCH_LIST"
          ? "Multi-Batch Traceability Excel downloaded successfully (4 Sheets)."
          : "Batch Traceability Excel downloaded successfully (3 Sheets)."
      setSuccess(successMsg)
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
      line: selectedLine,
    })

    if (dateMode === "BATCH_LIST") {
      const allBatches = [...batchList]
      if (inputBatchNo.trim()) {
        const autoAdd = inputBatchNo.trim().toUpperCase()
        if (!allBatches.some(b => b.category === inputCategory && b.batchNo === autoAdd)) {
          allBatches.push({
            id: `auto-${Date.now()}`,
            category: inputCategory,
            batchNo: autoAdd,
          })
        }
      }
      if (allBatches.length === 0) {
        setError("Please enter or add at least one batch number before printing DPR.")
        return
      }
      params.set("dateMode", "BATCH_LIST")
      params.set(
        "batchFilters",
        JSON.stringify(allBatches.map(b => ({ category: b.category, batchNo: b.batchNo })))
      )
      params.set("batchNo", allBatches.map(b => b.batchNo).join(","))
      if (enableDateRange && batchFrom && batchTo) {
        params.set("from", batchFrom)
        params.set("to", batchTo)
      }
    } else if (dateMode === "CUSTOM") {
      params.set("from", customFrom)
      params.set("to", customTo)
      if (batchNoFilter.trim()) {
        params.set("batchNo", batchNoFilter.trim())
      }
    } else {
      params.set("year", String(selectedYear))
      params.set("week", String(selectedWeek))
      if (batchNoFilter.trim()) {
        params.set("batchNo", batchNoFilter.trim())
      }
    }

    window.open(`/forms/production/daily-report/batch-print?${params.toString()}`, "_blank")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
                Bottle-to-box Excel &amp; batch print Daily Production Reports
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

        {/* Tab Switcher: ISO Week vs Custom Date vs By Batch No */}
        <div className="bg-slate-100 p-1.5 border-b border-slate-200 flex gap-1">
          <button
            type="button"
            onClick={() => setDateMode("ISO_WEEK")}
            disabled={isExportingExcel}
            className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              dateMode === "ISO_WEEK"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">By ISO Week</span>
          </button>

          <button
            type="button"
            onClick={() => setDateMode("CUSTOM")}
            disabled={isExportingExcel}
            className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              dateMode === "CUSTOM"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">By Custom Date</span>
          </button>

          <button
            type="button"
            onClick={() => setDateMode("BATCH_LIST")}
            disabled={isExportingExcel}
            className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              dateMode === "BATCH_LIST"
                ? "bg-white text-emerald-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate">By Batch No</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-slate-800 max-h-[75vh] overflow-y-auto">
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

          {/* 1. Selector based on mode */}
          {dateMode === "ISO_WEEK" ? (
            <div className="space-y-3">
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
            </div>
          ) : dateMode === "CUSTOM" ? (
            <div className="space-y-3">
              {/* Date From and Date To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    disabled={isExportingExcel}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    disabled={isExportingExcel}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Quick Presets
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "TODAY", label: "Today" },
                    { id: "LAST_7", label: "Last 7D" },
                    { id: "THIS_MONTH", label: "This Month" },
                    { id: "LAST_30", label: "Last 30D" },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p.id as any, "custom")}
                      disabled={isExportingExcel}
                      className="text-[10px] font-bold uppercase py-1.5 px-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 transition-colors text-center text-slate-700 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* BATCH_LIST Mode */
            <div className="space-y-4">
              {/* Batch Input Form */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Batches to Trace</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPasteOpen(prev => !prev)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>{isPasteOpen ? "Close Paste" : "Paste Multiple"}</span>
                  </button>
                </div>

                {/* Bulk Paste Area (Collapsible) */}
                {isPasteOpen && (
                  <div className="p-3 bg-white border border-emerald-200 rounded-lg space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Paste Multiple Batches</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">Category:</span>
                        <select
                          value={pasteCategory}
                          onChange={e => setPasteCategory(e.target.value as BatchCategory)}
                          className="text-[11px] font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800"
                        >
                          {(Object.keys(CATEGORY_CONFIG) as BatchCategory[]).map(cat => (
                            <option key={cat} value={cat}>
                              {CATEGORY_CONFIG[cat].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder="Paste batch numbers here, separated by newlines or commas (e.g. 034025-01, BM1-2601, CAP-9912)..."
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPasteOpen(false)}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyPaste}
                        disabled={!pasteText.trim()}
                        className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
                      >
                        Add Pasted Batches
                      </button>
                    </div>
                  </div>
                )}

                {/* Single Add Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <select
                      value={inputCategory}
                      onChange={e => setInputCategory(e.target.value as BatchCategory)}
                      disabled={isExportingExcel}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {(Object.keys(CATEGORY_CONFIG) as BatchCategory[]).map(cat => (
                        <option key={cat} value={cat}>
                          {CATEGORY_CONFIG[cat].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={inputBatchNo}
                      onChange={e => setInputBatchNo(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddBatch()
                        }
                      }}
                      disabled={isExportingExcel}
                      placeholder="e.g. 034025-01, BM1..."
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddBatch}
                      disabled={isExportingExcel || !inputBatchNo.trim()}
                      className="w-full text-xs font-bold uppercase py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Batches Chip List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Selected Batches ({batchList.length})
                  </label>
                  {batchList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllBatches}
                      className="text-[10px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {batchList.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                    No batch numbers added yet. Add batches above or use &apos;Paste Multiple&apos;.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5">
                    {batchList.map(item => {
                      const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.ALL
                      return (
                        <span
                          key={item.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-2xs ${cfg.badgeCls}`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-75">
                            [{cfg.shortLabel}]
                          </span>
                          <span>{item.batchNo}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBatch(item.id)}
                            className="hover:opacity-70 p-0.5 ml-0.5 cursor-pointer"
                            title="Remove batch"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Optional Date Range Toggle */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableDateRange}
                    onChange={e => setEnableDateRange(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Filter by Date Range{" "}
                    <span className="text-[10px] font-normal text-slate-500">(Optional — Default is All Time)</span>
                  </span>
                </label>

                {enableDateRange && (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          From Date
                        </label>
                        <input
                          type="date"
                          value={batchFrom}
                          onChange={e => setBatchFrom(e.target.value)}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          To Date
                        </label>
                        <input
                          type="date"
                          value={batchTo}
                          onChange={e => setBatchTo(e.target.value)}
                          className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: "TODAY", label: "Today" },
                        { id: "LAST_7", label: "Last 7D" },
                        { id: "THIS_MONTH", label: "This Month" },
                        { id: "LAST_30", label: "Last 30D" },
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleApplyPreset(p.id as any, "batch")}
                          className="text-[10px] font-bold uppercase py-1 px-1 rounded border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 transition-colors text-center text-slate-700 cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Production Line Selector */}
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

          {/* 3. Batch Number Search (Optional) for ISO_WEEK & CUSTOM */}
          {dateMode !== "BATCH_LIST" && (
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
          )}
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
              title="Open all Daily Production Reports for this selection in a printable view with page breaks"
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

"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, X, Calendar, Filter, RotateCcw, CalendarRange, Loader2 } from "lucide-react"

interface ProductionReportFiltersProps {
  currentFilters: {
    q?: string
    month?: string
    from?: string
    to?: string
    shift?: string
    line?: string
    status?: string
    pageSize?: number
  }
}

function getRecentMonths() {
  const months = []
  const now = new Date()
  // Include up to next month
  const start = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  for (let i = 0; i < 18; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const value = `${year}-${month}`
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    months.push({ value, label })
  }
  return months
}

export function ProductionReportFilters({ currentFilters }: ProductionReportFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchDraft, setSearchDraft] = useState(currentFilters.q || "")
  const [isCustomDate, setIsCustomDate] = useState(Boolean(currentFilters.from || currentFilters.to))
  const [customFrom, setCustomFrom] = useState(currentFilters.from || "")
  const [customTo, setCustomTo] = useState(currentFilters.to || "")

  const recentMonths = getRecentMonths()

  // Sync draft state if searchParams change externally (e.g. back button)
  useEffect(() => {
    setSearchDraft(currentFilters.q || "")
    setCustomFrom(currentFilters.from || "")
    setCustomTo(currentFilters.to || "")
    setIsCustomDate(Boolean(currentFilters.from || currentFilters.to))
  }, [currentFilters.q, currentFilters.from, currentFilters.to])

  const updateParams = (updates: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    // Always reset page to 1 when filters change
    params.set("page", "1")

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === "" || val === "ALL") {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchDraft.trim()
      if (trimmed !== (currentFilters.q || "")) {
        updateParams({ q: trimmed || null })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchDraft])

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === "CUSTOM") {
      setIsCustomDate(true)
      // clear month, keep any custom dates
      updateParams({ month: null })
    } else {
      setIsCustomDate(false)
      setCustomFrom("")
      setCustomTo("")
      updateParams({
        month: val || null,
        from: null,
        to: null,
      })
    }
  }

  const applyCustomDate = (fromVal: string, toVal: string) => {
    setCustomFrom(fromVal)
    setCustomTo(toVal)
    if (fromVal && toVal && fromVal > toVal) return
    updateParams({
      month: null,
      from: fromVal || null,
      to: toVal || null,
    })
  }

  const resetAllFilters = () => {
    setSearchDraft("")
    setIsCustomDate(false)
    setCustomFrom("")
    setCustomTo("")

    const params = new URLSearchParams()
    if (currentFilters.pageSize && currentFilters.pageSize !== 10) {
      params.set("pageSize", String(currentFilters.pageSize))
    }

    startTransition(() => {
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false })
    })
  }

  const hasActiveFilters = Boolean(
    currentFilters.q ||
    currentFilters.month ||
    currentFilters.from ||
    currentFilters.to ||
    (currentFilters.shift && currentFilters.shift !== "ALL") ||
    (currentFilters.line && currentFilters.line !== "ALL") ||
    (currentFilters.status && currentFilters.status !== "ALL")
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-6 space-y-4">
      {/* Top Row: Search Bar & Reset */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by Prepared By, Batch No, or Remarks..."
            className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 font-medium text-gray-800 placeholder-gray-400 transition-all"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft("")
                updateParams({ q: null })
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors shadow-sm shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Second Row: Divide by Month / Date, Shift, Line, Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
        
        {/* Divide by Month / Date Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Divide By Month / Date
          </label>
          <select
            value={isCustomDate ? "CUSTOM" : currentFilters.month || ""}
            onChange={handleMonthChange}
            className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            <option value="">All Time (Semua Bulan)</option>
            {recentMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            <option value="CUSTOM">Custom Date Range...</option>
          </select>
        </div>

        {/* Shift Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Shift
          </label>
          <select
            value={currentFilters.shift || "ALL"}
            onChange={(e) => updateParams({ shift: e.target.value })}
            className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            <option value="ALL">All Shifts (Semua)</option>
            <option value="AM">AM Shift</option>
            <option value="PM">PM Shift</option>
          </select>
        </div>

        {/* Line Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Production Line
          </label>
          <select
            value={currentFilters.line || "ALL"}
            onChange={(e) => updateParams({ line: e.target.value })}
            className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            <option value="ALL">All Lines (Semua Line)</option>
            <option value="LINE 1 - 800ml">Line 1 (800ml)</option>
            <option value="LINE 2 - 425ml">Line 2 (425ml)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Status
          </label>
          <select
            value={currentFilters.status || "ALL"}
            onChange={(e) => updateParams({ status: e.target.value })}
            className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

      </div>

      {/* Expandable Custom Date Range Picker */}
      {isCustomDate && (
        <div className="pt-2 border-t border-dashed border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-indigo-50/50 p-3 rounded-xl animate-in fade-in duration-200">
          <div className="flex items-center text-xs font-black uppercase tracking-wider text-indigo-900 shrink-0">
            <CalendarRange className="w-4 h-4 mr-1.5 text-indigo-600" />
            Custom Date Range:
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => applyCustomDate(e.target.value, customTo)}
              className="text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-gray-400 text-xs font-bold">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => applyCustomDate(customFrom, e.target.value)}
              className="text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {(customFrom || customTo) && (
              <button
                type="button"
                onClick={() => applyCustomDate("", "")}
                className="text-xs font-bold text-gray-500 hover:text-rose-600 px-2 py-1"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Indicator when filtering in progress */}
      {isPending && (
        <div className="flex items-center justify-end text-xs font-bold text-indigo-600 space-x-1.5 pt-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Updating results...</span>
        </div>
      )}
    </div>
  )
}

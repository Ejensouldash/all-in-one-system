"use client"

import React, { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar as CalendarIcon,
  Grid,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react"
import {
  MonthDataPayload,
  ComplianceDaySummary,
  GMPCategory,
} from "@/lib/compliance/types"
import { getComplianceMonthData } from "@/app/actions/compliance-actions"
import { ComplianceCalendarView } from "./ComplianceCalendarView"
import { ComplianceMatrixView } from "./ComplianceMatrixView"
import { DateDetailsPanel } from "./DateDetailsPanel"

interface Props {
  initialData: MonthDataPayload
  initialSelectedDate?: string | null
}

const CATEGORIES: { value: string; label: string }[] = [
  { value: "ALL", label: "Semua Kategori" },
  { value: "QC", label: "Quality Control (QC)" },
  { value: "PRODUCTION", label: "Production" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "SECURITY", label: "Security" },
  { value: "LOGISTICS", label: "Logistics" },
]

export function GMPComplianceClient({ initialData, initialSelectedDate }: Props) {
  const router = useRouter()
  const [data, setData] = useState<MonthDataPayload>(initialData)
  const [year, setYear] = useState(initialData.year)
  const [month, setMonth] = useState(initialData.month)
  const [activeView, setActiveView] = useState<"CALENDAR" | "MATRIX">("CALENDAR")

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [formTypeFilter, setFormTypeFilter] = useState("ALL")
  const [shiftFilter, setShiftFilter] = useState("ALL")

  // Modal / panel state
  const [selectedDay, setSelectedDay] = useState<ComplianceDaySummary | null>(() => {
    if (initialSelectedDate) {
      return initialData.days.find(d => d.date === initialSelectedDate) || null
    }
    return null
  })
  const [isPanelOpen, setIsPanelOpen] = useState(Boolean(initialSelectedDate))

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  // Available forms based on category
  const filteredFormsList = useMemo(() => {
    if (categoryFilter === "ALL") return data.formsRegistry
    return data.formsRegistry.filter(f => f.category === categoryFilter)
  }, [data.formsRegistry, categoryFilter])

  // Filtered days data
  const filteredDays = useMemo(() => {
    if (categoryFilter === "ALL" && formTypeFilter === "ALL" && shiftFilter === "ALL") {
      return data.days
    }

    return data.days.map(day => {
      const filteredObligations = day.obligations.filter(ob => {
        if (categoryFilter !== "ALL" && ob.category !== categoryFilter) return false
        if (formTypeFilter !== "ALL" && ob.formType !== formTypeFilter) return false
        if (shiftFilter !== "ALL" && ob.shift && ob.shift !== shiftFilter) return false
        return true
      })

      // Re-aggregate counts for filtered view
      let totalExpected = 0
      let totalSubmitted = 0
      let totalMissing = 0
      let totalPending = 0
      let totalDraft = 0
      let totalUnconfigured = 0

      for (const ob of filteredObligations) {
        if (ob.submissionStatus === "UNCONFIGURED") {
          totalUnconfigured++
          continue
        }
        if (ob.frequency === "EVENT_BASED") {
          if (
            ob.submissionStatus === "SUBMITTED_ON_TIME" ||
            ob.submissionStatus === "SUBMITTED_LATE"
          ) {
            totalSubmitted++
            if (ob.verificationStatus === "PENDING") totalPending++
          }
          continue
        }

        totalExpected++
        if (
          ob.submissionStatus === "SUBMITTED_ON_TIME" ||
          ob.submissionStatus === "SUBMITTED_LATE"
        ) {
          totalSubmitted++
          if (ob.verificationStatus === "PENDING") totalPending++
        } else if (ob.submissionStatus === "DRAFT") {
          totalDraft++
          if (ob.isDeadlinePassed) totalMissing++
        } else if (ob.submissionStatus === "MISSING_OVERDUE") {
          totalMissing++
        }
      }

      return {
        ...day,
        totalExpected,
        totalSubmitted,
        totalMissing,
        totalPendingVerification: totalPending,
        totalDraft,
        totalUnconfigured,
        hasAttention: totalMissing > 0 || totalPending > 0 || totalDraft > 0,
        obligations: filteredObligations,
      }
    })
  }, [data.days, categoryFilter, formTypeFilter, shiftFilter])

  // Filtered KPI metrics
  const filteredMetrics = useMemo(() => {
    if (categoryFilter === "ALL" && formTypeFilter === "ALL" && shiftFilter === "ALL") {
      return data.metrics
    }

    let passedDeadline = 0
    let submittedOnTime = 0
    let submittedLate = 0
    let missingAfterDeadline = 0
    let pendingVerification = 0

    for (const day of filteredDays) {
      for (const ob of day.obligations) {
        if (ob.submissionStatus === "UNCONFIGURED" || ob.frequency === "EVENT_BASED") continue

        if (
          ob.submissionStatus === "SUBMITTED_ON_TIME" ||
          ob.submissionStatus === "SUBMITTED_LATE"
        ) {
          if (ob.submissionStatus === "SUBMITTED_ON_TIME") submittedOnTime++
          if (ob.submissionStatus === "SUBMITTED_LATE") submittedLate++
          if (ob.verificationStatus === "PENDING") pendingVerification++
          if (ob.isDeadlinePassed) passedDeadline++
        } else if (ob.isDeadlinePassed) {
          missingAfterDeadline++
          passedDeadline++
        }
      }
    }

    const onTimeRate =
      passedDeadline > 0 ? Math.round((submittedOnTime / passedDeadline) * 100) : null

    return {
      passedDeadlineExpected: passedDeadline,
      submittedOnTime,
      submittedLate,
      missingAfterDeadline,
      pendingVerification,
      onTimeRate,
      totalUnconfiguredForms: data.metrics.totalUnconfiguredForms,
    }
  }, [filteredDays, data.metrics, categoryFilter, formTypeFilter, shiftFilter])

  async function loadMonth(nextYear: number, nextMonth: number) {
    setErrorMsg("")
    startTransition(async () => {
      const res = await getComplianceMonthData(nextYear, nextMonth)
      if (res.success && res.data) {
        setData(res.data)
        setYear(nextYear)
        setMonth(nextMonth)
        // Update URL query parameters for bookmarking
        router.replace(`/forms/maintenance/compliance?year=${nextYear}&month=${nextMonth}`)
      } else {
        setErrorMsg(res.error || "Gagal memuatkan data pematuhan.")
      }
    })
  }

  function handlePrevMonth() {
    if (month === 1) {
      loadMonth(year - 1, 12)
    } else {
      loadMonth(year, month - 1)
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      loadMonth(year + 1, 1)
    } else {
      loadMonth(year, month + 1)
    }
  }

  function handleToday() {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`

    loadMonth(currentYear, currentMonth)

    // Select today's card
    const target = data.days.find(d => d.date === todayStr)
    if (target) {
      setSelectedDay(target)
      setIsPanelOpen(true)
    }
  }

  function handleSelectDate(day: ComplianceDaySummary) {
    setSelectedDay(day)
    setIsPanelOpen(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control Bar: Month navigation, View switch, Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPending}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center min-w-[170px]">
              <h2 className="text-lg font-black text-slate-900 capitalize">
                {data.monthName} {year}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Waktu Piawai Malaysia (MYT)
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isPending}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 disabled:opacity-50"
              title="Bulan seterusnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleToday}
              disabled={isPending}
              className="ml-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border border-slate-200"
            >
              Hari Ini
            </button>

            {isPending && <RefreshCw className="w-4 h-4 text-blue-700 animate-spin ml-2" />}
          </div>

          {/* View Toggle: Calendar vs Matrix */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
              <button
                type="button"
                onClick={() => setActiveView("CALENDAR")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeView === "CALENDAR"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                Kalendar
              </button>
              <button
                type="button"
                onClick={() => setActiveView("MATRIX")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeView === "MATRIX"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Grid className="w-4 h-4" />
                Matriks
              </button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Kategori
            </label>
            <select
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value)
                setFormTypeFilter("ALL")
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:border-blue-600"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Form Type Dropdown */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Jenis Borang
            </label>
            <select
              value={formTypeFilter}
              onChange={e => setFormTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua Borang ({filteredFormsList.length})</option>
              {filteredFormsList.map(f => (
                <option key={f.formType} value={f.formType}>
                  {f.formCode} - {f.formTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Filter (where applicable) */}
          <div className="w-[120px]">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              Syif
            </label>
            <select
              value={shiftFilter}
              onChange={e => setShiftFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua</option>
              <option value="DAY">DAY</option>
              <option value="NIGHT">NIGHT</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(categoryFilter !== "ALL" || formTypeFilter !== "ALL" || shiftFilter !== "ALL") && (
            <div className="self-end pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("ALL")
                  setFormTypeFilter("ALL")
                  setShiftFilter("ALL")
                }}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              >
                Reset Penapis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards Row (Requirement 3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Passed Deadlines Expected */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Wajib Tarikh Akhir
          </p>
          <p className="text-xl font-black text-slate-800 mt-1">
            {filteredMetrics.passedDeadlineExpected}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Telah matang</p>
        </div>

        {/* Submitted On Time */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
            Tepat Masa
          </p>
          <p className="text-xl font-black text-emerald-700 mt-1">
            {filteredMetrics.submittedOnTime}
          </p>
          <p className="text-[10px] text-emerald-600/80 mt-0.5">Sebelum tarikh akhir</p>
        </div>

        {/* Submitted Late */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">
            Dihantar Lewat
          </p>
          <p className="text-xl font-black text-orange-700 mt-1">
            {filteredMetrics.submittedLate}
          </p>
          <p className="text-[10px] text-orange-600/80 mt-0.5">Status lewat dikekalkan</p>
        </div>

        {/* Missing After Deadline */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-red-600">
            Terlepas Tarikh Akhir
          </p>
          <p className="text-xl font-black text-red-700 mt-1">
            {filteredMetrics.missingAfterDeadline}
          </p>
          <p className="text-[10px] text-red-600/80 mt-0.5">Tiada rekod penyerahan</p>
        </div>

        {/* Pending Verification (Clearly labeled as subset) */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">
            Menunggu Semakan
          </p>
          <p className="text-xl font-black text-amber-700 mt-1">
            {filteredMetrics.pendingVerification}
          </p>
          <p className="text-[10px] text-amber-600/80 mt-0.5">Sebahagian drp dihantar</p>
        </div>

        {/* On-Time Submission Rate */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
            Kadar Tepat Masa
          </p>
          <p className="text-xl font-black text-blue-800 mt-1">
            {filteredMetrics.onTimeRate !== null ? `${filteredMetrics.onTimeRate}%` : "N/A"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Kadar penyerahan awal</p>
        </div>
      </div>

      {/* Main View: Calendar or Matrix */}
      {activeView === "CALENDAR" ? (
        <ComplianceCalendarView
          days={filteredDays}
          onSelectDate={handleSelectDate}
          selectedDateStr={selectedDay?.date || null}
        />
      ) : (
        <ComplianceMatrixView
          days={filteredDays}
          formsRegistry={data.formsRegistry}
          onSelectDate={handleSelectDate}
          selectedCategory={categoryFilter}
          selectedFormType={formTypeFilter}
        />
      )}

      {/* Date Details Side Panel / Drawer */}
      <DateDetailsPanel
        day={selectedDay}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setSelectedDay(null)
        }}
        userPermissions={data.userPermissions}
      />
    </div>
  )
}

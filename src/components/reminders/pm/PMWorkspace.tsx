"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import {
  CalendarDays,
  List,
  CheckCircle2,
  CircleAlert,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  UploadCloud,
  Archive,
  Edit2,
  Check,
  Wrench,
  Calendar as CalendarIcon,
  User as UserIcon,
  FileSpreadsheet,
} from "lucide-react"
import "../RemindersCSS.css"
import { ModalShell } from "../ModalShell"
import { PMFields, PICPicker, buttonClass, fieldClass } from "./PMFields"
import { PMImport } from "./PMImport"
import {
  getPMData,
  completePMOccurrence,
  savePMSchedule,
  archivePMSchedule,
} from "@/app/actions/reminder-pm"
import {
  canCompletePM,
  pmStatus,
  ruleLabel,
  type PMInput,
  type PMRule,
  type PMUser,
} from "@/lib/reminders/pm-core"

const MONTH_BM = [
  "Januari",
  "Februari",
  "Mac",
  "April",
  "Mei",
  "Jun",
  "Julai",
  "Ogos",
  "September",
  "Oktober",
  "November",
  "Disember",
]

const DAY_NAMES = ["AHD", "ISN", "SEL", "RAB", "KHA", "JUM", "SAB"]

type PMData = Awaited<ReturnType<typeof getPMData>>
type PMOccurrence = PMData["occurrences"][number]
type PMSchedule = PMData["schedules"][number]

type Banner = { kind: "ok" | "err"; text: string } | null

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (
      msg.includes("Server Components render") ||
      msg.includes("omitted in production") ||
      msg.includes("digest property") ||
      msg.includes("Prisma") ||
      msg.includes("prisma") ||
      msg.includes("Unique constraint") ||
      msg.includes("Foreign key") ||
      msg.includes("database") ||
      msg.includes("SELECT") ||
      msg.includes("syntax error")
    ) {
      return "Ralat pangkalan data: Jadual Preventive Maintenance belum dicipta atau migrasi belum dijalankan di pangkalan data."
    }
    return msg
  }
  return "Ralat tidak dijangka berlaku. Sila cuba lagi."
}

export function PMWorkspace() {
  const [data, setData] = useState<PMData | null>(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<Banner>(null)
  const [view, setView] = useState<"calendar" | "list" | "schedules">("list")

  // Month navigation cursor
  const [cursor, setCursor] = useState(() => new Date())

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [equipmentFilter, setEquipmentFilter] = useState<string>("ALL")
  const [picFilter, setPicFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [selectedOccurrence, setSelectedOccurrence] = useState<PMOccurrence | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean
    schedule: PMSchedule | null
  }>({ open: false, schedule: null })

  // Completion Form state
  const [completionResult, setCompletionResult] = useState<"OK" | "ISSUE">("OK")
  const [completionNotes, setCompletionNotes] = useState("")
  const [completionDate, setCompletionDate] = useState("")
  const [completionError, setCompletionError] = useState("")
  const [submitting, startSubmitting] = useTransition()

  // Schedule Form state
  const [scheduleForm, setScheduleForm] = useState<PMInput>({
    equipment: "",
    srs: null,
    startDate: "",
    intervalUnit: "DAY",
    intervalCount: 14,
    checklist: [""],
    picIds: [],
  })
  const [scheduleActivation, setScheduleActivation] = useState("")
  const [scheduleError, setScheduleError] = useState("")
  const [savingSchedule, startSavingSchedule] = useTransition()

  const flash = (b: Banner) => {
    setBanner(b)
    if (b?.kind === "ok") setTimeout(() => setBanner(null), 4000)
  }

  // Calculate month boundaries for data fetch
  const { fromDate, toDate } = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const start = new Date(Date.UTC(year, month, 1))
    const end = new Date(Date.UTC(year, month + 1, 0))
    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    }
  }, [cursor])

  // Fetch PM Data
  const loadData = useCallback(
    async (occurrenceId?: string) => {
      try {
        setLoading(true)
        const targetId =
          occurrenceId ||
          (typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("occurrence") || undefined
            : undefined)

        const result = await getPMData(fromDate, toDate, targetId)
        setData(result)

        // If URL requested an occurrence, auto-open it
        if (targetId) {
          const matched = result.occurrences.find((o) => o.id === targetId)
          if (matched) {
            setSelectedOccurrence(matched)
            setCompletionResult(matched.result === "ISSUE" ? "ISSUE" : "OK")
            setCompletionNotes(matched.notes || "")
            setCompletionDate(matched.inspectedDate || result.today)
            setCompletionError("")
          }
        }
      } catch (err) {
        flash({ kind: "err", text: sanitizeError(err) })
      } finally {
        setLoading(false)
      }
    },
    [fromDate, toDate]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open occurrence modal and sync URL
  const openOccurrence = (occ: PMOccurrence) => {
    setSelectedOccurrence(occ)
    setCompletionResult(occ.result === "ISSUE" ? "ISSUE" : "OK")
    setCompletionNotes(occ.notes || "")
    setCompletionDate(occ.inspectedDate || (data ? data.today : new Date().toISOString().slice(0, 10)))
    setCompletionError("")

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", "pm")
      url.searchParams.set("occurrence", occ.id)
      window.history.replaceState(null, "", url)
    }
  }

  // Close occurrence modal and clean URL
  const closeOccurrence = () => {
    setSelectedOccurrence(null)
    setCompletionError("")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("occurrence")
      window.history.replaceState(null, "", url)
    }
  }

  // Handle task completion submit
  const handleComplete = () => {
    if (!selectedOccurrence) return
    setCompletionError("")

    if (completionResult === "ISSUE" && !completionNotes.trim()) {
      setCompletionError("Catatan diperlukan untuk rekod ada masalah.")
      return
    }

    startSubmitting(async () => {
      try {
        await completePMOccurrence(
          selectedOccurrence.id,
          completionResult,
          completionNotes,
          completionDate
        )
        flash({ kind: "ok", text: "Pemeriksaan berjaya direkodkan." })
        closeOccurrence()
        await loadData()
      } catch (err) {
        setCompletionError(sanitizeError(err))
      }
    })
  }

  // Handle Schedule Create / Edit
  const openScheduleModal = (sched: PMSchedule | null) => {
    if (sched) {
      setScheduleModal({ open: true, schedule: sched })
      setScheduleForm({
        equipment: sched.equipment,
        srs: sched.srs,
        startDate: sched.startDate,
        intervalUnit: sched.intervalUnit,
        intervalCount: sched.intervalCount,
        checklist: sched.checklist.length ? sched.checklist : [""],
        picIds: sched.picIds,
      })
      setScheduleActivation(sched.activationDate)
    } else {
      setScheduleModal({ open: true, schedule: null })
      const todayStr = data ? data.today : new Date().toISOString().slice(0, 10)
      setScheduleForm({
        equipment: "",
        srs: null,
        startDate: todayStr,
        intervalUnit: "DAY",
        intervalCount: 14,
        checklist: [""],
        picIds: data?.userId ? [data.userId] : [],
      })
      setScheduleActivation(todayStr)
    }
    setScheduleError("")
  }

  const handleSaveSchedule = () => {
    setScheduleError("")
    const filteredChecklist = scheduleForm.checklist
      .map((c) => c.trim())
      .filter(Boolean)

    if (!scheduleForm.equipment.trim()) {
      setScheduleError("Nama equipment diperlukan.")
      return
    }
    if (!filteredChecklist.length) {
      setScheduleError("Sila masukkan sekurang-kurangnya satu arahan kerja / checklist.")
      return
    }

    startSavingSchedule(async () => {
      try {
        await savePMSchedule(
          scheduleModal.schedule?.id || null,
          { ...scheduleForm, checklist: filteredChecklist },
          scheduleActivation
        )
        flash({
          kind: "ok",
          text: scheduleModal.schedule
            ? "Jadual berjaya dikemas kini."
            : "Jadual baharu berjaya dicipta.",
        })
        setScheduleModal({ open: false, schedule: null })
        await loadData()
      } catch (err) {
        setScheduleError(sanitizeError(err))
      }
    })
  }

  // Handle Schedule Archive
  const handleArchiveSchedule = (sched: PMSchedule) => {
    if (
      !window.confirm(
        `Adakah anda pasti untuk mengarkibkan jadual "${sched.equipment}"? Ulangan masa hadapan yang belum selesai akan dihentikan tetapi sejarah pemeriksaan kekal.`
      )
    ) {
      return
    }

    startSavingSchedule(async () => {
      try {
        await archivePMSchedule(sched.id)
        flash({ kind: "ok", text: `Jadual "${sched.equipment}" telah diarkibkan.` })
        await loadData()
      } catch (err) {
        flash({ kind: "err", text: sanitizeError(err) })
      }
    })
  }

  // Derived user map for fast lookup
  const userMap = useMemo(() => {
    const map = new Map<string, PMUser>()
    if (data?.users) {
      for (const u of data.users) map.set(u.id, u)
    }
    return map
  }, [data?.users])

  // Equipment list for filter
  const equipmentOptions = useMemo(() => {
    if (!data?.occurrences) return []
    const set = new Set<string>()
    for (const o of data.occurrences) set.add(o.equipment)
    for (const s of data.schedules) set.add(s.equipment)
    return Array.from(set).sort()
  }, [data?.occurrences, data?.schedules])

  // Filtered occurrences
  const filteredOccurrences = useMemo(() => {
    if (!data) return []
    const today = data.today
    return data.occurrences.filter((occ) => {
      const status = pmStatus(occ, today)

      // Status filter
      if (statusFilter !== "ALL" && status !== statusFilter) return false

      // Equipment filter
      if (equipmentFilter !== "ALL" && occ.equipment !== equipmentFilter) return false

      // PIC filter
      if (picFilter !== "ALL" && !occ.picIds.includes(picFilter)) return false

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchEquip = occ.equipment.toLowerCase().includes(query)
        const matchSrs = occ.srs ? occ.srs.toLowerCase().includes(query) : false
        const matchChecklist = occ.checklist.some((c) => c.toLowerCase().includes(query))
        const matchPic = occ.picIds.some((id) => {
          const u = userMap.get(id)
          return u ? u.name.toLowerCase().includes(query) : false
        })
        if (!matchEquip && !matchSrs && !matchChecklist && !matchPic) return false
      }

      return true
    })
  }, [data, statusFilter, equipmentFilter, picFilter, searchQuery, userMap])

  // Summary counts
  const stats = useMemo(() => {
    if (!data) return { today: 0, upcoming: 0, overdue: 0, done: 0 }
    const today = data.today
    let tCount = 0
    let uCount = 0
    let oCount = 0
    let dCount = 0

    for (const occ of data.occurrences) {
      const st = pmStatus(occ, today)
      if (st === "TODAY") tCount++
      else if (st === "UPCOMING") uCount++
      else if (st === "OVERDUE") oCount++
      else if (st === "DONE") dCount++
    }

    return { today: tCount, upcoming: uCount, overdue: oCount, done: dCount }
  }, [data])

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(Date.UTC(year, month, 1))
    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const startOffset = firstDay.getUTCDay()

    const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = []

    // Previous month padding
    const prevMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const prevDate = new Date(Date.UTC(year, month - 1, d)).toISOString().slice(0, 10)
      days.push({ dayNumber: d, dateStr: prevDate, isCurrentMonth: false })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const currDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      days.push({ dayNumber: d, dateStr: currDate, isCurrentMonth: true })
    }

    // Next month padding to fill complete weeks (multiple of 7)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(Date.UTC(year, month + 1, d)).toISOString().slice(0, 10)
        days.push({ dayNumber: d, dateStr: nextDate, isCurrentMonth: false })
      }
    }

    return days
  }, [cursor])

  // Map occurrences by date for fast calendar cell rendering
  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, PMOccurrence[]>()
    for (const occ of filteredOccurrences) {
      const list = map.get(occ.dueDate) || []
      list.push(occ)
      map.set(occ.dueDate, list)
    }
    return map
  }, [filteredOccurrences])

  return (
    <div className="space-y-4">
      {/* Feedback banner */}
      {banner && (
        <div
          className={`reminder-fade-up flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            banner.kind === "ok"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          <span className="flex items-start gap-2">
            {banner.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {banner.text}
          </span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="reminder-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            key: "TODAY",
            label: "Hari Ini",
            value: stats.today,
            icon: Clock,
            gradient: "from-amber-500 to-amber-600",
            activeRing: statusFilter === "TODAY" ? "ring-2 ring-amber-500" : "",
          },
          {
            key: "UPCOMING",
            label: "Akan Datang",
            value: stats.upcoming,
            icon: CalendarIcon,
            gradient: "from-blue-500 to-indigo-600",
            activeRing: statusFilter === "UPCOMING" ? "ring-2 ring-blue-500" : "",
          },
          {
            key: "OVERDUE",
            label: "Tertunggak",
            value: stats.overdue,
            icon: AlertTriangle,
            gradient: "from-rose-500 to-red-600",
            activeRing: statusFilter === "OVERDUE" ? "ring-2 ring-rose-500" : "",
          },
          {
            key: "DONE",
            label: "Selesai",
            value: stats.done,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            activeRing: statusFilter === "DONE" ? "ring-2 ring-emerald-500" : "",
          },
        ].map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === card.key ? "ALL" : card.key))}
            className={`flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${card.activeRing}`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${card.gradient}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-black tabular-nums leading-none text-gray-900">
                {card.value}
              </div>
              <div className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {card.label}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Toolbar */}
      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Top Row: Month navigation, Views, Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Month selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCursor((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth() - 1, 1)))
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() =>
                  setCursor((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1)))
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                title="Bulan Seterusnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <h2 className="ml-1 text-lg font-black tracking-tight text-gray-900">
                {MONTH_BM[cursor.getMonth()]}{" "}
                <span className="text-gray-400">{cursor.getFullYear()}</span>
              </h2>
            </div>

            {/* View Switcher & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    view === "list"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> Senarai
                </button>
                <button
                  type="button"
                  onClick={() => setView("calendar")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    view === "calendar"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" /> Kalendar
                </button>
                <button
                  type="button"
                  onClick={() => setView("schedules")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    view === "schedules"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" /> Jadual PM
                </button>
              </div>

              {/* Superadmin Import Action */}
              {data?.isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel
                </button>
              )}

              {/* Create Schedule Action */}
              <button
                type="button"
                onClick={() => openScheduleModal(null)}
                className="reminder-btn-glow flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
              >
                <Plus className="h-4 w-4" /> Jadual Baharu
              </button>
            </div>
          </div>

          {/* Bottom Row: Search and Filters */}
          <div className="grid gap-2 pt-2 border-t border-gray-100 sm:grid-cols-4">
            {/* Search Input */}
            <div className="relative sm:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari alat / PIC / arahan…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Equipment Filter */}
            <div>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-medium text-gray-700 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option value="ALL">Semua Equipment ({equipmentOptions.length})</option>
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            {/* PIC Filter */}
            <div>
              <select
                value={picFilter}
                onChange={(e) => setPicFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-medium text-gray-700 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option value="ALL">Semua PIC</option>
                {data?.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-medium text-gray-700 outline-none transition focus:border-indigo-500 focus:bg-white"
              >
                <option value="ALL">Semua Status</option>
                <option value="TODAY">Hari Ini</option>
                <option value="UPCOMING">Akan Datang</option>
                <option value="OVERDUE">Tertunggak</option>
                <option value="DONE">Selesai</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            <span>Memuatkan jadual SGMP-03…</span>
          </div>
        </div>
      ) : view === "list" ? (
        /* List View */
        <div className="space-y-3">
          {filteredOccurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <CalendarDays className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-bold text-gray-700">Tiada rekod pemeriksaan dijumpai</p>
              <p className="mt-1 text-xs text-gray-400">
                Cuba tukar tapisan atau pilih bulan lain pada navigasi di atas.
              </p>
            </div>
          ) : (
            <div className="reminder-stagger grid gap-3">
              {filteredOccurrences.map((occ) => {
                const status = pmStatus(occ, data?.today || "")
                const isCompleted = Boolean(occ.completedAt)
                const assignedPics = occ.picIds
                  .map((id) => userMap.get(id)?.name || id)
                  .filter(Boolean)

                return (
                  <div
                    key={occ.id}
                    onClick={() => openOccurrence(occ)}
                    className="group flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-indigo-100 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition">
                          {occ.equipment}
                        </span>
                        {occ.srs && (
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            SRS: {occ.srs}
                          </span>
                        )}
                        {/* Status Badge */}
                        <span
                          className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                            status === "DONE"
                              ? occ.result === "ISSUE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                              : status === "OVERDUE"
                              ? "bg-rose-100 text-rose-800"
                              : status === "TODAY"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {status === "DONE"
                            ? occ.result === "ISSUE"
                              ? "Ada Masalah"
                              : "Selesai (OK)"
                            : status === "OVERDUE"
                            ? "Tertunggak"
                            : status === "TODAY"
                            ? "Hari Ini"
                            : "Akan Datang"}
                        </span>
                      </div>

                      {/* Checklist instructions preview */}
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                        {occ.checklist.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="truncate">
                            {item}
                          </li>
                        ))}
                        {occ.checklist.length > 3 && (
                          <li className="text-gray-400 font-medium">
                            +{occ.checklist.length - 3} lagi arahan kerja
                          </li>
                        )}
                      </ul>

                      {/* PIC tags and inspection info */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-medium">
                          <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                          {assignedPics.join(", ") || "Tiada PIC"}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          Tarikh: <strong>{occ.dueDate}</strong>
                        </span>
                        {isCompleted && occ.inspectedDate && (
                          <span className="text-emerald-700">
                            Diperiksa: {occ.inspectedDate}
                            {occ.completedById && (
                              <> oleh {userMap.get(occ.completedById)?.name || occ.completedById}</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openOccurrence(occ)
                        }}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition ${
                          isCompleted
                            ? "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {isCompleted ? "Lihat Rekod" : "Rekod Pemeriksaan"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : view === "calendar" ? (
        /* Calendar Grid View */
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          {/* Day header */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50 text-center text-xs font-bold text-gray-500">
            {DAY_NAMES.map((name) => (
              <div key={name} className="py-2.5">
                {name}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {calendarDays.map((day, idx) => {
              const occurrences = occurrencesByDate.get(day.dateStr) || []
              const isToday = day.dateStr === (data?.today || "")

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-1.5 transition ${
                    day.isCurrentMonth ? "bg-white" : "bg-gray-50/30 text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-indigo-600 text-white shadow-sm"
                          : day.isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-400"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {occurrences.length > 0 && (
                      <span className="text-[10px] font-bold text-gray-400">
                        {occurrences.length}
                      </span>
                    )}
                  </div>

                  {/* Occurrence pills */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] reminder-scroll">
                    {occurrences.map((occ) => {
                      const status = pmStatus(occ, data?.today || "")
                      const isCompleted = Boolean(occ.completedAt)

                      return (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() => openOccurrence(occ)}
                          className={`reminder-pill w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-bold ${
                            isCompleted
                              ? occ.result === "ISSUE"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-emerald-100 text-emerald-900"
                              : status === "OVERDUE"
                              ? "bg-rose-100 text-rose-900"
                              : status === "TODAY"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-blue-100 text-blue-900"
                          }`}
                          title={`${occ.equipment} - ${occ.checklist.join(", ")}`}
                        >
                          {occ.equipment}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Schedules Management View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              Jadual Berulang Aktif & Diarkibkan ({data?.schedules.length || 0})
            </h3>
            <button
              type="button"
              onClick={() => openScheduleModal(null)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> Jadual Baharu
            </button>
          </div>

          <div className="grid gap-3">
            {data?.schedules.map((sched) => {
              const isArchived = Boolean(sched.archivedAt)
              const assignedPics = sched.picIds
                .map((id) => userMap.get(id)?.name || id)
                .filter(Boolean)

              return (
                <div
                  key={sched.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center ${
                    isArchived
                      ? "border-gray-200 bg-gray-50 opacity-75"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-gray-900">{sched.equipment}</span>
                      {sched.srs && (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          SRS: {sched.srs}
                        </span>
                      )}
                      <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        {ruleLabel(sched)}
                      </span>
                      {isArchived && (
                        <span className="rounded-lg bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
                          Diarkibkan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      <strong>Checklist:</strong> {sched.checklist.join(" · ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      <strong>PIC:</strong> {assignedPics.join(", ") || "Tiada"} |{" "}
                      <strong>Mula:</strong> {sched.startDate} | <strong>Aktif:</strong>{" "}
                      {sched.activationDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isArchived && (
                      <>
                        <button
                          type="button"
                          onClick={() => openScheduleModal(sched)}
                          className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveSchedule(sched)}
                          className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                        >
                          <Archive className="h-3 w-3" /> Arkib
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Task Completion / Detail Modal */}
      {selectedOccurrence && (
        <ModalShell open={Boolean(selectedOccurrence)} onClose={closeOccurrence} maxWidth="max-w-xl">
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  SGMP-03 Preventive Maintenance
                </span>
                <h3 className="text-xl font-black text-gray-900">
                  {selectedOccurrence.equipment}
                </h3>
                {selectedOccurrence.srs && (
                  <p className="text-xs font-semibold text-gray-500">
                    SRS Number: {selectedOccurrence.srs}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeOccurrence}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Task Info Summary */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-4 text-xs">
              <div>
                <span className="text-gray-400 font-medium">Tarikh Jadual:</span>
                <p className="font-bold text-gray-800">{selectedOccurrence.dueDate}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Status Semasa:</span>
                <p className="font-bold text-gray-800">
                  {pmStatus(selectedOccurrence, data?.today || "")}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 font-medium">PIC Ditugaskan:</span>
                <p className="font-bold text-gray-800">
                  {selectedOccurrence.picIds
                    .map((id) => userMap.get(id)?.name || id)
                    .join(", ") || "Tiada"}
                </p>
              </div>
            </div>

            {/* Checklist items */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Arahan Kerja / Checklist Pemeriksaan
              </h4>
              <ul className="space-y-1.5 rounded-2xl border border-gray-200 bg-white p-3.5 text-xs text-gray-700">
                {selectedOccurrence.checklist.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* If task is already completed */}
            {selectedOccurrence.completedAt ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      selectedOccurrence.result === "ISSUE"
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  />
                  <h4 className="text-sm font-bold text-gray-900">
                    Pemeriksaan Selesai Direkodkan
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div>
                    <span className="text-gray-500">Keputusan:</span>{" "}
                    <strong>
                      {selectedOccurrence.result === "ISSUE" ? "Ada Masalah" : "OK (Memuaskan)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Tarikh Pemeriksaan:</span>{" "}
                    <strong>{selectedOccurrence.inspectedDate || "-"}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Direkodkan Oleh:</span>{" "}
                    <strong>
                      {selectedOccurrence.completedById
                        ? userMap.get(selectedOccurrence.completedById)?.name ||
                          selectedOccurrence.completedById
                        : "-"}
                    </strong>
                  </div>
                  {selectedOccurrence.notes && (
                    <div className="col-span-2 pt-1 border-t border-emerald-100">
                      <span className="text-gray-500">Catatan:</span>
                      <p className="mt-0.5 text-gray-800">{selectedOccurrence.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If task is NOT completed yet */
              <div className="space-y-4 pt-2">
                {canCompletePM(
                  {
                    userId: data?.userId || "",
                    isSuperAdmin: Boolean(data?.isSuperAdmin),
                  },
                  selectedOccurrence.picIds
                ) ? (
                  <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                    <h4 className="text-sm font-bold text-gray-900">
                      Borang Rekod Pemeriksaan
                    </h4>

                    {completionError && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
                      >
                        {completionError}
                      </p>
                    )}

                    {/* Result buttons: OK vs Ada Masalah */}
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-700">
                        Keputusan Pemeriksaan *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCompletionResult("OK")}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                            completionResult === "OK"
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" /> OK (Tiada Masalah)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompletionResult("ISSUE")}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                            completionResult === "ISSUE"
                              ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4" /> Ada Masalah
                        </button>
                      </div>
                    </div>

                    {/* Inspected Date */}
                    <div>
                      <label className="block mb-1 text-xs font-bold text-gray-700">
                        Tarikh Pemeriksaan *
                      </label>
                      <input
                        type="date"
                        value={completionDate}
                        max={data?.today}
                        min={selectedOccurrence.schedule?.activationDate || "2026-01-01"}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className={fieldClass}
                      />
                    </div>

                    {/* Notes textarea */}
                    <div>
                      <label className="block mb-1 text-xs font-bold text-gray-700">
                        Catatan Pemeriksaan{" "}
                        {completionResult === "ISSUE" ? (
                          <span className="text-red-600 font-bold">* (Wajib diisi)</span>
                        ) : (
                          <span className="text-gray-400">(Pilihan)</span>
                        )}
                      </label>
                      <textarea
                        rows={3}
                        value={completionNotes}
                        maxLength={5000}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder={
                          completionResult === "ISSUE"
                            ? "Sila nyatakan kerosakan atau masalah yang dijumpai..."
                            : "Catatan tambahan jika ada..."
                        }
                        className={fieldClass}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleComplete}
                      className={`w-full ${buttonClass} flex items-center justify-center gap-2`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
                        </>
                      ) : (
                        "Sahkan & Rekod Pemeriksaan"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                    <p className="font-bold">Akses Terhad</p>
                    <p className="mt-0.5">
                      Hanya PIC yang ditugaskan atau Superadmin dibenarkan merekod pemeriksaan untuk tugasan ini.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Schedule Create / Edit Modal */}
      {scheduleModal.open && (
        <ModalShell
          open={scheduleModal.open}
          onClose={() => setScheduleModal({ open: false, schedule: null })}
          maxWidth="max-w-2xl"
        >
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  {scheduleModal.schedule ? "Edit Jadual PM" : "Cipta Jadual PM Baharu"}
                </h3>
                <p className="text-xs text-gray-500">
                  Pengubahsuaian jadual hanya akan mempengaruhi ulangan masa hadapan yang belum selesai.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModal({ open: false, schedule: null })}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {scheduleError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
              >
                {scheduleError}
              </p>
            )}

            <PMFields
              value={scheduleForm}
              users={data?.users || []}
              onChange={setScheduleForm}
            />

            {!scheduleModal.schedule && (
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Tarikh Pengaktifan Jadual
                </label>
                <input
                  type="date"
                  min={data?.today}
                  value={scheduleActivation}
                  onChange={(e) => setScheduleActivation(e.target.value)}
                  className={fieldClass}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setScheduleModal({ open: false, schedule: null })}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingSchedule}
                onClick={handleSaveSchedule}
                className={buttonClass}
              >
                {savingSchedule ? "Menyimpan…" : "Simpan Jadual"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Superadmin PM Import Modal */}
      {showImportModal && data?.isSuperAdmin && (
        <ModalShell
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          maxWidth="max-w-4xl"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-xl font-black text-gray-900">
                  Import Jadual SGMP-03 (Excel)
                </h3>
                <p className="text-xs text-gray-500">
                  Muat naik fail Excel jadual maintenance untuk mempratonton kumpulan, padankan PIC, dan aktifkan jadual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <PMImport
              users={data.users}
              today={data.today}
              schedules={data.schedules}
              onDone={() => {
                setShowImportModal(false)
                flash({ kind: "ok", text: "Import SGMP-03 berjaya diaktifkan." })
                loadData()
              }}
            />
          </div>
        </ModalShell>
      )}
    </div>
  )
}

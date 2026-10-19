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
  FileText,
  FilePenLine,
  Trash2,
  Lock,
  Send,
  Zap,
  UserCheck,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { ExportPMModal } from "./ExportPMModal"
import "../RemindersCSS.css"
import { ModalShell } from "../ModalShell"
import { PMFields, PICPicker, buttonClass, fieldClass } from "./PMFields"
import {
  getPMData,
  assignPMPic,
  completePMOccurrence,
  savePMSchedule,
  archivePMSchedule,
  unarchivePMSchedule,
  simulatePMTaskReminderAction,
  updatePMOccurrenceWork,
} from "@/app/actions/reminder-pm"
import {
  canCompletePM,
  pmStatus,
  ruleLabel,
  mytDate,
  type PMInput,
  type PMRule,
  type PMUser,
} from "@/lib/reminders/pm-core"

const MONTH_NAMES = [
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

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

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
      return "Database error: Preventive Maintenance tables have not been created or migrations have not run."
    }
    return msg
  }
  return "An unexpected error occurred. Please try again."
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
  const [scheduleArchiveTab, setScheduleArchiveTab] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE")

  // Mobile-specific UX state
  const [selectedDayDate, setSelectedDayDate] = useState<string>("")
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const [quickFilter, setQuickFilter] = useState<"ALL" | "TODAY" | "MY_TASKS" | "OVERDUE">("ALL")

  // Modals
  const [selectedOccurrence, setSelectedOccurrence] = useState<PMOccurrence | null>(null)
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean
    schedule: PMSchedule | null
  }>({ open: false, schedule: null })

  // Completion Form state
  const [completionResult, setCompletionResult] = useState<"OK" | "ISSUE">("OK")
  const [completionNotes, setCompletionNotes] = useState("")
  const [completionDate, setCompletionDate] = useState("")
  const [completedChecklist, setCompletedChecklist] = useState<string[]>([])
  const [performedSignature, setPerformedSignature] = useState<string | null>(null)
  const [completionError, setCompletionError] = useState("")
  const [submitting, startSubmitting] = useTransition()

  // SuperAdmin Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState<{ success: boolean; message: string } | null>(null)

  // Task PIC Assignment state
  const [isEditingTaskPic, setIsEditingTaskPic] = useState(false)
  const [taskPicIds, setTaskPicIds] = useState<string[]>([])
  const [applyToFutureSchedules, setApplyToFutureSchedules] = useState(false)
  const [isSavingPic, setIsSavingPic] = useState(false)

  // Task Work Checklist Editing state
  const [isEditingWork, setIsEditingWork] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<string[]>([])
  const [applyWorkToFuture, setApplyWorkToFuture] = useState(false)
  const [isSavingWork, setIsSavingWork] = useState(false)
  const [workEditError, setWorkEditError] = useState("")

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

  const [rangeMode, setRangeMode] = useState<"month" | "year">("month")
  const [exportingType, setExportingType] = useState<"pdf" | "excel" | null>(null)
  const [exportModal, setExportModal] = useState<{ open: boolean; format: "pdf" | "excel" }>({
    open: false,
    format: "pdf",
  })

  // Calculate boundaries for data fetch
  const { fromDate, toDate } = useMemo(() => {
    const year = cursor.getFullYear()
    if (rangeMode === "year") {
      const start = new Date(Date.UTC(year, 0, 1))
      const end = new Date(Date.UTC(year, 11, 31))
      return {
        fromDate: start.toISOString().slice(0, 10),
        toDate: end.toISOString().slice(0, 10),
      }
    }
    const month = cursor.getMonth()
    const start = new Date(Date.UTC(year, month, 1))
    const end = new Date(Date.UTC(year, month + 1, 0))
    return {
      fromDate: start.toISOString().slice(0, 10),
      toDate: end.toISOString().slice(0, 10),
    }
  }, [cursor, rangeMode])

  // Handle PDF / Excel Export
  const handleExport = async (type: "pdf" | "excel") => {
    try {
      setExportingType(type)
      const params = new URLSearchParams()
      params.set("from", fromDate)
      params.set("to", toDate)
      if (equipmentFilter && equipmentFilter !== "ALL") {
        params.set("equipment", equipmentFilter)
      }
      if (statusFilter && statusFilter !== "ALL") {
        params.set("status", statusFilter)
      }

      const res = await fetch(`/api/reminders/pm/export/${type}?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Failed to export ${type.toUpperCase()}.`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition")
      let filename = `PM_Audit_Report_SGMP03_${fromDate}_to_${toDate}.${type === "pdf" ? "pdf" : "xlsx"}`
      if (disposition && disposition.includes("filename=")) {
        const match = /filename="?([^"]+)"?/.exec(disposition)
        if (match?.[1]) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      flash({ kind: "ok", text: `${type.toUpperCase()} file successfully downloaded.` })
    } catch (err) {
      flash({ kind: "err", text: sanitizeError(err) })
    } finally {
      setExportingType(null)
    }
  }

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

  // Synchronize mobile selected day with month cursor and current date
  useEffect(() => {
    const todayStr = data?.today || mytDate()
    const cursorYear = cursor.getFullYear()
    const cursorMonth = cursor.getMonth()
    const todayYear = Number(todayStr.slice(0, 4))
    const todayMonth = Number(todayStr.slice(5, 7)) - 1

    if (cursorYear === todayYear && cursorMonth === todayMonth) {
      setSelectedDayDate(todayStr)
    } else {
      setSelectedDayDate(`${cursorYear}-${String(cursorMonth + 1).padStart(2, "0")}-01`)
    }
  }, [cursor, data?.today])

  // Open occurrence modal and sync URL
  const openOccurrence = (occ: PMOccurrence) => {
    setSelectedOccurrence(occ)
    setCompletionResult(occ.result === "ISSUE" ? "ISSUE" : "OK")
    setCompletionNotes(occ.notes || "")
    setCompletionDate(occ.inspectedDate || (data ? data.today : new Date().toISOString().slice(0, 10)))
    setCompletedChecklist(occ.completedChecklist && occ.completedChecklist.length > 0 ? occ.completedChecklist : [])
    setPerformedSignature(occ.performedSignature || null)
    setCompletionError("")
    setSimulationResult(null)
    setTaskPicIds(occ.picIds || [])
    setIsEditingTaskPic(false)
    setApplyToFutureSchedules(false)
    setIsEditingWork(false)
    setEditingChecklist(occ.checklist ? [...occ.checklist] : [""])
    setApplyWorkToFuture(false)
    setWorkEditError("")

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
    setCompletedChecklist([])
    setPerformedSignature(null)
    setCompletionError("")
    setSimulationResult(null)
    setIsEditingTaskPic(false)
    setIsEditingWork(false)
    setWorkEditError("")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("occurrence")
      window.history.replaceState(null, "", url)
    }
  }

  // Handle task PIC assignment save
  const handleSaveTaskPic = async () => {
    if (!selectedOccurrence) return
    setIsSavingPic(true)
    try {
      await assignPMPic(selectedOccurrence.id, taskPicIds, applyToFutureSchedules)
      flash({ kind: "ok", text: "PIC successfully updated for this task." })
      setIsEditingTaskPic(false)
      setSelectedOccurrence((prev) => (prev ? { ...prev, picIds: taskPicIds } : null))
      await loadData()
    } catch (err) {
      flash({ kind: "err", text: sanitizeError(err) })
    } finally {
      setIsSavingPic(false)
    }
  }

  // Handle task work checklist editing save
  const handleSaveWorkChecklist = async () => {
    if (!selectedOccurrence) return
    const filtered = editingChecklist.map((c) => c.trim()).filter(Boolean)
    if (!filtered.length) {
      setWorkEditError("Please enter at least one valid work instruction.")
      return
    }

    setIsSavingWork(true)
    setWorkEditError("")
    try {
      await updatePMOccurrenceWork(selectedOccurrence.id, filtered, applyWorkToFuture)
      setSelectedOccurrence((prev) => (prev ? { ...prev, checklist: filtered } : null))
      setIsEditingWork(false)
      flash({
        kind: "ok",
        text: applyWorkToFuture
          ? "Work instructions updated for this task and future occurrences."
          : "Work instructions updated for this task.",
      })
      await loadData()
    } catch (err) {
      setWorkEditError(sanitizeError(err))
    } finally {
      setIsSavingWork(false)
    }
  }

  // Handle SuperAdmin Task Reminder Simulation
  const handleSimulateReminder = async (occurrenceId: string) => {
    setIsSimulating(true)
    setSimulationResult(null)
    try {
      const res = await simulatePMTaskReminderAction(occurrenceId)
      if (res.success) {
        let msg = `🎉 Simulation Successful!\n✉️ Email & Google Calendar invite sent to: ${(res.recipients || []).join(", ")}.`
        if (res.telegramSent) {
          msg += `\n🤖 Telegram Bot notification also successfully broadcasted to plant operations group!`
        } else if (res.telegramError) {
          msg += `\n⚠️ Telegram: ${res.telegramError}`
        }
        setSimulationResult({
          success: true,
          message: msg,
        })
      } else {
        setSimulationResult({
          success: false,
          message: `❌ Simulation Failed: ${res.error || "Unknown error"}`,
        })
      }
    } catch (err: any) {
      setSimulationResult({
        success: false,
        message: `❌ Error: ${err.message || String(err)}`,
      })
    } finally {
      setIsSimulating(false)
    }
  }

  // Handle task completion submit
  const handleComplete = () => {
    if (!selectedOccurrence) return
    setCompletionError("")

    if (completionResult === "ISSUE" && !completionNotes.trim()) {
      setCompletionError("Remarks are required when an issue is reported.")
      return
    }

    if (completionResult === "OK") {
      const allChecked = selectedOccurrence.checklist.every((item) =>
        completedChecklist.includes(item)
      )
      if (!allChecked) {
        setCompletionError(
          "All checklist items must be completed for an OK result. If any item cannot be completed, select 'Issue Reported' and provide remarks."
        )
        return
      }
    }

    if (!performedSignature || !performedSignature.trim()) {
      setCompletionError("Please sign (Checked By) before confirming the inspection.")
      return
    }

    startSubmitting(async () => {
      try {
        await completePMOccurrence(
          selectedOccurrence.id,
          completionResult,
          completionNotes,
          completionDate,
          performedSignature,
          completedChecklist
        )
        flash({ kind: "ok", text: "Inspection successfully recorded." })
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
      setScheduleError("Equipment name is required.")
      return
    }
    if (!filteredChecklist.length) {
      setScheduleError("Please provide at least one work instruction / checklist item.")
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
            ? "Schedule successfully updated."
            : "New schedule successfully created.",
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
        `Are you sure you want to archive schedule "${sched.equipment}"? Uncompleted future occurrences will be discontinued, but historical records will be preserved.`
      )
    ) {
      return
    }

    startSavingSchedule(async () => {
      try {
        await archivePMSchedule(sched.id)
        flash({ kind: "ok", text: `Schedule "${sched.equipment}" has been archived.` })
        await loadData()
      } catch (err) {
        flash({ kind: "err", text: sanitizeError(err) })
      }
    })
  }

  // Handle Schedule Unarchive / Restore
  const handleUnarchiveSchedule = (sched: PMSchedule) => {
    if (
      !window.confirm(
        `Are you sure you want to restore schedule "${sched.equipment}"? Future occurrences will be regenerated according to its frequency rule.`
      )
    ) {
      return
    }

    startSavingSchedule(async () => {
      try {
        await unarchivePMSchedule(sched.id)
        flash({ kind: "ok", text: `Schedule "${sched.equipment}" has been restored and reactivated.` })
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

      // Quick Filter (Mobile 1-Tap Chips)
      if (quickFilter === "TODAY" && occ.dueDate !== today) return false
      if (quickFilter === "MY_TASKS" && (!data.userId || !occ.picIds.includes(data.userId))) return false
      if (quickFilter === "OVERDUE" && status !== "OVERDUE") return false

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
  }, [data, quickFilter, statusFilter, equipmentFilter, picFilter, searchQuery, userMap])

  // Occurrences for the selected day in mobile agenda
  const selectedDayOccurrences = useMemo(() => {
    if (!selectedDayDate) return []
    return filteredOccurrences.filter((occ) => occ.dueDate === selectedDayDate)
  }, [filteredOccurrences, selectedDayDate])

  const selectedDayDateFormatted = useMemo(() => {
    if (!selectedDayDate) return ""
    const [y, m, d] = selectedDayDate.split("-").map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
  }, [selectedDayDate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count++
    if (equipmentFilter !== "ALL") count++
    if (picFilter !== "ALL") count++
    if (statusFilter !== "ALL") count++
    if (quickFilter !== "ALL") count++
    return count
  }, [searchQuery, equipmentFilter, picFilter, statusFilter, quickFilter])

  // Schedule counts for status tabs
  const scheduleCounts = useMemo(() => {
    if (!data?.schedules) return { active: 0, archived: 0, all: 0 }
    let active = 0
    let archived = 0
    for (const s of data.schedules) {
      if (s.archivedAt) archived++
      else active++
    }
    return { active, archived, all: data.schedules.length }
  }, [data?.schedules])

  // Filtered recurring schedules (for Schedules view)
  const filteredSchedules = useMemo(() => {
    if (!data?.schedules) return []
    return data.schedules.filter((sched) => {
      // Archive tab filter
      if (scheduleArchiveTab === "ACTIVE" && sched.archivedAt) return false
      if (scheduleArchiveTab === "ARCHIVED" && !sched.archivedAt) return false

      // Equipment filter
      if (equipmentFilter !== "ALL" && sched.equipment !== equipmentFilter) return false

      // PIC filter
      if (picFilter !== "ALL" && !sched.picIds.includes(picFilter)) return false

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchEquip = sched.equipment.toLowerCase().includes(query)
        const matchSrs = sched.srs ? sched.srs.toLowerCase().includes(query) : false
        const matchChecklist = sched.checklist.some((c) => c.toLowerCase().includes(query))
        const matchPic = sched.picIds.some((id) => {
          const u = userMap.get(id)
          return u ? u.name.toLowerCase().includes(query) : false
        })
        if (!matchEquip && !matchSrs && !matchChecklist && !matchPic) return false
      }

      return true
    })
  }, [data?.schedules, scheduleArchiveTab, equipmentFilter, picFilter, searchQuery, userMap])

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

  // Current month days without padding (for mobile agenda strip)
  const currentMonthDays = useMemo(() => {
    return calendarDays.filter((d) => d.isCurrentMonth)
  }, [calendarDays])

  // Dynamic weekly count for Monday-to-Sunday weekly printouts
  const monthWeeks = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(Date.UTC(year, month, 1))
    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const mondayOffset = (firstDay.getUTCDay() + 6) % 7
    const count = Math.ceil((mondayOffset + totalDays) / 7)
    return Array.from({ length: count }, (_, i) => i + 1)
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
      {/* Module Title Banner */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 text-white shadow-sm shadow-indigo-200">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              PMC — Preventive Maintenance Calendar
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              SOP SGMP-03 &bull; Equipment maintenance schedules, weekend routines &amp; audit sign-offs
            </p>
          </div>
        </div>
      </div>

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
            label: "Today",
            value: stats.today,
            icon: Clock,
            gradient: "from-amber-500 to-amber-600",
            activeRing: statusFilter === "TODAY" ? "ring-2 ring-amber-500" : "",
          },
          {
            key: "UPCOMING",
            label: "Upcoming",
            value: stats.upcoming,
            icon: CalendarIcon,
            gradient: "from-blue-500 to-indigo-600",
            activeRing: statusFilter === "UPCOMING" ? "ring-2 ring-blue-500" : "",
          },
          {
            key: "OVERDUE",
            label: "Overdue",
            value: stats.overdue,
            icon: AlertTriangle,
            gradient: "from-rose-500 to-red-600",
            activeRing: statusFilter === "OVERDUE" ? "ring-2 ring-rose-500" : "",
          },
          {
            key: "DONE",
            label: "Completed",
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

      {/* Mobile Toolbar (md:hidden) */}
      <div className="md:hidden space-y-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-xs">
        {/* Row 1: Month navigation & View switch */}
        <div className="flex items-center justify-between gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setCursor((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth() - 1, 1)))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-1 text-center min-w-[100px]">
              <span className="block text-xs font-black text-gray-900 leading-tight">
                {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setCursor((d) => new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1)))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* View switcher */}
          <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "calendar"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Agenda
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "list"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("schedules")}
              className={`rounded-md px-2.5 py-1 transition ${
                view === "schedules"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Schedules
            </button>
          </div>
        </div>

        {/* Row 2: 1-Tap Quick Filter Chips & Filter Drawer Trigger */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x flex-1">
            <button
              type="button"
              onClick={() => setQuickFilter("ALL")}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                quickFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({filteredOccurrences.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter((prev) => (prev === "TODAY" ? "ALL" : "TODAY"))}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 ${
                quickFilter === "TODAY"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}
            >
              <Zap className="h-3 w-3" /> Today ({stats.today})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter((prev) => (prev === "MY_TASKS" ? "ALL" : "MY_TASKS"))}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 ${
                quickFilter === "MY_TASKS"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
              }`}
            >
              <UserIcon className="h-3 w-3" /> My Tasks
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter((prev) => (prev === "OVERDUE" ? "ALL" : "OVERDUE"))}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1 ${
                quickFilter === "OVERDUE"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 border border-rose-200/60"
              }`}
            >
              <AlertTriangle className="h-3 w-3" /> Overdue ({stats.overdue})
            </button>
          </div>

          {/* Filter & Export Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-700 shrink-0 hover:bg-gray-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-500" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Main Toolbar (hidden md:block) */}
      <div className="hidden md:block rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Top Row: Month navigation, Views, Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Range and Month selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setRangeMode("month")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    rangeMode === "month"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode("year")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    rangeMode === "year"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Year
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setCursor((d) =>
                      rangeMode === "year"
                        ? new Date(Date.UTC(d.getFullYear() - 1, 0, 1))
                        : new Date(Date.UTC(d.getFullYear(), d.getMonth() - 1, 1))
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                  title={rangeMode === "year" ? "Previous Year" : "Previous Month"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCursor(new Date())}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                >
                  Current
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCursor((d) =>
                      rangeMode === "year"
                        ? new Date(Date.UTC(d.getFullYear() + 1, 0, 1))
                        : new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1))
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
                  title={rangeMode === "year" ? "Next Year" : "Next Month"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5 ml-1">
                  {rangeMode === "month" && (
                    <select
                      value={cursor.getMonth()}
                      onChange={(e) => {
                        const m = parseInt(e.target.value, 10)
                        setCursor((d) => new Date(Date.UTC(d.getFullYear(), m, 1)))
                      }}
                      aria-label="Select Month"
                      className="cursor-pointer rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-black text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hover:border-gray-300"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <select
                    value={cursor.getFullYear()}
                    onChange={(e) => {
                      const y = parseInt(e.target.value, 10)
                      setCursor((d) => new Date(Date.UTC(y, rangeMode === "year" ? 0 : d.getMonth(), 1)))
                    }}
                    aria-label="Select Year"
                    className="cursor-pointer rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-black text-indigo-600 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hover:border-gray-300"
                  >
                    {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                  <List className="h-3.5 w-3.5" /> List
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
                  <CalendarDays className="h-3.5 w-3.5" /> Calendar
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
                  <Wrench className="h-3.5 w-3.5" /> PM Schedules
                </button>
              </div>

              {/* Export Actions */}
              <button
                type="button"
                onClick={() => setExportModal({ open: true, format: "pdf" })}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                title="Export Audit Report PDF (A4 Portrait, Cover Page, TOC, AI Summary & Sign-offs)"
              >
                <FileText className="h-3.5 w-3.5" />
                Export PDF
              </button>

              <button
                type="button"
                onClick={() => setExportModal({ open: true, format: "excel" })}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                title="Export Excel File (Multi-tab: SGMP-03 Original, Detailed Log, Sign-offs & Calendar Matrix)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export Excel
              </button>

              {/* Summary / Verification Link */}
              <Link
                href="/reminders/summary"
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 shadow-sm"
                title="View Inspection Summary & Supervisor Verification"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                Summary &amp; Verification
              </Link>

              {/* Create Schedule Action */}
              <button
                type="button"
                onClick={() => openScheduleModal(null)}
                className="reminder-btn-glow flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700"
              >
                <Plus className="h-4 w-4" /> New Schedule
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
                placeholder="Search equipment, SRS, PIC, checklist..."
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
                <option value="ALL">All Equipment ({equipmentOptions.length})</option>
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
                <option value="ALL">All PICs</option>
                {data?.users
                  .filter((u) => u.eligible)
                  .map((u) => (
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
                <option value="ALL">All Statuses</option>
                <option value="TODAY">Today</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="OVERDUE">Overdue</option>
                <option value="DONE">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter & Export Sheet */}
      {isMobileFilterOpen && (
        <ModalShell open={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} maxWidth="max-w-md">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                <h3 className="text-base font-black text-gray-900">Filters &amp; Exports</h3>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Search Keywords</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment, SRS, checklist..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Equipment Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Equipment / Zone</label>
              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Equipment ({equipmentOptions.length})</option>
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            {/* PIC Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Assigned PIC</label>
              <select
                value={picFilter}
                onChange={(e) => setPicFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All PICs</option>
                {data?.users.filter((u) => u.eligible).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Inspection Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODAY">Today</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="OVERDUE">Overdue</option>
                <option value="DONE">Completed</option>
              </select>
            </div>

            {/* Reset Filters */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setEquipmentFilter("ALL")
                  setPicFilter("ALL")
                  setStatusFilter("ALL")
                  setQuickFilter("ALL")
                }}
                className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                Reset All Filters
              </button>
            )}

            {/* Export & Actions Section */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Actions &amp; Reports</label>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`/api/reminders/pm/export/calendar-pdf?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}&view=month`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <FileText className="h-3.5 w-3.5" /> 1-Page PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileFilterOpen(false)
                    setExportModal({ open: true, format: "pdf" })
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <FileText className="h-3.5 w-3.5" /> Detailed PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileFilterOpen(false)
                    setExportModal({ open: true, format: "excel" })
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
                </button>
                <Link
                  href="/reminders/summary"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Summary
                </Link>
              </div>

              {/* Weekly Wall PDFs */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                  Weekly Wall PDFs (Mon – Sun):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {monthWeeks.map((wk) => (
                    <a
                      key={wk}
                      href={`/api/reminders/pm/export/calendar-pdf?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}&view=week&week=${wk}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[42px] py-1 text-center rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs hover:bg-indigo-50 hover:text-indigo-700"
                      title={`Export 1-Page Detailed Work Sheet for Week ${wk} (Monday to Sunday)`}
                    >
                      W{wk}
                    </a>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileFilterOpen(false)
                  openScheduleModal(null)
                }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" /> Create New Schedule
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
            >
              Apply &amp; View ({filteredOccurrences.length} Tasks)
            </button>
          </div>
        </ModalShell>
      )}

      {/* Main Content Areas */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            <span>Loading SGMP-03 PM schedules…</span>
          </div>
        </div>
      ) : view === "list" ? (
        /* List View */
        <div className="space-y-3">
          {filteredOccurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <CalendarDays className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-bold text-gray-700">No inspection records found</p>
              <p className="mt-1 text-xs text-gray-400">
                Try adjusting filters or selecting another month in the navigation above.
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
                              ? "Issue Reported"
                              : "Completed (OK)"
                            : status === "OVERDUE"
                            ? "Overdue"
                            : status === "TODAY"
                            ? "Today"
                            : "Upcoming"}
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
                            +{occ.checklist.length - 3} more work instructions
                          </li>
                        )}
                      </ul>

                      {/* PIC tags and inspection info */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-medium">
                          <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                          {assignedPics.join(", ") || "No PIC"}
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          Date: <strong>{occ.dueDate}</strong>
                        </span>
                        {isCompleted && occ.inspectedDate && (
                          <span className="text-emerald-700">
                            Inspected: {occ.inspectedDate}
                            {occ.completedById && (
                              <> by {userMap.get(occ.completedById)?.name || occ.completedById}</>
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
                        {isCompleted ? "View Record" : "Record Inspection"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : view === "calendar" ? (
        <>
          {/* MOBILE AGENDA DAY STRIP & TASK FEED (md:hidden) */}
          <div className="md:hidden space-y-3">
            {/* 1. Date Carousel Header & Horizontal Day Strip */}
            <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold text-gray-800">
                  {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = data?.today || new Date().toISOString().slice(0, 10)
                      setSelectedDayDate(todayStr)
                      const [y, m] = todayStr.split("-").map(Number)
                      setCursor(new Date(Date.UTC(y, m - 1, 1)))
                    }}
                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    Today
                  </button>
                  <a
                    href={`/api/reminders/pm/export/calendar-pdf?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}&view=month`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100"
                    title="Export 1-Page PDF"
                  >
                    <FileText className="h-3 w-3 text-indigo-600" /> PDF
                  </a>
                </div>
              </div>

              {/* Horizontal Scrollable Day Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x py-1">
                {currentMonthDays.map((day) => {
                  const isSelected = day.dateStr === selectedDayDate
                  const isToday = day.dateStr === (data?.today || "")
                  const occs = occurrencesByDate.get(day.dateStr) || []

                  // Status indicators
                  const hasOverdue = occs.some((o) => pmStatus(o, data?.today || "") === "OVERDUE")
                  const hasIssue = occs.some((o) => o.result === "ISSUE")
                  const allDone = occs.length > 0 && occs.every((o) => Boolean(o.completedAt))
                  const hasPending = occs.length > 0 && !allDone

                  const [y, m, d] = day.dateStr.split("-").map(Number)
                  const dayOfWeek = DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]

                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDayDate(day.dateStr)}
                      className={`flex flex-col items-center justify-between min-w-[50px] w-[50px] h-[68px] py-1.5 px-1 rounded-xl transition-all shrink-0 active:scale-95 ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 font-bold"
                          : isToday
                          ? "bg-indigo-50 border border-indigo-200 text-indigo-900"
                          : "bg-gray-50/80 border border-gray-100 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span
                        className={`text-[10px] uppercase font-bold tracking-tight ${
                          isSelected ? "text-indigo-100" : "text-gray-400"
                        }`}
                      >
                        {dayOfWeek}
                      </span>
                      <span
                        className={`text-base font-black leading-none ${
                          isSelected ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {/* Dots / badge container */}
                      <div className="flex items-center justify-center gap-0.5 h-3">
                        {occs.length === 0 ? (
                          <span
                            className={`h-1 w-1 rounded-full ${
                              isSelected ? "bg-indigo-400/60" : "bg-transparent"
                            }`}
                          />
                        ) : (
                          <>
                            {hasOverdue && (
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-1 ring-white" />
                            )}
                            {hasIssue && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ring-1 ring-white" />
                            )}
                            {allDone && !hasIssue && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                            )}
                            {hasPending && !hasOverdue && !hasIssue && (
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isSelected ? "bg-white" : "bg-indigo-500"
                                }`}
                              />
                            )}
                            {occs.length > 1 && (
                              <span
                                className={`text-[9px] font-black leading-none ml-0.5 ${
                                  isSelected ? "text-indigo-200" : "text-gray-500"
                                }`}
                              >
                                {occs.length}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Selected Day Task Feed */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-gray-900">
                    {selectedDayDateFormatted || selectedDayDate}
                  </h3>
                  {selectedDayDate === data?.today && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Today
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-gray-500">
                  {selectedDayOccurrences.length}{" "}
                  {selectedDayOccurrences.length === 1 ? "task" : "tasks"}
                </span>
              </div>

              {selectedDayOccurrences.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-xs">
                  <CalendarDays className="h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-xs font-bold text-gray-700">No PM tasks for this day</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Swipe the day strip above or tap another day to inspect tasks.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {selectedDayOccurrences.map((occ) => {
                    const status = pmStatus(occ, data?.today || "")
                    const isCompleted = Boolean(occ.completedAt)
                    const assignedPics = occ.picIds
                      .map((id) => userMap.get(id)?.name || id)
                      .filter(Boolean)

                    return (
                      <div
                        key={occ.id}
                        onClick={() => openOccurrence(occ)}
                        className="group flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xs transition hover:border-indigo-100 active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition">
                                {occ.equipment}
                              </span>
                              {occ.srs && (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  {occ.srs}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
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
                                ? "Issue"
                                : "Done (OK)"
                              : status === "OVERDUE"
                              ? "Overdue"
                              : status === "TODAY"
                              ? "Today"
                              : "Upcoming"}
                          </span>
                        </div>

                        {/* Checklist items preview */}
                        <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                          {occ.checklist.slice(0, 2).map((item, idx) => (
                            <li key={idx} className="truncate">
                              {item}
                            </li>
                          ))}
                          {occ.checklist.length > 2 && (
                            <li className="text-[11px] text-gray-400 font-medium">
                              +{occ.checklist.length - 2} more instructions
                            </li>
                          )}
                        </ul>

                        {/* PIC and Action button row */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <UserIcon className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{assignedPics.join(", ") || "No PIC"}</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openOccurrence(occ)
                            }}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs transition ${
                              isCompleted
                                ? "border border-gray-200 bg-gray-50 text-gray-700"
                                : "bg-indigo-600 text-white hover:bg-indigo-700"
                            }`}
                          >
                            {isCompleted ? "View" : "Inspect"}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP CALENDAR GRID (hidden md:block) */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            {/* Calendar top bar with Print Wall Calendar buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-2.5">
              <span className="text-xs font-bold text-gray-700">
                Monthly Schedule &bull; {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/reminders/pm/export/calendar-pdf?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}&view=month`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 shadow-xs"
                  title="Export 1-Page A4 Landscape Monthly Calendar for Noticeboard"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Print Monthly Calendar (1 Page)
                </a>

                {/* Weekly Detail Print Buttons (Monday to Sunday) */}
                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-600 text-[11px]">Weekly 1-Page (Mon–Sun):</span>
                  {monthWeeks.map((wk) => (
                    <a
                      key={wk}
                      href={`/api/reminders/pm/export/calendar-pdf?year=${cursor.getFullYear()}&month=${cursor.getMonth() + 1}&view=week&week=${wk}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-md font-bold text-slate-700 hover:bg-white hover:text-indigo-600 hover:shadow-xs transition text-xs"
                      title={`Export 1-Page Detailed Work Sheet for Week ${wk} (Monday to Sunday)`}
                    >
                      W{wk}
                    </a>
                  ))}
                </div>
              </div>
            </div>

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
        </>
      ) : (
        /* Schedules Management View */
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                Recurring Schedules:
              </h3>
              <div className="flex items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setScheduleArchiveTab("ACTIVE")}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    scheduleArchiveTab === "ACTIVE"
                      ? "bg-white text-indigo-700 font-bold shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Active ({scheduleCounts.active})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleArchiveTab("ARCHIVED")}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    scheduleArchiveTab === "ARCHIVED"
                      ? "bg-white text-indigo-700 font-bold shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Archived ({scheduleCounts.archived})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleArchiveTab("ALL")}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    scheduleArchiveTab === "ALL"
                      ? "bg-white text-indigo-700 font-bold shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  All ({scheduleCounts.all})
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openScheduleModal(null)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" /> New Schedule
            </button>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <Wrench className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-bold text-gray-700">No recurring schedules match your search filters</p>
              <p className="mt-1 text-xs text-gray-400">
                Try clearing your search query or setting equipment and PIC filters to &quot;All&quot;.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredSchedules.map((sched) => {
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
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        <strong>Checklist:</strong> {sched.checklist.join(" · ")}
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>PIC:</strong> {assignedPics.join(", ") || "None"} |{" "}
                        <strong>Start:</strong> {sched.startDate} | <strong>Activated:</strong>{" "}
                        {sched.activationDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isArchived ? (
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
                            <Archive className="h-3 w-3" /> Archive
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUnarchiveSchedule(sched)}
                          className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                        >
                          <RotateCcw className="h-3 w-3" /> Restore
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
                <span className="text-gray-400 font-medium">Scheduled Date:</span>
                <p className="font-bold text-gray-800">{selectedOccurrence.dueDate}</p>
              </div>
              <div>
                <span className="text-gray-400 font-medium">Current Status:</span>
                <p className="font-bold text-gray-800">
                  {pmStatus(selectedOccurrence, data?.today || "")}
                </p>
              </div>
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">Assigned PIC:</span>
                  {data?.canAssignPic && !selectedOccurrence.completedAt && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTaskPic(!isEditingTaskPic)}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {isEditingTaskPic ? "Close Picker" : "Change / Assign PIC"}
                    </button>
                  )}
                </div>

                {!isEditingTaskPic ? (
                  <p className="font-bold text-gray-800">
                    {selectedOccurrence.picIds
                      .map((id) => userMap.get(id)?.name || id)
                      .join(", ") || (
                        <span className="text-amber-700 font-semibold">
                          No PIC Assigned (All Reminders staff can inspect)
                        </span>
                      )}
                  </p>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-3.5 shadow-sm">
                    <p className="text-[11px] font-semibold text-gray-700">
                      Select staff assigned to inspect this equipment:
                    </p>
                    <PICPicker
                      ids={taskPicIds}
                      users={data?.users || []}
                      onChange={setTaskPicIds}
                    />
                    <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={applyToFutureSchedules}
                        onChange={(e) => setApplyToFutureSchedules(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-indigo-600"
                      />
                      <span>Apply this PIC assignment to future recurring schedules of this equipment</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        type="button"
                        disabled={isSavingPic}
                        onClick={handleSaveTaskPic}
                        className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                      >
                        {isSavingPic && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save PIC
                      </button>
                      <button
                        type="button"
                        disabled={isSavingPic}
                        onClick={() => {
                          setTaskPicIds(selectedOccurrence.picIds || [])
                          setIsEditingTaskPic(false)
                        }}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Parent Schedule Info & Quick Edit */}
              {(() => {
                const parentSchedule = data?.schedules.find(
                  (s) => s.id === selectedOccurrence.scheduleId
                )
                if (!parentSchedule) return null
                return (
                  <div className="col-span-2 pt-2 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>Recurring Rule:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {ruleLabel(parentSchedule)}
                      </span>
                      {parentSchedule.archivedAt && (
                        <span className="font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-md">
                          Archived
                        </span>
                      )}
                    </div>
                    {!parentSchedule.archivedAt &&
                      (data?.canEditFrequency || data?.canEditWork || data?.isSuperAdmin) && (
                        <button
                          type="button"
                          onClick={() => {
                            closeOccurrence()
                            openScheduleModal(parentSchedule)
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <Edit2 className="h-3 w-3" /> Edit Master Schedule &amp; Frequency
                        </button>
                      )}
                  </div>
                )
              })()}
            </div>

            {/* Checklist items (if completed) */}
            {selectedOccurrence.completedAt && (
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Work Instructions / Inspection Checklist
                </h4>
                <ul className="space-y-1.5 rounded-2xl border border-gray-200 bg-white p-3.5 text-xs text-gray-700">
                  {selectedOccurrence.checklist.map((item, idx) => {
                    const isDone =
                      !selectedOccurrence.completedChecklist ||
                      selectedOccurrence.completedChecklist.length === 0 ||
                      selectedOccurrence.completedChecklist.includes(item)
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        {isDone ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                        )}
                        <span className={isDone ? "" : "text-gray-400 line-through"}>{item}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* If task is already completed */}
            {selectedOccurrence.completedAt ? (
              <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        selectedOccurrence.result === "ISSUE"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    />
                    <h4 className="text-sm font-bold text-gray-900">
                      Inspection Completed &amp; Recorded
                    </h4>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                      selectedOccurrence.result === "ISSUE"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {selectedOccurrence.result === "ISSUE" ? "Issue Reported" : "Satisfactory (OK)"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
                  <div>
                    <span className="text-gray-500 font-medium">Inspection Date:</span>
                    <p className="font-bold text-gray-900">{selectedOccurrence.inspectedDate || "-"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Recorded By:</span>
                    <p className="font-bold text-gray-900">
                      {selectedOccurrence.completedById
                        ? userMap.get(selectedOccurrence.completedById)?.name ||
                          selectedOccurrence.completedById
                        : "-"}
                    </p>
                  </div>
                  {selectedOccurrence.notes && (
                    <div className="col-span-2 pt-2 border-t border-emerald-100">
                      <span className="text-gray-500 font-medium">Remarks:</span>
                      <p className="mt-0.5 text-gray-800 font-medium bg-white/70 p-2 rounded-lg border border-emerald-100">
                        {selectedOccurrence.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Checked By Signature Display */}
                <div className="pt-3 border-t border-emerald-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                    Inspector Signature (Checked By):
                  </span>
                  {selectedOccurrence.performedSignature ? (
                    <div className="inline-block rounded-xl border border-gray-200 bg-white p-2 shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedOccurrence.performedSignature}
                        alt="Inspector Signature"
                        className="h-16 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No signature recorded</span>
                  )}
                </div>

                {/* Supervisor Verification Status & Signature Display */}
                <div className="pt-3 border-t border-emerald-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Supervisor Verification (Verified By):
                    </span>
                    {selectedOccurrence.verifiedAt ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Pending Verification
                      </span>
                    )}
                  </div>

                  {selectedOccurrence.verifiedAt ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                        <div>
                          <span className="text-gray-500">Verified By:</span>{" "}
                          <strong>
                            {selectedOccurrence.verifiedById
                              ? userMap.get(selectedOccurrence.verifiedById)?.name ||
                                selectedOccurrence.verifiedById
                              : "-"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500">Verification Date:</span>{" "}
                          <strong>
                            {new Date(selectedOccurrence.verifiedAt).toLocaleDateString("en-MY")}
                          </strong>
                        </div>
                      </div>
                      {selectedOccurrence.verifiedSignature && (
                        <div className="inline-block rounded-xl border border-gray-200 bg-white p-2 shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedOccurrence.verifiedSignature}
                            alt="Supervisor Signature"
                            className="h-16 max-w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl bg-amber-50/70 border border-amber-200 p-2.5 text-xs text-amber-800">
                      <span>This inspection has not yet been verified by a supervisor.</span>
                      <Link
                        href="/reminders/summary"
                        className="font-bold text-indigo-600 hover:text-indigo-800 underline ml-2 shrink-0"
                      >
                        Open Summary Page &rarr;
                      </Link>
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
                  selectedOccurrence.picIds,
                  Boolean(data?.canAssignPic)
                ) ? (
                  <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                    <h4 className="text-sm font-bold text-gray-900">
                      Inspection Record Form
                    </h4>

                    {completionError && (
                      <p
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
                      >
                        {completionError}
                      </p>
                    )}

                    {/* Interactive Checklist Section */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700">
                          Work Instructions / Inspection Checklist *
                        </label>
                        <div className="flex items-center gap-2">
                          {Boolean(data?.canEditWork || data?.isSuperAdmin) && !isEditingWork && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChecklist([...selectedOccurrence.checklist])
                                setIsEditingWork(true)
                                setWorkEditError("")
                              }}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 hover:underline"
                            >
                              <FilePenLine className="h-3 w-3" /> Edit Work
                            </button>
                          )}
                          {!isEditingWork && (
                            <button
                              type="button"
                              onClick={() => setCompletedChecklist([...selectedOccurrence.checklist])}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              Mark All Completed
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditingWork ? (
                        <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5 mb-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                              <FilePenLine className="h-3.5 w-3.5 text-indigo-600" />
                              Edit Work Instructions
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingChecklist([...editingChecklist, ""])
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Item
                            </button>
                          </div>

                          {workEditError && (
                            <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
                              {workEditError}
                            </p>
                          )}

                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {editingChecklist.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-bold text-indigo-700">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => {
                                    const next = [...editingChecklist]
                                    next[idx] = e.target.value
                                    setEditingChecklist(next)
                                  }}
                                  placeholder={`Work instruction ${idx + 1}`}
                                  className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingChecklist.length <= 1) {
                                      setEditingChecklist([""])
                                    } else {
                                      setEditingChecklist(editingChecklist.filter((_, i) => i !== idx))
                                    }
                                  }}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={applyWorkToFuture}
                              onChange={(e) => setApplyWorkToFuture(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Apply this updated wording to future pending occurrences &amp; Master Schedule</span>
                          </label>

                          <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                            <button
                              type="button"
                              disabled={isSavingWork}
                              onClick={handleSaveWorkChecklist}
                              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {isSavingWork ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Saving…
                                </>
                              ) : (
                                "Save Work Instructions"
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isSavingWork}
                              onClick={() => {
                                setIsEditingWork(false)
                                setEditingChecklist([...selectedOccurrence.checklist])
                                setWorkEditError("")
                              }}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-3 text-xs text-gray-700 max-h-60 overflow-y-auto">
                          {selectedOccurrence.checklist.map((item, idx) => {
                            const isChecked = completedChecklist.includes(item)
                            return (
                              <label
                                key={idx}
                                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer min-h-[46px] select-none active:scale-[0.99] ${
                                  isChecked
                                    ? "border-indigo-300 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs"
                                    : "border-gray-200/80 bg-gray-50/50 text-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCompletedChecklist([...completedChecklist, item])
                                    } else {
                                      setCompletedChecklist(
                                        completedChecklist.filter((c) => c !== item)
                                      )
                                    }
                                  }}
                                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                                />
                                <span className="text-xs leading-relaxed flex-1">{item}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>
                          {completedChecklist.length} of {selectedOccurrence.checklist.length} items checked
                        </span>
                        {completedChecklist.length === selectedOccurrence.checklist.length ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> All completed
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            {selectedOccurrence.checklist.length - completedChecklist.length} items remaining
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Result buttons: OK vs Ada Masalah */}
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-700">
                        Inspection Result *
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
                          <CheckCircle2 className="h-4 w-4" /> Satisfactory (OK)
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
                          <AlertTriangle className="h-4 w-4" /> Issue Reported
                        </button>
                      </div>
                    </div>

                    {/* Inspected Date */}
                    <div>
                      <label className="block mb-1 text-xs font-bold text-gray-700">
                        Inspection Date *
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
                        Inspection Remarks{" "}
                        {completionResult === "ISSUE" ? (
                          <span className="text-red-600 font-bold">* (Required)</span>
                        ) : (
                          <span className="text-gray-400">(Optional)</span>
                        )}
                      </label>
                      <textarea
                        rows={3}
                        value={completionNotes}
                        maxLength={5000}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder={
                          completionResult === "ISSUE"
                            ? "Please describe the defect or issue observed..."
                            : "Additional remarks if any..."
                        }
                        className={fieldClass}
                      />
                    </div>

                    {/* Checked By Signature Pad */}
                    <div className="pt-2 border-t border-indigo-100">
                      <SignaturePadClient
                        label="Inspector Signature (Checked By) *"
                        autoLoadSaved={true}
                        savedSignatureUrl={performedSignature}
                        onSave={(sig) => setPerformedSignature(sig)}
                      />
                    </div>

                    <div className="sticky bottom-0 z-10 pt-2 pb-1 bg-white/95 backdrop-blur-xs -mx-1 px-1">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleComplete}
                        className={`w-full ${buttonClass} py-3 text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2`}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                          </>
                        ) : (
                          "Confirm & Record Inspection"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                    <p className="font-bold">Restricted Access</p>
                    <p className="mt-0.5">
                      Only assigned PICs or administrators are authorized to record inspections for this task.
                    </p>
                  </div>
                )}
              </div>
            )}


            {/* SuperAdmin Special Test Simulation Action */}
            {data?.isSuperAdmin && (
              <div className="pt-3 border-t border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> SuperAdmin Controls
                  </span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                    Live Task Simulation
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Send email notification, Google Calendar invite (.ics), and broadcast interactive message to Telegram Bot for this <strong>{selectedOccurrence.equipment}</strong> inspection task.
                </p>
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={() => handleSimulateReminder(selectedOccurrence.id)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow transition active:scale-95 disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending Simulation (Email, Calendar &amp; Telegram)…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> 🧪 Test Reminder Simulation (Email + Calendar + Telegram Bot)
                    </>
                  )}
                </button>
                {simulationResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold whitespace-pre-line ${
                      simulationResult.success
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    {simulationResult.message}
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
                  {scheduleModal.schedule ? "Edit PM Schedule" : "Create New PM Schedule"}
                </h3>
                <p className="text-xs text-gray-500">
                  Modifications will only affect future pending occurrences. Historical records remain preserved.
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
              canEditWork={Boolean(data?.canEditWork || data?.isSuperAdmin)}
              canEditFrequency={Boolean(data?.canEditFrequency || data?.isSuperAdmin)}
            />

            {!scheduleModal.schedule && (
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Schedule Activation Date
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
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSchedule}
                onClick={handleSaveSchedule}
                className={buttonClass}
              >
                {savingSchedule ? "Saving…" : "Save Schedule"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Export Options Modal (Auditor vs Internal) */}
      {exportModal.open && (
        <ExportPMModal
          open={exportModal.open}
          onClose={() => setExportModal((prev) => ({ ...prev, open: false }))}
          initialFormat={exportModal.format}
          defaultFrom={fromDate}
          defaultTo={toDate}
          currentYear={cursor.getFullYear()}
          currentMonth={cursor.getMonth()}
          onSuccess={(text) => flash({ kind: "ok", text })}
          onError={(text) => flash({ kind: "err", text })}
        />
      )}
    </div>
  )
}

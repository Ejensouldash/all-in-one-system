"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  Droplets,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock,
  RefreshCw,
  Save,
  Sun,
  Moon,
  Info,
  Activity,
  Gauge,
  Filter,
  ShieldCheck,
  Sparkles,
  Copy,
  RotateCcw,
  Check,
  Table,
  LayoutGrid,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
  HelpCircle,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import {
  getHazardProcessRecordByDateAndShift,
  createOrUpdateHazardProcessRecord,
} from "./actions"
import {
  type FUVRow,
  type FUVFormData,
  DAY_SHIFT_TIMES,
  NIGHT_SHIFT_TIMES,
  getDefaultShiftRows,
  createEmptyFUVRow,
  parseFUVNumeric,
  isPG02Breach,
  isPG05Breach,
  isUVIntensityBreach,
} from "./types"

export type CellStatus = "normal" | "warning" | "ccp-breach"

export function checkCellStatus(field: keyof FUVRow, row: FUVRow): CellStatus {
  if (row.isOff) return "normal"

  if (field === "sp01Status" || field === "sp02Status" || field === "sp03Status") {
    return row[field] && row[field] !== "Clear / No Colour" ? "warning" : "normal"
  }

  const valStr = row[field]
  if (!valStr || typeof valStr !== "string" || valStr.trim() === "" || valStr === "-") return "normal"

  switch (field) {
    case "pg02": // CCP1: Max 3 Bar
      if (isPG02Breach(valStr, row.isOff)) return "ccp-breach"
      break
    case "pg05": // CCP1: Max 2 Bar
      if (isPG05Breach(valStr, row.isOff)) return "ccp-breach"
      break
    case "uvIntensity": // CCP2: 80 - 99%
      if (isUVIntensityBreach(valStr, row.isOff)) return "ccp-breach"
      break
    case "vfd01":
    case "vfd02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 25) return "warning"
      break
    }
    case "sp01Ph":
    case "sp02Ph":
    case "sp03Ph": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && (num < 6.5 || num > 7.5)) return "warning"
      break
    }
    case "cs02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && (num < 50 || num > 270)) return "warning"
      break
    }
    case "pg01":
    case "pt01": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 1.1) return "warning"
      break
    }
    case "pg03":
    case "pt02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num < 0.9) return "warning"
      break
    }
    case "pt03":
    case "pg04": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 9.0) return "warning"
      break
    }
    case "cs01": {
      const num = parseFUVNumeric(valStr)
      const cs02Num = parseFUVNumeric(row.cs02)
      if (num !== null) {
        if (cs02Num !== null && num > cs02Num) return "warning"
        if (num < 50 || num > 270) return "warning"
      }
      break
    }
    case "fm02": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && (num < 1.2 || num > 1.8)) return "warning"
      break
    }
    case "operatingHour": {
      const num = parseFUVNumeric(valStr)
      if (num !== null && num > 9000) return "warning"
      break
    }
  }
  return "normal"
}

export function hasCCPBreach(rows: FUVRow[]): boolean {
  return rows.some(
    (row) =>
      !row.isOff &&
      (isPG02Breach(row.pg02) ||
        isPG05Breach(row.pg05) ||
        isUVIntensityBreach(row.uvIntensity))
  )
}

function getSlotStatus(row: FUVRow): {
  isCompleted: boolean
  isPartiallyFilled: boolean
  isOff: boolean
  hasBreach: boolean
  filledCount: number
  totalCount: number
} {
  const isOff = Boolean(row.isOff)
  if (isOff) {
    return {
      isCompleted: true,
      isPartiallyFilled: false,
      isOff: true,
      hasBreach: false,
      filledCount: 21,
      totalCount: 21,
    }
  }

  const fieldsToCheck: (keyof FUVRow)[] = [
    "vfd01", "vfd02", "sp01Ph", "cs02", "pg01", "pt01",
    "sp02Ph", "sp03Ph", "pg02", "pg03", "pt02", "pt03",
    "pg04", "pg05", "cs01", "fm01", "pg06", "fm02",
    "uvIntensity", "operatingHour", "totalRunningDays",
  ]

  let filledCount = 0
  fieldsToCheck.forEach((f) => {
    const val = row[f]
    if (val && typeof val === "string" && val.trim() !== "" && val !== "-") {
      filledCount++
    }
  })

  const hasBreach =
    isPG02Breach(row.pg02, row.isOff) ||
    isPG05Breach(row.pg05, row.isOff) ||
    isUVIntensityBreach(row.uvIntensity, row.isOff)

  const isCompleted = filledCount >= 18
  const isPartiallyFilled = filledCount > 0 && !isCompleted

  return {
    isCompleted,
    isPartiallyFilled,
    isOff: false,
    hasBreach,
    filledCount,
    totalCount: fieldsToCheck.length,
  }
}

interface FUVFormProps {
  userName: string
  initialRecord?: any
  initialDate?: string
  initialShift?: "DAY" | "NIGHT"
}

export function FUVForm({
  userName,
  initialRecord,
  initialDate,
  initialShift,
}: FUVFormProps) {
  const [date, setDate] = useState(() => initialDate || new Date().toISOString().split("T")[0])
  const [shift, setShift] = useState<"DAY" | "NIGHT">(() => initialShift || "DAY")
  const [checkedBy, setCheckedBy] = useState(() => initialRecord?.checkedBy || userName)
  const [remarks, setRemarks] = useState(() => initialRecord?.remarks || "")
  const [existingId, setExistingId] = useState<string | null>(() => initialRecord?.id || null)
  const [isLocked, setIsLocked] = useState(() => Boolean(initialRecord?.isLocked))
  const [signature, setSignature] = useState<string | null>(() => initialRecord?.performedSignature || null)

  const [rows, setRows] = useState<FUVRow[]>(() => {
    const s = initialShift || "DAY"
    const c = initialRecord?.checkedBy || userName
    const defaultRows = getDefaultShiftRows(s, c)
    if (initialRecord && Array.isArray(initialRecord.rows) && initialRecord.rows.length > 0) {
      const savedRows = initialRecord.rows as FUVRow[]
      return defaultRows.map((defRow) => {
        const matched = savedRows.find((r: FUVRow) => r.time === defRow.time)
        return matched ? { ...defRow, ...matched } : defRow
      })
    }
    return defaultRows
  })

  // UI state - Synchronously calculate active slot based on current time
  const [activeSlotIndex, setActiveSlotIndex] = useState(() => {
    const currentHour = new Date().getHours()
    const activeShift = initialShift || (currentHour >= 7 && currentHour < 19 ? "DAY" : "NIGHT")
    if (activeShift === "DAY") {
      if (currentHour < 9) return 0
      if (currentHour < 11) return 1
      if (currentHour < 13) return 2
      if (currentHour < 15) return 3
      if (currentHour < 17) return 4
      return 5
    } else {
      if (currentHour >= 19 && currentHour < 21) return 0
      if (currentHour >= 21 && currentHour < 23) return 1
      if (currentHour >= 23 || currentHour < 1) return 2
      if (currentHour < 3) return 3
      if (currentHour < 5) return 4
      return 5
    }
  })
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [copyNotification, setCopyNotification] = useState("")

  const [isLoadingRecord, setIsLoadingRecord] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [reloadTick, setReloadTick] = useState(0)

  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (initialDate === date && (initialShift ? initialShift === shift : true)) {
        return
      }
    }

    let cancelled = false

    async function load() {
      setIsLoadingRecord(true)
      setError("")
      try {
        const res = await getHazardProcessRecordByDateAndShift(date, shift)
        if (cancelled) return

        if (res && res.success && res.data) {
          setExistingId(res.data.id)
          setIsLocked(Boolean(res.data.isLocked))
          setCheckedBy(res.data.checkedBy || userName)
          setRemarks(res.data.remarks || "")
          setSignature(res.data.performedSignature || null)

          const defaultRows = getDefaultShiftRows(shift, res.data.checkedBy || userName)
          const savedRows = res.data.rows || []
          const mergedRows = defaultRows.map((defRow) => {
            const matched = savedRows.find((r: FUVRow) => r.time === defRow.time)
            return matched ? { ...defRow, ...matched } : defRow
          })
          setRows(mergedRows)
        } else if (res && !res.success) {
          setError(res.error || "Failed to load record for selected date/shift.")
        } else {
          setExistingId(null)
          setIsLocked(false)
          setRemarks("")
          setSignature(null)
          setCheckedBy(userName)
          setRows(getDefaultShiftRows(shift, userName))
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const errMessage = err instanceof Error ? err.message : String(err)
          console.error("Failed to load record:", err)
          if (errMessage.includes("Server Action") || errMessage.includes("deployment")) {
            setError("Deployment update detected. Please refresh the page (Ctrl + F5).")
          } else {
            setError(errMessage || "Failed to load record for selected date/shift.")
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecord(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [date, shift, userName, reloadTick, initialDate, initialShift])

  // Draft integration
  const draft = useMaintenanceDraft("fuv", {
    values: () => ({ date, shift, checkedBy, remarks, rows }),
    apply: (v) => {
      setDate(v.date)
      setShift(v.shift)
      setCheckedBy(v.checkedBy)
      setRemarks(v.remarks || "")
      setRows(v.rows)
    },
  })

  function handleRowChange(index: number, field: keyof FUVRow, value: string | boolean) {
    if (isLocked) return
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function handleToggleOff(index: number, isOff: boolean) {
    if (isLocked) return
    setRows((prev) => {
      const next = [...prev]
      const current = next[index]
      if (isOff) {
        next[index] = {
          ...current,
          isOff: true,
          vfd01: "OFF",
          vfd02: "OFF",
          sp01Ph: "-",
          sp01Status: "Clear / No Colour",
          cs02: "-",
          pg01: "-",
          pt01: "-",
          sp02Ph: "-",
          sp02Status: "Clear / No Colour",
          sp03Ph: "-",
          sp03Status: "Clear / No Colour",
          pg02: "-",
          pg03: "-",
          pt02: "-",
          pt03: "-",
          pg04: "-",
          pg05: "-",
          cs01: "-",
          fm01: "-",
          pg06: "-",
          fm02: "-",
          uvIntensity: "-",
          operatingHour: "-",
          totalRunningDays: "-",
        }
      } else {
        next[index] = {
          ...createEmptyFUVRow(current.time, checkedBy),
          isOff: false,
        }
      }
      return next
    })
  }

  function handleCopyFromPrevious(currentIdx: number) {
    if (isLocked || currentIdx <= 0) return
    const prevRow = rows[currentIdx - 1]
    if (!prevRow) return

    setRows((prev) => {
      const next = [...prev]
      next[currentIdx] = {
        ...prevRow,
        time: next[currentIdx].time,
        isOff: prevRow.isOff || false,
        checkedBy: checkedBy || prevRow.checkedBy,
      }
      return next
    })

    setCopyNotification(
      `All values from slot ${prevRow.time} successfully copied to slot ${rows[currentIdx].time}!`
    )
    setTimeout(() => setCopyNotification(""), 4500)
  }

  function handleClearSlot(index: number) {
    if (isLocked) return
    if (!confirm(`Are you sure you want to clear all readings for time slot ${rows[index].time}?`)) {
      return
    }
    setRows((prev) => {
      const next = [...prev]
      next[index] = createEmptyFUVRow(next[index].time, checkedBy)
      return next
    })
  }

  const ccpViolated = hasCCPBreach(rows)

  // Summary counts
  const slotSummaries = useMemo(() => {
    return rows.map((r) => getSlotStatus(r))
  }, [rows])

  const completedSlotsCount = slotSummaries.filter((s) => s.isCompleted).length

  async function handleSubmit() {
    if (isLocked) {
      setError("This record has been verified and locked by Supervisor / QC.")
      return
    }

    if (!signature) {
      setError("Digital signature is required before submitting the form.")
      const sigElement = document.getElementById("signature-section")
      if (sigElement) sigElement.scrollIntoView({ behavior: "smooth" })
      return
    }

    if (ccpViolated && !remarks.trim()) {
      setError(
        "CCP ALERT: One or more CCP parameters are outside safe operating limits. You MUST fill in the Remarks / Corrective Actions field before submitting!"
      )
      const remarksElement = document.getElementById("remarks-section")
      if (remarksElement) remarksElement.scrollIntoView({ behavior: "smooth" })
      return
    }

    setIsSubmitting(true)
    setError("")

    const payload: FUVFormData = {
      id: existingId || undefined,
      date,
      shift,
      checkedBy,
      remarks,
      performedSignature: signature,
      rows,
    }

    const res = await createOrUpdateHazardProcessRecord(payload)

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      setError(res.error || "Failed to save record.")
    }

    setIsSubmitting(false)
  }

  const activeRow = rows[activeSlotIndex] || rows[0]
  const isCurrentSlotOff = Boolean(activeRow?.isOff)

  if (success) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-12 text-center max-w-xl mx-auto my-8">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full inline-block mb-3">
          Record Successfully Submitted
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">
          Hazard & Process Control Saved!
        </h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          SGMP/19/FUV record for <strong>{date}</strong> (<strong>{shift === "DAY" ? "Day Shift" : "Night Shift"}</strong>) has been securely saved into the database with your digital signature.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setSuccess(false)
              setReloadTick((t) => t + 1)
            }}
            className="w-full sm:w-auto px-6 py-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
          >
            Edit This Record
          </button>
          <Link
            href="/forms/maintenance/reports/fuv"
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
          >
            View Monthly Report (Audit View)
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Official Document Header (Paper-like Card Style) */}
      <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 text-white p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <Link
                href="/forms/maintenance"
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors backdrop-blur-sm mt-1"
                title="Back to Maintenance Forms"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full text-xs font-black tracking-widest uppercase">
                    SGMP/19/FUV
                  </span>
                  <span className="px-2.5 py-1 bg-white/10 text-white/90 rounded-full text-xs font-bold uppercase">
                    Rev 4
                  </span>
                  {isLocked && (
                    <span className="flex items-center px-2.5 py-1 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded-full text-xs font-black uppercase">
                      <Lock className="w-3.5 h-3.5 mr-1" /> Locked (Audit-Proof)
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                  <Droplets className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />
                  Hazard and Process Control Records
                </h1>
                <p className="text-xs sm:text-sm text-cyan-100/80 font-medium mt-1">
                  GMP - Production • BUBBLES O2 SDN BHD, Kompleks Al-Ammar, Rantau
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start lg:self-center">
              <SaveDraftButton draft={draft} />
              <Link
                href="/forms/maintenance/reports/fuv"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase rounded-xl transition-all border border-white/20 backdrop-blur-sm flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> Reports & Print
              </Link>
            </div>
          </div>

          {/* Quick Doc Control Chips */}
          <div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/70">
            <div>
              <span className="text-white/40 block text-[10px] uppercase font-bold">Rec. No</span>
              <strong className="text-white font-mono">SGMP/19/FUV</strong>
            </div>
            <div>
              <span className="text-white/40 block text-[10px] uppercase font-bold">Effective Date</span>
              <strong className="text-white">02/03/2026</strong>
            </div>
            <div>
              <span className="text-white/40 block text-[10px] uppercase font-bold">Inspection Frequency</span>
              <strong className="text-white">Every 2 Hours (6 Slots / Shift)</strong>
            </div>
            <div>
              <span className="text-white/40 block text-[10px] uppercase font-bold">Critical Control Points</span>
              <strong className="text-amber-300">CCP1 (PG02/PG05) & CCP2 (UV)</strong>
            </div>
          </div>
        </div>

        {/* Shift, Date & View Mode Selection Bar */}
        <div className="p-6 bg-slate-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                Inspection Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                disabled={isLocked}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:opacity-60 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                Shift Selection <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-200 p-1 rounded-xl">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setShift("DAY")
                    setActiveSlotIndex(0)
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    shift === "DAY"
                      ? "bg-amber-500 text-white shadow-md font-black"
                      : "text-gray-600 hover:text-gray-900"
                  } disabled:opacity-60`}
                >
                  <Sun className="w-4 h-4 text-amber-100" /> Day Shift
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    setShift("NIGHT")
                    setActiveSlotIndex(0)
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    shift === "NIGHT"
                      ? "bg-indigo-900 text-white shadow-md font-black"
                      : "text-gray-600 hover:text-gray-900"
                  } disabled:opacity-60`}
                >
                  <Moon className="w-4 h-4 text-indigo-200" /> Night Shift
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1.5">
                Checked By <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={checkedBy}
                disabled={isLocked}
                onChange={(e) => setCheckedBy(e.target.value)}
                placeholder="Operator / Inspector Name"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:opacity-60 shadow-sm"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              <span>
                Shift Hours: <strong>{shift === "DAY" ? "07:30 AM – 05:30 PM" : "07:30 PM – 05:30 AM"}</strong>
              </span>
              <span className="text-gray-300">•</span>
              <span>
                Shift Status: <strong>{completedSlotsCount} of 6 Slots Completed</strong>
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                  viewMode === "cards"
                    ? "bg-cyan-700 text-white font-black shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Focus Cards Mode
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                  viewMode === "table"
                    ? "bg-cyan-700 text-white font-black shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Table className="w-3.5 h-3.5" /> Full Matrix Table
              </button>
            </div>
          </div>
        </div>
      </div>

      <DraftBanner draft={draft} />

      {/* Lock Notice */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-sm">
          <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">This record has been verified and locked by Supervisor / QC.</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Modifications are strictly prohibited to comply with audit standards.
            </p>
          </div>
        </div>
      )}

      {/* CCP Alert Banner */}
      {ccpViolated && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 flex items-start gap-3 text-red-900 shadow-md animate-in fade-in duration-300">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="text-sm">
            <h4 className="font-black uppercase tracking-tight text-red-800 text-base">
              CRITICAL ALERT: CCP Limit Breach Detected!
            </h4>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              One or more CCP parameters are outside safe operating limits (PG02 &gt; 3.0 Bar, PG05 &gt; 2.0 Bar, or UV Intensity &lt; 80% / &gt; 99%).
              In accordance with HACCP & GMP audit requirements, you <strong>MUST</strong> provide a corrective action explanation in the
              <em>Remarks / Corrective Actions</em> section below before submitting this record.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              className="underline ml-3 font-bold text-xs uppercase hover:text-red-950 transition-colors"
            >
              Retry
            </button>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {copyNotification && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 font-bold text-xs flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {copyNotification}
        </div>
      )}

      {/* VIEW MODE 1: SLOT-BY-SLOT PAPER CARDS (USER-PREFERRED MODE) */}
      {viewMode === "cards" ? (
        <div className="space-y-6">
          {/* 2. Time Slot Pills Navigation Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-600" /> Select Inspection Time Slot:
              </span>
              <span className="text-[11px] font-bold text-gray-500">
                Click any slot to begin inspection
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {rows.map((row, idx) => {
                const status = slotSummaries[idx]
                const isActive = activeSlotIndex === idx

                return (
                  <button
                    key={row.time}
                    type="button"
                    onClick={() => setActiveSlotIndex(idx)}
                    className={`relative p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      isActive
                        ? "bg-cyan-50 border-cyan-500 shadow-md ring-2 ring-cyan-500/50"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-black uppercase tracking-tight ${
                          isActive ? "text-cyan-900" : "text-gray-900"
                        }`}
                      >
                        {row.time}
                      </span>
                      {status.hasBreach ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" title="CCP Breach" />
                      ) : status.isOff ? (
                        <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[9px] font-bold uppercase">
                          OFF
                        </span>
                      ) : status.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : status.isPartiallyFilled ? (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold">
                      {status.hasBreach ? (
                        <span className="text-red-600 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> CCP Alert
                        </span>
                      ) : status.isOff ? (
                        <span className="text-gray-500">Downtime</span>
                      ) : status.isCompleted ? (
                        <span className="text-emerald-700">Completed (21/21)</span>
                      ) : status.isPartiallyFilled ? (
                        <span className="text-blue-600">{status.filledCount}/21 Filled</span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Active Slot Header Card with Downtime Toggle & Quick Copy */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-100 rounded-2xl flex items-center justify-center text-cyan-800 font-black text-lg">
                  {activeSlotIndex + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-gray-900">
                      Inspection Time Slot: {activeRow.time}
                    </h2>
                    {isCurrentSlotOff && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-black text-[10px] uppercase">
                        Downtime (OFF)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    Please complete readings for all water treatment zones below
                  </p>
                </div>
              </div>

              {/* Status Toggle & Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* RUNNING vs OFF Toggle */}
                <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleToggleOff(activeSlotIndex, false)}
                    className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                      !isCurrentSlotOff
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    } disabled:opacity-50`}
                  >
                    RUNNING
                  </button>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => handleToggleOff(activeSlotIndex, true)}
                    className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                      isCurrentSlotOff
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    } disabled:opacity-50`}
                  >
                    DOWNTIME (OFF)
                  </button>
                </div>

                {/* Copy from Previous Slot Button */}
                {activeSlotIndex > 0 && !isLocked && (
                  <button
                    type="button"
                    onClick={() => handleCopyFromPrevious(activeSlotIndex)}
                    title={`Copy values from slot ${rows[activeSlotIndex - 1].time}`}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-gray-200"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Previous Slot
                  </button>
                )}

                {/* Clear Slot Button */}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => handleClearSlot(activeSlotIndex)}
                    title="Clear readings for this slot"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* If slot is OFF, show downtime notice banner */}
            {isCurrentSlotOff ? (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 mt-6 px-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  OFF
                </div>
                <h3 className="text-base font-black uppercase text-gray-800">
                  Plant / Machinery OFF (Downtime) at {activeRow.time}
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                  This slot has been marked as downtime. All readings are automatically populated with &quot;-&quot; according to audit standards.
                </p>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleToggleOff(activeSlotIndex, false)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-colors"
                >
                  Switch to RUNNING Status
                </button>
              </div>
            ) : (
              /* 4. The 6 Physical Process Cards (Paper-like form fields) */
              <div className="mt-6 space-y-6">
                {/* CARD 1: SOURCE WATER & BOOSTER PUMPS */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Zone 01
                        </span>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mt-0.5">
                          Pump Station (Source Water & Booster Pumps)
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">Limit: Max 25 Hz</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* VFD01 */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Source Water Pump <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">VFD01</span>
                        </label>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Max 25 Hz
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.vfd01 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "vfd01", e.target.value)}
                          placeholder="e.g. 22.5"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all pr-10 ${
                            checkCellStatus("vfd01", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900 focus:ring-2 focus:ring-amber-500"
                              : "border-gray-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">Hz</span>
                      </div>
                      {checkCellStatus("vfd01", activeRow) === "warning" && (
                        <p className="text-[11px] font-bold text-amber-600">⚠️ Exceeds standard limit (Max 25 Hz)</p>
                      )}
                    </div>

                    {/* VFD02 */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Booster Pump <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">VFD02</span>
                        </label>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Max 25 Hz
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.vfd02 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "vfd02", e.target.value)}
                          placeholder="e.g. 24.0"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none transition-all pr-10 ${
                            checkCellStatus("vfd02", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900 focus:ring-2 focus:ring-amber-500"
                              : "border-gray-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/20"
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">Hz</span>
                      </div>
                      {checkCellStatus("vfd02", activeRow) === "warning" && (
                        <p className="text-[11px] font-bold text-amber-600">⚠️ Exceeds standard limit (Max 25 Hz)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 2: SOURCE WATER LINE */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                          Zone 02
                        </span>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mt-0.5">
                          Source Water Line
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">4 Control Parameters</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* SP01 pH & Appearance */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          pH & Appearance <span className="font-mono text-cyan-700 bg-cyan-50 px-1 py-0.5 rounded text-[10px]">SP01</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          6.5 - 7.5
                        </span>
                      </div>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={activeRow.sp01Ph || ""}
                        onChange={(e) => handleRowChange(activeSlotIndex, "sp01Ph", e.target.value)}
                        placeholder="pH value (e.g. 7.2)"
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none ${
                          checkCellStatus("sp01Ph", activeRow) === "warning"
                            ? "border-amber-400 bg-amber-50 text-amber-900"
                            : "border-gray-300 focus:border-cyan-600"
                        }`}
                      />
                      <select
                        disabled={isLocked}
                        value={activeRow.sp01Status || "Clear / No Colour"}
                        onChange={(e) => handleRowChange(activeSlotIndex, "sp01Status", e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-bold ${
                          activeRow.sp01Status && activeRow.sp01Status !== "Clear / No Colour"
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-gray-300 bg-gray-50 text-gray-700"
                        }`}
                      >
                        <option value="Clear / No Colour">Clear / No Colour</option>
                        <option value="Turbid / Coloured">Turbid / Coloured</option>
                      </select>
                    </div>

                    {/* CS02 Conductivity */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Conductivity <span className="font-mono text-cyan-700 bg-cyan-50 px-1 py-0.5 rounded text-[10px]">CS02</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          50 - 270
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.cs02 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "cs02", e.target.value)}
                          placeholder="e.g. 120"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none pr-14 ${
                            checkCellStatus("cs02", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-gray-300 focus:border-cyan-600"
                          }`}
                        />
                        <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-gray-400">µS/cm</span>
                      </div>
                      {checkCellStatus("cs02", activeRow) === "warning" && (
                        <p className="text-[10px] font-bold text-amber-600">⚠️ Safe range: 50 - 270 µS/cm</p>
                      )}
                    </div>

                    {/* PG01 Pressure Gauge */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Pressure Gauge <span className="font-mono text-cyan-700 bg-cyan-50 px-1 py-0.5 rounded text-[10px]">PG01</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Max 1.1 Bar
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.pg01 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "pg01", e.target.value)}
                          placeholder="e.g. 0.8"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none pr-10 ${
                            checkCellStatus("pg01", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-gray-300 focus:border-cyan-600"
                          }`}
                        />
                        <span className="absolute right-2.5 top-2.5 text-xs font-bold text-gray-400">Bar</span>
                      </div>
                      {checkCellStatus("pg01", activeRow) === "warning" && (
                        <p className="text-[10px] font-bold text-amber-600">⚠️ Exceeds limit (Max 1.1 Bar)</p>
                      )}
                    </div>

                    {/* PT01 Pressure Transmitter */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Pressure Transmitter <span className="font-mono text-cyan-700 bg-cyan-50 px-1 py-0.5 rounded text-[10px]">PT01</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Max 1.1 Bar
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.pt01 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "pt01", e.target.value)}
                          placeholder="e.g. 0.8"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none pr-10 ${
                            checkCellStatus("pt01", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-gray-300 focus:border-cyan-600"
                          }`}
                        />
                        <span className="absolute right-2.5 top-2.5 text-xs font-bold text-gray-400">Bar</span>
                      </div>
                      {checkCellStatus("pt01", activeRow) === "warning" && (
                        <p className="text-[10px] font-bold text-amber-600">⚠️ Exceeds limit (Max 1.1 Bar)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 3: SAND FILTER & ACTIVATED CARBON FILTER (WITH CCP1) */}
                <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        <Filter className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Zone 03
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider">
                            Contains CCP1
                          </span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mt-0.5">
                          Sand Filter & Activated Carbon Filter
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800">CCP1 Limit: Max 3.0 Bar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* SP02 Sand Filter Sample */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Sand Filter <span className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-[10px]">SP02</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          6.5 - 7.5
                        </span>
                      </div>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={activeRow.sp02Ph || ""}
                        onChange={(e) => handleRowChange(activeSlotIndex, "sp02Ph", e.target.value)}
                        placeholder="pH value"
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none ${
                          checkCellStatus("sp02Ph", activeRow) === "warning"
                            ? "border-amber-400 bg-amber-50 text-amber-900"
                            : "border-gray-300 focus:border-amber-600"
                        }`}
                      />
                      <select
                        disabled={isLocked}
                        value={activeRow.sp02Status || "Clear / No Colour"}
                        onChange={(e) => handleRowChange(activeSlotIndex, "sp02Status", e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-bold ${
                          activeRow.sp02Status && activeRow.sp02Status !== "Clear / No Colour"
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-gray-300 bg-gray-50 text-gray-700"
                        }`}
                      >
                        <option value="Clear / No Colour">Clear / No Colour</option>
                        <option value="Turbid / Coloured">Turbid / Coloured</option>
                      </select>
                    </div>

                    {/* SP03 Carbon Filter Sample */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          Carbon Filter <span className="font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-[10px]">SP03</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          6.5 - 7.5
                        </span>
                      </div>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={activeRow.sp03Ph || ""}
                        onChange={(e) => handleRowChange(activeSlotIndex, "sp03Ph", e.target.value)}
                        placeholder="pH value"
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none ${
                          checkCellStatus("sp03Ph", activeRow) === "warning"
                            ? "border-amber-400 bg-amber-50 text-amber-900"
                            : "border-gray-300 focus:border-amber-600"
                        }`}
                      />
                      <select
                        disabled={isLocked}
                        value={activeRow.sp03Status || "Clear / No Colour"}
                        onChange={(e) => handleRowChange(activeSlotIndex, "sp03Status", e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-bold ${
                          activeRow.sp03Status && activeRow.sp03Status !== "Clear / No Colour"
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : "border-gray-300 bg-gray-50 text-gray-700"
                        }`}
                      >
                        <option value="Clear / No Colour">Clear / No Colour</option>
                        <option value="Turbid / Coloured">Turbid / Coloured</option>
                      </select>
                    </div>

                    {/* PG02 - CCP1 CRITICAL PARAMETER */}
                    <div
                      className={`p-4 rounded-xl border shadow-sm space-y-1.5 transition-all ${
                        checkCellStatus("pg02", activeRow) === "ccp-breach"
                          ? "bg-red-50 border-red-500 ring-2 ring-red-400"
                          : "bg-amber-100/60 border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-amber-950 flex items-center gap-1">
                          Sand + Carbon <span className="font-mono bg-amber-200 text-amber-900 px-1 py-0.5 rounded text-[10px]">PG02</span>
                        </label>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white uppercase">
                          CCP1 (Max 3 Bar)
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.pg02 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "pg02", e.target.value)}
                          placeholder="e.g. 2.1"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-black outline-none pr-10 ${
                            checkCellStatus("pg02", activeRow) === "ccp-breach"
                              ? "border-red-600 bg-white text-red-900 focus:ring-2 focus:ring-red-500"
                              : "border-amber-300 bg-white text-gray-900 focus:border-amber-600"
                          }`}
                        />
                        <span className="absolute right-2.5 top-2.5 text-xs font-bold text-gray-400">Bar</span>
                      </div>
                      {checkCellStatus("pg02", activeRow) === "ccp-breach" ? (
                        <p className="text-[11px] font-black text-red-700 animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> CCP1 BREACH (&gt; 3.0 Bar)!
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-amber-800">
                          Critical Control Point (Safe Limit: &le; 3.0 Bar)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 4: PRECISION FILTERS */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          Zone 04
                        </span>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mt-0.5">
                          Precision Filters (10µm & 5µm)
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">Limit: Min 0.9 Bar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PG03 10µm */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          10µm Precision Filter <span className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded text-[10px]">PG03</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Min 0.9 Bar
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.pg03 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "pg03", e.target.value)}
                          placeholder="e.g. 1.2"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none pr-10 ${
                            checkCellStatus("pg03", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-gray-300 focus:border-purple-600"
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">Bar</span>
                      </div>
                      {checkCellStatus("pg03", activeRow) === "warning" && (
                        <p className="text-[10px] font-bold text-amber-600">⚠️ Below minimum limit (Min 0.9 Bar)</p>
                      )}
                    </div>

                    {/* PT02 5µm */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">
                          5µm Precision Filter <span className="font-mono text-purple-700 bg-purple-50 px-1 py-0.5 rounded text-[10px]">PT02</span>
                        </label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Min 0.9 Bar
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.pt02 || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "pt02", e.target.value)}
                          placeholder="e.g. 1.1"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold outline-none pr-10 ${
                            checkCellStatus("pt02", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-gray-300 focus:border-purple-600"
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">Bar</span>
                      </div>
                      {checkCellStatus("pt02", activeRow) === "warning" && (
                        <p className="text-[10px] font-bold text-amber-600">⚠️ Below minimum limit (Min 0.9 Bar)</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD 5: ULTRAFILTRATION (UF) MEMBRANE SYSTEM (WITH CCP1) */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                        <Gauge className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                            Zone 05
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider">
                            Contains CCP1 (PG05)
                          </span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mt-0.5">
                          UF Membrane System (Inlet, Outlet CCP1 & Reject)
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">7 Membrane Parameters</span>
                  </div>

                  <div className="space-y-4">
                    {/* Inlet UF Sub-section */}
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2 block">
                        • Inlet UF Membrane
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* PT03 */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">
                              Inlet Transmitter <span className="font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px]">PT03</span>
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              Max 9 Bar
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.pt03 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "pt03", e.target.value)}
                              placeholder="e.g. 4.5"
                              className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none pr-10 ${
                                checkCellStatus("pt03", activeRow) === "warning"
                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                  : "border-gray-300 focus:border-teal-600"
                              }`}
                            />
                            <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">Bar</span>
                          </div>
                        </div>

                        {/* PG04 */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">
                              Inlet Gauge <span className="font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px]">PG04</span>
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              Max 9 Bar
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.pg04 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "pg04", e.target.value)}
                              placeholder="e.g. 4.6"
                              className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none pr-10 ${
                                checkCellStatus("pg04", activeRow) === "warning"
                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                  : "border-gray-300 focus:border-teal-600"
                              }`}
                            />
                            <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">Bar</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Outlet UF Sub-section (With CCP1 PG05) */}
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2 block">
                        • Outlet UF Membrane (Includes CCP1)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* PG05 - CCP1 */}
                        <div
                          className={`p-3.5 rounded-xl border shadow-sm space-y-1.5 transition-all ${
                            checkCellStatus("pg05", activeRow) === "ccp-breach"
                              ? "bg-red-50 border-red-500 ring-2 ring-red-400"
                              : "bg-amber-100/60 border-amber-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-amber-950 flex items-center gap-1">
                              Outlet Gauge <span className="font-mono bg-amber-200 text-amber-900 px-1 py-0.5 rounded text-[10px]">PG05</span>
                            </label>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-600 text-white uppercase">
                              CCP1 (Max 2 Bar)
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.pg05 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "pg05", e.target.value)}
                              placeholder="e.g. 1.4"
                              className={`w-full px-3 py-2 rounded-xl border text-sm font-black outline-none pr-10 ${
                                checkCellStatus("pg05", activeRow) === "ccp-breach"
                                  ? "border-red-600 bg-white text-red-900 focus:ring-2 focus:ring-red-500"
                                  : "border-amber-300 bg-white text-gray-900 focus:border-amber-600"
                              }`}
                            />
                            <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">Bar</span>
                          </div>
                          {checkCellStatus("pg05", activeRow) === "ccp-breach" ? (
                            <p className="text-[10px] font-black text-red-700 animate-pulse">
                              🚨 CCP1 BREACH (&gt; 2.0 Bar)!
                            </p>
                          ) : (
                            <p className="text-[10px] font-bold text-amber-800">
                              Safe Limit: &le; 2.0 Bar
                            </p>
                          )}
                        </div>

                        {/* CS01 Conductivity */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">
                              Permeate CS <span className="font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px]">CS01</span>
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              &le; CS02 (50-270)
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.cs01 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "cs01", e.target.value)}
                              placeholder="e.g. 115"
                              className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none pr-14 ${
                                checkCellStatus("cs01", activeRow) === "warning"
                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                  : "border-gray-300 focus:border-teal-600"
                              }`}
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] font-bold text-gray-400">µS/cm</span>
                          </div>
                        </div>

                        {/* FM01 Flow Meter */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">
                              Permeate Flow <span className="font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px]">FM01</span>
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              Flow Range
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.fm01 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "fm01", e.target.value)}
                              placeholder="e.g. 3.5"
                              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-teal-600 pr-14"
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] font-bold text-gray-400">m³/Hr</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reject Line Sub-section */}
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2 block">
                        • UF Membrane Reject Line
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* PG06 */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">
                              Reject Pressure <span className="font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px]">PG06</span>
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              Nil
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.pg06 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "pg06", e.target.value)}
                              placeholder="e.g. 0.1 / Nil"
                              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-teal-600 pr-10"
                            />
                            <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400">Bar</span>
                          </div>
                        </div>

                        {/* FM02 */}
                        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-800">
                              Reject Flow <span className="font-mono text-teal-700 bg-teal-50 px-1 py-0.5 rounded text-[10px]">FM02</span>
                            </label>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              1.2 - 1.8 m³/Hr
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={isLocked}
                              value={activeRow.fm02 || ""}
                              onChange={(e) => handleRowChange(activeSlotIndex, "fm02", e.target.value)}
                              placeholder="e.g. 1.5"
                              className={`w-full px-3 py-2 rounded-xl border text-sm font-bold outline-none pr-14 ${
                                checkCellStatus("fm02", activeRow) === "warning"
                                  ? "border-amber-400 bg-amber-50 text-amber-900"
                                  : "border-gray-300 focus:border-teal-600"
                              }`}
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] font-bold text-gray-400">m³/Hr</span>
                          </div>
                          {checkCellStatus("fm02", activeRow) === "warning" && (
                            <p className="text-[10px] font-bold text-amber-600">⚠️ Reject flow range: 1.2 - 1.8 m³/Hr</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 6: ULTRAVIOLET (UV) SYSTEM (CCP2) */}
                <div className="bg-rose-50/40 border border-rose-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-200/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                            Zone 06
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider">
                            Critical Control Point (CCP2)
                          </span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-wide text-gray-900 mt-0.5">
                          Ultraviolet (UV) System (CCP2)
                        </h3>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-rose-800">CCP2 Limit: 80% – 99%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* UV Intensity (CCP2) */}
                    <div
                      className={`p-4 rounded-xl border shadow-sm space-y-1.5 transition-all ${
                        checkCellStatus("uvIntensity", activeRow) === "ccp-breach"
                          ? "bg-red-100 border-red-600 ring-2 ring-red-500"
                          : "bg-white border-rose-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-rose-950 flex items-center gap-1">
                          UV Intensity <span className="font-mono bg-rose-100 text-rose-900 px-1 py-0.5 rounded text-[10px]">CCP2</span>
                        </label>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white uppercase">
                          80 - 99%
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.uvIntensity || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "uvIntensity", e.target.value)}
                          placeholder="e.g. 95"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-black outline-none pr-10 ${
                            checkCellStatus("uvIntensity", activeRow) === "ccp-breach"
                              ? "border-red-600 bg-white text-red-900 focus:ring-2 focus:ring-red-500"
                              : "border-rose-300 bg-white text-gray-900 focus:border-rose-600"
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">%</span>
                      </div>
                      {checkCellStatus("uvIntensity", activeRow) === "ccp-breach" ? (
                        <p className="text-[11px] font-black text-red-700 animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> CCP2 BREACH (Below 80% / Above 99%)!
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-rose-800">
                          Safe Intensity: Min 80%
                        </p>
                      )}
                    </div>

                    {/* Operating Hour */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">Operating Hour</label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Max 9000 Hr
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.operatingHour || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "operatingHour", e.target.value)}
                          placeholder="e.g. 4500"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-bold outline-none pr-10 ${
                            checkCellStatus("operatingHour", activeRow) === "warning"
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-gray-300 focus:border-rose-600"
                          }`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">Hr</span>
                      </div>
                      {checkCellStatus("operatingHour", activeRow) === "warning" && (
                        <p className="text-[10px] font-bold text-amber-600">⚠️ Exceeds 9000 hours service life!</p>
                      )}
                    </div>

                    {/* Total Running Days */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">Total Running Days</label>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          Days
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={isLocked}
                          value={activeRow.totalRunningDays || ""}
                          onChange={(e) => handleRowChange(activeSlotIndex, "totalRunningDays", e.target.value)}
                          placeholder="e.g. 180"
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-bold outline-none focus:border-rose-600 pr-14"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">Days</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Slot Navigation Bar */}
            <div className="mt-8 pt-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                disabled={activeSlotIndex === 0}
                onClick={() => setActiveSlotIndex((prev) => Math.max(0, prev - 1))}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl transition-colors disabled:opacity-30 flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Slot ({rows[Math.max(0, activeSlotIndex - 1)]?.time})
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {activeSlotIndex < rows.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSlotIndex((prev) => Math.min(rows.length - 1, prev + 1))
                      window.scrollTo({ top: 380, behavior: "smooth" })
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    Save & Next Slot ({rows[activeSlotIndex + 1]?.time}) <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("shift-summary-section")
                      if (el) el.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    Review Summary & Sign-off <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: FULL SPREADSHEET 25-COLUMN TABLE (FOR SUPERVISORS / AUDIT COMPARISON) */
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 bg-slate-100 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <Table className="w-4 h-4 text-cyan-700" /> Full Matrix Table (25 Columns)
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Complete tabular view matching the original Excel spreadsheet layout for cross-checking
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Normal
              </span>
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Range Warning
              </span>
              <span className="flex items-center gap-1 text-red-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-ping"></span> CCP Breach
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse border border-gray-200 min-w-[2100px]">
              <thead>
                <tr className="bg-slate-800 text-white font-bold border-b border-slate-700 text-[11px]">
                  <th rowSpan={3} className="p-2 border border-slate-700 w-24 sticky left-0 z-20 bg-slate-800">
                    Time of Inspection
                  </th>
                  <th rowSpan={3} className="p-2 border border-slate-700 w-20 sticky left-24 z-20 bg-slate-800">
                    OFF
                  </th>
                  <th className="p-2 border border-slate-700">Source Pump</th>
                  <th className="p-2 border border-slate-700">Booster Pump</th>
                  <th colSpan={4} className="p-2 border border-slate-700">Source Water Line</th>
                  <th className="p-2 border border-slate-700">Sand Filter</th>
                  <th className="p-2 border border-slate-700">Carbon Filter</th>
                  <th className="p-2 border border-slate-700 bg-amber-950/70 text-amber-200">Sand+Carbon (CCP1)</th>
                  <th className="p-2 border border-slate-700">10µm Filter</th>
                  <th className="p-2 border border-slate-700">5µm Filter</th>
                  <th colSpan={2} className="p-2 border border-slate-700">Inlet UF</th>
                  <th colSpan={3} className="p-2 border border-slate-700 bg-amber-950/70 text-amber-200">Outlet UF (CCP1)</th>
                  <th colSpan={2} className="p-2 border border-slate-700">UF Reject</th>
                  <th colSpan={3} className="p-2 border border-slate-700 bg-red-950/80 text-rose-200">UV SYSTEM (CCP2)</th>
                  <th rowSpan={3} className="p-2 border border-slate-700 w-28">Checked By</th>
                </tr>
                <tr className="bg-slate-700 text-slate-200 text-[10px] border-b border-slate-600">
                  <th className="p-1 border border-slate-600">Max 25Hz</th>
                  <th className="p-1 border border-slate-600">Max 25Hz</th>
                  <th className="p-1 border border-slate-600">PH 6.5-7.5</th>
                  <th className="p-1 border border-slate-600">(50-270)</th>
                  <th className="p-1 border border-slate-600">Max 1.1 Bar</th>
                  <th className="p-1 border border-slate-600">Max 1.1 Bar</th>
                  <th className="p-1 border border-slate-600">PH 6.5-7.5</th>
                  <th className="p-1 border border-slate-600">PH 6.5-7.5</th>
                  <th className="p-1 border border-slate-600 font-bold text-amber-300">Max 3 Bar</th>
                  <th className="p-1 border border-slate-600">Min 0.9 Bar</th>
                  <th className="p-1 border border-slate-600">Min 0.9 Bar</th>
                  <th className="p-1 border border-slate-600">Max 9 Bar</th>
                  <th className="p-1 border border-slate-600">Max 9 Bar</th>
                  <th className="p-1 border border-slate-600 font-bold text-amber-300">Max 2 Bar</th>
                  <th className="p-1 border border-slate-600">&le; CS02</th>
                  <th className="p-1 border border-slate-600">Flow</th>
                  <th className="p-1 border border-slate-600">Nil</th>
                  <th className="p-1 border border-slate-600">1.2-1.8</th>
                  <th className="p-1 border border-slate-600 font-bold text-rose-300">80 - 99%</th>
                  <th className="p-1 border border-slate-600">9000 Hr</th>
                  <th className="p-1 border border-slate-600">Days</th>
                </tr>
                <tr className="bg-slate-100 text-slate-800 text-[10px] font-black border-b-2 border-slate-300">
                  <th className="p-1 border border-slate-300">VFD01</th>
                  <th className="p-1 border border-slate-300">VFD02</th>
                  <th className="p-1 border border-slate-300">SP01</th>
                  <th className="p-1 border border-slate-300">CS02</th>
                  <th className="p-1 border border-slate-300">PG01</th>
                  <th className="p-1 border border-slate-300">PT01</th>
                  <th className="p-1 border border-slate-300">SP02</th>
                  <th className="p-1 border border-slate-300">SP03</th>
                  <th className="p-1 border border-slate-300 bg-amber-100 text-amber-900">PG02 (CCP1)</th>
                  <th className="p-1 border border-slate-300">PG03</th>
                  <th className="p-1 border border-slate-300">PT02</th>
                  <th className="p-1 border border-slate-300">PT03</th>
                  <th className="p-1 border border-slate-300">PG04</th>
                  <th className="p-1 border border-slate-300 bg-amber-100 text-amber-900">PG05 (CCP1)</th>
                  <th className="p-1 border border-slate-300">CS01</th>
                  <th className="p-1 border border-slate-300">FM01</th>
                  <th className="p-1 border border-slate-300">PG06</th>
                  <th className="p-1 border border-slate-300">FM02</th>
                  <th className="p-1 border border-slate-300 bg-red-100 text-red-900">UV INTENSITY</th>
                  <th className="p-1 border border-slate-300">OPERATING</th>
                  <th className="p-1 border border-slate-300">DAYS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isOff = Boolean(row.isOff)
                  return (
                    <tr
                      key={row.time}
                      className={`border-b border-gray-200 transition-colors ${
                        isOff ? "bg-gray-100/70" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="p-2 border border-gray-200 font-bold text-gray-800 sticky left-0 z-10 bg-inherit whitespace-nowrap">
                        {row.time}
                      </td>
                      <td className="p-2 border border-gray-200 sticky left-24 z-10 bg-inherit text-center">
                        <input
                          type="checkbox"
                          checked={isOff}
                          disabled={isLocked}
                          onChange={(e) => handleToggleOff(idx, e.target.checked)}
                          className="w-4 h-4 text-cyan-600 rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.vfd01 || ""}
                          onChange={(e) => handleRowChange(idx, "vfd01", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.vfd02 || ""}
                          onChange={(e) => handleRowChange(idx, "vfd02", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.sp01Ph || ""}
                          onChange={(e) => handleRowChange(idx, "sp01Ph", e.target.value)}
                          placeholder="pH"
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.cs02 || ""}
                          onChange={(e) => handleRowChange(idx, "cs02", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pg01 || ""}
                          onChange={(e) => handleRowChange(idx, "pg01", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pt01 || ""}
                          onChange={(e) => handleRowChange(idx, "pt01", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.sp02Ph || ""}
                          onChange={(e) => handleRowChange(idx, "sp02Ph", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.sp03Ph || ""}
                          onChange={(e) => handleRowChange(idx, "sp03Ph", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200 bg-amber-50">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pg02 || ""}
                          onChange={(e) => handleRowChange(idx, "pg02", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded font-black text-amber-900"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pg03 || ""}
                          onChange={(e) => handleRowChange(idx, "pg03", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pt02 || ""}
                          onChange={(e) => handleRowChange(idx, "pt02", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pt03 || ""}
                          onChange={(e) => handleRowChange(idx, "pt03", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pg04 || ""}
                          onChange={(e) => handleRowChange(idx, "pg04", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200 bg-amber-50">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pg05 || ""}
                          onChange={(e) => handleRowChange(idx, "pg05", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded font-black text-amber-900"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.cs01 || ""}
                          onChange={(e) => handleRowChange(idx, "cs01", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.fm01 || ""}
                          onChange={(e) => handleRowChange(idx, "fm01", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.pg06 || ""}
                          onChange={(e) => handleRowChange(idx, "pg06", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.fm02 || ""}
                          onChange={(e) => handleRowChange(idx, "fm02", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200 bg-red-50">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.uvIntensity || ""}
                          onChange={(e) => handleRowChange(idx, "uvIntensity", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded font-black text-red-900"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.operatingHour || ""}
                          onChange={(e) => handleRowChange(idx, "operatingHour", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.totalRunningDays || ""}
                          onChange={(e) => handleRowChange(idx, "totalRunningDays", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                      <td className="p-1.5 border border-gray-200">
                        <input
                          type="text"
                          disabled={isLocked || isOff}
                          value={row.checkedBy || checkedBy}
                          onChange={(e) => handleRowChange(idx, "checkedBy", e.target.value)}
                          className="w-full text-center px-1.5 py-1 text-xs border rounded"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Shift Summary, Remarks & Sign-off Section */}
      <div id="shift-summary-section" className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
              Shift Verification
            </span>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-gray-900 mt-1">
              Record Summary, Remarks & Digital Signature
            </h3>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-500 block">Overall Status:</span>
            <span
              className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full inline-block ${
                ccpViolated
                  ? "bg-red-100 text-red-800"
                  : completedSlotsCount === 6
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {ccpViolated
                ? "CCP Breach Detected"
                : completedSlotsCount === 6
                ? "All 6 Slots Completed"
                : `${completedSlotsCount}/6 Slots Completed`}
            </span>
          </div>
        </div>

        {/* Remarks / Corrective Actions (Mandatory if CCP breach) */}
        <div id="remarks-section" className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-800">
            Remarks / Corrective Actions
            {ccpViolated ? (
              <span className="text-red-600 font-black ml-2 animate-pulse">
                * MANDATORY: CCP LIMIT BREACH DETECTED!
              </span>
            ) : (
              <span className="text-gray-400 font-normal ml-2">(Optional)</span>
            )}
          </label>
          <textarea
            rows={3}
            value={remarks}
            disabled={isLocked}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={
              ccpViolated
                ? "Please state the root cause of the CCP deviation (PG02 / PG05 / UV Intensity) and immediate corrective actions taken in accordance with standard operating procedures..."
                : "Enter any observations, operating notes, or equipment downtime remarks here..."
            }
            className={`w-full p-4 rounded-2xl border text-sm outline-none transition-all ${
              ccpViolated && !remarks.trim()
                ? "border-red-500 bg-red-50/60 focus:ring-2 focus:ring-red-500 text-red-900 placeholder:text-red-400"
                : "border-gray-300 bg-gray-50/50 focus:border-cyan-600 focus:bg-white"
            } disabled:opacity-60`}
          />
        </div>

        {/* Operator Signature Pad */}
        <div id="signature-section" className="space-y-3 pt-2">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-800">
            Staff Digital Signature (Checked By) <span className="text-red-500">*</span>
          </label>

          {signature && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl inline-block">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Saved Signature ({checkedBy}):
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signature}
                alt="Operator Signature"
                className="h-16 object-contain bg-white rounded-xl border border-gray-200 px-3"
              />
            </div>
          )}

          {!isLocked && (
            <div className="max-w-md">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Please sign inside the box below to verify the accuracy and integrity of this shift's inspection data:
              </p>
              <SignaturePadClient onSave={setSignature} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SaveDraftButton draft={draft} disabled={isSubmitting || isLocked} />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href="/forms/maintenance"
              className="w-full sm:w-auto px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider text-center transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isLocked}
              className="w-full sm:w-auto px-8 py-3.5 bg-cyan-700 hover:bg-cyan-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving Record...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Shift Record (SGMP/19/FUV)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

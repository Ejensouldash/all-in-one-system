"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Zap,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  PenTool,
  ShieldCheck,
  User,
  Lightbulb,
} from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import {
  getUVMachineRecordByDate,
  saveUVMachineRecord,
  type UVMachineFormData,
} from "./actions"

interface UVMachineFormProps {
  userName: string
}

function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getCurrentTimeString(): string {
  const now = new Date()
  return now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function UVMachineForm({ userName }: UVMachineFormProps) {
  const router = useRouter()

  const [date, setDate] = useState<string>(getTodayString())
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null)
  const [isLoadingDate, setIsLoadingDate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // LINE 1 Fields
  const [line1Intensity, setLine1Intensity] = useState("")
  const [line1OperatingHours, setLine1OperatingHours] = useState("")
  const [line1RunningDays, setLine1RunningDays] = useState("")
  const [line1Time, setLine1Time] = useState(getCurrentTimeString())
  const [line1Pic, setLine1Pic] = useState(userName)
  const [line1Signature, setLine1Signature] = useState<string | null>(null)
  const [line1Remarks, setLine1Remarks] = useState("")

  // LINE 2 Fields (Default to unselected so it never falsely completes)
  const [line2MachineStatus, setLine2MachineStatus] = useState<string>("")
  const [line2Time, setLine2Time] = useState(getCurrentTimeString())
  const [line2Pic, setLine2Pic] = useState(userName)
  const [line2Signature, setLine2Signature] = useState<string | null>(null)
  const [line2Remarks, setLine2Remarks] = useState("")

  // Check if Line 1 / Line 2 are filled in existing record
  const [isLine1Completed, setIsLine1Completed] = useState(false)
  const [isLine2Completed, setIsLine2Completed] = useState(false)

  // Fetch record for selected date
  const loadRecordForDate = useCallback(async (selectedDate: string) => {
    try {
      setIsLoadingDate(true)
      setErrorMessage(null)
      setSubmitSuccessMessage(null)

      const res = await getUVMachineRecordByDate(selectedDate)
      if (res.success && res.data) {
        const rec = res.data
        setExistingRecordId(rec.id)

        // Line 1
        setLine1Intensity(rec.line1Intensity || "")
        setLine1OperatingHours(rec.line1OperatingHours || "")
        setLine1RunningDays(rec.line1RunningDays || "")
        setLine1Time(rec.line1Time || getCurrentTimeString())
        setLine1Pic(rec.line1Pic || userName)
        setLine1Signature(rec.line1Signature || null)
        setLine1Remarks(rec.line1Remarks || "")

        // Line 1 is completed if it has readings and a signature
        const hasLine1 = Boolean(
          (rec.line1Intensity || rec.line1OperatingHours || rec.line1RunningDays) &&
          rec.line1Signature
        )
        setIsLine1Completed(hasLine1)

        // Line 2: Only completed if status AND signature exist
        setLine2MachineStatus(rec.line2MachineStatus || "")
        setLine2Time(rec.line2Time || getCurrentTimeString())
        setLine2Pic(rec.line2Pic || userName)
        setLine2Signature(rec.line2Signature || null)
        setLine2Remarks(rec.line2Remarks || "")

        const hasLine2 = Boolean(rec.line2MachineStatus && rec.line2Signature)
        setIsLine2Completed(hasLine2)
      } else {
        // No record for this date
        setExistingRecordId(null)
        setLine1Intensity("")
        setLine1OperatingHours("")
        setLine1RunningDays("")
        setLine1Time(getCurrentTimeString())
        setLine1Pic(userName)
        setLine1Signature(null)
        setLine1Remarks("")
        setIsLine1Completed(false)

        setLine2MachineStatus("")
        setLine2Time(getCurrentTimeString())
        setLine2Pic(userName)
        setLine2Signature(null)
        setLine2Remarks("")
        setIsLine2Completed(false)
      }
    } catch (err: any) {
      console.error("Failed to load UV record:", err)
      setErrorMessage("Could not load data for the selected date.")
    } finally {
      setIsLoadingDate(false)
    }
  }, [userName])

  useEffect(() => {
    loadRecordForDate(date)
  }, [date, loadRecordForDate])

  // Submit Handler
  const handleSubmit = async (submissionType: "ALL" | "LINE1" | "LINE2") => {
    setErrorMessage(null)
    setSubmitSuccessMessage(null)

    // Validation
    if (!date) {
      setErrorMessage("Please select an inspection date.")
      return
    }

    if (submissionType === "LINE1" || submissionType === "ALL") {
      if (!line1Pic.trim()) {
        setErrorMessage("Please enter PIC Name for LINE 1.")
        return
      }
      if (!line1Intensity.trim() && !line1OperatingHours.trim()) {
        setErrorMessage("Please enter at least UV Intensity or UV Operating Hours for LINE 1.")
        return
      }
      if (!line1Signature) {
        setErrorMessage("Please provide digital signature for LINE 1.")
        return
      }
    }

    if (submissionType === "LINE2" || submissionType === "ALL") {
      if (!line2Pic.trim()) {
        setErrorMessage("Please enter PIC Name for LINE 2.")
        return
      }
      if (!line2MachineStatus) {
        setErrorMessage("Please select UV Machine Status (Green Light / Red Light) for LINE 2.")
        return
      }
      if (!line2Signature) {
        setErrorMessage("Please provide digital signature for LINE 2.")
        return
      }
    }

    try {
      setIsSubmitting(true)

      // Strictly isolate fields per submissionType so Line 1 never accidentally writes Line 2 data
      const payload: UVMachineFormData = {
        id: existingRecordId || undefined,
        date,
        submissionType,

        // Line 1
        line1Intensity: submissionType === "LINE2" ? undefined : line1Intensity,
        line1OperatingHours: submissionType === "LINE2" ? undefined : line1OperatingHours,
        line1RunningDays: submissionType === "LINE2" ? undefined : line1RunningDays,
        line1Time: submissionType === "LINE2" ? undefined : line1Time,
        line1Pic: submissionType === "LINE2" ? undefined : line1Pic,
        line1Signature: submissionType === "LINE2" ? undefined : line1Signature,
        line1Remarks: submissionType === "LINE2" ? undefined : line1Remarks,

        // Line 2
        line2MachineStatus: submissionType === "LINE1" ? undefined : line2MachineStatus,
        line2Time: submissionType === "LINE1" ? undefined : line2Time,
        line2Pic: submissionType === "LINE1" ? undefined : line2Pic,
        line2Signature: submissionType === "LINE1" ? undefined : line2Signature,
        line2Remarks: submissionType === "LINE1" ? undefined : line2Remarks,
      }

      const res = await saveUVMachineRecord(payload)

      if (!res.success) {
        setErrorMessage(res.error || "Failed to save record.")
        return
      }

      setSubmitSuccessMessage(res.message || "Record successfully saved!")
      if (res.id) {
        setExistingRecordId(res.id)
      }

      // Refresh data
      await loadRecordForDate(date)
      router.refresh()
    } catch (err: any) {
      console.error("Submission error:", err)
      setErrorMessage(err.message || "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Date Header & Record Status */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5 text-blue-600" />
              Inspection Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLoadingDate ? (
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 text-slate-600">
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Loading record...
              </span>
            ) : existingRecordId ? (
              <>
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                    isLine1Completed
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${isLine1Completed ? "bg-emerald-500" : "bg-amber-500"}`} />
                  Line 1 (800ML): {isLine1Completed ? "Recorded" : "Pending"}
                </span>

                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${
                    isLine2Completed
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${isLine2Completed ? "bg-emerald-500" : "bg-amber-500"}`} />
                  Line 2 (425ML): {isLine2Completed ? "Recorded" : "Pending"}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                New Record for {date}
              </span>
            )}
          </div>
        </div>

        {existingRecordId && (
          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4">
            ℹ️ <strong>Auto-loaded record:</strong> Data for {date} is already saved in the system. You can update individual lines or complete pending sections below.
          </p>
        )}
      </div>

      {/* Alert Messages */}
      {submitSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
          {submitSuccessMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center shadow-sm">
          <AlertCircle className="w-5 h-5 mr-2 text-rose-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* ======================================================== */}
      {/* LINE 1 (800ML) - UV Sterilizer Operational Status */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden transition-all hover:border-blue-300">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-500/30 text-blue-300 text-xs font-black uppercase px-2.5 py-1 rounded-md border border-blue-400/30">
              LINE 1 (800ML)
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center">
              <Zap className="w-5 h-5 mr-2 text-blue-400" />
              UV Sterilizer Operational Status
            </h2>
          </div>
          {isLine1Completed ? (
            <span className="inline-flex items-center text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Completed
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md border border-amber-500/40">
              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" /> Pending Inspection
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* UV Intensity */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                UV Intensity
              </label>
              <input
                type="text"
                value={line1Intensity}
                onChange={(e) => setLine1Intensity(e.target.value)}
                placeholder="e.g. 98% or 45 mW/cm²"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <p className="text-[11px] text-slate-400">Lamp radiation output percentage</p>
            </div>

            {/* UV Operating Hour */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                UV Operating Hour
              </label>
              <input
                type="text"
                value={line1OperatingHours}
                onChange={(e) => setLine1OperatingHours(e.target.value)}
                placeholder="e.g. 1,450 hrs"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <p className="text-[11px] text-slate-400">Accumulated lamp run hours</p>
            </div>

            {/* UV Total Running Days */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                UV Total Running Days
              </label>
              <input
                type="text"
                value={line1RunningDays}
                onChange={(e) => setLine1RunningDays(e.target.value)}
                placeholder="e.g. 165 days"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <p className="text-[11px] text-slate-400">Total days in service</p>
            </div>
          </div>

          {/* Line 1 PIC, Time & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
                <Clock className="w-4 h-4 mr-1 text-slate-500" />
                Line 1 Inspection Time
              </label>
              <input
                type="text"
                value={line1Time}
                onChange={(e) => setLine1Time(e.target.value)}
                placeholder="e.g. 09:30 AM"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
                <User className="w-4 h-4 mr-1 text-slate-500" />
                Line 1 PIC Name
              </label>
              <input
                type="text"
                value={line1Pic}
                onChange={(e) => setLine1Pic(e.target.value)}
                placeholder="Name of operator"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Line 1 Remarks (Optional)
            </label>
            <input
              type="text"
              value={line1Remarks}
              onChange={(e) => setLine1Remarks(e.target.value)}
              placeholder="Any operational remarks or abnormal observations..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          {/* Line 1 Signature */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
              <PenTool className="w-4 h-4 mr-1.5 text-blue-600" />
              Line 1 Operator Digital Signature
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <SignaturePadClient
                label="Sign Line 1 Verification"
                savedSignatureUrl={line1Signature}
                onSave={setLine1Signature}
              />
            </div>
          </div>

          {/* Line 1 Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSubmit("LINE1")}
              disabled={isSubmitting}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Line 1...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isLine1Completed ? "Update Line 1 (800ML)" : "Submit Line 1 (800ML)"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* LINE 2 (425ML) - UV Machine Status */}
      {/* ======================================================== */}
      <section className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden transition-all hover:border-indigo-300">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-950 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="bg-indigo-500/30 text-indigo-300 text-xs font-black uppercase px-2.5 py-1 rounded-md border border-indigo-400/30">
              LINE 2 (425ML)
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-indigo-400" />
              UV Machine Status
            </h2>
          </div>
          {isLine2Completed ? (
            <span className="inline-flex items-center text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Completed
            </span>
          ) : (
            <span className="inline-flex items-center text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md border border-amber-500/40">
              <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" /> Pending Inspection
            </span>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Dropdown: Machine Status */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Machine Status Indicator Lamp
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  line2MachineStatus === "Green Light"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="line2StatusRadio"
                  value="Green Light"
                  checked={line2MachineStatus === "Green Light"}
                  onChange={() => setLine2MachineStatus("Green Light")}
                  className="sr-only"
                />
                <span className={`w-4 h-4 rounded-full mr-3 ring-4 flex-shrink-0 ${
                  line2MachineStatus === "Green Light" ? "bg-emerald-500 ring-emerald-200" : "bg-slate-300 ring-slate-100"
                }`} />
                <div>
                  <div className="font-bold text-sm">Green Light</div>
                  <div className="text-xs text-slate-500">Normal Operating</div>
                </div>
              </label>

              <label
                className={`relative flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  line2MachineStatus === "Red Light"
                    ? "border-rose-500 bg-rose-50/50 text-rose-950 shadow-sm ring-2 ring-rose-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="line2StatusRadio"
                  value="Red Light"
                  checked={line2MachineStatus === "Red Light"}
                  onChange={() => setLine2MachineStatus("Red Light")}
                  className="sr-only"
                />
                <span className={`w-4 h-4 rounded-full mr-3 ring-4 flex-shrink-0 ${
                  line2MachineStatus === "Red Light" ? "bg-rose-500 ring-rose-200" : "bg-slate-300 ring-slate-100"
                }`} />
                <div>
                  <div className="font-bold text-sm">Red Light</div>
                  <div className="text-xs text-slate-500">Fault / Warning</div>
                </div>
              </label>
            </div>

            {/* Dropdown Alternative for strict dropdown compliance */}
            <div className="pt-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Dropdown Selection:
              </label>
              <select
                value={line2MachineStatus}
                onChange={(e) => setLine2MachineStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="">-- Sila Pilih Status Lampu (Select Status) --</option>
                <option value="Green Light">🟢 Green Light (Normal Operating)</option>
                <option value="Red Light">🔴 Red Light (Fault / Warning)</option>
              </select>
            </div>
          </div>

          {/* Line 2 PIC, Time & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
                <Clock className="w-4 h-4 mr-1 text-slate-500" />
                Line 2 Inspection Time
              </label>
              <input
                type="text"
                value={line2Time}
                onChange={(e) => setLine2Time(e.target.value)}
                placeholder="e.g. 02:30 PM"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
                <User className="w-4 h-4 mr-1 text-slate-500" />
                Line 2 PIC Name
              </label>
              <input
                type="text"
                value={line2Pic}
                onChange={(e) => setLine2Pic(e.target.value)}
                placeholder="Name of operator"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Line 2 Remarks (Optional)
            </label>
            <input
              type="text"
              value={line2Remarks}
              onChange={(e) => setLine2Remarks(e.target.value)}
              placeholder="Any operational remarks or lamp issue details..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>

          {/* Line 2 Signature */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center">
              <PenTool className="w-4 h-4 mr-1.5 text-indigo-600" />
              Line 2 Operator Digital Signature
            </label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <SignaturePadClient
                label="Sign Line 2 Verification"
                savedSignatureUrl={line2Signature}
                onSave={setLine2Signature}
              />
            </div>
          </div>

          {/* Line 2 Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSubmit("LINE2")}
              disabled={isSubmitting}
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-700/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Line 2...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isLine2Completed ? "Update Line 2 (425ML)" : "Submit Line 2 (425ML)"}
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* Master Save / Global Actions */}
      {/* ======================================================== */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/forms/maintenance/reports/uv-machine-3-in-1")}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          &larr; Go to UV Machine Reports &amp; Slips
        </button>

        <button
          type="button"
          onClick={() => handleSubmit("ALL")}
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 hover:from-blue-800 hover:to-black text-white font-black text-sm tracking-wide shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving Complete Checklist...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 mr-2 text-blue-300" />
              Save Entire Checklist (Both Lines)
            </>
          )}
        </button>
      </div>
    </div>
  )
}

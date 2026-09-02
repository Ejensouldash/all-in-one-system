"use client"

import { useState, useEffect, useCallback } from "react"
import { Wrench, CheckCircle2, ChevronLeft, Save, Clock, Check, AlertCircle } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import { saveMaintenanceShiftRecord, getMaintenanceRecordByDate, LineType, ShiftType } from "./actions"

const MACHINES = [
  "AUTO SCRAMBLER",
  "3 IN 1 MACHINE",
  "BLOWER MACHINE",
  "LABEL MACHINE",
  "PRINTER MACHINE",
  "WEIGHING MACHINE",
  "SEALER MACHINE",
  "ROBOTIC ARM MACHINE",
  "WRAPPING MACHINE",
  "SAND FILTER",
  "ACTIVATED CARBON FILTER",
  "HOLLOW MEMBRANE FILTER",
  "UV MACHINE",
  "AIR COMPRESSOR",
  "GENSET",
  "RAW WATER TANK PUMP",
  "RAW TANK",
  "FILTERED TANK",
  "WELL"
]

export function MaintenanceRecordForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedLine, setSelectedLine] = useState<LineType>("800ML")
  const [selectedShift, setSelectedShift] = useState<ShiftType>("MORNING")

  const [activities, setActivities] = useState<Record<string, { ml800Morning: string, ml800Night: string, ml425Morning: string, ml425Night: string }>>({})
  const [existingRecord, setExistingRecord] = useState<any>(null)
  const [remarks, setRemarks] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [checkedBy, setCheckedBy] = useState(userName)

  const [verifiedBy, setVerifiedBy] = useState("")
  const [verifiedSig, setVerifiedSig] = useState<string | null>(null)

  // Fetch existing record on date change
  const loadDateRecord = useCallback(async () => {
    setLoadingData(true)
    try {
      const res = await getMaintenanceRecordByDate(date)
      if (res.success && res.data) {
        setExistingRecord(res.data)
        setRemarks(res.data.remarks || "")
        if (Array.isArray(res.data.activities)) {
          const actMap: Record<string, any> = {}
          res.data.activities.forEach((item: any) => {
            actMap[item.activity] = {
              ml800Morning: item.ml800Morning || "",
              ml800Night: item.ml800Night || "",
              ml425Morning: item.ml425Morning || "",
              ml425Night: item.ml425Night || "",
            }
          })
          setActivities(actMap)
        }
      } else {
        setExistingRecord(null)
        setActivities({})
      }
    } catch (err: any) {
      console.error("Error loading date record:", err)
    } finally {
      setLoadingData(false)
    }
  }, [date])

  useEffect(() => {
    loadDateRecord()
  }, [loadDateRecord])

  function handleActivityChange(machine: string, field: "ml800Morning" | "ml800Night" | "ml425Morning" | "ml425Night", value: string) {
    setActivities(prev => ({
      ...prev,
      [machine]: {
        ...(prev[machine] || { ml800Morning: "", ml800Night: "", ml425Morning: "", ml425Night: "" }),
        [field]: value
      }
    }))
  }

  const currentFieldKey = selectedLine === "800ML"
    ? (selectedShift === "MORNING" ? "ml800Morning" : "ml800Night")
    : (selectedShift === "MORNING" ? "ml425Morning" : "ml425Night")

  const draft = useMaintenanceDraft("maintenance-record", {
    values: () => ({ date, selectedLine, selectedShift, activities, checkedBy, remarks }),
    apply: (v) => {
      setDate(v.date)
      if (v.selectedLine) setSelectedLine(v.selectedLine)
      if (v.selectedShift) setSelectedShift(v.selectedShift)
      setActivities(v.activities)
      setCheckedBy(v.checkedBy)
      if (v.remarks) setRemarks(v.remarks)
    },
  })

  async function handleSubmit() {
    if (!signature) {
      setError(`Supervisor signature is required for ${selectedLine} - ${selectedShift} SHIFT.`)
      return
    }

    if (!checkedBy.trim()) {
      setError("Please specify the supervisor name (Checked By).")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Extract current shift activities
      const shiftActivities: Record<string, string> = {}
      MACHINES.forEach(machine => {
        shiftActivities[machine] = activities[machine]?.[currentFieldKey] || ""
      })

      const res = await saveMaintenanceShiftRecord({
        date: new Date(date),
        line: selectedLine,
        shift: selectedShift,
        activities: shiftActivities,
        checkedBy,
        signature,
        verifiedBy: verifiedBy.trim() || undefined,
        verifiedSig: verifiedSig || undefined,
        remarks,
      })

      if (res.success) {
        await draft.clearDraft()
        if (res.data) {
          setExistingRecord(res.data)
        }
        setSuccess(true)
      } else {
        setError(res.error || "Failed to submit form.")
      }
    } catch (err: any) {
      setError(err?.message || "Failed to submit form.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center max-w-2xl mx-auto mt-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2 uppercase">Shift Record Submitted</h2>
        <p className="text-gray-500 mb-8 font-medium">
          The record for <span className="font-bold text-slate-800">{selectedLine} ({selectedShift} SHIFT)</span> on <span className="font-bold text-slate-800">{date}</span> has been securely saved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={async () => {
              setSuccess(false)
              setIsSubmitting(false)
              setSignature(null)
              setVerifiedSig(null)
              setError("")
              await loadDateRecord()
            }}
            className="inline-flex items-center justify-center bg-blue-700 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-blue-800 transition-colors shadow-md"
          >
            Submit Another Shift
          </button>
          <Link href="/forms/maintenance/reports/maintenance-record" className="inline-flex items-center justify-center bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-md">
            View Maintenance Report
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link href="/forms/maintenance" className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-blue-400/20">
                  <Wrench className="w-3.5 h-3.5 mr-2" /> SGMP-04/MR
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Maintenance Record</h1>
              <p className="text-slate-400 font-medium">Record maintenance status with 4 supervisor shift signatures.</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          <DraftBanner draft={draft} />
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-bold text-sm">
              {error}
            </div>
          )}

          {/* Date & Shift Status Overview */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Record Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Line Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Production Line</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  {(["800ML", "425ML"] as LineType[]).map(line => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setSelectedLine(line)}
                      className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        selectedLine === line
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shift Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Shift</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
                  {(["MORNING", "NIGHT"] as ShiftType[]).map(shift => (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => setSelectedShift(shift)}
                      className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        selectedShift === shift
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {shift}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Shift Status Badges */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Daily Shifts Status ({date})</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "800ML Morning", sig: existingRecord?.signature800M, name: existingRecord?.checkedBy800M, line: "800ML", shift: "MORNING" },
                  { label: "800ML Night", sig: existingRecord?.signature800N, name: existingRecord?.checkedBy800N, line: "800ML", shift: "NIGHT" },
                  { label: "425ML Morning", sig: existingRecord?.signature425M, name: existingRecord?.checkedBy425M, line: "425ML", shift: "MORNING" },
                  { label: "425ML Night", sig: existingRecord?.signature425N, name: existingRecord?.checkedBy425N, line: "425ML", shift: "NIGHT" },
                ].map((item, idx) => {
                  const isCurrent = selectedLine === item.line && selectedShift === item.shift
                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedLine(item.line as LineType)
                        setSelectedShift(item.shift as ShiftType)
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isCurrent 
                          ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/50" 
                          : "bg-white border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-[11px] font-black uppercase text-slate-800">{item.label}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {item.sig ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Signed ({item.name})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Active Shift Input Header */}
          <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block">Currently Editing</span>
                <span className="text-base font-black text-slate-900 uppercase">{selectedLine} — {selectedShift} SHIFT</span>
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase">19 Maintenance Activities</div>
          </div>

          {/* Table */}
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600 border-r border-gray-200 w-1/3">
                      Maintenance Activity
                    </th>
                    <th colSpan={2} className={`px-4 py-2 font-black uppercase tracking-wider text-xs text-center border-r border-gray-200 border-b ${selectedLine === "800ML" ? "bg-blue-100/70 text-blue-900" : "text-slate-600"}`}>
                      800ML
                    </th>
                    <th colSpan={2} className={`px-4 py-2 font-black uppercase tracking-wider text-xs text-center border-b ${selectedLine === "425ML" ? "bg-blue-100/70 text-blue-900" : "text-slate-600"}`}>
                      425ML
                    </th>
                  </tr>
                  <tr>
                    <th className={`px-4 py-2 font-bold text-xs border-r border-gray-200 ${currentFieldKey === "ml800Morning" ? "bg-blue-200/60 text-blue-950 font-black" : "text-slate-500"}`}>
                      Morning Shift {currentFieldKey === "ml800Morning" && "★"}
                    </th>
                    <th className={`px-4 py-2 font-bold text-xs border-r border-gray-200 ${currentFieldKey === "ml800Night" ? "bg-blue-200/60 text-blue-950 font-black" : "text-slate-500"}`}>
                      Night Shift {currentFieldKey === "ml800Night" && "★"}
                    </th>
                    <th className={`px-4 py-2 font-bold text-xs border-r border-gray-200 ${currentFieldKey === "ml425Morning" ? "bg-blue-200/60 text-blue-950 font-black" : "text-slate-500"}`}>
                      Morning Shift {currentFieldKey === "ml425Morning" && "★"}
                    </th>
                    <th className={`px-4 py-2 font-bold text-xs ${currentFieldKey === "ml425Night" ? "bg-blue-200/60 text-blue-950 font-black" : "text-slate-500"}`}>
                      Night Shift {currentFieldKey === "ml425Night" && "★"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {MACHINES.map((machine, index) => (
                    <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-3 font-bold text-slate-700 uppercase text-xs border-r border-gray-200">
                        {machine}
                      </td>
                      <td className={`p-1 border-r border-gray-200 ${currentFieldKey === "ml800Morning" ? "bg-blue-50/40" : ""}`}>
                        <input 
                          type="text" 
                          value={activities[machine]?.ml800Morning || ""}
                          onChange={(e) => handleActivityChange(machine, "ml800Morning", e.target.value)}
                          className={`w-full h-full p-2 outline-none font-medium text-slate-700 ${currentFieldKey === "ml800Morning" ? "bg-transparent font-bold text-blue-900" : "bg-transparent"}`}
                          placeholder="-"
                        />
                      </td>
                      <td className={`p-1 border-r border-gray-200 ${currentFieldKey === "ml800Night" ? "bg-blue-50/40" : ""}`}>
                        <input 
                          type="text" 
                          value={activities[machine]?.ml800Night || ""}
                          onChange={(e) => handleActivityChange(machine, "ml800Night", e.target.value)}
                          className={`w-full h-full p-2 outline-none font-medium text-slate-700 ${currentFieldKey === "ml800Night" ? "bg-transparent font-bold text-blue-900" : "bg-transparent"}`}
                          placeholder="-"
                        />
                      </td>
                      <td className={`p-1 border-r border-gray-200 ${currentFieldKey === "ml425Morning" ? "bg-blue-50/40" : ""}`}>
                        <input 
                          type="text" 
                          value={activities[machine]?.ml425Morning || ""}
                          onChange={(e) => handleActivityChange(machine, "ml425Morning", e.target.value)}
                          className={`w-full h-full p-2 outline-none font-medium text-slate-700 ${currentFieldKey === "ml425Morning" ? "bg-transparent font-bold text-blue-900" : "bg-transparent"}`}
                          placeholder="-"
                        />
                      </td>
                      <td className={`p-1 ${currentFieldKey === "ml425Night" ? "bg-blue-50/40" : ""}`}>
                        <input 
                          type="text" 
                          value={activities[machine]?.ml425Night || ""}
                          onChange={(e) => handleActivityChange(machine, "ml425Night", e.target.value)}
                          className={`w-full h-full p-2 outline-none font-medium text-slate-700 ${currentFieldKey === "ml425Night" ? "bg-transparent font-bold text-blue-900" : "bg-transparent"}`}
                          placeholder="-"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="State any remarks or maintenance findings..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
            />
          </div>

          {/* Shift Supervisor Signature Section */}
          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Shift Supervisor Verification ({selectedLine} - {selectedShift} SHIFT)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Supervisor Name (Checked By) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={checkedBy}
                      onChange={(e) => setCheckedBy(e.target.value)}
                      placeholder="e.g. Supervisor Name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <SignaturePadClient
                      onSave={setSignature}
                      label={`Supervisor Signature (${selectedLine} ${selectedShift}) *`}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-200 md:pl-6 pt-4 md:pt-0">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                      QA / Manager (Verified By - Optional)
                    </label>
                    <input
                      type="text"
                      value={verifiedBy}
                      onChange={(e) => setVerifiedBy(e.target.value)}
                      placeholder="e.g. QA Executive / Plant Manager"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <SignaturePadClient
                      onSave={setVerifiedSig}
                      label={`Verifier Signature (Optional)`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:justify-end">
            <SaveDraftButton draft={draft} disabled={isSubmitting} />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? "Submitting..." : `Save ${selectedLine} (${selectedShift}) Record`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

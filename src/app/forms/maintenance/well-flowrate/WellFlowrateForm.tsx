"use client"

import { useRef, useState, useMemo } from "react"
import { submitWellFlowrate } from "./actions"
import {
  Loader2,
  CheckCircle2,
  Droplets,
  User,
  Calendar,
  Gauge,
  FileText,
  Calculator,
  Power,
  Clock,
  Sparkles,
} from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceFormElementDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

interface WellFlowrateFormProps {
  userName: string
}

interface WellTimeState {
  isOff: boolean
  minutes: string
  seconds: string
}

const INITIAL_WELL_STATE: WellTimeState = {
  isOff: false,
  minutes: "",
  seconds: "",
}

const WELL_KEYS = [2, 3, 4, 7, 8, 12] as const

export function WellFlowrateForm({ userName }: WellFlowrateFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  // State for each well
  const [wellTimes, setWellTimes] = useState<Record<number, WellTimeState>>({
    2: { ...INITIAL_WELL_STATE },
    3: { ...INITIAL_WELL_STATE },
    4: { ...INITIAL_WELL_STATE },
    7: { ...INITIAL_WELL_STATE },
    8: { ...INITIAL_WELL_STATE },
    12: { ...INITIAL_WELL_STATE },
  })

  const formRef = useRef<HTMLFormElement>(null)
  const draft = useMaintenanceFormElementDraft("well-flowrate", formRef)

  const getDefaultDateTime = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - offset).toISOString().slice(0, 16)
  }

  // Helper to compute flowrate from time
  const computeFlowrateInfo = (state: WellTimeState) => {
    if (state.isOff) {
      return {
        formatted: "OFF",
        totalSeconds: 0,
        flowrateLh: null,
      }
    }

    const m = parseInt(state.minutes || "0", 10) || 0
    const s = parseInt(state.seconds || "0", 10) || 0
    const totalSeconds = m * 60 + s

    if (totalSeconds <= 0) {
      return {
        formatted: "",
        totalSeconds: 0,
        flowrateLh: null,
      }
    }

    // Formula: (18 / Z) * 3600
    const flowrate = (18 / totalSeconds) * 3600
    const rounded = Math.round(flowrate * 100) / 100
    const timeLabel = m > 0 ? `${m}m ${s}s` : `${s}s`

    return {
      formatted: `${rounded.toFixed(2)} L/h (${timeLabel})`,
      totalSeconds,
      flowrateLh: rounded,
      timeLabel,
    }
  }

  const handleWellChange = (wellNum: number, field: "minutes" | "seconds", value: string) => {
    setWellTimes((prev) => ({
      ...prev,
      [wellNum]: {
        ...prev[wellNum],
        [field]: value,
      },
    }))
  }

  const toggleWellOff = (wellNum: number) => {
    setWellTimes((prev) => ({
      ...prev,
      [wellNum]: {
        ...prev[wellNum],
        isOff: !prev[wellNum].isOff,
      },
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!signature) {
      setError("Please sign the form using the digital signature pad before submitting.")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.append("performedSignature", signature)

    // Append calculated well values into formData
    WELL_KEYS.forEach((num) => {
      const info = computeFlowrateInfo(wellTimes[num])
      formData.set(`well${num}`, info.formatted)
    })

    const res = await submitWellFlowrate(formData)

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      setSignature(null)
      setWellTimes({
        2: { ...INITIAL_WELL_STATE },
        3: { ...INITIAL_WELL_STATE },
        4: { ...INITIAL_WELL_STATE },
        7: { ...INITIAL_WELL_STATE },
        8: { ...INITIAL_WELL_STATE },
        12: { ...INITIAL_WELL_STATE },
      })
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "An error occurred while submitting the form.")
    }
    setLoading(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <DraftBanner draft={draft} />

      {success && (
        <div className="bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-200 flex items-center font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0" />
          <span>Well Flowrate record has been successfully recorded!</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-900 p-4 rounded-xl border border-rose-200 font-medium shadow-sm">
          {error}
        </div>
      )}

      {/* Date, Time & PIC Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <Calendar className="w-4 h-4 mr-1.5 text-sky-600" />
            Date &amp; Time <span className="text-rose-500 ml-1">*</span>
          </label>
          <input
            type="datetime-local"
            name="dateTime"
            required
            defaultValue={getDefaultDateTime()}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-medium text-slate-800"
          />
          <p className="text-xs text-slate-500">Select inspection date and time.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <User className="w-4 h-4 mr-1.5 text-sky-600" />
            Person In Charge (PIC Name) <span className="text-rose-500 ml-1">*</span>
          </label>
          <input
            type="text"
            name="picName"
            required
            defaultValue={userName}
            placeholder="Enter PIC Name"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-medium text-slate-800"
          />
          <p className="text-xs text-slate-500">Name of officer logging the reading.</p>
        </div>
      </div>

      {/* Well Flowrate Readings Section (With 18L Fill Formula) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-sky-950 flex items-center">
              <Gauge className="w-5 h-5 mr-2 text-sky-600" />
              Well Flowrate Readings (18L Container Filling Test)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter time taken to fill 18-liter container in Minutes &amp; Seconds. The system auto-calculates Liter/Hour (L/h).
            </p>
          </div>
          <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1 text-[11px] font-bold text-sky-800 inline-flex items-center shrink-0">
            <Calculator className="w-3.5 h-3.5 mr-1 text-sky-600" />
            Formula: (18L ÷ Z sec) × 3,600 = L/h
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {WELL_KEYS.map((num) => {
            const state = wellTimes[num]
            const info = computeFlowrateInfo(state)

            return (
              <div
                key={num}
                className={`p-5 rounded-2xl border transition-all space-y-3.5 ${
                  state.isOff
                    ? "bg-slate-100 border-slate-300 opacity-80"
                    : "bg-white border-slate-200 shadow-sm hover:border-sky-300"
                }`}
              >
                {/* Well Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets
                      className={`w-4 h-4 ${state.isOff ? "text-slate-400" : "text-sky-500"}`}
                    />
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Well {num}
                    </label>
                  </div>

                  {/* Toggle OFF / Running Button */}
                  <button
                    type="button"
                    onClick={() => toggleWellOff(num)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      state.isOff
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                    title={state.isOff ? "Click to Activate" : "Click to set OFF"}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {state.isOff ? "OFF" : "Active"}
                  </button>
                </div>

                {/* Inputs: Minutes & Seconds */}
                {!state.isOff ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Minutes
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={state.minutes}
                            onChange={(e) => handleWellChange(num, "minutes", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold text-slate-800 text-center"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                            m
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                          Seconds
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="0"
                            value={state.seconds}
                            onChange={(e) => handleWellChange(num, "seconds", e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none font-bold text-slate-800 text-center"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                            s
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto Computed Flowrate Badge */}
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        info.flowrateLh !== null
                          ? "bg-sky-50 border-sky-200 text-sky-950"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      {info.flowrateLh !== null ? (
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                            <span>Computed Flowrate:</span>
                            <span className="text-[10px] text-sky-600 font-bold">
                              Z = {info.totalSeconds}s
                            </span>
                          </div>
                          <div className="text-xl font-black text-sky-700">
                            {info.flowrateLh.toFixed(2)}{" "}
                            <span className="text-xs font-bold">L/h</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            (18 ÷ {info.totalSeconds}s) × 3,600
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-slate-400 py-1">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          <span>Fill minutes &amp; seconds</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Well is OFF */
                  <div className="p-4 bg-slate-200/60 rounded-xl text-center space-y-1">
                    <p className="text-xs font-bold text-slate-600">PUMP IS OFF</p>
                    <p className="text-[11px] text-slate-400">
                      Well {num} is marked inactive / not extracting.
                    </p>
                  </div>
                )}

                {/* Hidden input to carry formatted value */}
                <input type="hidden" name={`well${num}`} value={info.formatted} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
          <FileText className="w-4 h-4 mr-1.5 text-slate-500" />
          Remarks / Additional Notes (Optional)
        </label>
        <textarea
          name="remarks"
          rows={3}
          placeholder="Enter any observations, pump maintenance status, pressure readings, or operational anomalies..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-medium text-slate-800"
        ></textarea>
      </div>

      {/* Signature Pad Section */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
          PIC Digital Signature <span className="text-rose-500 ml-1">*</span>
        </label>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <SignaturePadClient onSave={setSignature} />
        </div>
        <p className="text-xs text-slate-500">
          Sign above to verify and certify the recorded well flowrate values.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <SaveDraftButton draft={draft} />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              formRef.current?.reset()
              setSignature(null)
              setWellTimes({
                2: { ...INITIAL_WELL_STATE },
                3: { ...INITIAL_WELL_STATE },
                4: { ...INITIAL_WELL_STATE },
                7: { ...INITIAL_WELL_STATE },
                8: { ...INITIAL_WELL_STATE },
                12: { ...INITIAL_WELL_STATE },
              })
              setError("")
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting Flowrate...
              </>
            ) : (
              "Submit Flowrate"
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

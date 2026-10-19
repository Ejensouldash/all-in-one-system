"use client"

import { useRef, useState, useMemo } from "react"
import { submitWaterQualityRO } from "./actions"
import {
  Loader2,
  CheckCircle2,
  Droplets,
  User,
  Calendar,
  Activity,
  Zap,
  Sparkles,
  FileText,
  Calculator,
  ShieldCheck,
} from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceFormElementDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

interface WaterQualityROFormProps {
  userName: string
}

const PH_OPTIONS = ["6.5", "6.6", "6.7", "6.8", "6.9", "7.0", "Others"]

export function WaterQualityROForm({ userName }: WaterQualityROFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  // Form Field States for live reactivity
  const [phSelection, setPhSelection] = useState("6.8")
  const [phCustom, setPhCustom] = useState("")
  const [condBefore, setCondBefore] = useState<string>("")
  const [condAfter, setCondAfter] = useState<string>("")
  const [turbidity, setTurbidity] = useState<string>("No")
  const [colour, setColour] = useState<string>("Clear")
  const [smell, setSmell] = useState<string>("Okay")

  const formRef = useRef<HTMLFormElement>(null)
  const draft = useMaintenanceFormElementDraft("water-quality-ro", formRef)

  // Current local datetime formatted for datetime-local input (YYYY-MM-DDTHH:mm)
  const getDefaultDateTime = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - offset).toISOString().slice(0, 16)
  }

  // Live calculation of Conductivity Performance %
  const performanceCalc = useMemo(() => {
    const before = parseFloat(condBefore)
    const after = parseFloat(condAfter)

    if (isNaN(before) || isNaN(after) || before <= 0) {
      return null
    }

    // Formula: ((Before - After) / Before) * 100
    const diff = before - after
    const perf = (diff / before) * 100
    const rounded = Math.round(perf * 100) / 100

    return {
      before,
      after,
      diff,
      percentage: rounded,
      isValid: true,
    }
  }, [condBefore, condAfter])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (phSelection === "Others" && !phCustom.trim()) {
      setError("Please specify the custom pH reading value.")
      return
    }

    if (!signature) {
      setError("Please provide your digital signature using the pad below before submitting.")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.append("performedSignature", signature)

    const res = await submitWaterQualityRO(formData)

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      setSignature(null)
      setCondBefore("")
      setCondAfter("")
      setPhSelection("6.8")
      setPhCustom("")
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "An error occurred while submitting the record.")
    }
    setLoading(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <DraftBanner draft={draft} />

      {success && (
        <div className="bg-emerald-50 text-emerald-900 p-4 rounded-xl border border-emerald-200 flex items-center font-medium shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0" />
          <span>Water Quality Testing Record (RO) has been saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-900 p-4 rounded-xl border border-rose-200 font-medium shadow-sm">
          {error}
        </div>
      )}

      {/* Date, Time & PIC Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <Calendar className="w-4 h-4 mr-1.5 text-teal-600" />
            Date &amp; Time <span className="text-rose-500 ml-1">*</span>
          </label>
          <input
            type="datetime-local"
            name="dateTime"
            required
            defaultValue={getDefaultDateTime()}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium text-slate-800"
          />
          <p className="text-xs text-slate-500">Inspection date and sampling time.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
            <User className="w-4 h-4 mr-1.5 text-teal-600" />
            Person In Charge (PIC Name) <span className="text-rose-500 ml-1">*</span>
          </label>
          <input
            type="text"
            name="picName"
            required
            defaultValue={userName}
            placeholder="Enter PIC Name"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium text-slate-800"
          />
          <p className="text-xs text-slate-500">Name of officer conducting water quality analysis.</p>
        </div>
      </div>

      {/* Section 1: Physical Water Quality Parameters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-teal-600" />
            Physical Water Quality Parameters
          </h3>
          <span className="text-xs font-medium text-slate-500">RO Treated Water Output</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* pH Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              pH Reading <span className="text-rose-500">*</span>
            </label>
            <select
              name="phSelection"
              value={phSelection}
              onChange={(e) => setPhSelection(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
            >
              {PH_OPTIONS.map((val) => (
                <option key={val} value={val}>
                  {val === "Others" ? "Others (Custom pH)" : `pH ${val}`}
                </option>
              ))}
            </select>

            {phSelection === "Others" && (
              <input
                type="text"
                name="phCustom"
                value={phCustom}
                onChange={(e) => setPhCustom(e.target.value)}
                placeholder="Enter pH e.g. 7.2"
                className="w-full px-3 py-2 rounded-xl border border-teal-300 bg-teal-50/50 font-bold text-teal-900 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            )}
            <p className="text-[11px] text-slate-400">Pre-filtered RO permeate pH level</p>
          </div>

          {/* Turbidity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Turbidity <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  turbidity === "No"
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="turbidity"
                  value="No"
                  checked={turbidity === "No"}
                  onChange={() => setTurbidity("No")}
                  className="sr-only"
                />
                No (Clear)
              </label>
              <label
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  turbidity === "Yes"
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="turbidity"
                  value="Yes"
                  checked={turbidity === "Yes"}
                  onChange={() => setTurbidity("Yes")}
                  className="sr-only"
                />
                Yes (Turbid)
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Visual suspended particles</p>
          </div>

          {/* Colour */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Colour <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  colour === "Clear"
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="colour"
                  value="Clear"
                  checked={colour === "Clear"}
                  onChange={() => setColour("Clear")}
                  className="sr-only"
                />
                Clear
              </label>
              <label
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  colour === "Not Clear"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="colour"
                  value="Not Clear"
                  checked={colour === "Not Clear"}
                  onChange={() => setColour("Not Clear")}
                  className="sr-only"
                />
                Not Clear
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Sample coloration</p>
          </div>

          {/* Smell */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Smell / Odour <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  smell === "Okay"
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="smell"
                  value="Okay"
                  checked={smell === "Okay"}
                  onChange={() => setSmell("Okay")}
                  className="sr-only"
                />
                Okay
              </label>
              <label
                className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  smell === "Not Okay"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="smell"
                  value="Not Okay"
                  checked={smell === "Not Okay"}
                  onChange={() => setSmell("Not Okay")}
                  className="sr-only"
                />
                Not Okay
              </label>
            </div>
            <p className="text-[11px] text-slate-400">Odour evaluation</p>
          </div>
        </div>
      </div>

      {/* Section 2: RO Conductivity & Performance (With Live Auto-Calculation) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-teal-600" />
            Conductivity &amp; RO Performance Efficiency
          </h3>
          <span className="text-xs font-medium text-slate-500">Auto-calculated formula</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          {/* Conductivity Before */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Conductivity Before</span>
              <span className="text-slate-400 text-[11px] font-normal">Feed Water</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                name="condBefore"
                placeholder="e.g. 250"
                value={condBefore}
                onChange={(e) => setCondBefore(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-slate-800 text-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                μS/cm
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Conductivity before RO filtration</p>
          </div>

          {/* Conductivity After */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Conductivity After</span>
              <span className="text-slate-400 text-[11px] font-normal">Permeate</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                name="condAfter"
                placeholder="e.g. 8"
                value={condAfter}
                onChange={(e) => setCondAfter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-slate-800 text-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                μS/cm
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Conductivity after RO membrane filtration</p>
          </div>

          {/* Auto Computed Performance % Card */}
          <div
            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              performanceCalc
                ? performanceCalc.percentage >= 90
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : performanceCalc.percentage >= 80
                  ? "bg-amber-50 border-amber-300 text-amber-950"
                  : "bg-rose-50 border-rose-300 text-rose-950"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider">
                  Conductivity Performance %
                </span>
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-[11px] text-slate-500">
                Formula: ((Before - After) / Before) × 100%
              </p>
            </div>

            <div className="my-3">
              <div className="text-3xl font-black tracking-tight">
                {performanceCalc ? `${performanceCalc.percentage.toFixed(2)}%` : "0.00%"}
              </div>
              {performanceCalc && (
                <p className="text-xs font-medium mt-1">
                  ({performanceCalc.before} - {performanceCalc.after}) ÷ {performanceCalc.before} × 100
                </p>
              )}
            </div>

            <div className="text-[11px] font-bold">
              {performanceCalc ? (
                performanceCalc.percentage >= 90 ? (
                  <span className="text-emerald-700 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Optimum Rejection (&gt;=90%)
                  </span>
                ) : (
                  <span className="text-amber-700">Sub-optimal Rejection (&lt;90%)</span>
                )
              ) : (
                <span className="text-slate-400">Enter Before &amp; After values to auto-compute</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: UV Disinfection System Parameters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-teal-600" />
            UV Sterilizer Operational Status
          </h3>
          <span className="text-xs font-medium text-slate-500">Lamp performance &amp; runtime</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* UV Intensity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              UV Intensity
            </label>
            <input
              type="text"
              name="uvIntensity"
              placeholder="e.g. 98% or 45 mW/cm²"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <p className="text-[11px] text-slate-400">Lamp radiation output percentage</p>
          </div>

          {/* UV Operating Hour */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              UV Operating Hour
            </label>
            <input
              type="text"
              name="uvOperatingHours"
              placeholder="e.g. 1,450 hrs"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <p className="text-[11px] text-slate-400">Accumulated lamp run hours</p>
          </div>

          {/* UV Total Running Days */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              UV Total Running Days
            </label>
            <input
              type="text"
              name="uvRunningDays"
              placeholder="e.g. 165 days"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <p className="text-[11px] text-slate-400">Total days in service</p>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
          <FileText className="w-4 h-4 mr-1.5 text-slate-500" />
          Remarks / Operational Notes (Optional)
        </label>
        <textarea
          name="remarks"
          rows={3}
          placeholder="Enter any chemical dosing, CIP sanitization notes, membrane performance, or anomalies..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all font-medium text-slate-800"
        ></textarea>
      </div>

      {/* Digital Signature Pad Section */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
          PIC Digital Signature <span className="text-rose-500 ml-1">*</span>
        </label>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <SignaturePadClient onSave={setSignature} />
        </div>
        <p className="text-xs text-slate-500">
          Sign above to certify and verify the water testing readings.
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
              setCondBefore("")
              setCondAfter("")
              setPhSelection("6.8")
              setPhCustom("")
              setError("")
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting Record...
              </>
            ) : (
              "Submit Water Quality Record"
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

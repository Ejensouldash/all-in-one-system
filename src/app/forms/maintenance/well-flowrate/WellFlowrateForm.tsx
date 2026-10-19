"use client"

import { useRef, useState } from "react"
import { submitWellFlowrate } from "./actions"
import { Loader2, CheckCircle2, Droplets, User, Calendar, Clock, Gauge, FileText } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceFormElementDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

interface WellFlowrateFormProps {
  userName: string
}

export function WellFlowrateForm({ userName }: WellFlowrateFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const draft = useMaintenanceFormElementDraft("well-flowrate", formRef)

  // Current local datetime formatted for datetime-local input (YYYY-MM-DDTHH:mm)
  const getDefaultDateTime = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16)
    return localISOTime
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

    const res = await submitWellFlowrate(formData)

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      setSignature(null)
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

      {/* Well Flowrate Readings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-sky-950 flex items-center">
            <Gauge className="w-5 h-5 mr-2 text-sky-600" />
            Well Flowrate Readings
          </h3>
          <span className="text-xs font-medium text-slate-500">Enter reading or status (e.g. 15.5 m³/h, OFF, RUNNING)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Well 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Well 2</label>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <input
              type="text"
              name="well2"
              placeholder="e.g. 12.5 m³/h or OFF"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Well 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Well 3</label>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <input
              type="text"
              name="well3"
              placeholder="e.g. 15.0 m³/h or OFF"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Well 4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Well 4</label>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <input
              type="text"
              name="well4"
              placeholder="e.g. 18.2 m³/h or OFF"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Well 7 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Well 7</label>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <input
              type="text"
              name="well7"
              placeholder="e.g. 20.1 m³/h or OFF"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Well 8 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Well 8</label>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <input
              type="text"
              name="well8"
              placeholder="e.g. 14.8 m³/h or OFF"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
            />
          </div>

          {/* Well 12 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">Well 12</label>
              <Droplets className="w-4 h-4 text-sky-500" />
            </div>
            <input
              type="text"
              name="well12"
              placeholder="e.g. 16.4 m³/h or OFF"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all font-semibold text-slate-800"
            />
          </div>
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
          placeholder="Enter any observations, maintenance notes, or pump operational status..."
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
                Submitting...
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

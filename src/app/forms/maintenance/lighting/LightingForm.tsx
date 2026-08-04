"use client"

import { useEffect, useRef, useState } from "react"
import { submitLightingInspection } from "./actions"
import { Loader2, CheckCircle2 } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { applyFormValues, readFormValues, useMaintenanceDraft, type FormValues } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

export function LightingForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [isOthers, setIsOthers] = useState(false)
  const [resultsOption, setResultsOption] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)

  // The "Others" free-text field only mounts once isOthers is true, so restoring runs in two
  // phases: set the state, then write the field values on the render where they exist.
  const pendingFieldsRef = useRef<FormValues | null>(null)
  const [restoreTick, setRestoreTick] = useState(0)
  useEffect(() => {
    if (!pendingFieldsRef.current) return
    applyFormValues(formRef.current, pendingFieldsRef.current)
    pendingFieldsRef.current = null
  }, [restoreTick])

  const draft = useMaintenanceDraft<{ fields: FormValues; isOthers: boolean; resultsOption: string }>(
    "lighting",
    {
      values: () => ({ fields: readFormValues(formRef.current), isOthers, resultsOption }),
      apply: (v) => {
        setIsOthers(v.isOthers)
        setResultsOption(v.resultsOption ?? "")
        pendingFieldsRef.current = v.fields
        setRestoreTick(t => t + 1)
      },
    }
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!signature) {
      setError("Sila tandatangan borang sebelum menghantar.")
      return
    }
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    formData.append("performedSignature", signature)
    const res = await submitLightingInspection(formData)
    
    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      setSignature(null)
      setResultsOption("")
      setIsOthers(false)
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "Something went wrong")
    }
    setLoading(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <DraftBanner draft={draft} />

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-center font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          Lighting Inspection Record submitted successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date of Inspection <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            name="date" 
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Coverage Area <span className="text-red-500">*</span></label>
          <select 
            name="coverageArea" 
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all bg-white"
          >
            <option value="">Select Area</option>
            <option value="Production Area">Production Area</option>
            <option value="Warehouse A">Warehouse A</option>
            <option value="Warehouse B">Warehouse B</option>
            <option value="Office Area">Office Area</option>
            <option value="Outside Compound">Outside Compound</option>
            <option value="Toilet/Changing Room">Toilet/Changing Room</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Results <span className="text-red-500">*</span></label>
          {/* Named either way so a draft can capture the choice; the action only reads "results". */}
          <select
            name={isOthers ? "resultsOption" : "results"}
            value={resultsOption}
            onChange={(e) => {
              setResultsOption(e.target.value)
              setIsOthers(e.target.value === "Others")
            }}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all bg-white"
          >
            <option value="">Select Result</option>
            <option value="OK - All lights functioning">OK - All lights functioning</option>
            <option value="NOT OK - Faulty/Flickering">NOT OK - Faulty/Flickering</option>
            <option value="NOT OK - Missing bulb">NOT OK - Missing bulb</option>
            <option value="NOT OK - Broken casing">NOT OK - Broken casing</option>
            <option value="Others">Others (Please specify)</option>
          </select>
          {isOthers && (
            <input 
              type="text" 
              name="results" 
              required
              placeholder="Please specify..."
              className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Action Taken</label>
          <input 
            type="text" 
            name="action" 
            placeholder="e.g. Changed tube, reported to wireman..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Performed By <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="performedBy" 
            required
            defaultValue={userName}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2 md:col-span-2 border-t border-gray-200 pt-6">
          <SignaturePadClient 
            onSave={setSignature}
            label="Staff Signature (Tandatangan Kakitangan) *"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
        <SaveDraftButton draft={draft} disabled={loading} />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-yellow-950 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
          ) : (
            "Submit Record"
          )}
        </button>
      </div>
    </form>
  )
}

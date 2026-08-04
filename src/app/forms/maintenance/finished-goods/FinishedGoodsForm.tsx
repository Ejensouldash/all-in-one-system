"use client"

import { useRef, useState } from "react"
import { submitFinishedGoodsInspection } from "./actions"
import { Loader2, CheckCircle2, PackageX } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceFormElementDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

export function FinishedGoodsForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const draft = useMaintenanceFormElementDraft("finished-goods", formRef)

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
    const res = await submitFinishedGoodsInspection(formData)
    
    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
      setSignature(null)
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "Something went wrong")
    }
    setLoading(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <DraftBanner draft={draft} />

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-center font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          Finished Goods Inspection Record submitted successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date of Inspection <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            name="date" 
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
          />
        </div>
        
        {/* Quantity of Damage Section */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-800 bg-red-100 px-4 py-2 inline-block rounded-t-lg border-b-2 border-red-500 mb-4">
            Quantity of Damage Boxes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            
            {/* 425ML */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center">
                <PackageX className="w-4 h-4 mr-2 text-gray-400" /> 425ML Category
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">425ML x 24</label>
                  <input 
                    type="number" 
                    name="qtyDamage425x24" 
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-center font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">425ML x 6</label>
                  <input 
                    type="number" 
                    name="qtyDamage425x6" 
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 800ML */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center">
                <PackageX className="w-4 h-4 mr-2 text-gray-400" /> 800ML Category
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">800ML x 12</label>
                  <input 
                    type="number" 
                    name="qtyDamage800x12" 
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-center font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">800ML x 20</label>
                  <input 
                    type="number" 
                    name="qtyDamage800x20" 
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-center font-bold"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Action Taken</label>
          <input 
            type="text" 
            name="actionTaken" 
            placeholder="e.g. Change Box, Repack, Reject..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Performed By <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="performedBy" 
            required
            defaultValue={userName}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Remarks</label>
          <input 
            type="text" 
            name="remarks" 
            placeholder="Any additional notes..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
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
          className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
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

"use client"

import { useRef, useState } from "react"
import { submitFoodHandlerForm } from "./actions"
import { Loader2, CheckCircle2 } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceFormElementDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"

export function FoodHandlerForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const checklistItems = [
    { name: "hairnet", label: "Hairnet" },
    { name: "facemask", label: "Facemask" },
    { name: "cleanUniform", label: "Clean Uniform" },
    { name: "shoes", label: "Proper Shoes" },
    { name: "glove", label: "Gloves" },
    { name: "fingernails", label: "Short/Clean Fingernails" },
    { name: "noJewellery", label: "No Jewellery/Accessories" },
  ]

  const formRef = useRef<HTMLFormElement>(null)
  const draft = useMaintenanceFormElementDraft("food-handler", formRef)

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
    const res = await submitFoodHandlerForm(formData)
    
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
          Food Handler Inspection Record submitted successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            name="date" 
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Name of Employee <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="employeeName" 
            required
            placeholder="Enter employee's full name"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
          />
        </div>
        
        {/* Checklist Section */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-orange-800 bg-orange-100 px-4 py-2 inline-block rounded-t-lg border-b-2 border-orange-500 mb-4">
            Hygiene & PPE Checklist
          </h3>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-6 font-medium">
              Check the boxes if the employee is wearing proper protective clothing or meets the criteria.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {checklistItems.map((item) => (
                <label 
                  key={item.name} 
                  className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-all group"
                >
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name={item.name}
                      className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded-full cursor-pointer checked:bg-orange-500 checked:border-orange-500 transition-all"
                    />
                    <CheckCircle2 className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <span className="ml-3 font-bold text-gray-700 group-hover:text-orange-900 transition-colors text-sm">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                * Examples of Jewellery/Accessories: Rings, Necklaces, Bracelets, Watch, Hijab pin, Safety pin.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Checked By <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="checkedBy" 
            required
            defaultValue={userName}
            className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
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
          className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-orange-950 font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
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

"use client"

import { useState, useEffect } from "react"
import { submitWasteDisposalForm } from "./actions"
import { Loader2, CheckCircle2, CheckSquare } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

export function WasteDisposalForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  // Auto-set the time to now when component mounts
  const [currentTime, setCurrentTime] = useState("")
  useEffect(() => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    setCurrentTime(`${hours}:${mins}`)
  }, [])

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
    const res = await submitWasteDisposalForm(formData)
    
    if (res.success) {
      setSuccess(true)
      setSignature(null)
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "Something went wrong")
    }
    setLoading(false)
  }

  const areas = [
    { name: "feederArea", label: "Feeder Area" },
    { name: "labelArea", label: "Label Area" },
    { name: "fillingArea", label: "Filling Area" },
    { name: "packagingArea", label: "Packaging Area" },
    { name: "changingRoom", label: "Changing Room" },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-center font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          Waste Disposal Inspection Record submitted successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            name="date" 
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Inspection Time <span className="text-red-500">*</span></label>
          <input 
            type="time" 
            name="inspectionTime" 
            required
            defaultValue={currentTime}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          />
        </div>
        
        {/* Checklist Section */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-teal-800 bg-teal-100 px-4 py-2 inline-block rounded-t-lg border-b-2 border-teal-500 mb-4">
            Waste Disposal Area Checklist
          </h3>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-6 font-medium">
              Please inspect the following areas and check the box if waste has been properly disposed of.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {areas.map((area) => (
                <label 
                  key={area.name} 
                  className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-teal-50 hover:border-teal-200 transition-all group"
                >
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      name={area.name}
                      className="peer appearance-none w-6 h-6 border-2 border-gray-300 rounded cursor-pointer checked:bg-teal-500 checked:border-teal-500 transition-all"
                    />
                    <CheckSquare className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <span className="ml-3 font-bold text-gray-700 group-hover:text-teal-900 transition-colors uppercase tracking-wide text-sm">
                    {area.label}
                  </span>
                </label>
              ))}
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
            className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2 md:col-span-2 border-t border-gray-200 pt-6">
          <SignaturePadClient 
            onSave={setSignature}
            label="Staff Signature (Tandatangan Kakitangan) *"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
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

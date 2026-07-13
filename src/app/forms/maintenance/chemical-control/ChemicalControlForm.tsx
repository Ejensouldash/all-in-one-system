"use client"

import { useState, useEffect } from "react"
import { submitChemicalControlForm } from "./actions"
import { Loader2, CheckCircle2, FlaskConical, Clock } from "lucide-react"

export function ChemicalControlForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  
  // Auto-set current time
  const [currentTime, setCurrentTime] = useState("")
  useEffect(() => {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const mins = String(now.getMinutes()).padStart(2, '0')
    setCurrentTime(`${hours}:${mins}`)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const res = await submitChemicalControlForm(formData)
    
    if (res.success) {
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "Something went wrong")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-center font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          Chemical Control Record submitted successfully!
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
            className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
          />
        </div>

        {/* Section: Taking Chemical */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-purple-800 bg-purple-100 px-4 py-2 inline-block rounded-t-lg border-b-2 border-purple-500 mb-4 flex items-center w-fit">
            <FlaskConical className="w-4 h-4 mr-2" /> Taking Chemical
          </h3>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Chemical Code <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="chemicalCode" 
                required
                placeholder="e.g. 01, 02, 03..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Fill in the chemical code based on your reference table.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Time Taken <span className="text-red-500">*</span></label>
              <input 
                type="time" 
                name="timeTaken" 
                required
                defaultValue={currentTime}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Taken By <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="takenBy" 
                required
                defaultValue={userName}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section: Returning Chemical (Optional) */}
        <div className="md:col-span-2 mt-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-600 bg-gray-100 px-4 py-2 inline-block rounded-t-lg border-b-2 border-gray-400 mb-4 flex items-center w-fit">
            <Clock className="w-4 h-4 mr-2" /> Returning Chemical (Optional)
          </h3>
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <p className="text-sm text-gray-500 md:col-span-2 font-medium">
              You can leave this blank if you are only recording the collection right now.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Time Return</label>
              <input 
                type="time" 
                name="timeReturn" 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Return By</label>
              <input 
                type="text" 
                name="returnBy" 
                placeholder="Name of person returning"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
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

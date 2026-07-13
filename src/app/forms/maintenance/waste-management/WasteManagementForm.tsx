"use client"

import { useState } from "react"
import { submitWasteManagementForm } from "./actions"
import { Loader2, CheckCircle2, Recycle, Trash } from "lucide-react"

export function WasteManagementForm({ userName }: { userName: string }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"recycle" | "disposal">("recycle")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const res = await submitWasteManagementForm(formData)
    
    if (res.success) {
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 5000)
    } else {
      setError(res.error || "Something went wrong")
    }
    setLoading(false)
  }

  const categories = [
    { name: "Plastic Bottle", key: "PlasticBottle" },
    { name: "Cap", key: "Cap" },
    { name: "Carton Box", key: "CartonBox" },
    { name: "Label", key: "Label" },
    { name: "Others", key: "Others" },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-200 flex items-center font-medium">
          <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
          Waste Management Record submitted successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date of Record <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            name="date" 
            required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
          />
        </div>
        
        {/* Tab Selection */}
        <div className="md:col-span-2 mt-4">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("recycle")}
              className={`py-3 px-6 font-bold uppercase tracking-widest text-sm border-b-4 transition-colors flex items-center ${
                activeTab === "recycle" 
                  ? "border-green-500 text-green-700 bg-green-50/50 rounded-t-lg" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Recycle className="w-5 h-5 mr-2" />
              Recycle
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("disposal")}
              className={`py-3 px-6 font-bold uppercase tracking-widest text-sm border-b-4 transition-colors flex items-center ${
                activeTab === "disposal" 
                  ? "border-gray-800 text-gray-900 bg-gray-100 rounded-t-lg" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Trash className="w-5 h-5 mr-2" />
              Disposal
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-6 font-medium">
              Enter the weight/quantity for each category below. You may leave unused fields blank.
            </p>
            
            {/* Recycle Inputs */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 ${activeTab === 'recycle' ? 'block' : 'hidden'}`}>
              {categories.map((cat) => (
                <div key={`recycle-${cat.key}`} className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {cat.name}
                  </label>
                  <input 
                    type="text" 
                    name={`recycle${cat.key}`} 
                    placeholder="e.g. 5kg, 2 bags..."
                    className="w-full px-4 py-3 rounded-xl border border-green-100 bg-green-50/30 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Disposal Inputs */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 ${activeTab === 'disposal' ? 'block' : 'hidden'}`}>
              {categories.map((cat) => (
                <div key={`disposal-${cat.key}`} className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {cat.name}
                  </label>
                  <input 
                    type="text" 
                    name={`disposal${cat.key}`} 
                    placeholder="e.g. 5kg, 2 bags..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-gray-800 focus:border-gray-800 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Checked By <span className="text-red-500">*</span></label>
        <input 
          type="text" 
          name="checkedBy" 
          required
          defaultValue={userName}
          className="w-full md:w-1/2 px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
        />
        <p className="text-xs text-gray-500 mt-1">Recorded as your signature.</p>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-70"
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

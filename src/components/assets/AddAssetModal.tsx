"use client"

import { useState } from "react"
import { createAsset } from "@/app/actions/asset"
import { Plus, X, AlertCircle } from "lucide-react"

export function AddAssetModal({ units }: { units: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setIsPending(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await createAsset(formData)
    
    setIsPending(false)
    if (!res.success) {
      setError(res.error || "Failed to create asset")
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors text-sm font-bold w-full sm:w-auto justify-center"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Asset
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg flex items-center">
                <Plus className="h-5 w-5 mr-2 text-blue-500" /> Manually Add Asset
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full p-2 transition-colors border border-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center border border-red-100"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Category *</label>
                  <input type="text" name="category" required placeholder="e.g. Laptop, Monitor" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Brand *</label>
                  <input type="text" name="brand" required placeholder="e.g. Dell, HP, Apple" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Model *</label>
                  <input type="text" name="model" required placeholder="e.g. Latitude 5420" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Serial Number</label>
                  <input type="text" name="serialNumber" placeholder="Optional" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Barcode / Tag ID</label>
                  <input type="text" name="barcode" placeholder="Optional" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Location</label>
                  <input type="text" name="location" placeholder="e.g. Server Room, Desk 12" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Initial Status</label>
                  <select name="status" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="ACTIVE">Active / Deployed</option>
                    <option value="MAINTENANCE">In Maintenance</option>
                    <option value="BROKEN">Broken</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assign To Department</label>
                  <select name="unitId" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- No Department --</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Assignee Name</label>
                  <input type="text" name="assigneeName" placeholder="e.g. John Doe (Optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button disabled={isPending} type="submit" className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-70">
                  {isPending ? "Saving..." : "Save Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

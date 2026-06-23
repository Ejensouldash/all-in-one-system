"use client"

import { useState } from "react"
import { addAssetLog } from "@/app/actions/asset"
import { PenTool, Check, Loader2 } from "lucide-react"

export function MaintenanceLogForm({ assetId, currentStatus }: { assetId: string, currentStatus: string }) {
  const [isPending, setIsPending] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setSuccess(false)
    
    try {
      const formData = new FormData(e.currentTarget)
      await addAssetLog(assetId, formData)
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error(error)
      alert("Failed to add log")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-6 flex items-center">
        <PenTool className="w-4 h-4 mr-2" /> Add Audit Entry
      </h3>
      
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Action Type</label>
            <select name="action" required className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
              <option value="REPAIRED">Hardware Repaired</option>
              <option value="MAINTENANCE">Routine Maintenance</option>
              <option value="REASSIGNED">Reassigned to User</option>
              <option value="STATUS_CHANGED">Status Changed</option>
              <option value="SOFTWARE_UPDATE">Software Update</option>
              <option value="OTHER">Other Activity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update Status To</label>
            <select name="newStatus" defaultValue="" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50">
              <option value="">-- No Change ({currentStatus}) --</option>
              <option value="ACTIVE">Active (Working)</option>
              <option value="MAINTENANCE">In Maintenance</option>
              <option value="BROKEN">Broken / Faulty</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Detailed Notes</label>
          <textarea 
            name="description" 
            required 
            rows={3} 
            placeholder="Describe the maintenance performed..."
            className="w-full border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 resize-none"
          ></textarea>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center transition-colors disabled:opacity-70 text-sm shadow-md"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : success ? (
              <><Check className="w-4 h-4 mr-2" /> Log Added</>
            ) : (
              "Submit Entry"
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

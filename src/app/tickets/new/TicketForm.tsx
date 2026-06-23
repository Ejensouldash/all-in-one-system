"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createTicket } from "@/app/actions/ticket"
import { AlertCircle, Send } from "lucide-react"

export function TicketForm({ assets }: { assets: any[] }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const res = await createTicket(formData)
    
    if (res.success) {
      router.push("/tickets")
    } else {
      setError(res.error || "Failed to submit ticket.")
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center border border-red-100">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
        <input type="text" name="title" required placeholder="e.g. Printer is jammed" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select name="priority" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Related Asset (Optional)</label>
          <select name="linkedAssetId" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
            <option value="">-- None --</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.id}>{asset.brand} {asset.model} ({asset.serialNumber || 'No SN'})</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Showing assets assigned to you.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea name="description" required rows={6} placeholder="Please provide detailed information about the problem..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"></textarea>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-2.5 rounded-lg transition-colors disabled:opacity-70 shadow-sm flex items-center justify-center">
          {isSubmitting ? "Submitting..." : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Ticket
            </>
          )}
        </button>
      </div>
    </form>
  )
}

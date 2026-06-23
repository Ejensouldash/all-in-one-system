"use client"

import { useState } from "react"
import { createEvent } from "@/app/actions/event"
import { CalendarPlus, Loader2, AlertCircle } from "lucide-react"

export function EventForm({ itStaff }: { itStaff: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const res = await createEvent(formData)
    
    if (res && !res.success) {
      setError(res.error || "Failed to create event")
    } else {
      e.currentTarget.reset()
    }
    
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Event Title</label>
        <input type="text" name="title" required placeholder="Server Maintenance" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description (Optional)</label>
        <textarea name="description" rows={3} placeholder="Details about the task..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Time</label>
          <input type="datetime-local" name="startDateTime" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Time</label>
          <input type="datetime-local" name="endDateTime" required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assign IT Staff (Optional)</label>
        <select name="assigneeId" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          <option value="">Unassigned</option>
          {itStaff.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
        </select>
      </div>

      {error && (
        <div className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded flex items-center border border-red-100">
          <AlertCircle className="h-3 w-3 mr-1" /> {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center shadow-sm disabled:opacity-70"
      >
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : <><CalendarPlus className="h-4 w-4 mr-2" /> Add Event</>}
      </button>
    </form>
  )
}

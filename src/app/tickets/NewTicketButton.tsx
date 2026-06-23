"use client"

import { Plus } from "lucide-react"

export function NewTicketButton() {
  return (
    <button 
      onClick={() => window.dispatchEvent(new CustomEvent('open-ticket-modal'))} 
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center"
    >
      <Plus className="h-4 w-4 mr-2" />
      New Ticket
    </button>
  )
}

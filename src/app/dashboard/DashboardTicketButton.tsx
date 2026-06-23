"use client"

import { ExternalLink } from "lucide-react"

export function DashboardTicketButton() {
  return (
    <button 
      onClick={() => window.dispatchEvent(new CustomEvent('open-ticket-modal'))} 
      className="block w-full text-left px-4 py-3 bg-white hover:bg-gray-50 transition-colors rounded-lg text-sm font-medium border border-gray-200 shadow-sm hover:shadow group flex items-center justify-between"
    >
      Submit a Request <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
    </button>
  )
}

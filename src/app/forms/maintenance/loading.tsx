import React from "react"
import { Loader2 } from "lucide-react"

export default function MaintenanceLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-pulse">
      <Loader2 className="h-10 w-10 text-blue-700 animate-spin" />
      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
        Loading Maintenance module...
      </p>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, FileSpreadsheet, LayoutDashboard } from "lucide-react"

export function MaintenanceTabs() {
  const pathname = usePathname()

  const isReports = pathname.startsWith("/forms/maintenance/reports")
  const isDashboard = pathname.startsWith("/forms/maintenance/dashboard")
  const isForms = !isReports && !isDashboard

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        <Link 
          href="/forms/maintenance"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            isForms
              ? "border-blue-700 text-blue-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ClipboardList className="w-5 h-5 mr-2" />
          Forms
        </Link>

        <Link 
          href="/forms/maintenance/dashboard"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            isDashboard
              ? "border-blue-700 text-blue-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mr-2" />
          Dashboard
        </Link>

        <Link 
          href="/forms/maintenance/reports"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            isReports
              ? "border-blue-700 text-blue-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <FileSpreadsheet className="w-5 h-5 mr-2" />
          Reports
        </Link>
      </div>
    </div>
  )
}

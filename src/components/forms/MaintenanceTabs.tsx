"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, FileSpreadsheet, LayoutDashboard, Activity, Boxes, ShieldCheck } from "lucide-react"

export function MaintenanceTabs({ userModules = [] }: { userModules?: string[] }) {
  const pathname = usePathname()

  const isReports = pathname.startsWith("/forms/maintenance/reports")
  const isDashboard = pathname.startsWith("/forms/maintenance/dashboard")
  const isSummary = pathname.startsWith("/forms/maintenance/summary")
  const isPallet = pathname.startsWith("/forms/maintenance/pallet-transfer")
  const isCompliance = pathname.startsWith("/forms/maintenance/compliance")
  const isForms = !isReports && !isDashboard && !isSummary && !isPallet && !isCompliance
  
  // If no modules provided (e.g. from client component), default to showing all to avoid breakage,
  // or handle gracefully. Usually it's better to hide if not included, but if array is empty
  // we might want to be careful. Actually, let's just use it to hide.
  const hasForms = userModules.length === 0 || userModules.includes("MAINTENANCE_FORMS")
  const hasDashboard = userModules.length === 0 || userModules.includes("MAINTENANCE_DASHBOARD")
  const hasReports = userModules.length === 0 || userModules.includes("MAINTENANCE_REPORTS")
  const hasSummary = userModules.length === 0 || userModules.includes("MAINTENANCE_SUMMARY")
  const hasPallet = userModules.length === 0 || userModules.includes("PALLET_LEDGER") || userModules.includes("WAREHOUSE")
  const hasCompliance = userModules.length === 0 || 
    userModules.includes("MAINTENANCE_FORMS") || 
    userModules.includes("MAINTENANCE_SUMMARY") || 
    userModules.includes("MAINTENANCE_REPORTS") || 
    userModules.includes("MAINTENANCE_DASHBOARD")

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        {hasForms && (
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
        )}

        {hasDashboard && (
          <Link 
            href="/forms/maintenance/dashboard"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isDashboard
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-2" />
            Maintenance Inventory
          </Link>
        )}

        {hasReports && (
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
        )}

        {hasSummary && (
          <Link 
            href="/forms/maintenance/summary"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isSummary
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Activity className="w-5 h-5 mr-2" />
            Summary
          </Link>
        )}

        {hasCompliance && (
          <Link 
            href="/forms/maintenance/compliance"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isCompliance
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            Compliance
          </Link>
        )}

        {hasPallet && (
          <Link
            href="/forms/maintenance/pallet-transfer"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isPallet
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Boxes className="w-5 h-5 mr-2" />
            Pallet Ledger
          </Link>
        )}
      </div>
    </div>
  )
}

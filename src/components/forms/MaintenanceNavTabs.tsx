"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wrench, PackageOpen, Bell } from "lucide-react"

export function MaintenanceNavTabs({ userModules = [] }: { userModules?: string[] }) {
  const pathname = usePathname()

  const isNotifications = pathname.startsWith("/forms/maintenance/tickets/notifications")
  const isTickets = pathname.startsWith("/forms/maintenance/tickets") && !isNotifications
  const isDashboard = pathname.startsWith("/forms/maintenance/dashboard")

  const hasTickets = userModules.length === 0 || 
    userModules.includes("MAINTENANCE_TICKETS_MANAGE") || 
    userModules.includes("MAINTENANCE_FORMS") || 
    userModules.includes("MAINTENANCE_DASHBOARD") ||
    userModules.includes("MAINTENANCE_REPORTS") ||
    userModules.includes("MAINTENANCE_SUMMARY")

  const hasDashboard = userModules.length === 0 || 
    userModules.includes("MAINTENANCE_DASHBOARD")

  const hasNotifications = userModules.length === 0 || 
    userModules.includes("MAINTENANCE_TICKETS_MANAGE")

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        {hasTickets && (
          <Link 
            href="/forms/maintenance/tickets"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isTickets
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Wrench className="w-5 h-5 mr-2" />
            Work Requests
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
            <PackageOpen className="w-5 h-5 mr-2" />
            Maintenance Inventory
          </Link>
        )}

        {hasNotifications && (
          <Link 
            href="/forms/maintenance/tickets/notifications"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isNotifications
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Bell className="w-5 h-5 mr-2" />
            Email Alerts
          </Link>
        )}
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wrench, ClipboardList, PackageOpen, Bell, Boxes } from "lucide-react"

export function MaintenanceNavTabs({ 
  userModules = [],
  isSuperAdmin = false,
}: { 
  userModules?: string[]
  isSuperAdmin?: boolean
}) {
  const pathname = usePathname()

  const isNotifications = pathname.startsWith("/forms/maintenance/tickets/notifications")
  const isRequests = pathname.startsWith("/forms/maintenance/tickets/service-requests")
  const isAssets = pathname.startsWith("/forms/maintenance/assets")
  const isTickets = pathname.startsWith("/forms/maintenance/tickets") && !isNotifications && !isRequests
  const isDashboard = pathname.startsWith("/forms/maintenance/dashboard")

  // 1st tier: Can manage work orders, assign PIC, track KPI & costing
  // Superadmin, tickets page context, empty modules fallback, or users with maintenance management permissions
  const canManage = isSuperAdmin || 
    isTickets ||
    userModules.length === 0 || 
    userModules.includes("MAINTENANCE_TICKETS_MANAGE") ||
    userModules.includes("GMP_FORMS") ||
    userModules.includes("MAINTENANCE_FORMS")

  // 2nd tier floor/department requests: Accessible to all
  const hasRequests = true

  // FMS Inventory / Stock: Accessible to Superadmin & maintenance users or if currently on dashboard
  const hasDashboard = isSuperAdmin || 
    isDashboard ||
    userModules.length === 0 || 
    userModules.includes("MAINTENANCE_DASHBOARD") ||
    userModules.includes("GMP_FORMS") ||
    userModules.includes("MAINTENANCE_FORMS") ||
    userModules.includes("MAINTENANCE_TICKETS_MANAGE")

  // FMS Asset (NRHO): Accessible to Superadmin or users with MAINTENANCE_ASSETS
  const hasAssets = isSuperAdmin || 
    isAssets ||
    userModules.includes("MAINTENANCE_ASSETS")

  const hasNotifications = canManage

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        {/* Tab 1: FMS Work Request */}
        {canManage && (
          <Link 
            href="/forms/maintenance/tickets"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isTickets
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Wrench className="w-5 h-5 mr-2" />
            FMS Work Request
          </Link>
        )}

        {/* Tab 2: Service Request */}
        {hasRequests && (
          <Link 
            href="/forms/maintenance/tickets/service-requests"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isRequests
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ClipboardList className="w-5 h-5 mr-2" />
            Service Request
          </Link>
        )}

        {/* Tab 3: FMS Inventory */}
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
            FMS Inventory
          </Link>
        )}

        {/* Tab 4: FMS Asset (NRHO) */}
        {hasAssets && (
          <Link 
            href="/forms/maintenance/assets"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              isAssets
                ? "border-blue-700 text-blue-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Boxes className="w-5 h-5 mr-2" />
            FMS Asset
          </Link>
        )}

        {/* Tab 5: Email Alerts (Management) */}
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

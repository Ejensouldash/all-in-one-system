"use client"

import { LogOut, User, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

export function Topbar({ 
  user, 
  onMenuClick,
  isCollapsed,
  onToggleCollapse
}: { 
  user: any, 
  onMenuClick?: () => void,
  isCollapsed?: boolean,
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()

  let title = "Dashboard"
  if (
    pathname.startsWith("/forms/maintenance/tickets") || 
    pathname.startsWith("/forms/maintenance/dashboard") ||
    pathname.startsWith("/forms/maintenance/assets")
  ) title = "Facilities Maintenance"
  else if (pathname.includes("/forms/maintenance/pallet-transfer")) title = "Pallet Ledger"
  else if (pathname.includes("/forms/maintenance")) title = "GMP & Quality"
  else if (pathname.includes("/forms/warehouse/trace")) title = "DO Traceability & Logistics"
  else if (pathname.includes("/forms/warehouse/gatepass")) title = "Warehouse Gatepass"
  else if (pathname.includes("/forms/warehouse/distribution")) title = "Distribution Orders"
  else if (pathname.includes("/forms/warehouse")) title = "Warehouse Management"
  else if (pathname.includes("/forms/production")) title = "Daily Production Report"
  else if (pathname.includes("/forms/sales-ordering")) title = "Sales Ordering"
  else if (pathname.includes("/forms")) title = "Forms & Operations"
  else if (pathname.startsWith("/tickets")) title = "Tickets"
  else if (pathname.includes("/dashboard/assets")) title = "Assets"
  else if (pathname.includes("/users")) title = "Users"
  else if (pathname.includes("/calendar")) title = "Event Calendar"
  else if (pathname.includes("/organization")) title = "Organization"
  else if (pathname.includes("/settings")) title = "Settings"

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 shadow-sm sticky top-0 z-30 transition-colors">
      <div className="flex items-center">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="mr-3 md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse}
            title={isCollapsed ? "Kembangkan Sidebar (Expand)" : "Kecilkan Sidebar (Minimize)"}
            className="hidden md:flex mr-3 p-2 -ml-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors items-center justify-center"
          >
            {isCollapsed ? <PanelLeftOpen className="h-5 w-5 text-blue-600" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 p-1.5 rounded-full">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
        </div>
        
        <div className="h-6 w-px bg-gray-300 mx-2"></div>
        
        <button 
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    </header>
  )
}

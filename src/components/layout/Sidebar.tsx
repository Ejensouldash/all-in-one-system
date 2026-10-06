"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  LayoutDashboard, 
  Ticket, 
  Package, 
  FileText, 
  Calendar,
  BellRing,
  Settings,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  QrCode,
  X,
  ShoppingCart,
  Factory,
  Warehouse,
  Wrench,
  ClipboardCheck,
  Briefcase
} from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isSubLinkActive(subHref: string, currentPath: string): boolean {
  const basePath = subHref.split('?')[0]
  if (basePath === "/forms/maintenance") {
    // Only active when strictly on /forms/maintenance (and not /forms/maintenance/tickets or /dashboard)
    return currentPath === "/forms/maintenance" || currentPath.startsWith("/forms/maintenance?")
  }
  return currentPath.startsWith(basePath)
}

type SubLink = {
  name: string
  href: string
  module?: string
  modules?: string[]
  restrictToWarehouseUnit?: boolean
}

type NavLink = {
  name: string
  href?: string
  icon: any
  module?: string
  modules?: string[]
  subLinks?: SubLink[]
}

const SOD_MODULES = [
  "SALES_ORDERING",
  "SALES_ORDERING_DASHBOARD",
  "SALES_ORDERING_CUSTOMERS",
  "SALES_ORDERING_DOCUMENTS",
  "SALES_ORDERING_INTAKE",
  "SALES_ORDERING_CREDIT_CHECK",
  "SALES_ORDERING_ORDERS",
  "SALES_ORDERING_CUSTOMERS_MANAGE",
  "SALES_ORDERING_DOCUMENT_MANAGE",
]

const staffLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "IT Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { name: "Sales Ordering", href: "/forms/sales-ordering", icon: ShoppingCart, modules: SOD_MODULES },
  {
    name: "Production",
    icon: Factory,
    subLinks: [
      { name: "Daily Report (Rantau)", href: "/forms/production", modules: ["FORMS", "PRODUCTION_STOCK", "HANDOVER"] },
      { name: "KBP — Batch QR (Pedas)", href: "/kbp", module: "KBP" },
    ],
  },
  {
    name: "Warehouse & Logistics",
    icon: Warehouse,
    subLinks: [
      { name: "Inventory & Distribution", href: "/forms/warehouse/dashboard", module: "WAREHOUSE", restrictToWarehouseUnit: true },
      { name: "Gatepass Planning", href: "/forms/warehouse/gatepass", modules: ["GATEPASS_REQUESTER", "WAREHOUSE_GATEPASS"] },
      { name: "Security Gate", href: "/forms/warehouse/gatepass/security", module: "SECURITY_GATEPASS" },
      { name: "Ambil Bahan (Withdrawal)", href: "/forms/warehouse/reports/raw-material", module: "RAW_MATERIAL_WITHDRAWAL" },
    ],
  },
  {
    name: "Facilities Maintenance",
    icon: Wrench,
    subLinks: [
      { name: "FMS Work Request", href: "/forms/maintenance/tickets", module: "MAINTENANCE_TICKETS_MANAGE" },
      { name: "Service Request", href: "/forms/maintenance/tickets/service-requests", modules: ["MAINTENANCE_FORMS", "MAINTENANCE_DASHBOARD", "MAINTENANCE_REPORTS", "MAINTENANCE_SUMMARY", "FORMS"] },
      { name: "FMS Inventory", href: "/forms/maintenance/dashboard", module: "MAINTENANCE_DASHBOARD" },
      { name: "FMS Asset", href: "/forms/maintenance/assets", module: "MAINTENANCE_ASSETS" },
      { name: "Purchase Requisition", href: "/forms/maintenance/purchase-requests", modules: ["MAINTENANCE_DASHBOARD", "MAINTENANCE_TICKETS_MANAGE", "MAINTENANCE_PR_APPROVE", "MAINTENANCE_FORMS"] },
    ],
  },
  {
    name: "GMP & Quality",
    icon: ClipboardCheck,
    subLinks: [
      { name: "GMP Checklists", href: "/forms/maintenance?_cache=bust", module: "MAINTENANCE_FORMS" },
      { name: "GMP Reports", href: "/forms/maintenance/reports", module: "MAINTENANCE_REPORTS" },
      { name: "Pallet Ledger", href: "/forms/maintenance/pallet-transfer", module: "PALLET_LEDGER" },
    ],
  },
  {
    name: "Business Development",
    icon: Briefcase,
    subLinks: [
      { name: "Customer Care", href: "/business-development/customer-care", modules: ["CUSTOMER_CARE_VIEW", "CUSTOMER_CARE_MANAGE"] },
    ],
  },
  { name: "Event Calendar", href: "/calendar", icon: Calendar, module: "EVENTS" },
  { name: "Reminders", href: "/reminders", icon: BellRing, module: "REMINDERS" },
  { name: "Assets", href: "/dashboard/assets", icon: Package, module: "ASSETS" },
]

const adminLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "IT Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { name: "Sales Ordering", href: "/forms/sales-ordering", icon: ShoppingCart, modules: SOD_MODULES },
  {
    name: "Production",
    icon: Factory,
    subLinks: [
      { name: "Daily Report (Rantau)", href: "/forms/production", modules: ["FORMS", "PRODUCTION_STOCK", "HANDOVER"] },
      { name: "KBP — Batch QR (Pedas)", href: "/kbp", module: "KBP" },
    ],
  },
  {
    name: "Warehouse & Logistics",
    icon: Warehouse,
    subLinks: [
      { name: "Inventory & Distribution", href: "/forms/warehouse/dashboard", module: "WAREHOUSE", restrictToWarehouseUnit: true },
      { name: "Gatepass Planning", href: "/forms/warehouse/gatepass", modules: ["GATEPASS_REQUESTER", "WAREHOUSE_GATEPASS"] },
      { name: "Security Gate", href: "/forms/warehouse/gatepass/security", module: "SECURITY_GATEPASS" },
      { name: "Ambil Bahan (Withdrawal)", href: "/forms/warehouse/reports/raw-material", module: "RAW_MATERIAL_WITHDRAWAL" },
    ],
  },
  {
    name: "Facilities Maintenance",
    icon: Wrench,
    subLinks: [
      { name: "FMS Work Request", href: "/forms/maintenance/tickets", module: "MAINTENANCE_TICKETS_MANAGE" },
      { name: "Service Request", href: "/forms/maintenance/tickets/service-requests", modules: ["MAINTENANCE_FORMS", "MAINTENANCE_DASHBOARD", "MAINTENANCE_REPORTS", "MAINTENANCE_SUMMARY", "FORMS"] },
      { name: "FMS Inventory", href: "/forms/maintenance/dashboard", module: "MAINTENANCE_DASHBOARD" },
      { name: "FMS Asset", href: "/forms/maintenance/assets", module: "MAINTENANCE_ASSETS" },
      { name: "Purchase Requisition", href: "/forms/maintenance/purchase-requests", modules: ["MAINTENANCE_DASHBOARD", "MAINTENANCE_TICKETS_MANAGE", "MAINTENANCE_PR_APPROVE", "MAINTENANCE_FORMS"] },
    ],
  },
  {
    name: "GMP & Quality",
    icon: ClipboardCheck,
    subLinks: [
      { name: "GMP Checklists", href: "/forms/maintenance?_cache=bust", module: "MAINTENANCE_FORMS" },
      { name: "GMP Reports", href: "/forms/maintenance/reports", module: "MAINTENANCE_REPORTS" },
      { name: "Pallet Ledger", href: "/forms/maintenance/pallet-transfer", module: "PALLET_LEDGER" },
    ],
  },
  {
    name: "Business Development",
    icon: Briefcase,
    subLinks: [
      { name: "Customer Care", href: "/business-development/customer-care", modules: ["CUSTOMER_CARE_VIEW", "CUSTOMER_CARE_MANAGE"] },
    ],
  },
  { name: "Event Calendar", href: "/calendar", icon: Calendar, module: "EVENTS" },
  { name: "Reminders", href: "/reminders", icon: BellRing, module: "REMINDERS" },
  { name: "Assets", href: "/dashboard/assets", icon: Package, module: "ASSETS" },
  { name: "Users", href: "/users", icon: Users, module: "USERS" },
  { 
    name: "Organization", 
    icon: Building2, 
    subLinks: [
      { name: "Structure", href: "/organization", module: "USERS" },
      { name: "User Activity Logs", href: "/organization/audit-logs", module: "USER_LOGS" }
    ]
  },
  { name: "Settings", href: "/settings", icon: Settings, module: "SETTINGS" },
]

export function Sidebar({ 
  role, 
  user, 
  onMobileClose,
  isCollapsed = false,
  onToggleCollapse
}: { 
  role: string, 
  user?: any, 
  onMobileClose?: () => void,
  isCollapsed?: boolean,
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname() || ""
  
  // State for accordion menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Auto-open menus if we are in their sub-route
    setOpenMenus(prev => {
      let next = { ...prev };
      if (pathname.startsWith("/forms/production") || pathname.startsWith("/kbp")) next["Production"] = true;
      if (pathname.startsWith("/forms/warehouse")) next["Warehouse & Logistics"] = true;
      if (
        pathname.startsWith("/forms/maintenance/tickets") || 
        pathname.startsWith("/forms/maintenance/dashboard") ||
        pathname.startsWith("/forms/maintenance/assets") ||
        pathname.startsWith("/forms/maintenance/purchase-requests")
      ) {
        next["Facilities Maintenance"] = true;
      } else if (pathname.startsWith("/forms/maintenance")) {
        next["GMP & Quality"] = true;
      }
      if (pathname.startsWith("/organization")) next["Organization"] = true;
      return next;
    });
  }, [pathname])

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }
  
  // Base links list (Superadmin gets all, others get staff)
  let allLinks = role === "SUPERADMIN" ? adminLinks : staffLinks

  // The user's explicitly granted modules
  const userModules = user?.modules || []

  // Filter links based on modules
  let links = allLinks.map(link => {
    let newLink = { ...link }
    if (newLink.subLinks) {
      newLink.subLinks = newLink.subLinks.filter(sub => {
        if (user?.trueRole === "SUPERADMIN") return true;
        
        if (sub.restrictToWarehouseUnit) {
          if (user?.unitName !== "Warehouse" || user?.branchName !== "BubblesO2 Rantau") {
            return false;
          }
        }
        
        if (sub.modules) {
          const hasAny = sub.modules.some(mod => userModules.includes(mod))
          if (!hasAny) {
            return false;
          }
        } else if (sub.module && !userModules.includes(sub.module)) {
          return false;
        }
        
        return true;
      })
    }
    return newLink;
  }).filter(link => {
    // Superadmin bypasses module checks entirely
    if (user?.trueRole === "SUPERADMIN") return true;

    // Everyone with access to anything sees Dashboard, unless BubblesO2 Rantau
    if (link.name === "Dashboard") return true
    
    // If it has sublinks, only show parent if there's at least one visible sublink
    if (link.subLinks) {
      return link.subLinks.length > 0;
    }

    // If the link has a module requirement, check if it's in the user's array
    if (link.modules) {
      return link.modules.some(mod => userModules.includes(mod))
    }
    if (link.module) {
      return userModules.includes(link.module)
    }
    return true
  })

  // Hide Dashboard for BubblesO2 Rantau (they only get their specific modules like Forms/Tickets)
  if (user?.branchName === "BubblesO2 Rantau") {
    links = links.filter(link => link.name !== "Dashboard")
  }

  return (
    <div className={cn(
      "flex h-screen flex-col bg-gray-900 text-white shadow-xl transition-all duration-300 relative select-none",
      isCollapsed ? "w-20 overflow-visible" : "w-64 overflow-y-auto"
    )}>
      {/* Header */}
      {isCollapsed ? (
        <div className="flex h-20 items-center justify-center border-b border-gray-800 px-2 shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Kembangkan Sidebar (Expand)"
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-blue-600/20 to-emerald-600/20 border border-blue-500/30 hover:border-blue-400 hover:scale-105 transition-all group cursor-pointer"
          >
            <span className="text-sm font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              B2
            </span>
            <span className="text-[8px] font-extrabold text-blue-400 tracking-wider">AIO</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between h-20 border-b border-gray-800 px-4 shrink-0 relative">
          <div className="flex-1 text-center pl-6">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              BubblesO2
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">AIO System</p>
          </div>
          
          {onToggleCollapse && (
            <button 
              type="button"
              onClick={onToggleCollapse}
              title="Kecilkan Sidebar (Minimize)"
              className="hidden md:flex p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          {onMobileClose && (
            <button 
              type="button"
              onClick={onMobileClose}
              className="md:hidden absolute right-4 top-6 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
      
      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 py-4",
        isCollapsed ? "px-2 overflow-visible" : "px-2 overflow-y-auto"
      )}>
        {links.map((link) => {
          const Icon = link.icon
          
          if (link.subLinks) {
            const isChildActive = link.subLinks.some(sub => isSubLinkActive(sub.href, pathname))
            
            if (isCollapsed) {
              return (
                <div key={link.name} className="relative group/flyout px-1 py-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onToggleCollapse?.()}
                    className={cn(
                      "h-10 w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer",
                      isChildActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                    title={link.name}
                  >
                    <Icon className="h-5 w-5" />
                  </button>

                  {/* Flyout Submenu on Hover */}
                  <div className="pointer-events-none group-hover/flyout:pointer-events-auto opacity-0 group-hover/flyout:opacity-100 transition-all duration-150 absolute left-full top-0 ml-2.5 w-56 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl p-2 z-50">
                    <div className="px-2.5 py-1.5 border-b border-gray-800 mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">{link.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">{link.subLinks.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {link.subLinks.map((subLink) => {
                        const isSubActive = isSubLinkActive(subLink.href, pathname)
                        return (
                          <Link
                            key={subLink.name}
                            href={subLink.href}
                            className={cn(
                              "block px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                              isSubActive
                                ? "bg-blue-600 text-white font-semibold"
                                : "text-gray-300 hover:bg-gray-800 hover:text-white"
                            )}
                          >
                            {subLink.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            }

            const isOpen = openMenus[link.name]
            return (
              <div key={link.name} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleMenu(link.name)}
                  className={cn(
                    "w-full group flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    isChildActive && !isOpen ? "text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}
                >
                  <div className="flex items-center">
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isChildActive ? "text-blue-400" : "text-gray-400 group-hover:text-gray-300"
                      )}
                      aria-hidden="true"
                    />
                    {link.name}
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {isOpen && (
                  <div className="pl-10 space-y-1">
                    {link.subLinks.map((subLink) => (
                      <Link
                        key={subLink.name}
                        href={subLink.href}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                          isSubLinkActive(subLink.href, pathname)
                            ? "bg-gray-800 text-white"
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}
                      >
                        {subLink.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const isActive = pathname.startsWith(link.href!)
          
          if (isCollapsed) {
            return (
              <div key={link.name} className="relative group/tooltip px-1 py-1 flex justify-center">
                <Link
                  href={link.href!}
                  className={cn(
                    "h-10 w-10 flex items-center justify-center rounded-xl transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                </Link>
                {/* Floating Tooltip */}
                <div className="pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50">
                  {link.name}
                </div>
              </div>
            )
          }

          return (
            <Link
              key={link.name}
              href={link.href!}
              className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-blue-400" : "text-gray-400 group-hover:text-gray-300"
                )}
                aria-hidden="true"
              />
              {link.name}
            </Link>
          )
        })}
      </nav>
      
      {/* Footer */}
      {isCollapsed ? (
        <div className="p-3 border-t border-gray-800 flex flex-col items-center mt-auto shrink-0 relative group/user">
          <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg cursor-pointer">
            {user?.name ? user.name.charAt(0).toUpperCase() : role.charAt(0)}
          </div>
          {/* Floating Profile Info */}
          <div className="pointer-events-none opacity-0 group-hover/user:opacity-100 transition-all duration-150 absolute left-full bottom-2 ml-2.5 p-2 bg-gray-900 text-white text-xs rounded-xl shadow-xl border border-gray-700 whitespace-nowrap z-50">
            <p className="font-bold text-gray-100">{user?.name || "Current User"}</p>
            <p className="text-[10px] text-blue-400 font-medium">{role}</p>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-800 flex flex-col mt-auto shrink-0">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : role.charAt(0)}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name || "Current User"}</p>
              <p className="text-xs font-medium text-blue-400 tracking-wide mt-0.5">{role}</p>
            </div>
          </div>
          <div className="text-[9px] text-gray-500 text-center leading-relaxed font-medium uppercase tracking-wider">
            All right reserve by Information Technology Department BubblesO2 2026
          </div>
        </div>
      )}
    </div>
  )
}

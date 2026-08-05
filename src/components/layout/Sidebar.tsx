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
  QrCode,
  X
} from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  subLinks?: SubLink[]
}

const staffLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { 
    name: 'Forms', 
    icon: FileText, 
    subLinks: [
      { name: "Production", href: "/forms/production", module: "FORMS" },
      { name: "Warehouse", href: "/forms/warehouse/dashboard", module: "WAREHOUSE", restrictToWarehouseUnit: true },
      { name: "Sales Ordering", href: "/forms/sales-ordering", modules: ["SALES_ORDERING", "SALES_ORDERING_DASHBOARD", "SALES_ORDERING_INTAKE", "SALES_ORDERING_ORDERS", "SALES_ORDERING_CUSTOMERS", "SALES_ORDERING_CUSTOMERS_MANAGE", "SALES_ORDERING_DOCUMENT_MANAGE"] },
      // Production staff who take raw material off the rack. Deliberately not unit-restricted:
      // they are not in the Warehouse unit, which is the whole point of the narrow grant.
      { name: "Ambil Bahan", href: "/forms/warehouse/reports/raw-material", module: "RAW_MATERIAL_WITHDRAWAL" },
      { name: "GMP", href: "/forms/maintenance?_cache=bust", modules: ["MAINTENANCE_FORMS", "MAINTENANCE_DASHBOARD", "MAINTENANCE_REPORTS"] },
    ]
  },
  { name: "KBP", href: "/kbp", icon: QrCode, module: "KBP" },
  { name: "Event Calendar", href: "/calendar", icon: Calendar, module: "EVENTS" },
  { name: "Reminders", href: "/reminders", icon: BellRing, module: "REMINDERS" },
  { name: "Assets", href: "/dashboard/assets", icon: Package, module: "ASSETS" },
]

const adminLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { 
    name: 'Forms', 
    icon: FileText, 
    subLinks: [
      { name: "Production", href: "/forms/production", module: "FORMS" },
      { name: "Warehouse", href: "/forms/warehouse/dashboard", module: "WAREHOUSE", restrictToWarehouseUnit: true },
      { name: "Sales Ordering", href: "/forms/sales-ordering", modules: ["SALES_ORDERING", "SALES_ORDERING_DASHBOARD", "SALES_ORDERING_INTAKE", "SALES_ORDERING_ORDERS", "SALES_ORDERING_CUSTOMERS", "SALES_ORDERING_CUSTOMERS_MANAGE", "SALES_ORDERING_DOCUMENT_MANAGE"] },
      // Production staff who take raw material off the rack. Deliberately not unit-restricted:
      // they are not in the Warehouse unit, which is the whole point of the narrow grant.
      { name: "Ambil Bahan", href: "/forms/warehouse/reports/raw-material", module: "RAW_MATERIAL_WITHDRAWAL" },
      { name: "GMP", href: "/forms/maintenance?_cache=bust", modules: ["MAINTENANCE_FORMS", "MAINTENANCE_DASHBOARD", "MAINTENANCE_REPORTS"] },
    ]
  },
  { name: "KBP", href: "/kbp", icon: QrCode, module: "KBP" },
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

export function Sidebar({ role, user, onMobileClose }: { role: string, user?: any, onMobileClose?: () => void }) {
  const pathname = usePathname() || ""
  
  // State for accordion menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Auto-open menus if we are in their sub-route
    setOpenMenus(prev => {
      let next = { ...prev };
      if (pathname.startsWith("/forms")) next["Forms"] = true;
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
      }).map(sub => {
        // Keep the name as "Maintenance Inventory" for users who only have access to the dashboard
        if (sub.name === "GMP" && user?.trueRole !== "SUPERADMIN") {
          const hasForms = userModules.includes("MAINTENANCE_FORMS");
          const hasReports = userModules.includes("MAINTENANCE_REPORTS");
          const hasDashboard = userModules.includes("MAINTENANCE_DASHBOARD");
          
          if (!hasForms && !hasReports && hasDashboard) {
            return { ...sub, name: "Maintenance Inventory" };
          }
        }
        return sub;
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
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white shadow-xl overflow-y-auto">
      <div className="flex flex-col h-20 items-center justify-center border-b border-gray-800 px-4 text-center shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          BubblesO2
        </h1>
        <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">AIO System</p>
        
        {/* Mobile Close Button */}
        {onMobileClose && (
          <button 
            onClick={onMobileClose}
            className="md:hidden absolute right-4 top-6 text-gray-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 px-2 py-4">
        {links.map((link) => {
          const Icon = link.icon
          
          if (link.subLinks) {
            const isOpen = openMenus[link.name]
            const isChildActive = link.subLinks.some(sub => pathname.startsWith(sub.href))
            
            return (
              <div key={link.name} className="space-y-1">
                <button
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
                          pathname.startsWith(subLink.href)
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
    </div>
  )
}

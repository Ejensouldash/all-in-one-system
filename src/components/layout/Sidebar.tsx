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
  Settings,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
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
}

type NavLink = {
  name: string
  href?: string
  icon: any
  module: string
  subLinks?: SubLink[]
}

const staffLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { 
    name: 'Forms', 
    icon: FileText, 
    module: "FORMS",
    subLinks: [
      { name: "KAR Daily Report", href: "/forms/production/daily-report" },
      { name: "My Submissions", href: "/forms/history" },
      { name: "Raw Material (Transfer In)", href: "/forms/transfer-in" },
      { name: "Warehouse Dashboard", href: "/forms/warehouse/dashboard" },
      { name: "Distribution & DO", href: "/forms/warehouse/distribution" },
      { name: "Quarantine & Returns", href: "/forms/warehouse/quarantine" },
    ]
  },
]

const adminLinks: NavLink[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { 
    name: 'Forms', 
    icon: FileText, 
    module: "FORMS",
    subLinks: [
      { name: "KAR Daily Report", href: "/forms/production/daily-report" },
      { name: "My Submissions", href: "/forms/history" },
      { name: "Raw Material (Transfer In)", href: "/forms/transfer-in" },
      { name: "Warehouse Dashboard", href: "/forms/warehouse/dashboard" },
      { name: "Distribution & DO", href: "/forms/warehouse/distribution" },
      { name: "Quarantine & Returns", href: "/forms/warehouse/quarantine" },
    ]
  },
  { name: "Event Calendar", href: "/calendar", icon: Calendar, module: "EVENTS" },
  { name: "Assets", href: "/assets", icon: Package, module: "WAREHOUSE" }, // Warehouse/Assets
  { name: "Users", href: "/users", icon: Users, module: "USERS" },
  { name: "Organization", href: "/organization", icon: Building2, module: "USERS" },
  { name: "Settings", href: "/settings", icon: Settings, module: "SETTINGS" },
]

export function Sidebar({ role, user, onMobileClose }: { role: string, user?: any, onMobileClose?: () => void }) {
  const pathname = usePathname() || ""
  
  // State for accordion menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Auto-open Forms menu if we are in a forms sub-route
    if (pathname.startsWith("/forms")) {
      setOpenMenus(prev => ({ ...prev, "Forms": true }))
    }
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
  let links = allLinks.filter(link => {
    // Superadmin bypasses module checks entirely
    if (user?.trueRole === "SUPERADMIN") return true;

    // Everyone with access to anything sees Dashboard, unless BubblesO2 Rantau
    if (link.name === "Dashboard") return true
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
                    {/* Categories for Forms */}
                    {link.name === "Forms" && (
                      <div className="pt-2 pb-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Production</p>
                        {link.subLinks.slice(0, 2).map((subLink) => (
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
                        
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mt-4 mb-1">Warehouse</p>
                        {link.subLinks.slice(2).map((subLink) => (
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

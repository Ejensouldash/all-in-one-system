"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Ticket, 
  Package, 
  FileText, 
  Calendar,
  Settings,
  Users,
  Building2,
  MonitorSmartphone,
  CalendarDays,
  LogOut,
  X
} from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const staffLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { name: 'Forms', href: '/forms', icon: FileText, module: "FORMS" },
]

const adminLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, module: "DASHBOARD" },
  { name: "Tickets", href: "/tickets", icon: Ticket, module: "TICKETS" },
  { name: 'Forms', href: '/forms', icon: FileText, module: "FORMS" },
  { name: "Event Calendar", href: "/calendar", icon: Calendar, module: "EVENTS" },
  { name: "Assets", href: "/assets", icon: Package, module: "WAREHOUSE" }, // Warehouse/Assets
  { name: "Users", href: "/users", icon: Users, module: "USERS" },
  { name: "Organization", href: "/organization", icon: Building2, module: "USERS" },
  { name: "Settings", href: "/settings", icon: Settings, module: "SETTINGS" },
]

export function Sidebar({ role, user, onMobileClose }: { role: string, user?: any, onMobileClose?: () => void }) {
  const pathname = usePathname() || ""
  
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
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white shadow-xl">
      <div className="flex flex-col h-20 items-center justify-center border-b border-gray-800 px-4 text-center">
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
          const isActive = pathname.startsWith(link.href)
          
          return (
            <Link
              key={link.name}
              href={link.href}
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
      <div className="p-4 border-t border-gray-800 flex flex-col mt-auto">
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

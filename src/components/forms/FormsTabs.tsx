"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, LayoutDashboard, Database } from "lucide-react"

export function FormsTabs({ role }: { role: string }) {
  const pathname = usePathname()

  // Match root forms, transfer-in, and daily report
  const isHome = pathname === "/forms" || 
                 (pathname.startsWith("/forms/") && 
                  !pathname.startsWith("/forms/dashboard") && 
                  !pathname.startsWith("/forms/database"))

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        <Link 
          href="/forms"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            isHome
              ? "border-emerald-500 text-emerald-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <ClipboardList className="w-5 h-5 mr-2" />
          Forms Home
        </Link>
        
        <Link 
          href="/forms/dashboard"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            pathname.startsWith("/forms/dashboard")
              ? "border-indigo-500 text-indigo-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mr-2" />
          Analytics
        </Link>

        {role === "SUPERADMIN" && (
          <Link 
            href="/forms/database"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              pathname.startsWith("/forms/database")
                ? "border-red-500 text-red-700" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Database className="w-5 h-5 mr-2" />
            Database
          </Link>
        )}
      </div>
    </div>
  )
}

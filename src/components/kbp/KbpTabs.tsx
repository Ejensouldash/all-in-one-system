"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, QrCode } from "lucide-react"

const TABS = [
  { href: "/kbp", label: "Dashboard", icon: LayoutDashboard, activeClass: "border-indigo-500 text-indigo-700", exact: true },
  { href: "/kbp/batch", label: "Generate Batch QR", icon: QrCode, activeClass: "border-yellow-500 text-yellow-700", exact: false },
]

export function KbpTabs() {
  const pathname = usePathname() || ""

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto print:hidden">
      <div className="flex space-x-8 min-w-max px-2">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
                isActive
                  ? tab.activeClass
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Layers, Box } from "lucide-react"

export function MarketingNavTabs() {
  const pathname = usePathname() || ""

  const tabs = [
    {
      name: "Forms",
      href: "/marketing/forms",
      icon: FileText,
      active: pathname.startsWith("/marketing/forms"),
    },
    {
      name: "Assets Management",
      href: "/marketing/assets",
      icon: Layers,
      active: pathname.startsWith("/marketing/assets"),
    },
    {
      name: "Inventory Management",
      href: "/marketing/inventory",
      icon: Box,
      active: pathname.startsWith("/marketing/inventory") || pathname.startsWith("/business-development/marketing/inventory"),
    },
  ]

  return (
    <div className="mb-8 border-b border-slate-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.active
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider transition-colors ${
                isActive
                  ? "border-b-4 border-blue-700 text-blue-700"
                  : "border-b-4 border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {tab.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

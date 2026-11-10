"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Receipt, Building2, ShoppingBag } from "lucide-react"

export function ProcurementTabs({
  userModules = [],
  isSuperAdmin = false,
}: {
  userModules?: string[]
  isSuperAdmin?: boolean
}) {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Invoice for Payment",
      href: "/procurement/invoices",
      icon: Receipt,
      active: pathname.startsWith("/procurement/invoices"),
    },
    {
      name: "Suppliers",
      href: "/procurement/suppliers",
      icon: Building2,
      active: pathname.startsWith("/procurement/suppliers"),
    },
    {
      name: "Purchases",
      href: "/procurement/purchases",
      icon: ShoppingBag,
      active: pathname.startsWith("/procurement/purchases"),
    },
  ]

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto py-2" aria-label="Procurement Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.active
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 font-black uppercase py-3 px-3 text-xs sm:text-sm border-b-4 tracking-wider transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
              <span>{tab.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

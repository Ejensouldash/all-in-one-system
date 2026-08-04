"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileSearch, LayoutDashboard, ShoppingCart, Users } from "lucide-react"

const tabs = [
  { label: "Dashboard", href: "/forms/sales-ordering", icon: LayoutDashboard },
  { label: "AI Intake", href: "/forms/sales-ordering/intake", icon: FileSearch },
  { label: "Sales Orders", href: "/forms/sales-ordering/orders", icon: ShoppingCart },
  { label: "Customers", href: "/forms/sales-ordering/customers", icon: Users },
]

export function SalesOrderingTabs() {
  const pathname = usePathname()
  return (
    <nav className="mb-7 flex gap-2 overflow-x-auto border-b border-slate-200" aria-label="Sales Ordering navigation">
      {tabs.map(tab => {
        const active = tab.href === "/forms/sales-ordering"
          ? pathname === tab.href
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-black transition ${active ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}


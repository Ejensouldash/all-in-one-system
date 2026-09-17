"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database, FileCheck, FileSearch, LayoutDashboard, ShieldCheck, ShoppingCart, Users } from "lucide-react"

type TabPermissions = {
  dashboard: boolean
  customers: boolean
  documents: boolean
  intake: boolean
  creditCheck: boolean
  orders: boolean
  isSuperAdmin?: boolean
}

export function SalesOrderingTabs({ permissions }: { permissions: TabPermissions }) {
  const pathname = usePathname()
  const visibleTabs = [
    ...(permissions.dashboard ? [{ label: "Dashboard", href: "/forms/sales-ordering", icon: LayoutDashboard }] : []),
    ...(permissions.customers ? [{ label: "Customers", href: "/forms/sales-ordering/customers", icon: Users }] : []),
    ...(permissions.documents ? [{ label: "Documents", href: "/forms/sales-ordering/documents", icon: FileCheck }] : []),
    ...(permissions.intake ? [{ label: "PO Upload", href: "/forms/sales-ordering/intake", icon: FileSearch }] : []),
    ...(permissions.creditCheck ? [{ label: "PO-SOA Check", href: "/forms/sales-ordering/credit-check", icon: ShieldCheck }] : []),
    ...(permissions.orders ? [{ label: "Sales Orders", href: "/forms/sales-ordering/orders", icon: ShoppingCart }] : []),
    ...(permissions.isSuperAdmin ? [{ label: "Database", href: "/forms/sales-ordering/database", icon: Database }] : []),
  ]
  return (
    <nav className="mb-7 flex gap-2 overflow-x-auto border-b border-slate-200" aria-label="Sales Ordering navigation">
      {visibleTabs.map(tab => {
        const active = tab.href === "/forms/sales-ordering"
          ? pathname === tab.href
          : tab.href === "/forms/sales-ordering/documents"
            ? pathname.startsWith("/forms/sales-ordering/documents") || pathname.startsWith("/forms/sales-ordering/po-customer")
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

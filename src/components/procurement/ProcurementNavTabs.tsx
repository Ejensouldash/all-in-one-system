"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Receipt, Scale, Building2, ShoppingBag } from "lucide-react"

export function ProcurementNavTabs() {
  const pathname = usePathname()

  const tabs = [
    {
      name: "Invoice for Payment",
      href: "/procurement/invoices",
      icon: Receipt,
      isActive: pathname.startsWith("/procurement/invoices"),
    },
    {
      name: "Price Comparison",
      href: "/procurement/comparisons",
      icon: Scale,
      isActive: pathname.startsWith("/procurement/comparisons"),
    },
    {
      name: "Suppliers Directory",
      href: "/procurement/suppliers",
      icon: Building2,
      isActive: pathname.startsWith("/procurement/suppliers"),
    },
    {
      name: "Purchases",
      href: "/procurement/purchases",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/procurement/purchases"),
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80 w-fit mb-6">
      {tabs.map((t) => {
        const Icon = t.icon
        return (
          <Link
            key={t.name}
            href={t.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              t.isActive
                ? "bg-white text-blue-600 shadow-sm shadow-slate-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${t.isActive ? "text-blue-600" : "text-slate-400"}`} />
            <span>{t.name}</span>
          </Link>
        )
      })}
    </div>
  )
}

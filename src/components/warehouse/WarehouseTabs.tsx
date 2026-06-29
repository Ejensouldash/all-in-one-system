"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Truck, AlertOctagon } from "lucide-react"

export function WarehouseTabs() {
  const pathname = usePathname()

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        <Link 
          href="/forms/warehouse/dashboard"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            pathname === "/forms/warehouse/dashboard"
              ? "border-emerald-500 text-emerald-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Package className="w-5 h-5 mr-2" />
          Inventory & Transfers
        </Link>

        <Link 
          href="/forms/warehouse/distribution"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            pathname.startsWith("/forms/warehouse/distribution")
              ? "border-blue-500 text-blue-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Truck className="w-5 h-5 mr-2" />
          Distribution (DO)
        </Link>

        <Link 
          href="/forms/warehouse/quarantine"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            pathname.startsWith("/forms/warehouse/quarantine")
              ? "border-red-500 text-red-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <AlertOctagon className="w-5 h-5 mr-2" />
          Quarantine / Returns
        </Link>
      </div>
    </div>
  )
}

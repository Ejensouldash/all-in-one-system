"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Truck, AlertOctagon, ClipboardCheck, ShieldCheck, FileBarChart } from "lucide-react"

/**
 * `fullWarehouse` is false for production staff holding only RAW_MATERIAL_WITHDRAWAL. They get the
 * Reports tab alone, since that is where the Daily Raw Material screens live; showing tabs that
 * redirect straight back out would just look broken.
 */
export function WarehouseTabs({
  fullWarehouse = true,
  gatePass = false,
  security = false,
  reports = true,
}: {
  fullWarehouse?: boolean
  gatePass?: boolean
  security?: boolean
  reports?: boolean
}) {
  const pathname = usePathname()

  return (
    <div className="mb-8 border-b border-gray-200 overflow-x-auto">
      <div className="flex space-x-8 min-w-max px-2">
        {fullWarehouse && (
          <>
            <Link
              href="/forms/warehouse/overview"
              className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
                pathname === "/forms/warehouse/overview"
                  ? "border-emerald-500 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-2" />
              Dashboard
            </Link>

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
          </>
        )}

        {gatePass && (
          <Link
            href="/forms/warehouse/gatepass"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              pathname.startsWith("/forms/warehouse/gatepass") && !pathname.startsWith("/forms/warehouse/gatepass/security")
                ? "border-cyan-500 text-cyan-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ClipboardCheck className="w-5 h-5 mr-2" />
            Gatepass Planning
          </Link>
        )}

        {security && (
          <Link
            href="/forms/warehouse/gatepass/security"
            className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
              pathname.startsWith("/forms/warehouse/gatepass/security")
                ? "border-amber-500 text-amber-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            Security Gate
          </Link>
        )}

        {reports && <Link
          href="/forms/warehouse/reports"
          className={`flex items-center pb-4 text-sm font-black uppercase tracking-wider border-b-4 transition-colors ${
            pathname.startsWith("/forms/warehouse/reports")
              ? "border-purple-500 text-purple-700" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <FileBarChart className="w-5 h-5 mr-2" />
          {fullWarehouse ? "Reports" : "Daily Raw Material"}
        </Link>}
      </div>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText, CalendarDays, Archive, PackageSearch } from "lucide-react"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export default async function ReportsDashboard() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  // Withdrawal-only users have one screen here; the other three reports are warehouse business.
  const fullWarehouse = hasAnyModule(access, ["WAREHOUSE"])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tight">
          {fullWarehouse ? "Warehouse Reports" : "Daily Raw Material"}
        </h2>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${fullWarehouse ? "md:grid-cols-2 xl:grid-cols-4" : "md:max-w-md"}`}>
        <Link href="/forms/warehouse/reports/raw-material" className="block group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-amber-500 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PackageSearch className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Raw Material</h3>
            <p className="text-sm text-gray-500">
              SGMP-15. Rekod baki bahan mentah warehouse. Quantity Stock Out terus masuk ke Transfer In
              dalam Daily Production Report.
            </p>
          </div>
        </Link>

        {fullWarehouse && (
        <>
        <Link href="/forms/warehouse/reports/daily" className="block group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CalendarDays className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Distribution Report</h3>
            <p className="text-sm text-gray-500">View and print daily finished goods distribution records.</p>
          </div>
        </Link>

        <Link href="/forms/warehouse/reports/monthly" className="block group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Monthly Finished Goods</h3>
            <p className="text-sm text-gray-500">Auto-generated monthly report with opening and closing balances.</p>
          </div>
        </Link>

        <Link href="/forms/warehouse/reports/opening-stock" className="block group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all h-full">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Archive className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">System Initialization</h3>
            <p className="text-sm text-gray-500">Set initial opening stock for the very first month of deployment.</p>
          </div>
        </Link>
        </>
        )}
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Package, Truck, AlertOctagon } from "lucide-react"
import { WarehouseTabs } from "@/components/warehouse/WarehouseTabs"
import { prisma } from "@/lib/prisma"

export default async function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true }
  })

  const role = dbUser?.role || (session.user as any).trueRole || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("WAREHOUSE")) {
    if (userModules.includes("FORMS")) redirect("/forms/production")
    if (userModules.includes("MAINTENANCE_FORMS")) redirect("/forms/maintenance")
    if (userModules.includes("MAINTENANCE_DASHBOARD")) redirect("/forms/maintenance/dashboard")
    if (userModules.includes("MAINTENANCE_REPORTS")) redirect("/forms/maintenance/reports")
    redirect("/dashboard")
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 print:p-0 print:m-0 print:max-w-none print:mt-0 print:pb-0">
      <div className="flex items-center mb-6 print:hidden">
        <Package className="h-10 w-10 mr-4 text-emerald-700" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Warehouse & Distribution</h1>
          <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">Module V3</p>
        </div>
      </div>
      
      <div className="print:hidden">
        <WarehouseTabs />
      </div>
      
      {children}
    </div>
  )
}

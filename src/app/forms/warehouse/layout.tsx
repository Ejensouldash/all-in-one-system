import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Package, Truck, AlertOctagon } from "lucide-react"
import { WarehouseTabs } from "@/components/warehouse/WarehouseTabs"

export default async function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div className="flex items-center mb-6">
        <Package className="h-10 w-10 mr-4 text-emerald-700" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Warehouse & Distribution</h1>
          <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">Module V3</p>
        </div>
      </div>
      
      <WarehouseTabs />
      
      {children}
    </div>
  )
}

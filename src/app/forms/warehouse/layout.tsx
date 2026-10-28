import { redirect } from "next/navigation"
import { Package } from "lucide-react"
import { WarehouseTabs } from "@/components/warehouse/WarehouseTabs"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export default async function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  // RAW_MATERIAL_WITHDRAWAL is a narrow grant for production staff who take material off the
  // rack themselves. It opens the Daily Raw Material screens only; every other warehouse page
  // gates on WAREHOUSE separately.
  const fullWarehouse = hasAnyModule(access, ["WAREHOUSE"])
  const withdrawalOnly = !fullWarehouse && hasAnyModule(access, ["RAW_MATERIAL_WITHDRAWAL"])
  const gatePass = hasAnyModule(access, ["GATEPASS_REQUESTER", "WAREHOUSE_GATEPASS", "WAREHOUSE"])
  const security = hasAnyModule(access, ["SECURITY_GATEPASS"])

  if (!fullWarehouse && !withdrawalOnly && !gatePass && !security) {
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  return (
    <div className="animate-in fade-in duration-500 pb-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 print:p-0 print:m-0 print:max-w-none print:mt-0 print:pb-0">
      <div className="flex items-center mb-6 print:hidden">
        <Package className="h-10 w-10 mr-4 text-emerald-700" />
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Warehouse & Distribution</h1>
          <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">Module V3</p>
        </div>
      </div>
      
      <div className="print:hidden">
        <WarehouseTabs
          fullWarehouse={fullWarehouse}
          gatePass={gatePass}
          security={security}
          reports={fullWarehouse || withdrawalOnly}
        />
      </div>
      
      {children}
    </div>
  )
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { getActiveInventory } from "@/app/actions/dailyReport"
import { ProductionStockClient } from "@/components/forms/ProductionStockClient"
import { Package } from "lucide-react"

export const metadata = {
  title: "Production Stock",
}

export default async function ProductionStockPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true }
  })

  const role = dbUser?.role || (session.user as any).trueRole || session.user.role
  const modules = dbUser?.modules || []

  if (role !== "SUPERADMIN" && !modules.includes("PRODUCTION_STOCK")) {
    redirect("/dashboard")
  }

  // Fetch the active inventory from the server
  const inventory = await getActiveInventory()
  const storeroomBatches = inventory.data?.storeroomBatches || []
  const todayDOs = inventory.data?.todayDOs || []

  // Combine both and format
  const allStock = [...storeroomBatches, ...todayDOs].map(item => ({
    ...item,
    // Add any necessary formatting if needed
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-in fade-in duration-500 pb-12">
      <FormsTabs role={role} hasDatabaseAccess={role === "SUPERADMIN" || modules.includes("DATABASE_MANAGER")} />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <Package className="w-6 h-6 mr-3 text-amber-600" />
            Production Stock
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Live inventory balances for raw materials inside Production.</p>
        </div>
      </div>

      <ProductionStockClient 
        initialData={allStock} 
        hasAdminAccess={role === "SUPERADMIN" || modules.includes("PRODUCTION_STOCK")}
      />
    </div>
  )
}

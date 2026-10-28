import { Suspense } from "react"
import { redirect } from "next/navigation"
import { WarehouseDashboardClient } from "@/components/warehouse/dashboard/WarehouseDashboardClient"
import { WarehouseSkeleton } from "@/components/warehouse/dashboard/WarehouseSkeleton"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getWarehouseDashboardData } from "@/lib/warehouse/dashboard-data"

async function AsyncOverview() {
  const { dashboard } = await getWarehouseDashboardData()
  return <WarehouseDashboardClient data={dashboard} />
}

export default async function WarehouseOverview() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  // Full warehouse users only; the layout already routes everyone else to a section they can open.
  if (!hasAnyModule(access, ["WAREHOUSE"])) redirect("/forms")

  return <Suspense fallback={<WarehouseSkeleton />}><AsyncOverview /></Suspense>
}

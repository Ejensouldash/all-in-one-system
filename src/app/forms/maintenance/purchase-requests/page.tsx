import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { prisma } from "@/lib/prisma"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { getMaintenancePurchaseRequests } from "@/app/actions/maintenance-pr"
import { PurchaseRequestLedgerClient } from "./PurchaseRequestLedgerClient"

export const metadata = {
  title: "Purchase Requisitions | BubblesO2 Facilities Maintenance",
}

export default async function PurchaseRequestsPage(props: {
  searchParams: Promise<{ pr?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/forms/maintenance/purchase-requests")
  }

  const access = await getAccessInfo()
  if (!access) {
    redirect("/login?callbackUrl=/forms/maintenance/purchase-requests")
  }

  const canAccess =
    access.isSuperAdmin ||
    hasAnyModule(access, [
      "MAINTENANCE_DASHBOARD",
      "MAINTENANCE_TICKETS_MANAGE",
      "MAINTENANCE_FORMS",
      "MAINTENANCE_PR_APPROVE",
    ])

  if (!canAccess) {
    redirect("/forms/maintenance/tickets")
  }

  const searchParams = await props.searchParams
  const prsRes = await getMaintenancePurchaseRequests({
    status: searchParams.status,
    search: searchParams.pr,
  })

  // Fetch inventory catalog items so PR creation can auto-complete name, brand, and stock balance
  const inventoryCatalog = await prisma.maintenanceItem.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      location: true,
      quantity: true,
      unit: true,
      pricePerUnit: true,
    },
    orderBy: { name: "asc" },
  })

  const canApprovePr = access.isSuperAdmin || access.modules.includes("MAINTENANCE_PR_APPROVE")

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
        <PurchaseRequestLedgerClient
          initialPrs={prsRes.success ? (prsRes.data as any) : []}
          inventoryCatalog={inventoryCatalog}
          userName={session.user.name || access.name || "Requester"}
          userDepartment={access.unitName || "MAINTENANCE"}
          canApprovePr={canApprovePr}
          isSuperAdmin={access.isSuperAdmin}
          selectedPrParam={searchParams.pr}
        />
      </div>
    </div>
  )
}

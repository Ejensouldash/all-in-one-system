import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { MaintenanceAssetClient } from "./MaintenanceAssetClient"

export const metadata = {
  title: "FMS Asset Ledger | BubblesO2 Facilities Maintenance",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/assets")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/assets")

  // Check MAINTENANCE_ASSETS module or isSuperAdmin
  if (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_ASSETS"])) {
    if (access.modules.includes("MAINTENANCE_DASHBOARD")) {
      redirect("/forms/maintenance/dashboard")
    }
    if (access.modules.includes("GMP_FORMS") || access.modules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    redirect("/forms")
  }

  // Query only NRHO assets
  const items = await prisma.maintenanceItem.findMany({
    where: {
      department: "NRHO",
    },
    orderBy: { name: "asc" },
  })

  // Get recent stock logs for NRHO assets
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentLogs = await prisma.maintenanceStockLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      OR: [
        { department: "NRHO" },
        { item: { department: "NRHO" } },
      ],
    },
    include: {
      item: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <MaintenanceAssetClient
      initialItems={items}
      initialLogs={recentLogs}
      userName={session.user.name || "Unknown"}
      userModules={access.modules}
      isSuperAdmin={access.isSuperAdmin}
    />
  )
}

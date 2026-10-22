import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MaintenanceDashboardClient } from "./MaintenanceDashboardClient"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export const metadata = {
  title: "FMS Inventory Dashboard",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/dashboard")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/dashboard")

  if (!hasAnyModule(access, ["MAINTENANCE_DASHBOARD"])) {
    if (access.modules.includes("GMP_FORMS") || access.modules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (access.modules.includes("GMP_REPORTS") || access.modules.includes("MAINTENANCE_REPORTS")) {
      redirect("/forms/maintenance/reports")
    }
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  const items = await prisma.maintenanceItem.findMany({
    where: {
      OR: [
        { department: { in: ["BOS", "BOM"] } },
        { department: null },
      ],
    },
    orderBy: { name: "asc" },
  })

  // Get recent stock logs (BOS and BOM only)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentLogs = await prisma.maintenanceStockLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      OR: [
        { department: { in: ["BOS", "BOM"] } },
        { department: null },
      ],
    },
    include: {
      item: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <MaintenanceDashboardClient 
      initialItems={items}
      initialLogs={recentLogs}
      userName={session.user.name || "Unknown"}
      userModules={access.modules}
      isSuperAdmin={access.isSuperAdmin}
    />
  )
}

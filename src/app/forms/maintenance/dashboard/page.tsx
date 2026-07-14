import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MaintenanceDashboardClient } from "./MaintenanceDashboardClient"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export const metadata = {
  title: "Maintenance Inventory Dashboard",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login")

  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["MAINTENANCE_DASHBOARD"])) {
    if (access.modules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (access.modules.includes("MAINTENANCE_REPORTS")) {
      redirect("/forms/maintenance/reports")
    }
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  const items = await prisma.maintenanceItem.findMany({
    orderBy: { name: "asc" }
  })

  // Get recent stock logs
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentLogs = await prisma.maintenanceStockLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo }
    },
    include: {
      item: true
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <MaintenanceDashboardClient 
      initialItems={items}
      initialLogs={recentLogs}
      userName={session.user.name || "Unknown"}
      userModules={access.modules}
    />
  )
}

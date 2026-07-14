import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MaintenanceDashboardClient } from "./MaintenanceDashboardClient"

export const metadata = {
  title: "Maintenance Inventory Dashboard",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any
  const role = user.trueRole || user.role
  const userModules = user.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("MAINTENANCE_DASHBOARD")) {
    if (userModules.includes("MAINTENANCE_FORMS")) {
      redirect("/forms/maintenance")
    }
    if (userModules.includes("MAINTENANCE_REPORTS")) {
      redirect("/forms/maintenance/reports")
    }
    redirect("/dashboard")
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
    />
  )
}

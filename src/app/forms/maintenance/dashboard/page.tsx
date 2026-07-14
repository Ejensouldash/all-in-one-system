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

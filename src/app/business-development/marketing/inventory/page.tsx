import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MarketingInventoryClient } from "./MarketingInventoryClient"
import { getAccessInfo } from "@/lib/access"

export const metadata = {
  title: "Marketing Assets & Inventory | Bubbles O2",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/business-development/marketing/inventory")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/business-development/marketing/inventory")

  // Fetch all Marketing Items
  const items = await prisma.marketingItem.findMany({
    orderBy: { name: "asc" },
  })

  // Get recent stock logs (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentLogs = await prisma.marketingStockLog.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      item: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <MarketingInventoryClient
      initialItems={items}
      initialLogs={recentLogs}
      userName={session.user.name || "Unknown"}
      userModules={access.modules}
      isSuperAdmin={access.isSuperAdmin}
    />
  )
}

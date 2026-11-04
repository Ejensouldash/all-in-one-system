import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MarketingInventoryClient } from "./MarketingInventoryClient"
import { getAccessInfo, canAccessMarketingInventory } from "@/lib/access"

export const metadata = {
  title: "Marketing Merchandise Management | Bubbles O2",
}

export default async function Page() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/inventory")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/marketing/inventory")

  if (!canAccessMarketingInventory(access)) {
    redirect("/dashboard")
  }

  // Fetch Marketing Items (bounded)
  const items = await prisma.marketingItem.findMany({
    orderBy: { name: "asc" },
    include: {
      variants: {
        orderBy: { variantName: "asc" },
      },
    },
  })

  // Fetch recent Merchandise Requests (capped to prevent egress spike)
  const requests = await prisma.marketingMerchandiseRequest.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      item: true,
      variant: true,
    },
  })

  // Get recent stock logs (last 30 days, capped to latest 100)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentLogs = await prisma.marketingStockLog.findMany({
    take: 100,
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      item: true,
      variant: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <MarketingInventoryClient
      initialItems={items}
      initialLogs={recentLogs}
      initialRequests={requests}
      userName={session.user.name || "Unknown"}
      userModules={access.modules}
      isSuperAdmin={access.isSuperAdmin}
    />
  )
}

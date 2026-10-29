import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canAccessMarketing } from "@/lib/access"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"
import { MarketingNotificationSettingsClient } from "./MarketingNotificationSettingsClient"

export const metadata = {
  title: "Marketing Email Notifications | Bubbles O2",
  description: "Configure email notification recipients, category routing, and inspect outbox logs for marketing requisitions.",
}

export default async function MarketingNotificationsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/notifications")

  const access = await getAccessInfo()
  if (!access || !canAccessMarketing(access)) {
    redirect("/dashboard")
  }

  // Load initial recipients and paginated outbox
  const [recipients, outboxItems, totalOutboxCount] = await Promise.all([
    prisma.marketingNotificationRecipient.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.marketingNotificationOutbox.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketingNotificationOutbox.count(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalOutboxCount / 10))

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Navigation Tabs */}
        <MarketingNavTabs 
          userModules={access.modules} 
          isSuperAdmin={access.isSuperAdmin} 
        />

        {/* Main Settings Client */}
        <MarketingNotificationSettingsClient
          initialRecipients={recipients}
          initialOutbox={outboxItems}
          initialTotalCount={totalOutboxCount}
          initialTotalPages={totalPages}
          userName={session.user?.name || "Marketing Officer"}
        />
      </div>
    </div>
  )
}

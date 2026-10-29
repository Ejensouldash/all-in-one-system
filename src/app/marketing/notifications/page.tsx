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

  let recipients: any[] = []
  let outboxItems: any[] = []
  let totalOutboxCount = 0

  try {
    const [recList, outList, count] = await Promise.all([
      prisma.marketingNotificationRecipient.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.marketingNotificationOutbox.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.marketingNotificationOutbox.count(),
    ])

    recipients = recList.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      category: r.category,
      isEnabled: r.isEnabled,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    outboxItems = outList.map((o) => ({
      id: o.id,
      referenceId: o.referenceId,
      category: o.category,
      to: o.to,
      subject: o.subject,
      status: o.status,
      error: o.error,
      attempts: o.attempts,
      sentAt: o.sentAt,
      createdAt: o.createdAt,
    }))

    totalOutboxCount = count
  } catch (err) {
    console.error("MarketingNotificationsPage data load error:", err)
  }

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

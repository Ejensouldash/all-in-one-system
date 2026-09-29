import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { 
  getMaintenanceNotificationRecipients, 
  getMaintenanceOutboxItems 
} from "@/app/actions/maintenance-notifications"
import { MaintenanceNotificationSettingsClient } from "./MaintenanceNotificationSettingsClient"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"

export const metadata = {
  title: "Email Alerts & Notification Outbox | BubblesO2",
}

export default async function MaintenanceNotificationSettingsPage() {
  const session = await auth()
  if (!session) {
    redirect("/login?callbackUrl=/forms/maintenance/tickets/notifications")
  }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    redirect("/forms/maintenance/tickets")
  }

  const recipients = await getMaintenanceNotificationRecipients()
  const outbox = await getMaintenanceOutboxItems(50)

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
        <MaintenanceNotificationSettingsClient 
          initialRecipients={recipients as any} 
          initialOutbox={outbox as any}
        />
      </div>
    </div>
  )
}

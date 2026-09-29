import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceTicketCreateForm } from "./MaintenanceTicketCreateForm"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { getAccessInfo } from "@/lib/access"

export const metadata = {
  title: "New Work Request | Maintenance",
}

export default async function NewMaintenanceTicketPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/tickets/new")

  const access = await getAccessInfo()

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access?.modules || []} isSuperAdmin={access?.isSuperAdmin} />
        <MaintenanceTicketCreateForm
          defaultName={session.user.name || ""}
          defaultEmail={session.user.email || ""}
        />
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getMaintenanceWorkspaceData } from "@/app/actions/maintenance-ticket"
import { MaintenanceWorkspace } from "./MaintenanceWorkspace"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"

export const metadata = {
  title: "Maintenance Workspace | Resolution",
}

export default async function MaintenanceTicketWorkspacePage(props: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) {
    const { id } = await props.params
    redirect(`/login?callbackUrl=/forms/maintenance/tickets/${id}`)
  }

  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"]))) {
    redirect("/forms/maintenance/tickets/service-requests")
  }

  const { id } = await props.params
  const data = await getMaintenanceWorkspaceData(id)
  if (!data) notFound()

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
        <MaintenanceWorkspace
          ticket={data.ticket}
          staffList={data.staffList}
          catalogItems={data.catalogItems}
        />
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import { ServiceRequestsClient } from "./ServiceRequestsClient"

export const metadata = {
  title: "Service Requests (Tier 2) | BubblesO2 Facilities",
  description: "Track and submit facilities service requests and repair orders across plant departments.",
}

export default async function ServiceRequestsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/tickets/service-requests")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/tickets/service-requests")

  const canManage = access.isSuperAdmin || hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"])

  // Safe projections for 2nd-tier viewing:
  // Excludes financial cost breakdowns, password hashes, and internal rates
  const tickets = await prisma.maintenanceTicket.findMany({
    select: {
      id: true,
      ticketNumber: true,
      legacyProjectId: true,
      title: true,
      reasonOfWork: true,
      ticketType: true,
      priority: true,
      status: true,
      location: true,
      specificArea: true,
      requesterName: true,
      requesterPhone: true,
      requesterToken: true,
      targetStartDate: true,
      targetDateline: true,
      startedAt: true,
      workCompletedAt: true,
      closedAt: true,
      jobSheetNumber: true,
      createdAt: true,
      assigneeName: true,
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      acknowledgedBy: {
        select: { id: true, name: true },
      },
      rootCause: true,
      resolution: true,
      photoUrl: true,
      photos: {
        select: {
          id: true,
          fileUrl: true,
          fileName: true,
          category: true,
          caption: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />

        <ServiceRequestsClient
          tickets={tickets}
          canManage={canManage}
          userName={session.user.name || "Employee"}
        />
      </div>
    </div>
  )
}

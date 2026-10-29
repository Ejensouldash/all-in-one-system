import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canAccessMarketing } from "@/lib/access"
import { MarketingEventsClient, EventRequisitionItem } from "./MarketingEventsClient"
import { MarketingNavTabs } from "@/components/marketing/MarketingNavTabs"

export const metadata = {
  title: "Marketing Event Management | Bubbles O2",
  description: "Review and manage department event support requisitions, approvals, and collaboration requests.",
}

export default async function MarketingEventsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/marketing/events")

  const access = await getAccessInfo()
  if (!access || !canAccessMarketing(access)) {
    redirect("/dashboard")
  }

  let requisitions: EventRequisitionItem[] = []
  try {
    const records = await prisma.marketingEventRequisition.findMany({
      orderBy: { createdAt: "desc" },
    })
    requisitions = records.map(r => ({
      id: r.id,
      requestNumber: r.requestNumber,
      name: r.name,
      staffId: r.staffId,
      email: r.email,
      department: r.department,
      eventName: r.eventName,
      eventType: r.eventType,
      organizer: r.organizer,
      eventDateFrom: r.eventDateFrom,
      eventDateTo: r.eventDateTo,
      picContactName: r.picContactName,
      picContactNumber: r.picContactNumber,
      tentative: r.tentative,
      requirements: r.requirements,
      status: r.status,
      remarks: r.remarks,
      attachments: r.attachments,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  } catch (error) {
    console.warn("Could not query marketingEventRequisition table yet:", error)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <MarketingNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
      <MarketingEventsClient initialRequisitions={requisitions} user={session.user} />
    </div>
  )
}

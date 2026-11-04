import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, canAccessMarketingEvents, canEditMarketingEvents } from "@/lib/access"
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
  if (!access || !canAccessMarketingEvents(access)) {
    redirect("/dashboard")
  }

  let requisitions: EventRequisitionItem[] = []
  try {
    const records = await prisma.marketingEventRequisition.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        requestNumber: true,
        name: true,
        staffId: true,
        email: true,
        phone: true,
        department: true,
        eventName: true,
        eventType: true,
        organizer: true,
        eventDateFrom: true,
        eventDateTo: true,
        picContactName: true,
        picContactNumber: true,
        tentative: true,
        requirements: true,
        status: true,
        remarks: true,
        attachments: true,
        galleryAttachments: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    requisitions = records.map(r => ({
      id: r.id,
      requestNumber: r.requestNumber,
      name: r.name,
      staffId: r.staffId,
      email: r.email,
      phone: r.phone || null,
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
      galleryAttachments: r.galleryAttachments || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  } catch (error) {
    console.warn("Could not query marketingEventRequisition table yet:", error)
  }

  const canEdit = canEditMarketingEvents(access)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <MarketingNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />
      <MarketingEventsClient initialRequisitions={requisitions} user={session.user} canEdit={canEdit} />
    </div>
  )
}

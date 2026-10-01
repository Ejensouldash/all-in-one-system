import { auth } from "@/auth"
import { getAccessInfo, canManageCustomerCare } from "@/lib/access"
import { prisma } from "@/lib/prisma"
import { CustomerCareDashboardClient } from "@/components/customer-care/CustomerCareDashboardClient"

export const metadata = {
  title: "Customer Complaints & Batch Investigation | Bubbles O2 AIO",
}

export default async function CustomerCarePage() {
  const session = await auth()
  const access = await getAccessInfo()
  const canManage = canManageCustomerCare(access)

  // Fetch batch complaint cases
  const cases = await prisma.customerComplaint.findMany({
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // Fetch manual complaint logs (Nana / BD direct intake)
  const manualComplaints = await prisma.manualComplaintLog.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  // Fetch social media complaints (scraped Threads tracking)
  const socialComplaintsRaw = await prisma.socialMediaComplaint.findMany({
    orderBy: { date: "desc" },
    take: 2000,
  })

  const socialComplaints = socialComplaintsRaw.map((s) => ({
    ...s,
    takenAt: s.takenAt ? Number(s.takenAt) : null,
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <CustomerCareDashboardClient
        initialCases={cases as any}
        initialManualComplaints={manualComplaints as any}
        initialSocialComplaints={socialComplaints as any}
        canManage={canManage}
      />
    </div>
  )
}

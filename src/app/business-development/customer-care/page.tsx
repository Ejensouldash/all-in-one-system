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

  // Fetch manual complaint logs (Nana's fast intake / tracking sheet)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <CustomerCareDashboardClient
        initialCases={cases as any}
        initialManualComplaints={manualComplaints as any}
        canManage={canManage}
      />
    </div>
  )
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEligibleDailyReports } from "@/app/actions/handover"
import { ProductionHandoverForm } from "@/components/forms/ProductionHandoverForm"
import { prisma } from "@/lib/prisma"

export default async function NewHandoverPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { modules: true, role: true } })
  const trueRole = user.trueRole || dbUser?.role
  
  if (trueRole !== "SUPERADMIN" && !dbUser?.modules.includes("HANDOVER")) {
    redirect("/forms/production")
  }

  const response = await getEligibleDailyReports()
  const eligibleReports = response.success && response.data ? response.data : []

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <ProductionHandoverForm 
          userId={user.id} 
          userName={user.name} 
          eligibleReports={eligibleReports} 
        />
      </div>
    </div>
  )
}

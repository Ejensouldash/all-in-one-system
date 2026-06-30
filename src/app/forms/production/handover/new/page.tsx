import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getEligibleDailyReports } from "@/app/actions/handover"
import { ProductionHandoverForm } from "@/components/forms/ProductionHandoverForm"

export default async function NewHandoverPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const user = session.user as any

  const response = await getEligibleDailyReports()
  const eligibleReports = response.success ? response.data : []

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

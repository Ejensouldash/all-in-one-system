import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Wrench } from "lucide-react"
import { MaintenanceTabs } from "@/components/forms/MaintenanceTabs"
import { MaintenanceSummaryClient } from "./MaintenanceSummaryClient"
import { getMaintenanceSummaryRecords } from "@/app/actions/maintenance-summary"

export const metadata = {
  title: "Maintenance Summary",
}

export default async function MaintenanceSummaryPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/summary")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true, name: true }
  })

  const role = dbUser?.role || (session.user as any).trueRole || session.user.role
  const userModules = dbUser?.modules || []
  const userName = dbUser?.name || session.user.name || "Supervisor"
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("MAINTENANCE_SUMMARY")) {
    if (userModules.includes("MAINTENANCE_FORMS")) redirect("/forms/maintenance")
    if (userModules.includes("MAINTENANCE_DASHBOARD")) redirect("/forms/maintenance/dashboard")
    if (userModules.includes("MAINTENANCE_REPORTS")) redirect("/forms/maintenance/reports")
    redirect("/dashboard")
  }

  // Load initial data for lighting as default
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
  const initialResult = await getMaintenanceSummaryRecords("lighting", firstDay, lastDay)
  const initialRecords = initialResult.success ? initialResult.data || [] : []

  return (
    <div className="bg-gray-50 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <Wrench className="h-10 w-10 text-blue-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                Maintenance Dashboard
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Digitalized Forms & Records
              </p>
            </div>
          </div>
        </div>

        <MaintenanceTabs userModules={isSuperAdmin ? [] : userModules} />

        <MaintenanceSummaryClient
          initialRecords={initialRecords}
          initialFormType="lighting"
          initialStartDate={firstDay}
          initialEndDate={lastDay}
          userName={userName}
        />
      </div>
    </div>
  )
}

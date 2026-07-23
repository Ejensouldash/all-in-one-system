import { redirect } from "next/navigation"
import { MaintenancePMIRReportClient } from "./MaintenancePMIRReportClient"
import { getAccessInfo } from "@/lib/access"

export const metadata = {
  title: "Preventive Maintenance Inspection Reports",
}

export default async function PMIRReportsPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/reports")

  const isSuperAdmin = access.role === "SUPERADMIN"

  if (!isSuperAdmin && !access.modules.includes("MAINTENANCE_REPORTS")) {
    redirect("/dashboard")
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <MaintenancePMIRReportClient />
      </div>
    </div>
  )
}

import { redirect } from "next/navigation"
import { MaintenancePMRReportClient } from "./MaintenancePMRReportClient"
import { getAccessInfo } from "@/lib/access"

export const metadata = {
  title: "Preventive Maintenance Reports - SGMP/03/PMR",
}

export default async function PMRReportsPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/reports")

  const isSuperAdmin = access.role === "SUPERADMIN"

  if (!isSuperAdmin && !access.modules.includes("GMP_REPORTS") && !access.modules.includes("MAINTENANCE_REPORTS")) {
    redirect("/dashboard")
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <MaintenancePMRReportClient />
      </div>
    </div>
  )
}

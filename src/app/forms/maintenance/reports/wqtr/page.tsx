import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceWQTRReportClient } from "./MaintenanceWQTRReportClient"

export const metadata = {
  title: "Water Quality Testing Record - SGMP/18/WQTR",
}

export default async function WQTRReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/wqtr")

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:py-0 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        <MaintenanceWQTRReportClient />
      </div>
    </div>
  )
}

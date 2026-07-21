import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceDQIPReportClient } from "./MaintenanceDQIPReportClient"

export const metadata = {
  title: "Daily Quality In-Process Records - SGMP/18/DQIP",
}

export default async function DQIPReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/dqip")

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:py-0 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        <MaintenanceDQIPReportClient />
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceSEFReportClient } from "./MaintenanceSEFReportClient"

export const metadata = {
  title: "Sensory Evaluation Form Report - SGMP/06/SEF",
}

export default async function SEFReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/sef")

  const userName = session.user?.name || "QA Reviewer"

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:py-0 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        <MaintenanceSEFReportClient currentUserName={userName} />
      </div>
    </div>
  )
}

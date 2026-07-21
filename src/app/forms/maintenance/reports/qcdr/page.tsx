import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceQCDRReportClient } from "./MaintenanceQCDRReportClient"

export const metadata = {
  title: "QC Daily Report - SGMP/18/QCDR",
}

export default async function QCDRReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/qcdr")

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:py-0 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        <MaintenanceQCDRReportClient />
      </div>
    </div>
  )
}

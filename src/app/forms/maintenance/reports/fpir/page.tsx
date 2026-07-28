import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceFPIRReportClient } from "./MaintenanceFPIRReportClient"

export const metadata = {
  title: "Finished Product Inspection Record - SGMP/18/FPIR",
}

export default async function FPIRReportPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/fpir")

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:py-0 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        <MaintenanceFPIRReportClient />
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceFUVReportClient } from "./MaintenanceFUVReportClient"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "Hazard and Process Control Reports - SGMP/19/FUV",
}

export default async function FUVReportsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports/fuv")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true },
  })
  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("GMP_REPORTS") && !userModules.includes("MAINTENANCE_REPORTS")) {
    redirect("/dashboard")
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24 print:bg-white print:p-0 print:m-0 print:min-h-0">
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 print:p-0 print:m-0">
        <MaintenanceFUVReportClient />
      </div>
    </div>
  )
}

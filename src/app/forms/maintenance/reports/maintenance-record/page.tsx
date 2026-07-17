import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { MaintenanceRecordReportClient } from "./MaintenanceRecordReportClient"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: "Maintenance Record Reports",
}

export default async function MaintenanceRecordReportsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/reports")

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true }
  })
  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("MAINTENANCE_REPORTS")) {
    redirect("/dashboard")
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MaintenanceRecordReportClient />
      </div>
    </div>
  )
}

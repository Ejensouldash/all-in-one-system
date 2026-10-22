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
    select: { role: true, modules: true, name: true, signatureUrl: true }
  })
  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  if (!isSuperAdmin && !userModules.includes("GMP_REPORTS") && !userModules.includes("MAINTENANCE_REPORTS")) {
    redirect("/dashboard")
  }

  const canVerify = isSuperAdmin || userModules.includes("GMP_SUMMARY") || userModules.includes("MAINTENANCE_SUMMARY") || userModules.includes("GMP_REPORTS") || userModules.includes("MAINTENANCE_REPORTS") || role === "SUPERVISOR"

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <MaintenanceRecordReportClient
          userName={dbUser?.name || session.user?.name || "Supervisor"}
          userSignatureUrl={dbUser?.signatureUrl || null}
          canVerify={canVerify}
        />
      </div>
    </div>
  )
}

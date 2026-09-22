import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getRetentionSampleRecords } from "../../retention-sample/actions"
import { RetentionSampleReportClient } from "./RetentionSampleReportClient"

export const metadata = {
  title: "Retention Sample Reports (SGMP/21/RSR) | Bubbles O2",
}

export default async function RetentionSampleReportPage() {
  const session = await auth()
  if (!session) {
    redirect("/login?callbackUrl=/forms/maintenance/reports/retention-sample")
  }

  // Permission checks
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true, name: true },
  })

  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  const hasReportAccess = isSuperAdmin || userModules.includes("MAINTENANCE_REPORTS") || userModules.includes("MAINTENANCE_FORMS")
  if (!hasReportAccess) {
    redirect("/forms/maintenance")
  }

  const canManage = isSuperAdmin || userModules.includes("RETENTION_SAMPLE_MANAGE")

  const now = new Date()
  const initialMonth = now.getMonth() + 1
  const initialYear = now.getFullYear()

  const initialRes = await getRetentionSampleRecords({
    month: initialMonth,
    year: initialYear,
  })

  const initialRecords = initialRes.success && initialRes.data ? initialRes.data : []

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RetentionSampleReportClient
          initialRecords={initialRecords}
          initialMonth={initialMonth}
          initialYear={initialYear}
          canManage={canManage}
          userName={dbUser?.name || session.user.name || "User"}
        />
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { DatabaseManagerClient } from "@/components/forms/DatabaseManagerClient"
import { AlertTriangle, Database } from "lucide-react"

export default async function FormsDatabasePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any
  const isSuperAdmin = user.trueRole === "SUPERADMIN"

  if (!isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <FormsTabs role={user.trueRole || user.role} />
        <div className="bg-red-50 border border-red-200 rounded-xl p-12 text-center flex flex-col items-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-black text-red-800 tracking-tight">Access Restricted</h2>
          <p className="text-red-600 mt-2 font-medium">The Database Manager is strictly restricted to Superadmin users only due to irreversible deletion capabilities.</p>
        </div>
      </div>
    )
  }

  // Fetch all reports
  const dailyReports = await prisma.dailyReport.findMany({
    orderBy: { createdAt: 'desc' }
  })

  const transferIns = await prisma.transferIn.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 animate-in fade-in duration-500 pb-12">
      <FormsTabs role={user.trueRole || user.role} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <Database className="w-6 h-6 mr-3 text-red-600" />
            Database Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Bulk select and delete raw records from the database.</p>
        </div>
      </div>

      <DatabaseManagerClient dailyReports={dailyReports} transferIns={transferIns} />
    </div>
  )
}

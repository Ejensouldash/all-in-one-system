import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getProductRecallReport } from "./actions"
import { ProductRecallReportClient } from "./ProductRecallReportClient"

export const metadata = {
  title: "Product Recall Reports (SGMP/22/PR) | Bubbles O2",
  description: "Quality Control GMP Product Recall reports and summaries (SGMP/22/PR) for Bubbles O2.",
}

export const dynamic = "force-dynamic"

export default async function ProductRecallReportPage() {
  const session = await auth()
  if (!session) {
    redirect("/login?callbackUrl=/forms/maintenance/reports/product-recall")
  }

  // Permission checks
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, modules: true, name: true },
  })

  const role = dbUser?.role || session.user.role
  const userModules = dbUser?.modules || []
  const isSuperAdmin = role === "SUPERADMIN"

  const hasReportAccess =
    isSuperAdmin ||
    userModules.includes("GMP_REPORTS") ||
    userModules.includes("MAINTENANCE_REPORTS") ||
    userModules.includes("GMP_FORMS") ||
    userModules.includes("MAINTENANCE_FORMS")

  if (!hasReportAccess) {
    redirect("/forms/maintenance")
  }

  const canManage =
    isSuperAdmin ||
    userModules.includes("GMP_FORMS") ||
    userModules.includes("MAINTENANCE_FORMS") ||
    userModules.includes("GMP_REPORTS") ||
    userModules.includes("MAINTENANCE_REPORTS")

  const now = new Date()
  const initialMonth = now.getMonth() + 1
  const initialYear = now.getFullYear()

  const initialRes = await getProductRecallReport({
    month: initialMonth,
    year: initialYear,
  })

  const initialRecords = initialRes.success && initialRes.data ? initialRes.data : []
  const initialSummary = initialRes.success && initialRes.summary ? initialRes.summary : null

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductRecallReportClient
          initialRecords={initialRecords}
          initialSummary={initialSummary}
          initialMonth={initialMonth}
          initialYear={initialYear}
          canManage={canManage}
          userName={dbUser?.name || session.user.name || "User"}
        />
      </div>
    </div>
  )
}

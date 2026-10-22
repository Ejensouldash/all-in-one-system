import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { ProductRecallForm } from "./ProductRecallForm"
import Link from "next/link"
import { ArrowLeft, RotateCcw, FileSpreadsheet } from "lucide-react"

export const metadata = {
  title: "Product Recall (SGMP/22/PR) | Bubbles O2",
  description: "Quality Control GMP Product Recall recording form (SGMP/22/PR) for Bubbles O2.",
}

export const dynamic = "force-dynamic"

export default async function ProductRecallPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/forms/maintenance/product-recall")
  }

  const access = await getAccessInfo()
  if (!access) {
    redirect("/login?callbackUrl=/forms/maintenance/product-recall")
  }

  const canAccess =
    access.isSuperAdmin ||
    hasAnyModule(access, ["GMP_FORMS", "MAINTENANCE_FORMS", "FORMS", "GMP_REPORTS", "MAINTENANCE_REPORTS"])

  if (!canAccess) {
    redirect("/forms/maintenance")
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/forms/maintenance"
            className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to GMP Dashboard
          </Link>
          <Link
            href="/forms/maintenance/reports/product-recall"
            className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            View Recall Reports (SGMP/22/PR)
          </Link>
        </div>

        <ProductRecallForm userName={access.name || session.user.name || "QC Inspector"} />
      </div>
    </div>
  )
}

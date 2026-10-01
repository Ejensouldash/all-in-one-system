import { auth } from "@/auth"
import { getAccessInfo, canManageCustomerCare } from "@/lib/access"
import { getComplaintCaseById } from "@/app/actions/customer-care"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CaseWorkspaceClient } from "@/components/customer-care/CaseWorkspaceClient"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getComplaintCaseById(id)
  if (!res.success || !res.data) {
    return { title: "Case Not Found | Bubbles O2" }
  }
  return {
    title: `Case ${res.data.caseNumber} - ${res.data.companyName} | Customer Care`,
  }
}

export default async function CustomerCareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const access = await getAccessInfo()
  const canManage = canManageCustomerCare(access)

  const res = await getComplaintCaseById(id)
  if (!res.success || !res.data) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/business-development/customer-care"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Complaints Queue
        </Link>
      </div>

      {/* Main Workspace */}
      <CaseWorkspaceClient caseData={res.data} canManage={canManage} />
    </div>
  )
}

import { auth } from "@/auth"
import { getAccessInfo, canManageCustomerCare } from "@/lib/access"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  Plus,
  Headphones,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react"
import { CustomerCareQueueTable } from "@/components/customer-care/CustomerCareQueueTable"

export const metadata = {
  title: "Customer Care & Complaints Queue | Bubbles O2 AIO",
}

export default async function CustomerCarePage() {
  const session = await auth()
  const access = await getAccessInfo()
  const canManage = canManageCustomerCare(access)

  // Fetch initial complaint cases
  const cases = await prisma.customerComplaint.findMany({
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  // KPI Calculations
  const totalCount = cases.length
  const underInvestigationCount = cases.filter(
    (c) => c.status === "UNDER_INVESTIGATION" || c.status === "PENDING_QC"
  ).length
  const unmatchedCount = cases.filter((c) =>
    c.items.some((i) => i.matchStatus === "UNMATCHED")
  ).length
  const recallCount = cases.filter((c) => c.status === "RECALL_INITIATED").length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
            <span>Business Development</span>
            <span>/</span>
            <span>Customer Care</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 mt-1">
            <Headphones className="w-6 h-6 text-indigo-600" />
            Customer Complaints & Batch Investigation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track product defect complaints, correlate bottle batches with production outputs, and coordinate investigation reports.
          </p>
        </div>

        {canManage && (
          <Link
            href="/business-development/customer-care/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-200 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            Log New Complaint
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{totalCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Total Complaints</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-700">{underInvestigationCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Investigating</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-700">{unmatchedCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Unmatched Batches</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-700">{recallCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Active Recalls</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <CustomerCareQueueTable
        initialCases={cases as any}
        canManage={canManage}
      />
    </div>
  )
}

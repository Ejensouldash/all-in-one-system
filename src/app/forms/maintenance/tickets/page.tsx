import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { MaintenanceTicketTable } from "@/components/maintenance/MaintenanceTicketTable"
import { MaintenanceNavTabs } from "@/components/forms/MaintenanceNavTabs"
import Link from "next/link"
import { 
  Plus, 
  QrCode, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Boxes,
  Bell,
  ShieldCheck,
  RotateCcw
} from "lucide-react"

export const metadata = {
  title: "FMS Work Request (QR01) | BubblesO2",
}

export default async function MaintenanceTicketsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/tickets")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/tickets")

  const canManage = access.isSuperAdmin || hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"])
  if (!canManage) {
    redirect("/forms/maintenance/tickets/service-requests")
  }

  // Safe projections: explicitly exclude password hashes and sensitive user fields
  const tickets = await prisma.maintenanceTicket.findMany({
    select: {
      id: true,
      ticketNumber: true,
      legacyProjectId: true,
      title: true,
      reasonOfWork: true,
      ticketType: true,
      priority: true,
      status: true,
      location: true,
      specificArea: true,
      requesterName: true,
      requesterPhone: true,
      requesterToken: true,
      targetStartDate: true,
      targetDateline: true,
      startedAt: true,
      workCompletedAt: true,
      completedAt: true,
      closedAt: true,
      kpiStatus: true,
      kpiResponseMins: true,
      kpiRepairHours: true,
      jobSheetNumber: true,
      createdAt: true,
      assigneeName: true,
      assignee: {
        select: { id: true, name: true, email: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      acknowledgedBy: {
        select: { id: true, name: true },
      },
      costs: {
        select: { amount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Compute metrics
  const total = tickets.length
  const pendingAckCount = tickets.filter((t) => t.status === "OPEN").length
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS" || t.status === "ACKNOWLEDGED").length
  const awaitingVerificationCount = tickets.filter((t) => t.status === "AWAITING_VERIFICATION" || t.status === "AWAITING_COSTING").length
  const closedCount = tickets.filter((t) => t.status === "CLOSED" || t.status === "COMPLETED").length

  const completedWithKpi = tickets.filter((t) => (t.status === "CLOSED" || t.status === "COMPLETED") && t.kpiStatus)
  const onTimeCount = completedWithKpi.filter((t) => t.kpiStatus === "On Time" || t.kpiStatus === "Not Delay").length
  const onTimeRate = completedWithKpi.length > 0 ? Math.round((onTimeCount / completedWithKpi.length) * 100) : 100

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access.modules} isSuperAdmin={access.isSuperAdmin} />

        {/* Header & Metric Cards */}
        <div className="space-y-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                  SOP BOSB-FMS-850-001
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  QR01 Plant Work Orders
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                FMS Work Request
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage plant breakdowns, assign technicians/contractors, and track Job Sheet closures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canManage && (
                <Link
                  href="/forms/maintenance/tickets/notifications"
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all flex items-center gap-1.5"
                  title="Configure notification recipients and monitor email delivery outbox"
                >
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span>Email Alerts &amp; Outbox</span>
                </Link>
              )}
              <Link
                href="/forms/maintenance/tickets/qr"
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all flex items-center gap-1.5"
                title="Generate physical QR posters for factory walls and machinery"
              >
                <QrCode className="h-4 w-4 text-slate-500" />
                <span>Print QR Poster</span>
              </Link>
              <Link
                href="/forms/maintenance/tickets/new"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>New Work Request</span>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Logged</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{total}</span>
                <Boxes className="h-5 w-5 text-slate-300" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending PIC Ack</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-600">{pendingAckCount}</span>
                <AlertCircle className="h-5 w-5 text-amber-300" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Active Execution</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-blue-600">{inProgressCount}</span>
                <Clock className="h-5 w-5 text-blue-300" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Verification / Costing</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-black text-purple-600">{awaitingVerificationCount}</span>
                <RotateCcw className="h-5 w-5 text-purple-300" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Closed &amp; On-Time</span>
              <div className="mt-1 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-emerald-600">{closedCount}</span>
                  <span className="text-[10px] text-slate-400 font-bold ml-1.5">({onTimeRate}% on-time)</span>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <MaintenanceTicketTable tickets={tickets} canManage={canManage} />
      </div>
    </div>
  )
}

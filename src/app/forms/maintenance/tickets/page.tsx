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
  Bell
} from "lucide-react"

export const metadata = {
  title: "Maintenance Work Requests (QR01)",
}

export default async function MaintenanceTicketsPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/forms/maintenance/tickets")

  const access = await getAccessInfo()
  if (!access) redirect("/login?callbackUrl=/forms/maintenance/tickets")

  const canManage = access.isSuperAdmin || hasAnyModule(access, ["MAINTENANCE_TICKETS_MANAGE"])

  const tickets = await prisma.maintenanceTicket.findMany({
    include: {
      assignee: true,
      createdBy: true,
      costs: true,
    },
    orderBy: { createdAt: "desc" },
  })

  // Compute metrics
  const total = tickets.length
  const openCount = tickets.filter((t) => t.status === "OPEN").length
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length
  const completedCount = tickets.filter((t) => t.status === "COMPLETED").length
  const completedWithKpi = tickets.filter((t) => t.status === "COMPLETED" && t.kpiStatus)
  const onTimeCount = completedWithKpi.filter((t) => t.kpiStatus === "On Time" || t.kpiStatus === "Not Delay").length
  const onTimeRate = completedWithKpi.length > 0 ? Math.round((onTimeCount / completedWithKpi.length) * 100) : 100

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <MaintenanceNavTabs userModules={access.modules} />

        {/* Header & Metric Cards */}
        <div className="space-y-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                  SOP BOSB-PFMD-850-001
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  QR01 / QR02 Tracker
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Maintenance Work Requests
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage, assign, and track factory Mechanical, Civil, and Electrical requests.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {canManage && (
                <Link
                  href="/forms/maintenance/tickets/notifications"
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all flex items-center gap-1.5"
                  title="Urus penerima amaran emel automatik mengikut kategori"
                >
                  <Bell className="h-4 w-4 text-blue-600" />
                  Email Alerts
                </Link>
              )}
              <Link
                href="/forms/maintenance/tickets/qr"
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all flex items-center gap-1.5"
                title="Generate and print physical QR code posters for factory lines"
              >
                <QrCode className="h-4 w-4 text-slate-500" />
                Print QR Poster
              </Link>
              <Link
                href="/forms/maintenance/tickets/new"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                New Work Request
              </Link>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requests</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{total}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Boxes className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Open Requests</p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">{openCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">In Progress</p>
                <p className="text-2xl font-black text-blue-700 mt-0.5">{inProgressCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completed (On Time)</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-emerald-700">{completedCount}</span>
                  <span className="text-xs font-bold text-emerald-600 font-mono">({onTimeRate}%)</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Tickets Table */}
        <MaintenanceTicketTable tickets={tickets} canManage={canManage} />
      </div>
    </div>
  )
}

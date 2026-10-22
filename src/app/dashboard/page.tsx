import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Ticket, Users, AlertCircle, CheckCircle2, CalendarDays, ExternalLink, FileText } from "lucide-react"
import Link from "next/link"
import { DashboardTicketButton } from "./DashboardTicketButton"
import dynamic from "next/dynamic"
import { getDashboardStats } from "@/lib/cache/dashboard"
import { getAccessInfo, getSession } from "@/lib/access"

const AnalyticsCharts = dynamic(() =>
  import("@/components/dashboard/AnalyticsCharts").then(mod => mod.AnalyticsCharts)
)

async function AsyncDashboardStats({ userUnitId, isSuperAdmin }: { userUnitId: string | null; isSuperAdmin: boolean }) {
  const stats = await getDashboardStats(userUnitId, isSuperAdmin)

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardCard 
          title="Total Tickets" 
          value={stats.totalTickets.toString()} 
          icon={<Ticket className="h-6 w-6 text-blue-500" />} 
          trend="All-time recorded"
        />
        <DashboardCard 
          title="Pending Issues" 
          value={stats.pendingTickets.toString()} 
          icon={<AlertCircle className="h-6 w-6 text-amber-500" />} 
          trend="Needs attention"
        />
        <DashboardCard 
          title="Resolved Today" 
          value={stats.resolvedToday.toString()} 
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />} 
          trend="Great job!"
        />
        {isSuperAdmin && (
          <>
            <DashboardCard 
              title="Active Assets" 
              value={stats.activeAssets.toString()} 
              icon={<Users className="h-6 w-6 text-purple-500" />} 
              trend="Currently deployed"
            />
            <DashboardCard 
              title="Upcoming Events" 
              value={stats.upcomingEvents.toString()} 
              icon={<CalendarDays className="h-6 w-6 text-indigo-500" />} 
              trend="Scheduled IT Tasks"
            />
          </>
        )}
      </div>

      {isSuperAdmin && (
        <AnalyticsCharts statusData={stats.statusData} departmentData={stats.departmentData} />
      )}
    </>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white/70 h-28 rounded-xl border border-gray-100 p-5">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  )
}

async function AsyncRecentTickets({ isSuperAdmin, userUnitId }: { isSuperAdmin: boolean; userUnitId: string | null }) {
  const ticketScope = isSuperAdmin ? {} : { unitId: userUnitId }

  const recentTickets = await prisma.ticket.findMany({
    where: ticketScope,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { createdBy: true, unit: true }
  })

  if (recentTickets.length === 0) {
    return (
      <div className="text-sm text-gray-500 flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        No recent tickets found.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recentTickets.map(ticket => (
        <div key={ticket.id} className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate">{ticket.title}</h3>
            <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2 truncate">
              <span className="truncate max-w-[100px] sm:max-w-none">{ticket.createdBy.name}</span>
              <span>•</span>
              <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">{ticket.unit?.name || 'No Unit'}</span>
              <span className="flex-shrink-0">•</span>
              <span className="flex-shrink-0">{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
            ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
            ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            {ticket.status}
          </div>
        </div>
      ))}
    </div>
  )
}

function TicketsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const access = await getAccessInfo()
  if (!access) return null

  const userModules = access.modules
  const isRantau = access.branchName === "BubblesO2 Rantau"

  if (isRantau && !access.isSuperAdmin) {
    if (userModules.includes("FORMS")) redirect("/forms/production")
    if (userModules.includes("WAREHOUSE")) redirect("/forms/warehouse/dashboard")
    if (userModules.includes("WAREHOUSE_GATEPASS") || userModules.includes("GATEPASS_REQUESTER")) redirect("/forms/warehouse/gatepass")
    if (userModules.includes("SECURITY_GATEPASS")) redirect("/forms/warehouse/gatepass/security")
    if (userModules.includes("GMP_FORMS") || userModules.includes("MAINTENANCE_FORMS")) redirect("/forms/maintenance")
    if (userModules.includes("PALLET_LEDGER")) redirect("/forms/maintenance/pallet-transfer")
    if (userModules.includes("MAINTENANCE_DASHBOARD")) redirect("/forms/maintenance/dashboard")
    if (userModules.includes("GMP_REPORTS") || userModules.includes("MAINTENANCE_REPORTS")) redirect("/forms/maintenance/reports")
    if (userModules.includes("PRODUCTION_STOCK")) redirect("/forms/production/stock")
    if (userModules.includes("TRANSFER_IN_HISTORY")) redirect("/forms/production/transfer-in/history")
    if (userModules.includes("DATABASE_MANAGER")) redirect("/forms/database")
    if (userModules.includes("HANDOVER")) redirect("/forms/production/handover/new")
    if (userModules.includes("TICKETS")) redirect("/tickets")
    if (userModules.includes("ASSETS")) redirect("/dashboard/assets")

    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-600 mb-2">Access Restricted</h1>
          <p className="text-gray-600 font-bold">You do not have access to any modules yet.</p>
          <p className="text-gray-500 text-sm mt-2">Please contact your administrator to configure your access.</p>
        </div>
      </div>
    )
  }

  const isSuperAdmin = session.user.role === "SUPERADMIN"
  const userUnitId = session.user.unitId || null

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {session.user.name}. Here's your real-time analytics.
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <AsyncDashboardStats userUnitId={userUnitId} isSuperAdmin={isSuperAdmin} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-lg rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Tickets</h2>
            <Link href="/tickets" className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</Link>
          </div>
          
          <Suspense fallback={<TicketsSkeleton />}>
            <AsyncRecentTickets isSuperAdmin={isSuperAdmin} userUnitId={userUnitId} />
          </Suspense>
        </div>
        
        <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Quick Actions</h2>
          <div className="space-y-3 flex-1">
            <DashboardTicketButton />
            {isSuperAdmin && (
              <>
                <Link href="/dashboard/report" className="block w-full text-left px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all rounded-lg text-sm font-bold shadow-md hover:shadow-lg group flex items-center justify-between">
                  IT Performance Report <FileText className="h-4 w-4 text-indigo-200 group-hover:text-white" />
                </Link>
                <Link href="/calendar" className="block w-full text-left px-4 py-3 bg-white hover:bg-gray-50 transition-colors rounded-lg text-sm font-medium border border-gray-200 shadow-sm hover:shadow group flex items-center justify-between">
                  IT Event Calendar <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                </Link>
                <Link href="/dashboard/assets" className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg text-sm font-medium border border-blue-100 text-blue-700 shadow-sm hover:shadow group flex items-center justify-between">
                  Manage Assets <ExternalLink className="h-4 w-4 text-blue-400 group-hover:text-blue-600" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardCard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white/70 backdrop-blur-lg overflow-hidden rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-1">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            {icon}
          </div>
          <div className="ml-4 w-0 flex-1">
            <dl>
              <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate">{title}</dt>
              <dd className="text-3xl font-bold text-gray-900 mt-1">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50/50 px-5 py-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 font-medium">{trend}</div>
      </div>
    </div>
  )
}

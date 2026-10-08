import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Package,
  AlertTriangle,
  DollarSign,
  Plus,
  QrCode,
  List,
  Wrench,
  ExternalLink,
  Printer
} from "lucide-react"
import dynamic from "next/dynamic"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

const DashboardCharts = dynamic(() =>
  import("./DashboardCharts").then(mod => mod.DashboardCharts)
)

export default async function AssetsDashboard() {
  // getAccessInfo() returns null whenever there's no session, so this one
  // check covers both "not logged in" and "no access record".
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  if (!hasAnyModule(access, ["ASSETS"])) redirect("/dashboard")

  // Calculate Total Maintenance Cost YTD
  const currentYear = new Date().getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)

  // All of these reads are independent of each other, so run them in
  // parallel instead of one-by-one, and use DB-side aggregation instead of
  // pulling every asset row down just to sum/count in JS.
  const [
    statusCounts,
    valueAgg,
    deptValueGroups,
    departments,
    ytdLogs,
    recentAssignments,
    recentMaintenance,
    alertAssets,
    blankAssetsCount
  ] = await Promise.all([
    prisma.asset.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.asset.aggregate({ _sum: { price: true } }),
    prisma.asset.groupBy({ by: ['departmentId'], _sum: { price: true } }),
    prisma.department.findMany(),
    prisma.maintenanceLog.findMany({ where: { date: { gte: startOfYear } } }),
    prisma.assetAssignment.findMany({
      take: 3,
      orderBy: { checkoutDate: 'desc' },
      include: { asset: true, user: true }
    }),
    prisma.maintenanceLog.findMany({
      take: 3,
      orderBy: { date: 'desc' },
      include: { asset: true }
    }),
    prisma.asset.findMany({
      where: {
        OR: [
          { status: "MAINTENANCE" },
          { type: "VEHICLE" },
          { type: "SAFETY" }
        ]
      },
      include: { department: true },
      take: 5
    }),
    prisma.asset.count({
      where: { name: "[Blank QR - Ready to Register]" }
    })
  ])

  const totalAssets = statusCounts.reduce((sum, s) => sum + s._count._all, 0)
  const availableAssets = statusCounts.find(s => s.status === "AVAILABLE")?._count._all || 0
  const assignedAssets = statusCounts.find(s => s.status === "ASSIGNED")?._count._all || 0
  const maintenanceAssets = statusCounts.find(s => s.status === "MAINTENANCE")?._count._all || 0

  const totalMaintenanceCost = ytdLogs.reduce((acc, log) => acc + (log.cost || 0), 0)

  // Asset Value by Department
  const totalValue = valueAgg._sum.price || 0
  const deptNameById = new Map(departments.map(d => [d.id, d.name]))
  const chartData = deptValueGroups
    .filter(g => g._sum.price)
    .map(g => ({
      name: (g.departmentId && deptNameById.get(g.departmentId)) || "Unassigned",
      value: g._sum.price || 0
    }))
    .sort((a, b) => b.value - a.value)

  // Recent Activities (Assignments & Logs)
  const activities = [
    ...recentAssignments.map(a => ({
      id: `assign-${a.id}`,
      type: 'ASSIGNMENT',
      title: `Asset Assigned: ${a.asset?.name || 'Unknown Asset'}`,
      desc: `Assigned to ${a.user?.name || 'Unknown User'}`,
      date: a.checkoutDate
    })),
    ...recentMaintenance.map(m => ({
      id: `maint-${m.id}`,
      type: 'MAINTENANCE',
      title: `Maintenance: ${m.asset.name}`,
      desc: m.description,
      date: m.date
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
  
  // Helper to format currency
  const formatCurrency = (val: number) => `RM ${val.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Assets</h1>
          <p className="text-slate-500 mt-1">Overview of company physical assets and infrastructure.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/assets/audit" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition flex items-center shadow-sm border border-slate-200">
            <QrCode className="w-4 h-4 mr-2 text-slate-500" /> Scan QR
          </Link>
          <Link href="/dashboard/assets/qr" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition flex items-center shadow-sm border border-slate-200">
            <Printer className="w-4 h-4 mr-2 text-slate-500" /> Print QR
          </Link>
          <Link href="/dashboard/assets/new" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition flex items-center shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Asset
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Assets</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{totalAssets}</h3>
            </div>
            <div className="bg-blue-50/80 border border-blue-100 p-2.5 rounded-xl">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500 mt-5 flex justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
            <span className="text-teal-600 font-bold">{totalAssets - blankAssetsCount} Registered</span>
            <span className="text-amber-600 font-bold">{blankAssetsCount} Blank QRs</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Maintenance</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{maintenanceAssets}</h3>
            </div>
            <div className="bg-orange-50/80 border border-orange-100 p-2.5 rounded-xl">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-4">Currently being serviced</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Asset Value</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1 truncate" title={formatCurrency(totalValue)}>
                {formatCurrency(totalValue)}
              </h3>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-100 p-2.5 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-4">Across all departments</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Maintenance YTD</p>
              <h3 className="text-2xl font-black text-red-600 mt-1 truncate" title={formatCurrency(totalMaintenanceCost)}>
                {formatCurrency(totalMaintenanceCost)}
              </h3>
            </div>
            <div className="bg-red-50/80 border border-red-100 p-2.5 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-4">Repair costs this year</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30">
              <h3 className="font-bold text-slate-800">Asset Value by Department</h3>
            </div>
            <div className="flex-1 p-5 relative">
              <DashboardCharts data={chartData} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
               <Link href="/dashboard/assets/list" className="bg-white p-6 text-center hover:bg-indigo-50/50 transition group">
                  <div className="mx-auto w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <List className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-800 text-sm">Master List</div>
               </Link>
               <Link href="/dashboard/assets/new" className="bg-white p-6 text-center hover:bg-teal-50/50 transition group">
                  <div className="mx-auto w-12 h-12 bg-teal-50 border border-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-800 text-sm">Add Asset</div>
               </Link>
               <Link href="/dashboard/assets/audit" className="bg-white p-6 text-center hover:bg-blue-50/50 transition group">
                  <div className="mx-auto w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-800 text-sm">Audit & Scan</div>
               </Link>
               <Link href="/dashboard/report" className="bg-white p-6 text-center hover:bg-orange-50/50 transition group">
                  <div className="mx-auto w-12 h-12 bg-orange-50 border border-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-800 text-sm">Reports</div>
               </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Activity */}
        <div className="space-y-8">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-red-100 bg-red-50 flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="font-bold text-red-900">Maintenance & Action Required</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {alertAssets.length === 0 && <p className="p-5 text-sm font-medium text-slate-500 text-center">All assets operating normally.</p>}
              {alertAssets.map(asset => (
                <Link href={`/dashboard/assets/${asset.id}`} key={asset.id} className="p-4 hover:bg-slate-50 transition block group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm group-hover:text-teal-600 transition-colors">{asset.name}</p>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">{asset.department?.name || 'Asset'}{asset.brand ? ` • ${asset.brand}` : ''}</p>
                    </div>
                    {asset.status === "MAINTENANCE" ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-orange-100 border border-orange-200 text-orange-700 px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap">Maintenance</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-md shadow-sm whitespace-nowrap">Check Due</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center">
                <List className="w-5 h-5 text-slate-500 mr-2" />
                <h3 className="font-bold text-slate-800">Recent Activity</h3>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {activities.length === 0 && <p className="p-5 text-sm font-medium text-slate-500 text-center">No recent activity logged.</p>}
              {activities.map(act => (
                <div key={act.id} className="p-4 hover:bg-slate-50 transition">
                  <p className="text-xs font-bold text-indigo-500 mb-1.5 uppercase tracking-wider">
                    {act.date.toLocaleDateString('en-GB')} {act.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit'})}
                  </p>
                  <p className="font-bold text-slate-800 text-sm">{act.title}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{act.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
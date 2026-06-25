import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ReportPrintButton } from "./ReportPrintButton"
import { ShieldCheck, TrendingUp, Cpu, Users, DollarSign, PieChart, Activity } from "lucide-react"

export default async function ITPerformanceReport() {
  const session = await auth()
  if (session?.user.role !== "SUPERADMIN") redirect("/dashboard")

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch Tickets
  const totalTickets = await prisma.ticket.count()
  const resolvedTickets = await prisma.ticket.count({ where: { status: "RESOLVED" } })
  const pendingTickets = await prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
  const thisMonthTickets = await prisma.ticket.count({ where: { createdAt: { gte: firstDayOfMonth } } })

  // Fetch Assets
  const totalAssets = await prisma.asset.count()
  const activeAssets = await prisma.asset.count({ where: { status: "ACTIVE" } })
  const maintenanceAssets = await prisma.asset.count({ where: { status: "MAINTENANCE" } })
  const brokenAssets = await prisma.asset.count({ where: { status: "BROKEN" } })

  const resolutionRate = totalTickets === 0 ? 100 : (resolvedTickets / totalTickets) * 100
  const assetHealthRate = totalAssets === 0 ? 100 : (activeAssets / totalAssets) * 100

  // Top Departments with Issues
  const unitStats = await prisma.ticket.groupBy({
    by: ['unitId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5
  })
  
  // Fetch unit names
  const topUnits = await Promise.all(
    unitStats.map(async (stat) => {
      if (!stat.unitId) return { name: "Unknown", count: stat._count.id }
      const unit = await prisma.unit.findUnique({ where: { id: stat.unitId } })
      return { name: unit?.name || "Unknown", count: stat._count.id }
    })
  )

  // -- NEW: V1.4 Financial & Classification Data --
  const allCosts = await prisma.ticketCost.findMany({
    include: { ticket: { include: { unit: true } } }
  })

  let totalCost = 0
  const costByDept: Record<string, number> = {}
  const costByType: Record<string, number> = {}
  const ticketByTypeCount: Record<string, number> = {}

  allCosts.forEach(cost => {
    totalCost += cost.amount
    const deptName = cost.ticket.unit?.name || "Unknown"
    costByDept[deptName] = (costByDept[deptName] || 0) + cost.amount
    const typeName = cost.ticket.type || "Uncategorized"
    costByType[typeName] = (costByType[typeName] || 0) + cost.amount
  })

  const tickets = await prisma.ticket.findMany({ select: { type: true } })
  tickets.forEach(t => {
    const typeName = t.type || "Uncategorized"
    ticketByTypeCount[typeName] = (ticketByTypeCount[typeName] || 0) + 1
  })

  const costByDeptArr = Object.entries(costByDept).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
  const costByTypeArr = Object.entries(costByType).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount)
  const ticketByTypeArr = Object.entries(ticketByTypeCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)


  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 print:pb-0">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IT Performance Report</h1>
          <p className="text-gray-500 text-sm mt-1">Executive Summary</p>
        </div>
        <ReportPrintButton />
      </div>

      {/* The Printable Report Container */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 print:shadow-none print:border-none print:m-0 overflow-hidden">
        
        {/* Report Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-10 text-white flex justify-between items-center print:bg-slate-900 print:text-black print:!bg-none">
          <div>
            <h2 className="text-3xl font-black tracking-tight flex items-center print:text-black">
              <ShieldCheck className="w-8 h-8 mr-3 text-indigo-400 print:text-black" />
              IT Operations Report
            </h2>
            <p className="text-indigo-200 mt-2 font-medium print:text-gray-600">Generated on: {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest print:text-gray-500">System Name</div>
            <div className="text-xl font-bold tracking-tight print:text-black">BubblesO2 ITST</div>
          </div>
        </div>

        <div className="p-10 space-y-10">
          
          {/* Executive Overview */}
          <div className="p-8 rounded-3xl border-2 flex flex-col md:flex-row items-center justify-between bg-blue-50 border-blue-200">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Overall Operations Overview</h3>
              <p className="text-gray-700 font-medium text-lg leading-relaxed">System statistics based on current active data.</p>
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-6 text-sm font-bold text-gray-600">
                <span className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">Resolution Rate: <span className="text-blue-700">{resolutionRate.toFixed(1)}%</span></span>
                <span className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100">Asset Health: <span className="text-emerald-700">{assetHealthRate.toFixed(1)}%</span></span>
                <span className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-100 flex items-center">
                  Total IT Cost: <span className="text-red-600 ml-1">RM {totalCost.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Ticketing KPI */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-900 flex items-center border-b pb-2">
                <TrendingUp className="w-4 h-4 mr-2" /> Helpdesk Ticketing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase">Total Tickets</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{totalTickets}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <div className="text-xs font-bold text-emerald-700 uppercase">Resolved</div>
                  <div className="text-3xl font-black text-emerald-600 mt-1">{resolvedTickets}</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <div className="text-xs font-bold text-amber-700 uppercase">Pending</div>
                  <div className="text-3xl font-black text-amber-600 mt-1">{pendingTickets}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <div className="text-xs font-bold text-blue-700 uppercase">This Month</div>
                  <div className="text-3xl font-black text-blue-600 mt-1">{thisMonthTickets}</div>
                </div>
              </div>
            </div>

            {/* Asset KPI */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-900 flex items-center border-b pb-2">
                <Cpu className="w-4 h-4 mr-2" /> Infrastructure Health
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="text-xs font-bold text-gray-500 uppercase">Total Assets</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{totalAssets}</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <div className="text-xs font-bold text-emerald-700 uppercase">Active / Healthy</div>
                  <div className="text-3xl font-black text-emerald-600 mt-1">{activeAssets}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <div className="text-xs font-bold text-orange-700 uppercase">In Maintenance</div>
                  <div className="text-3xl font-black text-orange-600 mt-1">{maintenanceAssets}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                  <div className="text-xs font-bold text-red-700 uppercase">Broken / Faulty</div>
                  <div className="text-3xl font-black text-red-600 mt-1">{brokenAssets}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Department Hotspots */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-900 flex items-center border-b pb-2">
              <Users className="w-4 h-4 mr-2" /> Highest Support Volume by Department
            </h3>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Department Name</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Tickets Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topUnits.length === 0 ? (
                    <tr><td colSpan={2} className="px-6 py-4 text-sm text-gray-500 text-center">No data available.</td></tr>
                  ) : topUnits.map((unit, idx) => (
                    <tr key={idx} className={idx === 0 ? 'bg-red-50/30' : ''}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center">
                        <span className="w-6 text-gray-400 text-xs font-bold">#{idx + 1}</span> {unit.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-right text-gray-700">{unit.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
            {/* Ticket Classification */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-900 flex items-center border-b pb-2">
                <PieChart className="w-4 h-4 mr-2" /> Ticket Classification
              </h3>
              <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                {ticketByTypeArr.length === 0 && <p className="text-sm text-gray-500">No data.</p>}
                {ticketByTypeArr.map((t, idx) => {
                  const percentage = totalTickets === 0 ? 0 : (t.count / totalTickets) * 100
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-700">{t.name}</span>
                        <span className="text-gray-500 font-medium">{t.count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-900 flex items-center border-b pb-2">
                <DollarSign className="w-4 h-4 mr-2" /> Financial Summary
              </h3>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-red-700 uppercase">Total IT Spending</span>
                  <span className="text-2xl font-black text-red-600">RM {totalCost.toFixed(2)}</span>
                </div>
                <div className="p-5 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center"><Activity className="w-3 h-3 mr-1"/> Cost By Department</h4>
                    {costByDeptArr.length === 0 && <p className="text-sm text-gray-500">No costs recorded.</p>}
                    <div className="space-y-3">
                      {costByDeptArr.slice(0,5).map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">{c.name}</span>
                          <span className="font-bold text-red-600">RM {c.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center"><PieChart className="w-3 h-3 mr-1"/> Cost By Ticket Type</h4>
                    <div className="space-y-3">
                      {costByTypeArr.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">{c.name}</span>
                          <span className="font-bold text-red-600">RM {c.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium">This report is automatically generated by BubblesO2 AIO System.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

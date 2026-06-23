"use client"

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import { Package, AlertOctagon, TrendingUp, Archive, Activity } from 'lucide-react'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function FormsAnalyticsClient({
  productionTrendData,
  rejectData,
  incomingTrendData,
  totalBoxesProduced,
  totalRejects,
  totalTransferBags,
  latestInventory
}: {
  productionTrendData: any[]
  rejectData: any[]
  incomingTrendData: any[]
  totalBoxesProduced: number
  totalRejects: number
  totalTransferBags: number
  latestInventory: any[]
}) {
  
  // Calculate a rough rejection rate based on an average of 20 bottles per box
  // This is a business logic simplification for the visual dashboard
  const estimatedTotalBottles = totalBoxesProduced * 20
  const rejectRate = estimatedTotalBottles > 0 
    ? ((totalRejects / (estimatedTotalBottles + totalRejects)) * 100).toFixed(2) 
    : "0.00"

  // Aggregate storeroom balance (Group by category)
  const inventorySummary: Record<string, number> = {}
  latestInventory.forEach(inv => {
    let category = "Others"
    if (inv.sectionKey.includes("BOTTLE")) category = "Bottles"
    else if (inv.sectionKey.includes("CAP")) category = "Caps"
    else if (inv.sectionKey.includes("BOX")) category = "Boxes"
    else if (inv.sectionKey.includes("LABEL")) category = "Labels"

    if (!inventorySummary[category]) inventorySummary[category] = 0
    inventorySummary[category] += (inv.bags * inv.mult)
  })

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Production" 
          value={totalBoxesProduced.toLocaleString()} 
          subtitle="Boxes Produced" 
          icon={<TrendingUp className="h-6 w-6 text-indigo-500" />}
          colorClass="border-indigo-100 bg-indigo-50/30"
        />
        <KPICard 
          title="Total Rejects" 
          value={totalRejects.toLocaleString()} 
          subtitle="Items Defective" 
          icon={<AlertOctagon className="h-6 w-6 text-red-500" />}
          colorClass="border-red-100 bg-red-50/30"
        />
        <KPICard 
          title="Overall Reject Rate" 
          value={`${rejectRate}%`} 
          subtitle="Rejects / Total Volume" 
          icon={<Activity className="h-6 w-6 text-amber-500" />}
          colorClass="border-amber-100 bg-amber-50/30"
        />
        <KPICard 
          title="Incoming Deliveries" 
          value={totalTransferBags.toLocaleString()} 
          subtitle="Bags/Boxes Received" 
          icon={<Package className="h-6 w-6 text-emerald-500" />}
          colorClass="border-emerald-100 bg-emerald-50/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Production Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-black uppercase text-gray-800 mb-4 tracking-tight border-b pb-2">Production Output Trend (Boxes)</h3>
          {productionTrendData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBoxes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="boxes" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorBoxes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No production data available for charting." />
          )}
        </div>

        {/* Top Rejects Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-black uppercase text-gray-800 mb-4 tracking-tight border-b pb-2">Top Defective Items</h3>
          {rejectData.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rejectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {rejectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`${value} items`, 'Rejects']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {rejectData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="font-bold text-gray-700 truncate max-w-[120px] uppercase">{item.name}</span>
                    </div>
                    <span className="font-black text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No reject data available." />
          )}
        </div>

        {/* Delivery / Incoming Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-black uppercase text-gray-800 mb-4 tracking-tight border-b pb-2">Incoming Delivery Trend (Bags/Boxes)</h3>
          {incomingTrendData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="bags" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="No delivery data available for charting." />
          )}
        </div>

        {/* Inventory Summary (Latest) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-black uppercase text-gray-800 mb-4 tracking-tight border-b pb-2 flex items-center">
            <Archive className="w-5 h-5 mr-2 text-gray-400" />
            Storeroom Balances
          </h3>
          {Object.keys(inventorySummary).length > 0 ? (
            <div className="flex-1 flex flex-col gap-4 pt-2">
              {Object.entries(inventorySummary).map(([category, count]) => (
                <div key={category} className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                  <span className="font-bold uppercase text-gray-600 tracking-wider text-sm">{category}</span>
                  <span className="font-black text-xl text-gray-900">{count.toLocaleString()}</span>
                </div>
              ))}
              <div className="mt-auto text-xs text-center font-bold text-gray-400 italic pt-4">
                *Based on most recently approved End-of-Shift report. Values represent estimated total pieces.
              </div>
            </div>
          ) : (
            <EmptyState message="No recent storeroom data available." />
          )}
        </div>

      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon, colorClass }: { title: string, value: string, subtitle: string, icon: React.ReactNode, colorClass: string }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col ${colorClass.replace('bg-', 'hover:bg-').replace('/30', '/10')} transition-colors`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg border ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div>
        <h4 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h4>
        <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mt-1">{title}</p>
        <p className="text-xs font-medium text-gray-400 mt-2">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
      <AlertOctagon className="w-8 h-8 text-gray-300 mb-2" />
      <p className="text-gray-500 font-medium text-sm">{message}</p>
    </div>
  )
}

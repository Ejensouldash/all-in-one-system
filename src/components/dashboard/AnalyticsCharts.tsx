"use client"

import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

export function AnalyticsCharts({ 
  statusData, 
  departmentData 
}: { 
  statusData: any[], 
  departmentData: any[] 
}) {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b'] // Emerald (Resolved), Blue (In Progress), Amber (Open)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Tickets By Status - Pie Chart */}
      <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Tickets by Status</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tickets By Department - Bar Chart */}
      <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Tickets by Department</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                interval={0}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip
                cursor={{ fill: '#f3f4f6' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar 
                dataKey="tickets" 
                fill="#4f46e5" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

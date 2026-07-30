import Link from "next/link"
import { getDailyRawMaterialReports } from "@/app/actions/warehouseDailyRawMaterial"
import { Plus, Eye, Calendar, Clock } from "lucide-react"

export default async function DailyRawMaterialHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Number(searchParams.page) || 1
  const result = await getDailyRawMaterialReports(page, 20)
  
  const reports = result.success ? result.data : []
  const total = result.success ? result.total : 0

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase">Daily Raw Material (Warehouse)</h1>
          <p className="text-gray-500">History of daily raw material reports</p>
        </div>
        
        <Link 
          href="/forms/warehouse/reports/daily-raw-material/new" 
          className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Report</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Shift</th>
                <th className="px-6 py-4">Prepared By</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Items Count</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report: any) => (
                <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(report.date).toLocaleDateString('en-MY')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {report.time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {report.shift}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{report.preparedBy}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {report.items?.length || 0} items
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/forms/warehouse/reports/daily-raw-material/${report.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-end gap-1"
                    >
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </td>
                </tr>
              ))}
              
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No reports found. Create a new one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

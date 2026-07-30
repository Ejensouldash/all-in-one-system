import { getDailyRawMaterialReportById } from "@/app/actions/warehouseDailyRawMaterial"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, User } from "lucide-react"

export default async function DailyRawMaterialViewPage({
  params
}: {
  params: { id: string }
}) {
  const result = await getDailyRawMaterialReportById(params.id)
  
  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto p-4 max-w-5xl text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Report Not Found</h1>
        <Link href="/forms/warehouse/reports/daily-raw-material" className="text-blue-600 hover:underline">
          Return to History
        </Link>
      </div>
    )
  }

  const report = result.data

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase">Daily Raw Material (Warehouse)</h1>
          <p className="text-gray-500">Report Details</p>
        </div>
        <Link 
          href="/forms/warehouse/reports/daily-raw-material"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
          <div className="flex items-center gap-2 font-medium">
            <Calendar className="w-4 h-4 text-gray-400" />
            {new Date(report.date).toLocaleDateString('en-MY')}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time / Shift</label>
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-gray-400" />
            {report.time} ({report.shift})
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prepared By</label>
          <div className="flex items-center gap-2 font-medium">
            <User className="w-4 h-4 text-gray-400" />
            {report.preparedBy}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              report.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {report.status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Raw Material Logs</h2>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
            <tr>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Batch No</th>
              <th className="px-4 py-3 text-center">Bal. In Whse</th>
              <th className="px-4 py-3 text-center text-emerald-600">+ Qty In</th>
              <th className="px-4 py-3 text-center text-rose-600">- Qty Out</th>
              <th className="px-4 py-3 text-center text-blue-600">= Carry Forward</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">{item.section}</td>
                <td className="px-4 py-3">{item.sku}</td>
                <td className="px-4 py-3 font-medium uppercase">{item.batchNo}</td>
                <td className="px-4 py-3 text-center font-bold">{item.balanceInWarehouse}</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-600">{item.quantityStockIn}</td>
                <td className="px-4 py-3 text-center font-bold text-rose-600">{item.quantityStockOut}</td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded font-bold">
                    {item.balanceCarryForward}
                  </div>
                </td>
              </tr>
            ))}
            
            {report.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

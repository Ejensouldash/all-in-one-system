import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ExternalLink, ClipboardList, PackagePlus, Eye } from "lucide-react"
import Link from "next/link"
import { FormsTabs } from "@/components/forms/FormsTabs"

export default async function FormsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const reports = await prisma.dailyReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return (
    <div className="animate-in fade-in duration-500 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        <FormsTabs role={(session.user as any).trueRole || session.user.role} />
        
        {/* Module CTAs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-700/50">
            <div className="relative z-10 mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                Warehouse Module V3
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Warehouse & Distribution</h2>
              <p className="text-emerald-200 text-sm font-medium">
                Manage incoming transfers, stock batches, DO, and reverse logistics.
              </p>
            </div>
            <Link href="/forms/warehouse/dashboard" className="group flex items-center justify-center w-full bg-white text-emerald-900 px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg">
              <PackagePlus className="h-5 w-5 mr-2" /> Enter Warehouse System
            </Link>
          </div>

          <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-amber-700/50">
            <div className="relative z-10 mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-100 text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>
                Raw Materials
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">DO Receiving (Transfer In)</h2>
              <p className="text-amber-200 text-sm font-medium">
                Log real-time Delivery Orders (DO) as they arrive.
              </p>
            </div>
            <Link href="/forms/transfer-in" className="group flex items-center justify-center w-full bg-white text-amber-900 px-8 py-4 rounded-xl font-bold hover:bg-amber-50 transition-colors shadow-lg">
              <PackagePlus className="h-5 w-5 mr-2" /> Log Incoming Stock
            </Link>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-indigo-700/50">
            <div className="relative z-10 mb-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-xs font-bold uppercase tracking-widest mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                Production Module
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">KAR Daily Report</h2>
              <p className="text-indigo-200 text-sm font-medium">
                End-of-shift production logs, auto-syncing carry forward inventory.
              </p>
            </div>
            <Link href="/forms/production/daily-report" className="group flex items-center justify-center w-full bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">
              <ClipboardList className="h-5 w-5 mr-2" /> Start Shift Report
            </Link>
          </div>

        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
            <ClipboardList className="w-6 h-6 mr-3 text-indigo-600" />
            Submitted Daily Reports
          </h2>
        </div>
        
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Reports Found</h3>
            <p className="text-gray-500 mt-1">Production reports submitted via the KAR Daily Report will appear here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Time</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Shift</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Line</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Prepared By</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {new Date(report.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                        {report.time || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-black uppercase rounded ${report.shift === 'AM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                          {report.shift}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                        {report.line}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase font-medium">
                        {report.preparedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.status === 'APPROVED' ? (
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-black uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/forms/daily-report/${report.id}`} className="text-indigo-600 hover:text-indigo-900 font-black flex items-center justify-end bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

    </div>
  )
}

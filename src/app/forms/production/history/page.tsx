import { getDailyReportsByUser } from "@/app/actions/dailyReport"
import Link from "next/link"
import { ClipboardList, Eye, Edit, Clock, History, AlertCircle, CheckCircle } from "lucide-react"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { auth } from "@/auth"

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1
  const pageSize = 10
  
  const session = await auth();
  const result = await getDailyReportsByUser(page, pageSize)
  const reports = result.data || []
  const totalPages = result.totalPages || 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FormsTabs role={(session?.user as any)?.trueRole || session?.user?.role} />
      
      <div className="bg-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center mb-2">
              <History className="w-8 h-8 mr-3 text-indigo-400" />
              My Submissions
            </h1>
            <p className="text-indigo-200 font-medium max-w-2xl text-lg">
              View the history of your submitted daily reports.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 flex items-center">
            <ClipboardList className="w-5 h-5 mr-3 text-indigo-600" />
            Submission Log
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Submissions Found</h3>
            <p className="text-gray-500 mt-1">You haven't submitted any production reports yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-24 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="w-20 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Shift</th>
                  <th scope="col" className="w-32 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Line</th>
                  <th scope="col" className="w-40 px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="w-40 px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report: any) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 truncate">
                      {new Date(report.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-black uppercase rounded ${report.shift === 'AM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {report.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 truncate">
                      {report.line}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {report.status === 'APPROVED' && (
                        <span className="flex items-center text-xs font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full w-fit">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approved / Locked
                        </span>
                      )}
                      {report.status === 'REJECTED' && (
                        <span className="flex items-center text-xs font-black uppercase text-red-700 bg-red-100 px-2 py-1 rounded-full w-fit">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" /> Needs Correction
                        </span>
                      )}
                      {report.status === 'PENDING' && (
                        <span className="flex items-center text-xs font-black uppercase text-amber-700 bg-amber-100 px-2 py-1 rounded-full w-fit">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Pending Supervisor
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-2">
                      {report.status !== 'APPROVED' && (
                        <Link href={`/forms/production/daily-report/${report.id}/edit`} className="text-amber-600 hover:text-amber-900 font-black flex items-center bg-amber-50 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors">
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Link>
                      )}
                      <Link href={`/forms/production/daily-report/${report.id}`} className="text-indigo-600 hover:text-indigo-900 font-black flex items-center bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <Link
                href={`/forms/history?page=${Math.max(1, page - 1)}`}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page === 1 ? 'pointer-events-none opacity-50' : ''}`}
              >
                Previous
              </Link>
              <Link
                href={`/forms/history?page=${Math.min(totalPages, page + 1)}`}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page === totalPages ? 'pointer-events-none opacity-50' : ''}`}
              >
                Next
              </Link>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <Link
                    href={`/forms/history?page=${Math.max(1, page - 1)}`}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === 1 ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <span className="sr-only">Previous</span>
                    Previous
                  </Link>
                  <Link
                    href={`/forms/history?page=${Math.min(totalPages, page + 1)}`}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <span className="sr-only">Next</span>
                    Next
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

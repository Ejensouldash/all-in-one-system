import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardList, PackagePlus, Eye } from "lucide-react"
import { FormsTabs } from "@/components/forms/FormsTabs"
import { prisma } from "@/lib/prisma"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export const metadata = {
  title: "Production Dashboard",
}

export default async function ProductionDashboard(props: {
  searchParams?: Promise<{ page?: string }>
}) {
  const resolvedParams = await props.searchParams
  const currentPage = Math.max(1, parseInt(resolvedParams?.page || "1", 10) || 1)
  const pageSize = 5

  // Check module access with live DB data (Superadmin gets all by default)
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["FORMS"])) {
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  const hasHandoverAccess = hasAnyModule(access, ["HANDOVER"])

  // Count total reports for pagination
  const totalReports = await prisma.dailyReport.count()
  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize))

  // Fetch paginated reports for the table
  const reports = await prisma.dailyReport.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-2">
            <ClipboardList className="h-10 w-10 text-indigo-700" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter text-gray-900">
                Production Dashboard
              </h1>
              <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">
                Forms & Logging
              </p>
            </div>
          </div>
        </div>

        <FormsTabs role={access.isSuperAdmin ? "SUPERADMIN" : access.role} />

        {/* Module CTAs */}
        <div className={`grid grid-cols-1 ${hasHandoverAccess ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8 mb-12`}>
          
          <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-amber-700/50 hover:-translate-y-1 transition-transform">
            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-100 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>
                Raw Materials
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Transfer In Forms</h2>
              <p className="text-amber-200 text-base font-medium max-w-md">
                Log real-time Delivery Orders (DO) for raw materials as they arrive from suppliers.
              </p>
            </div>
            <Link href="/forms/production/transfer-in" className="group flex items-center justify-center w-full bg-white text-amber-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-amber-50 transition-colors shadow-lg uppercase tracking-wider">
              <PackagePlus className="h-6 w-6 mr-3" /> Log Incoming Stock
            </Link>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-indigo-700/50 hover:-translate-y-1 transition-transform">
            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                Production Module
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Daily KAR</h2>
              <p className="text-indigo-200 text-base font-medium max-w-md">
                End-of-shift production logs, auto-syncing carry forward inventory to the warehouse.
              </p>
            </div>
            <Link href="/forms/production/daily-report" className="group flex items-center justify-center w-full bg-white text-indigo-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-indigo-50 transition-colors shadow-lg uppercase tracking-wider">
              <ClipboardList className="h-6 w-6 mr-3" /> Start Shift Report
            </Link>
          </div>

          {hasHandoverAccess && (
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-700/50 hover:-translate-y-1 transition-transform">
              <div className="relative z-10 mb-8">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-100 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                  Finished Goods
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Handover Form</h2>
                <p className="text-emerald-200 text-base font-medium max-w-md">
                  Nota Serahan Produksi to transfer finished goods to the warehouse and log direct deductions.
                </p>
              </div>
              <Link href="/forms/production/handover/new" className="group flex items-center justify-center w-full bg-white text-emerald-900 px-8 py-4 rounded-xl font-black text-lg hover:bg-emerald-50 transition-colors shadow-lg uppercase tracking-wider">
                <ClipboardList className="h-6 w-6 mr-3" /> Create Handover
              </Link>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between mt-12">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
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
                        {new Date(report.date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kuala_Lumpur' })}
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
                        ) : report.status === 'DRAFT' ? (
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-black uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                            Draft
                          </span>
                        ) : report.status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-black uppercase rounded-full bg-red-100 text-red-800 border border-red-300 shadow-sm">
                            Rejected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/forms/production/daily-report/${report.id}`} className="text-indigo-600 hover:text-indigo-900 font-black flex items-center justify-end bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Link
                    href={`/forms/production?page=${Math.max(1, currentPage - 1)}`}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    Previous
                  </Link>
                  <Link
                    href={`/forms/production?page=${Math.min(totalPages, currentPage + 1)}`}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    Next
                  </Link>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-bold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                      <span className="font-bold text-gray-900">{Math.min(currentPage * pageSize, totalReports)}</span> of{" "}
                      <span className="font-bold text-gray-900">{totalReports}</span> reports
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <Link
                        href={`/forms/production?page=${Math.max(1, currentPage - 1)}`}
                        className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                      >
                        Previous
                      </Link>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <Link
                          key={p}
                          href={`/forms/production?page=${p}`}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold ${
                            p === currentPage
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </Link>
                      ))}
                      <Link
                        href={`/forms/production?page=${Math.min(totalPages, currentPage + 1)}`}
                        className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                      >
                        Next
                      </Link>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

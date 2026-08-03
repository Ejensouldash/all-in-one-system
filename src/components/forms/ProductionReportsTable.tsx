"use client"

import { useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Eye, Loader2 } from "lucide-react"

export interface DailyReportItem {
  id: string
  date: string | Date
  time: string | null
  shift: string
  line: string
  preparedBy: string
  status: string
}

interface ProductionReportsTableProps {
  reports: DailyReportItem[]
  totalReports: number
  currentPage: number
  pageSize: number
  totalPages: number
}

function getPaginationPages(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total]
  }

  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, "...", current - 1, current, current + 1, "...", total]
}

export function ProductionReportsTable({
  reports,
  totalReports,
  currentPage,
  pageSize,
  totalPages,
}: ProductionReportsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const goToPage = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages || isPending) return
    startTransition(() => {
      router.push(`${pathname}?page=${page}`, { scroll: false })
    })
  }

  const paginationPages = getPaginationPages(currentPage, totalPages)
  const startRecord = (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalReports)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12 relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center transition-opacity">
          <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-200 flex items-center space-x-3 text-indigo-700 font-bold text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading page {currentPage}...</span>
          </div>
        </div>
      )}

      <div className={`overflow-x-auto transition-opacity duration-150 ${isPending ? "opacity-40" : "opacity-100"}`}>
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
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || isPending}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || isPending}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-bold text-gray-900">{startRecord}</span> to{" "}
                <span className="font-bold text-gray-900">{endRecord}</span> of{" "}
                <span className="font-bold text-gray-900">{totalReports}</span> reports
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                  className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {paginationPages.map((page, index) => {
                  if (typeof page === "string") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-400 select-none"
                      >
                        ...
                      </span>
                    )
                  }

                  const isCurrent = page === currentPage
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      disabled={isPending}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold transition-colors ${
                        isCurrent
                          ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
                  className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

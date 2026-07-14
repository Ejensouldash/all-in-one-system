import { redirect } from "next/navigation"
import { getTransferInHistory } from "@/app/actions/transferIn"
import Link from "next/link"
import { ClipboardList, Eye, PackagePlus, History } from "lucide-react"
import { TransferInHistoryClient } from "@/components/forms/TransferInHistoryClient"
import { getAccessInfo, hasAnyModule } from "@/lib/access"

export default async function TransferInHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")

  if (!hasAnyModule(access, ["FORMS", "TRANSFER_IN_HISTORY"])) {
    // /forms re-routes the user to whichever section they DO have access to
    redirect("/forms")
  }

  const role = access.isSuperAdmin ? "SUPERADMIN" : access.role
  const modules = access.modules

  const resolvedParams = await searchParams
  const page = resolvedParams.page ? parseInt(resolvedParams.page) : 1
  const pageSize = 20
  
  const result = await getTransferInHistory(page, pageSize)
  const transfers = result.data || []
  const totalPages = result.totalPages || 0

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8 mt-8">
      
      <div className="bg-emerald-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-3xl opacity-50 -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center mb-2">
              <History className="w-8 h-8 mr-3 text-emerald-400" />
              Transfer In History
            </h1>
            <p className="text-emerald-200 font-medium max-w-2xl text-lg">
              View historical logs of Delivery Orders (Transfer In).
            </p>
          </div>
          <Link href="/forms/production/transfer-in" className="flex items-center bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg">
            <PackagePlus className="w-5 h-5 mr-2" /> Log New DO
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 flex items-center">
            <ClipboardList className="w-5 h-5 mr-3 text-emerald-600" />
            DO Logs
          </h2>
        </div>

        {transfers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No DOs Found</h3>
            <p className="text-gray-500 mt-1">No delivery orders have been logged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <TransferInHistoryClient 
                transfers={transfers} 
                hasAdminAccess={role === "SUPERADMIN" || modules.includes("TRANSFER_IN_HISTORY")} 
              />
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <Link
                href={`/forms/production/transfer-in/history?page=${Math.max(1, page - 1)}`}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page === 1 ? 'pointer-events-none opacity-50' : ''}`}
              >
                Previous
              </Link>
              <Link
                href={`/forms/production/transfer-in/history?page=${Math.min(totalPages, page + 1)}`}
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
                    href={`/forms/production/transfer-in/history?page=${Math.max(1, page - 1)}`}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === 1 ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    <span className="sr-only">Previous</span>
                    Previous
                  </Link>
                  <Link
                    href={`/forms/production/transfer-in/history?page=${Math.min(totalPages, page + 1)}`}
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

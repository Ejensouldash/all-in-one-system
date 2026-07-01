import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getAuditLogs } from "@/app/actions/audit"
import { Activity, Clock, User, Info, FileText } from "lucide-react"

export const metadata = {
  title: "User Activity Logs",
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  // Superadmin bypasses, or users with USER_LOGS module
  const hasAccess = session?.user.role === "SUPERADMIN" || (session?.user as any).modules?.includes("USER_LOGS")
  
  if (!session || !hasAccess) {
    redirect("/dashboard")
  }

  const sp = await searchParams
  const page = Number(sp.page) || 1
  const result = await getAuditLogs(page, 50)
  const logs = result.data || []
  const totalPages = result.totalPages || 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <Activity className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Activity Logs</h1>
          <p className="text-gray-500 mt-1 text-sm">Monitor user actions, submissions, and modifications across the system.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Action</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p>No activity logs found.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(log.createdAt).toLocaleString('en-GB')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                          <User className="h-3 w-3 text-indigo-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.details ? (
                        <div className="flex items-start">
                          <Info className="h-4 w-4 mr-1.5 text-gray-400 mt-0.5 shrink-0" />
                          <span className="break-words line-clamp-2" title={log.details}>{log.details}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No details</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex space-x-2">
              {page > 1 && (
                <a href={`/organization/audit-logs?page=${page - 1}`} className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a href={`/organization/audit-logs?page=${page + 1}`} className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

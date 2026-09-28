"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Eye, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Search, 
  Filter, 
  Zap, 
  Building, 
  Cog, 
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { MaintenanceTicketViewModal } from "./MaintenanceTicketViewModal"

function getPaginationItems(currentPage: number, totalPages: number): (number | string)[] {
  const items: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i)
  } else {
    if (currentPage <= 4) {
      items.push(1, 2, 3, 4, 5, "...", totalPages)
    } else if (currentPage >= totalPages - 3) {
      items.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      items.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
    }
  }
  return items
}

export function MaintenanceTicketTable({
  tickets,
  canManage,
}: {
  tickets: any[]
  canManage: boolean
}) {
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [search, setSearch] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(5)

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Type Filter
      if (typeFilter !== "ALL" && ticket.ticketType !== typeFilter) return false

      // Status Filter
      if (statusFilter !== "ALL" && ticket.status !== statusFilter) return false

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const logFormatted = `bo2-mt-${ticket.ticketNumber.toString().padStart(4, "0")}`
        const matchTitle = ticket.title?.toLowerCase().includes(q)
        const matchReason = ticket.reasonOfWork?.toLowerCase().includes(q)
        const matchLocation = ticket.location?.toLowerCase().includes(q)
        const matchRequester = ticket.requesterName?.toLowerCase().includes(q)
        const matchPic = (ticket.assignee?.name || ticket.assigneeName)?.toLowerCase().includes(q)
        const matchLog = logFormatted.includes(q) || (ticket.legacyProjectId && ticket.legacyProjectId.toLowerCase().includes(q))

        if (!matchTitle && !matchReason && !matchLocation && !matchRequester && !matchPic && !matchLog) {
          return false
        }
      }

      return true
    })
  }, [tickets, typeFilter, statusFilter, search])

  const totalFiltered = filteredTickets.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (safeCurrentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalFiltered)
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex)

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type)
    setCurrentPage(1)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setCurrentPage(1)
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const typeCounts = useMemo(() => {
    const counts = { ALL: tickets.length, MECHANICAL: 0, CIVIL: 0, ELECTRICAL: 0, OTHERS: 0 }
    tickets.forEach((t) => {
      if (t.ticketType in counts) {
        counts[t.ticketType as keyof typeof counts]++
      }
    })
    return counts
  }, [tickets])

  return (
    <div className="space-y-4">
      {/* Category Tabs & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Quick Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All Categories", icon: Filter, count: typeCounts.ALL },
              { id: "MECHANICAL", label: "Mechanical", icon: Cog, count: typeCounts.MECHANICAL, color: "text-amber-600 bg-amber-50 border-amber-200" },
              { id: "CIVIL", label: "Civil & Facility", icon: Building, count: typeCounts.CIVIL, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
              { id: "ELECTRICAL", label: "Electrical", icon: Zap, count: typeCounts.ELECTRICAL, color: "text-blue-600 bg-blue-50 border-blue-200" },
              { id: "OTHERS", label: "Others", icon: HelpCircle, count: typeCounts.OTHERS, color: "text-slate-600 bg-slate-50 border-slate-200" },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = typeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTypeFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Status Filter & Search */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search ticket, plant, requester..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 text-left text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Log No.</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Work Description</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">PIC</th>
                <th className="px-5 py-3.5">Requester</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-xs">
              {totalFiltered === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                    No maintenance tickets matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => {
                  const logNumber = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Log No */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {logNumber}
                          </span>
                          {ticket.legacyProjectId && (
                            <span className="text-[10px] text-amber-700 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {ticket.legacyProjectId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ticket Type */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[11px] ${
                            ticket.ticketType === "MECHANICAL"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : ticket.ticketType === "CIVIL"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : ticket.ticketType === "ELECTRICAL"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {ticket.ticketType === "MECHANICAL" && <Cog className="h-3 w-3 mr-1" />}
                          {ticket.ticketType === "CIVIL" && <Building className="h-3 w-3 mr-1" />}
                          {ticket.ticketType === "ELECTRICAL" && <Zap className="h-3 w-3 mr-1" />}
                          {ticket.ticketType}
                        </span>
                      </td>

                      {/* Work Description */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-2">
                          {ticket.title}
                        </div>
                        {ticket.reasonOfWork && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {ticket.reasonOfWork}
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{ticket.location}</span>
                        </div>
                        {ticket.specificArea && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                            {ticket.specificArea}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            ticket.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : ticket.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : ticket.status === "CANCELLED"
                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                              : ticket.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {ticket.status === "COMPLETED" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {ticket.status === "IN_PROGRESS" && <Clock className="mr-1 h-3 w-3" />}
                          {ticket.status === "OPEN" && <AlertCircle className="mr-1 h-3 w-3" />}
                          {ticket.status.replace("_", " ")}
                        </span>
                        {ticket.kpiStatus && (
                          <span className={`block text-[10px] font-bold mt-1 ${
                            ticket.kpiStatus === "Delay" ? "text-rose-600" : "text-emerald-600"
                          }`}>
                            KPI: {ticket.kpiStatus}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`font-semibold ${
                          ticket.priority === "HIGH" || ticket.priority === "URGENT" ? "text-orange-600 font-bold" : "text-slate-600"
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>

                      {/* PIC */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                        {ticket.assignee?.name || ticket.assigneeName || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Requester */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{ticket.requesterName}</div>
                        {ticket.requesterPhone && ticket.requesterPhone !== "-" && (
                          <div className="text-[10px] text-slate-400">{ticket.requesterPhone}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(ticket.createdAt).toLocaleDateString("en-GB")}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                            title="Quick View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <Link
                              href={`/forms/maintenance/tickets/${ticket.id}`}
                              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              title="Open Maintenance Workspace"
                            >
                              <Wrench className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-white px-4 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{totalFiltered > 0 ? startIndex + 1 : 0}</span> to{" "}
              <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
              <span className="font-bold text-slate-900">{totalFiltered}</span> requests
            </p>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-3 border-l border-slate-200">
              <span className="font-medium text-slate-600">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <nav className="inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center px-2.5 py-1.5 rounded-l-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4 mr-0.5" />
                <span>Prev</span>
              </button>

              <div className="hidden sm:flex">
                {getPaginationItems(safeCurrentPage, totalPages).map((item, index) => {
                  if (item === "...") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-400 select-none"
                      >
                        ...
                      </span>
                    )
                  }
                  const pageNum = item as number
                  const isActive = safeCurrentPage === pageNum
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`inline-flex items-center px-3 py-1.5 border text-xs font-bold transition-colors ${
                        isActive
                          ? "z-10 bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              {/* Mobile current indicator */}
              <div className="flex sm:hidden items-center px-3 py-1.5 border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700">
                {safeCurrentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages || totalFiltered === 0}
                className="inline-flex items-center px-2.5 py-1.5 rounded-r-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 ml-0.5" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <MaintenanceTicketViewModal
          ticket={selectedTicket}
          canManage={canManage}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  )
}

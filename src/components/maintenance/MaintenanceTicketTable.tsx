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
  ChevronRight,
  FileText,
  RotateCcw,
  DollarSign
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
  const [pageSize, setPageSize] = useState<number>(10)

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Type Filter
      if (typeFilter !== "ALL" && ticket.ticketType !== typeFilter) return false

      // Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "CLOSED") {
          if (ticket.status !== "CLOSED" && ticket.status !== "COMPLETED") return false
        } else if (ticket.status !== statusFilter) {
          return false
        }
      }

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
        const matchJobSheet = ticket.jobSheetNumber?.toLowerCase().includes(q)

        if (!matchTitle && !matchReason && !matchLocation && !matchRequester && !matchPic && !matchLog && !matchJobSheet) {
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Quick Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All Categories", icon: Filter, count: typeCounts.ALL },
              { id: "MECHANICAL", label: "Mechanical", icon: Cog, count: typeCounts.MECHANICAL },
              { id: "CIVIL", label: "Civil & Facility", icon: Building, count: typeCounts.CIVIL },
              { id: "ELECTRICAL", label: "Electrical", icon: Zap, count: typeCounts.ELECTRICAL },
              { id: "OTHERS", label: "Others", icon: HelpCircle, count: typeCounts.OTHERS },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = typeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTypeFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
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
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open (Pending PIC)</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
              <option value="AWAITING_COSTING">Awaiting Costing</option>
              <option value="CLOSED">Closed / Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search ref, machine, requester..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Results summary and Page size */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{totalFiltered === 0 ? 0 : startIndex + 1}</strong> to{" "}
            <strong className="text-slate-800">{endIndex}</strong> of{" "}
            <strong className="text-slate-800">{totalFiltered}</strong> tickets
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs">Per page:</span>
            {[10, 25, 50].map((size) => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  pageSize === size
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 text-left text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Actions</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Work Description</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Assigned To</th>
                <th className="px-5 py-3.5">Requester</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Log No.</th>
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
                  const isClosed = ticket.status === "CLOSED" || ticket.status === "COMPLETED"

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {ticket.jobSheetNumber && (
                            <a
                              href={`/api/public/maintenance/jobsheet/${ticket.jobSheetNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Download Job Sheet & Billing Memo PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
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
                          {ticket.ticketType === "CIVIL" ? "CIV" : ticket.ticketType === "ELECTRICAL" ? "ELT" : ticket.ticketType === "MECHANICAL" ? "MEC" : ticket.ticketType}
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
                          <span className="truncate max-w-[65px]" title={ticket.location}>{ticket.location}</span>
                        </div>
                        {ticket.specificArea && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[65px]" title={ticket.specificArea}>
                            {ticket.specificArea}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isClosed
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : ticket.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : ticket.status === "ACKNOWLEDGED"
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : ticket.status === "AWAITING_VERIFICATION"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : ticket.status === "AWAITING_COSTING"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : ticket.status === "CANCELLED"
                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                              : ticket.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isClosed && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {ticket.status === "IN_PROGRESS" && <Clock className="mr-1 h-3 w-3" />}
                          {ticket.status === "ACKNOWLEDGED" && <Clock className="mr-1 h-3 w-3" />}
                          {ticket.status === "AWAITING_VERIFICATION" && <RotateCcw className="mr-1 h-3 w-3" />}
                          {ticket.status === "AWAITING_COSTING" && <DollarSign className="mr-1 h-3 w-3" />}
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

                      {/* Assigned Worker / Contractor */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                        {ticket.assignee?.name || ticket.assigneeName || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Requester */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 truncate max-w-[95px]" title={ticket.requesterName}>
                          {ticket.requesterName}
                        </div>
                        {ticket.requesterPhone && ticket.requesterPhone !== "-" && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[95px]" title={ticket.requesterPhone}>
                            {ticket.requesterPhone}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(ticket.createdAt).toLocaleDateString("en-GB")}
                      </td>

                      {/* Log No */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {logNumber}
                          </span>
                          {ticket.legacyProjectId && (
                            <span className="text-[10px] text-amber-700 font-mono bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {ticket.legacyProjectId}
                            </span>
                          )}
                          {ticket.jobSheetNumber && (
                            <span className="text-[10px] text-blue-700 font-mono bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {ticket.jobSheetNumber}
                            </span>
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
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPaginationItems(safeCurrentPage, totalPages).map((item, idx) =>
                item === "..." ? (
                  <span key={idx} className="px-2 text-xs text-slate-400">...</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(item as number)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${
                      safeCurrentPage === item
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
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

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
  Plus,
  QrCode,
  ClipboardList,
  Sparkles
} from "lucide-react"
import { MaintenanceTicketViewModal } from "@/components/maintenance/MaintenanceTicketViewModal"

interface ServiceRequestsClientProps {
  tickets: any[]
  canManage: boolean
  userName: string
}

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

export function ServiceRequestsClient({
  tickets,
  canManage,
  userName,
}: ServiceRequestsClientProps) {
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)

  // Metrics
  const total = tickets.length
  const pendingCount = tickets.filter((t) => t.status === "OPEN" || t.status === "ACKNOWLEDGED").length
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length
  const completedCount = tickets.filter((t) => 
    t.status === "AWAITING_VERIFICATION" || 
    t.status === "AWAITING_COSTING" || 
    t.status === "CLOSED" || 
    t.status === "COMPLETED"
  ).length

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (typeFilter !== "ALL" && t.ticketType !== typeFilter) return false

      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE") {
          if (t.status === "CLOSED" || t.status === "CANCELLED" || t.status === "COMPLETED") return false
        } else if (statusFilter === "INVESTIGATION") {
          if (t.status !== "OPEN" && t.status !== "ACKNOWLEDGED") return false
        } else if (statusFilter === "IN_PROGRESS") {
          if (t.status !== "IN_PROGRESS") return false
        } else if (statusFilter === "COMPLETED") {
          if (t.status !== "CLOSED" && t.status !== "COMPLETED" && t.status !== "AWAITING_VERIFICATION" && t.status !== "AWAITING_COSTING") return false
        } else if (t.status !== statusFilter) {
          return false
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchTitle = t.title?.toLowerCase().includes(query)
        const matchReason = t.reasonOfWork?.toLowerCase().includes(query)
        const matchLocation = t.location?.toLowerCase().includes(query)
        const matchSpecific = t.specificArea?.toLowerCase().includes(query)
        const matchRequester = t.requesterName?.toLowerCase().includes(query)
        const matchTicketNum = t.ticketNumber?.toString().includes(query)
        const matchLegacy = t.legacyProjectId?.toLowerCase().includes(query)

        if (
          !matchTitle &&
          !matchReason &&
          !matchLocation &&
          !matchSpecific &&
          !matchRequester &&
          !matchTicketNum &&
          !matchLegacy
        ) {
          return false
        }
      }

      return true
    })
  }, [tickets, typeFilter, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedTickets = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage
    return filteredTickets.slice(start, start + itemsPerPage)
  }, [filteredTickets, safeCurrentPage, itemsPerPage])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Submitted
          </span>
        )
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            Under Investigation
          </span>
        )
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Wrench className="h-3.5 w-3.5 text-blue-600" />
            Technician In Progress
          </span>
        )
      case "AWAITING_VERIFICATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <RotateCcw className="h-3.5 w-3.5 text-purple-600" />
            Work Completed (Pending Sign-off)
          </span>
        )
      case "AWAITING_COSTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            Requester Verified
          </span>
        )
      case "CLOSED":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Closed &amp; Resolved
          </span>
        )
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ELECTRICAL":
        return <Zap className="h-3.5 w-3.5 text-amber-500" />
      case "CIVIL":
        return <Building className="h-3.5 w-3.5 text-emerald-500" />
      case "MECHANICAL":
        return <Cog className="h-3.5 w-3.5 text-blue-500" />
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
              SOP BOSB-FMS-850-001
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              Tier-2 Floor Requests
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Facilities Service Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit and track plant breakdown, facility maintenance, and repair orders across all departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/forms/maintenance/tickets/qr"
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all flex items-center gap-1.5"
            title="Print factory floor QR posters"
          >
            <QrCode className="h-4 w-4 text-slate-500" />
            <span>Print QR Poster</span>
          </Link>
          <Link
            href="/forms/maintenance/tickets/new"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>New Service Request</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards (Floor / Requester focused) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{total}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Under Investigation</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{pendingCount}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{inProgressCount}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved &amp; Closed</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{completedCount}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Top Control Bar: Category Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => { setTypeFilter("ALL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories ({tickets.length})
            </button>
            <button
              onClick={() => { setTypeFilter("MECHANICAL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "MECHANICAL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
              }`}
            >
              <Cog className="h-3 w-3" />
              Mechanical ({tickets.filter((t) => t.ticketType === "MECHANICAL").length})
            </button>
            <button
              onClick={() => { setTypeFilter("CIVIL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "CIVIL"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
              }`}
            >
              <Building className="h-3 w-3" />
              Civil &amp; Facility ({tickets.filter((t) => t.ticketType === "CIVIL").length})
            </button>
            <button
              onClick={() => { setTypeFilter("ELECTRICAL"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "ELECTRICAL"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
              }`}
            >
              <Zap className="h-3 w-3" />
              Electrical ({tickets.filter((t) => t.ticketType === "ELECTRICAL").length})
            </button>
            <button
              onClick={() => { setTypeFilter("OTHERS"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "OTHERS"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Others ({tickets.filter((t) => t.ticketType === "OTHERS").length})
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">All Active (Unclosed)</option>
                <option value="INVESTIGATION">Under Investigation</option>
                <option value="IN_PROGRESS">Technician In Progress</option>
                <option value="COMPLETED">Completed &amp; Closed</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket ref, machine area, requester..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Results Counter */}
        <div className="px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{filteredTickets.length > 0 ? (safeCurrentPage - 1) * itemsPerPage + 1 : 0}</strong> to{" "}
            <strong className="text-slate-700">{Math.min(safeCurrentPage * itemsPerPage, filteredTickets.length)}</strong> of{" "}
            <strong className="text-slate-700">{filteredTickets.length}</strong> service requests
          </span>

          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs text-slate-700 focus:outline-none font-bold"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Actions</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Work Description</th>
                <th className="px-5 py-3.5">Location &amp; Area</th>
                <th className="px-5 py-3.5">Requester</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Log No.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No service requests match your search criteria.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((ticket) => {
                  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      {/* Actions */}
                      <td 
                        className="px-5 py-3.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          {ticket.jobSheetNumber && (
                            <a
                              href={`/api/public/maintenance/jobsheet/${ticket.jobSheetNumber}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Download Verified Job Sheet PDF"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
                            title="View Request Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {getTypeIcon(ticket.ticketType)}
                          {ticket.ticketType}
                        </span>
                      </td>

                      {/* Work Description */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="font-bold text-slate-900 line-clamp-1">{ticket.title}</p>
                        {ticket.reasonOfWork && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {ticket.reasonOfWork}
                          </p>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[65px]" title={ticket.location}>{ticket.location}</span>
                        </span>
                        {ticket.specificArea && (
                          <span className="block text-[10px] text-slate-400 ml-4 mt-0.5 truncate max-w-[65px]" title={ticket.specificArea}>
                            {ticket.specificArea}
                          </span>
                        )}
                      </td>

                      {/* Requester */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{ticket.requesterName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{ticket.requesterPhone}</p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getStatusBadge(ticket.status)}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(ticket.createdAt).toLocaleDateString("en-GB")}
                      </td>

                      {/* Ref / Log No */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <span className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {formattedLog}
                        </span>
                        {ticket.legacyProjectId && (
                          <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                            {ticket.legacyProjectId}
                          </span>
                        )}
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
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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

      {/* Ticket Details Modal (Strictly canManage={false} for 2nd Tier) */}
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

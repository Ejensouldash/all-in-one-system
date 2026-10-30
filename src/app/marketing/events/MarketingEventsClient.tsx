"use client"

import { useState, useMemo } from "react"
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Flame, 
  Camera, 
  Truck, 
  Paperclip, 
  FileText, 
  FileSpreadsheet, 
  ExternalLink, 
  Eye, 
  X, 
  ChevronRight, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  IdCard, 
  Tag, 
  Check, 
  AlertCircle, 
  Loader2, 
  Maximize2,
  LayoutList
} from "lucide-react"
import { updateEventRequisitionStatus, AttachmentInfo } from "@/app/actions/marketing-events"
import { TablePagination } from "@/components/ui/TablePagination"
import { MarketingEventsCalendarView } from "./MarketingEventsCalendarView"

export interface EventRequisitionItem {
  id: string
  requestNumber: string
  name: string
  staffId: string
  email: string
  department: string
  eventName: string
  eventType: string
  organizer: string
  eventDateFrom: Date | string | null
  eventDateTo: Date | string | null
  picContactName: string
  picContactNumber: string
  tentative: string
  requirements: string
  status: string
  remarks: string | null
  attachments: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

interface MarketingEventsClientProps {
  initialRequisitions: EventRequisitionItem[]
  user?: {
    id?: string
    name?: string | null
    email?: string | null
  }
}

function formatDateDisplay(d: Date | string | null | undefined): string {
  if (!d) return "-"
  const dateObj = typeof d === "string" ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return "-"
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parseAttachments(raw: string | null | undefined): AttachmentInfo[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function MarketingEventsClient({ initialRequisitions }: MarketingEventsClientProps) {
  const [requisitions, setRequisitions] = useState<EventRequisitionItem[]>(initialRequisitions)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")
  const [searchTerm, setSearchTerm] = useState("")

  // View mode: LIST or CALENDAR
  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR">("LIST")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Selected item for details modal
  const [selectedItem, setSelectedItem] = useState<EventRequisitionItem | null>(null)

  // Reject dialog state
  const [rejectingItem, setRejectingItem] = useState<EventRequisitionItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // Action loading state
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Lightbox preview for images
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Statistics
  const stats = useMemo(() => {
    const total = requisitions.length
    const pending = requisitions.filter(r => r.status === "PENDING").length
    const approved = requisitions.filter(r => r.status === "APPROVED").length
    const rejected = requisitions.filter(r => r.status === "REJECTED").length
    return { total, pending, approved, rejected }
  }, [requisitions])

  // Filtered List
  const filteredList = useMemo(() => {
    return requisitions.filter(item => {
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchesName = item.eventName.toLowerCase().includes(query)
        const matchesReqNo = item.requestNumber.toLowerCase().includes(query)
        const matchesRequester = item.name.toLowerCase().includes(query)
        const matchesDept = item.department.toLowerCase().includes(query)
        const matchesStaff = item.staffId.toLowerCase().includes(query)
        const matchesOrganizer = item.organizer.toLowerCase().includes(query)
        return matchesName || matchesReqNo || matchesRequester || matchesDept || matchesStaff || matchesOrganizer
      }

      return true
    })
  }, [requisitions, statusFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

  const paginatedList = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize
    return filteredList.slice(startIndex, startIndex + pageSize)
  }, [filteredList, safeCurrentPage, pageSize])

  // Handle Accept / Approve
  const handleApprove = async (item: EventRequisitionItem) => {
    setActionError(null)
    setProcessingId(item.id)

    try {
      const res = await updateEventRequisitionStatus(item.id, "APPROVED")
      if (res.success && res.data) {
        setRequisitions(prev =>
          prev.map(r => (r.id === item.id ? { ...r, status: "APPROVED", remarks: res.data.remarks } : r))
        )
        if (selectedItem?.id === item.id) {
          setSelectedItem(prev => prev ? { ...prev, status: "APPROVED" } : null)
        }
      } else {
        setActionError(res.error || "Failed to approve requisition.")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred."
      setActionError(message)
    } finally {
      setProcessingId(null)
    }
  }

  // Handle Open Reject Dialog
  const handleOpenReject = (item: EventRequisitionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setRejectingItem(item)
    setRejectReason(item.remarks || "")
  }

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectingItem) return
    setActionError(null)
    setProcessingId(rejectingItem.id)

    try {
      const res = await updateEventRequisitionStatus(rejectingItem.id, "REJECTED", rejectReason)
      if (res.success && res.data) {
        setRequisitions(prev =>
          prev.map(r => (r.id === rejectingItem.id ? { ...r, status: "REJECTED", remarks: rejectReason } : r))
        )
        if (selectedItem?.id === rejectingItem.id) {
          setSelectedItem(prev => prev ? { ...prev, status: "REJECTED", remarks: rejectReason } : null)
        }
        setRejectingItem(null)
        setRejectReason("")
      } else {
        setActionError(res.error || "Failed to reject requisition.")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred."
      setActionError(message)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Marketing Event Requisition Control
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
              Event Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Review and manage incoming department event requisitions, collaborate on logistics and activations, and track approvals.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Requisitions</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{stats.total}</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Pending Review
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-900 mt-1 block">{stats.pending}</span>
          </div>

          <div onClick={() => setViewMode("CALENDAR")} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 hover:shadow-xs transition group" title="Click to view Approved Events on Calendar">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1 block">{stats.approved}</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Rejected
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-900 mt-1 block">{stats.rejected}</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            All ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("PENDING")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "PENDING"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 hover:bg-amber-100 text-amber-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({stats.pending})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("APPROVED")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "APPROVED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved ({stats.approved})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("REJECTED")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "REJECTED"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 hover:bg-rose-100 text-rose-800"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected ({stats.rejected})
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search event, requester, ID..."
              className="w-full text-xs font-medium pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CALENDAR")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "CALENDAR"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "CALENDAR" ? (
        <MarketingEventsCalendarView
          events={requisitions}
          onSelectEvent={(item) => setSelectedItem(item)}
          onSwitchToList={() => setViewMode("LIST")}
        />
      ) : (
        /* Requisitions List */
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Event Requisitions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "ALL"
                ? "No event requests matched your filter criteria. Try clearing search filters."
                : "No event collaboration requisitions have been submitted yet from the QR portal."}
            </p>
          </div>
        ) : (
          <>
          <div className="divide-y divide-slate-100">
            {paginatedList.map((item) => {
              const attachments = parseAttachments(item.attachments)
              const isProcessing = processingId === item.id

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="p-5 sm:p-6 hover:bg-slate-50/80 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                >
                  {/* Left Info Column */}
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {item.requestNumber}
                      </span>

                      {/* Status Badge */}
                      {item.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                      {item.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        Submitted {formatDateDisplay(item.createdAt)}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.eventName}
                    </h2>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{item.department}</span>
                        <span className="text-slate-400">({item.name})</span>
                      </span>

                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {formatDateDisplay(item.eventDateFrom)} &rarr; {formatDateDisplay(item.eventDateTo)}
                        </span>
                      </span>

                      <span className="text-slate-400 font-medium">
                        Org: <span className="text-slate-700">{item.organizer}</span>
                      </span>
                    </div>

                    {/* Requirements and Attachments tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {item.requirements.split(",").map((reqStr) => {
                        const trimmed = reqStr.trim()
                        return (
                          <span
                            key={trimmed}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {trimmed}
                          </span>
                        )
                      })}

                      {attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          <Paperclip className="w-2.5 h-2.5 text-slate-500" />
                          {attachments.length} {attachments.length === 1 ? "file" : "files"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions Column */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {item.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(item)
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm hover:shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
                          title="Accept & Approve Requisition"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          )}
                          <span>Accept</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={(e) => handleOpenReject(item, e)}
                          className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-bold text-xs uppercase tracking-wider transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          title="Reject Requisition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <TablePagination
            currentPage={safeCurrentPage}
            totalItems={filteredList.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            }}
            pageSizeOptions={[10, 20, 50]}
            itemName="event requisitions"
          />
        </>
        )}
      </div>

      )}

      {/* DETAILS MODAL / DRAWER */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-indigo-600 text-white">
                      {selectedItem.requestNumber}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Event Requisition Details
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {selectedItem.eventName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedItem.status === "PENDING" && (
                      <span className="font-bold text-sm text-amber-700 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> Pending Marketing Review
                      </span>
                    )}
                    {selectedItem.status === "APPROVED" && (
                      <span className="font-bold text-sm text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Approved
                      </span>
                    )}
                    {selectedItem.status === "REJECTED" && (
                      <span className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Submitted On</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                    {formatDateDisplay(selectedItem.createdAt)}
                  </span>
                </div>
              </div>

              {/* Remarks if rejected or commented */}
              {selectedItem.remarks && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block mb-0.5">Marketing Remarks / Reason:</span>
                  <p className="text-amber-800">{selectedItem.remarks}</p>
                </div>
              )}

              {/* Event Dates & Schedule */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Event Schedule &amp; Organizer
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block mb-1">Event Dates:</span>
                    <span className="font-bold text-slate-900">
                      {formatDateDisplay(selectedItem.eventDateFrom)} &rarr; {formatDateDisplay(selectedItem.eventDateTo)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block mb-1">Organizer &amp; Type:</span>
                    <span className="font-bold text-slate-900">
                      {selectedItem.organizer} ({selectedItem.eventType})
                    </span>
                  </div>
                </div>

                {/* Tentative Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <span className="text-slate-500 font-bold block">Tentative Details &amp; Location:</span>
                  <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedItem.tentative}</p>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  Support Requirements Requested
                </h3>

                <div className="flex flex-wrap gap-2">
                  {selectedItem.requirements.split(",").map(req => {
                    const clean = req.trim()
                    return (
                      <span
                        key={clean}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs flex items-center gap-1.5"
                      >
                        {clean.toLowerCase().includes("activation") && <Flame className="w-3.5 h-3.5 text-orange-600" />}
                        {clean.toLowerCase().includes("media") && <Camera className="w-3.5 h-3.5 text-blue-600" />}
                        {clean.toLowerCase().includes("logistic") && <Truck className="w-3.5 h-3.5 text-emerald-600" />}
                        {clean}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Requester & PIC Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Requester &amp; PIC Contacts
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Requester Box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Department Requester</span>
                    <p className="font-bold text-slate-900">{selectedItem.name}</p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-slate-400" /> Staff ID: {selectedItem.staffId}
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {selectedItem.department}
                    </p>
                    <a
                      href={`mailto:${selectedItem.email}`}
                      className="text-indigo-600 hover:underline flex items-center gap-1.5 pt-0.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> {selectedItem.email}
                    </a>
                  </div>

                  {/* PIC Box */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Person In Charge (PIC)</span>
                    <p className="font-bold text-slate-900">{selectedItem.picContactName}</p>
                    <a
                      href={`tel:${selectedItem.picContactNumber}`}
                      className="text-emerald-700 font-bold hover:underline flex items-center gap-1.5 pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" /> {selectedItem.picContactNumber}
                    </a>
                    <span className="text-[11px] text-slate-500 block">
                      Tap phone number to call coordinator directly.
                    </span>
                  </div>
                </div>
              </div>

              {/* Attached Files & Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    Attached Files &amp; Images
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">
                    {parseAttachments(selectedItem.attachments).length} attachment(s)
                  </span>
                </div>

                {parseAttachments(selectedItem.attachments).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No files or images were attached to this requisition.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {parseAttachments(selectedItem.attachments).map((att, idx) => {
                      const isImage = att.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name)
                      const isSheet = att.name.endsWith(".xlsx") || att.name.endsWith(".xls") || att.name.endsWith(".csv")

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition shadow-2xs group"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(att.url)}
                                className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer group/thumb"
                                title="Click to enlarge"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                {isSheet ? (
                                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <FileText className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate" title={att.name}>
                                {att.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {formatFileSize(att.size)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isImage && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(att.url)}
                                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                                title="Preview image"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.name}
                              className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Download or view in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedItem.status !== "REJECTED" && (
                  <button
                    type="button"
                    disabled={processingId === selectedItem.id}
                    onClick={() => handleOpenReject(selectedItem)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}

                {selectedItem.status !== "APPROVED" && (
                  <button
                    type="button"
                    disabled={processingId === selectedItem.id}
                    onClick={() => handleApprove(selectedItem)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm hover:shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    {processingId === selectedItem.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                    <span>Accept Requisition</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Reject Event Requisition?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You are rejecting requisition <span className="font-bold text-slate-800">{rejectingItem.requestNumber}</span> for &quot;{rejectingItem.eventName}&quot;.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Rejection <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Schedule clash with major corporate event / insufficient logistic capacity..."
                className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectingItem.id}
                onClick={handleConfirmReject}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {processingId === rejectingItem.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>Confirm Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX IMAGE PREVIEW */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition z-10 cursor-pointer"
              title="Close image"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Attachment Preview"
              className="max-h-[85vh] w-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

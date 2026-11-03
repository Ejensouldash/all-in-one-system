"use client"

import React, { useState, useMemo } from "react"
import {
  Video,
  Palette,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  X,
  Phone,
  User,
  Tag,
  Loader2,
  Calendar,
  Cloud,
  FileCheck,
  Film,
  Printer,
  ChevronRight,
  Sparkles,
  Link as LinkIcon,
  Check,
  AlertCircle
} from "lucide-react"
import {
  VideoDesignRequisitionRecord,
  updateVideoDesignRequisitionStatus,
  CreativeAttachmentInfo,
} from "@/app/actions/marketing-video-design"
import { TablePagination } from "@/components/ui/TablePagination"

interface MarketingVideoDesignClientProps {
  initialRequisitions: VideoDesignRequisitionRecord[]
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

function parseAttachments(raw: string | null | undefined): CreativeAttachmentInfo[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function MarketingVideoDesignClient({ initialRequisitions }: MarketingVideoDesignClientProps) {
  const [requisitions, setRequisitions] = useState<VideoDesignRequisitionRecord[]>(initialRequisitions)
  const [typeFilter, setTypeFilter] = useState<"ALL" | "VIDEO" | "DESIGN">("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReq, setSelectedReq] = useState<VideoDesignRequisitionRecord | null>(null)

  // Status updating state
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [remarksInput, setRemarksInput] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filtered List
  const filteredList = useMemo(() => {
    return requisitions.filter((r) => {
      if (typeFilter !== "ALL" && r.type.toUpperCase() !== typeFilter) return false
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchNumber = r.requestNumber?.toLowerCase().includes(q)
        const matchName = r.name?.toLowerCase().includes(q)
        const matchStaff = r.staffId?.toLowerCase().includes(q)
        const matchDept = r.department?.toLowerCase().includes(q)
        const matchVideo = r.videoDetails?.toLowerCase().includes(q) || r.videoType?.toLowerCase().includes(q)
        const matchDesign = r.designDetails?.toLowerCase().includes(q) || r.designType?.toLowerCase().includes(q)
        return matchNumber || matchName || matchStaff || matchDept || matchVideo || matchDesign
      }
      return true
    })
  }, [requisitions, typeFilter, statusFilter, searchTerm])

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredList.slice(start, start + pageSize)
  }, [filteredList, currentPage, pageSize])

  // Summary counts
  const stats = useMemo(() => {
    const total = requisitions.length
    const pending = requisitions.filter((r) => r.status === "PENDING").length
    const video = requisitions.filter((r) => r.type.toUpperCase() === "VIDEO").length
    const design = requisitions.filter((r) => r.type.toUpperCase() === "DESIGN").length
    return { total, pending, video, design }
  }, [requisitions])

  // Handle Status Update
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedReq) return
    setUpdatingId(selectedReq.id)

    try {
      const res = await updateVideoDesignRequisitionStatus(
        selectedReq.id,
        newStatus,
        remarksInput || selectedReq.remarks || undefined
      )

      if (res.success && res.requisition) {
        setRequisitions((prev) =>
          prev.map((item) =>
            item.id === selectedReq.id
              ? { ...item, status: newStatus, remarks: remarksInput || item.remarks }
              : item
          )
        )
        setSelectedReq((prev) =>
          prev ? { ...prev, status: newStatus, remarks: remarksInput || prev.remarks } : null
        )
      }
    } catch (err) {
      console.error("Status update error:", err)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        )
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </span>
        )
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Pending Review
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Title & Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Creative Requisitions
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            Pending Actions
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">
            Video Requisitions
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-purple-600">{stats.video}</h3>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-pink-600 uppercase tracking-wider mb-1">
            Design Requisitions
          </p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-pink-600">{stats.design}</h3>
            <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Type Toggle Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            {(["ALL", "VIDEO", "DESIGN"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(t)
                  setCurrentPage(1)
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t === "ALL" ? "All Requisitions" : t === "VIDEO" ? "Video Requisitions" : "Design Requisitions"}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by ticket, name, department..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
            Status:
          </span>
          {["ALL", "PENDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "REJECTED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st)
                setCurrentPage(1)
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "ALL" ? "All" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Ticket Number</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Requester</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Need By</th>
                <th className="py-3.5 px-4">Cloudflare R2 Files</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-sm">No video or design requisitions found.</p>
                    <p className="text-xs mt-1">Try adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item) => {
                  const isVideo = item.type.toUpperCase() === "VIDEO"
                  const attachments = parseAttachments(item.attachments)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedReq(item)
                        setRemarksInput(item.remarks || "")
                      }}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-purple-700">
                        {item.requestNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            isVideo
                              ? "bg-purple-100 text-purple-800"
                              : "bg-pink-100 text-pink-800"
                          }`}
                        >
                          {isVideo ? <Video className="w-3 h-3" /> : <Palette className="w-3 h-3" />}
                          {isVideo ? "Video" : "Design"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.staffId} • {item.phoneNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item.department}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-rose-600">
                          {formatDateDisplay(item.needBy)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {attachments.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md">
                            <Cloud className="w-3 h-3" />
                            {attachments.length} file(s)
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-purple-600 group-hover:text-white text-slate-600 font-bold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* DETAILS MODAL */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedReq.type.toUpperCase() === "VIDEO"
                      ? "bg-purple-600"
                      : "bg-pink-600"
                  }`}
                >
                  {selectedReq.type.toUpperCase() === "VIDEO" ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <Palette className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black tracking-wider">
                      {selectedReq.requestNumber}
                    </span>
                    {getStatusBadge(selectedReq.status)}
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedReq.type.toUpperCase() === "VIDEO" ? "Video Requisition" : "Design Requisition"} • Submitted on {formatDateDisplay(selectedReq.createdAt)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Requester Information Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" /> Requester Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 text-xs block">Name:</span>
                    <span className="font-bold">{selectedReq.name} ({selectedReq.staffId})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Department:</span>
                    <span className="font-bold">{selectedReq.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Phone Number:</span>
                    <span className="font-bold">{selectedReq.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs block">Need By (Required Date):</span>
                    <span className="font-bold text-rose-600">{formatDateDisplay(selectedReq.needBy)}</span>
                  </div>
                </div>
              </div>

              {/* Creative Specifications */}
              {selectedReq.type.toUpperCase() === "VIDEO" ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-purple-600" /> Video Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                    <div>
                      <span className="text-slate-400 text-xs block">Video Type:</span>
                      <span className="font-bold text-slate-900">{selectedReq.videoType || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Format / Orientation:</span>
                      <span className="font-bold text-slate-900">{selectedReq.format || "-"}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-bold block">Video Details (Description):</span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedReq.videoDetails || "No additional description provided."}
                    </div>
                  </div>

                  {selectedReq.videoContentFocus && (
                    <div className="space-y-1">
                      <span className="text-slate-400 text-xs font-bold block">Video Content / Focus:</span>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedReq.videoContentFocus}
                      </div>
                    </div>
                  )}

                  {selectedReq.requiredShots && (
                    <div className="space-y-1">
                      <span className="text-slate-400 text-xs font-bold block">Required Shots:</span>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedReq.requiredShots}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-bold text-pink-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-pink-600" /> Design Specifications
                  </h4>
                  <div className="grid grid-cols-3 gap-2 bg-pink-50/50 p-4 rounded-2xl border border-pink-100">
                    <div>
                      <span className="text-slate-400 text-xs block">Design Type:</span>
                      <span className="font-bold text-slate-900">{selectedReq.designType || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Size of Design:</span>
                      <span className="font-bold text-slate-900">{selectedReq.designSize || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">Need Printing:</span>
                      <span className={`font-bold ${selectedReq.needPrinting ? "text-emerald-700" : "text-slate-700"}`}>
                        {selectedReq.needPrinting ? "YES" : "Digital Only"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 text-xs font-bold block">Design Details (Description):</span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedReq.designDetails || "No additional description provided."}
                    </div>
                  </div>

                  {selectedReq.designContent && (
                    <div className="space-y-1">
                      <span className="text-slate-400 text-xs font-bold block">Content on Design:</span>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedReq.designContent}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reference Links */}
              {selectedReq.referenceLinks && (
                <div className="space-y-1">
                  <span className="text-slate-400 text-xs font-bold block">Reference Links / Inspiration:</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                    <a
                      href={selectedReq.referenceLinks}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline break-all"
                    >
                      {selectedReq.referenceLinks}
                    </a>
                  </div>
                </div>
              )}

              {/* Attachments / Uploaded Documents in Cloudflare R2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold block">
                    Cloudflare R2 Documents &amp; Files:
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                    <Cloud className="w-3 h-3" /> Cloudflare R2 Storage
                  </span>
                </div>

                {parseAttachments(selectedReq.attachments).length === 0 ? (
                  <p className="text-slate-400 italic text-xs">No reference files uploaded.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parseAttachments(selectedReq.attachments).map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {file.type.startsWith("image/") ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              {file.type.startsWith("video/") ? (
                                <Film className="w-4 h-4" />
                              ) : (
                                <FileCheck className="w-4 h-4" />
                              )}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <p className="font-bold text-slate-900 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(file.size)} • Cloudflare R2
                            </p>
                          </div>
                        </div>

                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 shadow-sm shrink-0"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Remarks Input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Marketing Team Internal Remarks / Notes:
                </label>
                <textarea
                  rows={2}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder="Add status notes, assigned designer/videographer, handover notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
              </div>
            </div>

            {/* Modal Footer / Status Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={updatingId !== null}
                  onClick={() => handleStatusChange("APPROVED")}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={updatingId !== null}
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  In Progress
                </button>
                <button
                  type="button"
                  disabled={updatingId !== null}
                  onClick={() => handleStatusChange("COMPLETED")}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Complete
                </button>
                <button
                  type="button"
                  disabled={updatingId !== null}
                  onClick={() => handleStatusChange("REJECTED")}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

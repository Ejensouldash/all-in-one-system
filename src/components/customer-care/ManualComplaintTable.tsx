"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Download,
  Filter,
  Phone,
  MessageCircle,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Plus,
} from "lucide-react"
import { ManualComplaintPriority, ManualComplaintStatus } from "@prisma/client"
import {
  ManualComplaintItem,
  ManualComplaintEditModal,
} from "@/components/customer-care/ManualComplaintEditModal"
import { exportManualComplaintsCsv } from "@/app/actions/manual-complaints"

interface ManualComplaintTableProps {
  initialRecords: ManualComplaintItem[]
  canManage: boolean
  onOpenCreateModal?: () => void
}

export function ManualComplaintTable({
  initialRecords,
  canManage,
  onOpenCreateModal,
}: ManualComplaintTableProps) {
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL")
  const [selectedPic, setSelectedPic] = useState<string>("ALL")
  const [isExporting, setIsExporting] = useState(false)

  // Edit modal state
  const [editingItem, setEditingItem] = useState<ManualComplaintItem | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Expandable row state for full complaint text
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Derive unique platforms & PICs for filter options
  const platforms = useMemo(() => {
    const set = new Set<string>()
    initialRecords.forEach((r) => {
      if (r.customerPlatform) set.add(r.customerPlatform)
    })
    return Array.from(set).sort()
  }, [initialRecords])

  const pics = useMemo(() => {
    const set = new Set<string>()
    initialRecords.forEach((r) => {
      if (r.picHandling) set.add(r.picHandling)
    })
    return Array.from(set).sort()
  }, [initialRecords])

  // Filtered dataset
  const filtered = useMemo(() => {
    return initialRecords.filter((r) => {
      // Status filter
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) {
        return false
      }
      // Priority filter
      if (selectedPriority !== "ALL" && r.priority !== selectedPriority) {
        return false
      }
      // Platform filter
      if (selectedPlatform !== "ALL" && r.customerPlatform !== selectedPlatform) {
        return false
      }
      // PIC filter
      if (selectedPic !== "ALL" && r.picHandling !== selectedPic) {
        return false
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchId = r.complaintNumber.toLowerCase().includes(q)
        const matchName = r.customerName.toLowerCase().includes(q)
        const matchNumber = r.customerNumber.toLowerCase().includes(q)
        const matchSocials = r.customerSocials?.toLowerCase().includes(q)
        const matchBody = r.mainComplaint.toLowerCase().includes(q)
        const matchNotes = r.resolutionNotes?.toLowerCase().includes(q)
        if (!matchId && !matchName && !matchNumber && !matchSocials && !matchBody && !matchNotes) {
          return false
        }
      }
      return true
    })
  }, [initialRecords, search, selectedStatus, selectedPriority, selectedPlatform, selectedPic])

  // Export CSV handler
  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const res = await exportManualComplaintsCsv()
      if (!res.success || !res.csv) {
        alert(res.error || "Failed to export CSV.")
        return
      }

      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      link.setAttribute("download", `manual_complaint_log_${dateStr}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert("Error exporting CSV: " + (e?.message || e))
    } finally {
      setIsExporting(false)
    }
  }

  // Priority badge renderer
  const renderPriorityBadge = (priority: ManualComplaintPriority) => {
    switch (priority) {
      case ManualComplaintPriority.GREEN:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Green (Low)
          </span>
        )
      case ManualComplaintPriority.YELLOW:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Yellow (Med)
          </span>
        )
      case ManualComplaintPriority.RED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Red (Critical)
          </span>
        )
      default:
        return <span className="text-xs text-slate-500">{priority}</span>
    }
  }

  // Status badge renderer
  const renderStatusBadge = (status: ManualComplaintStatus) => {
    switch (status) {
      case ManualComplaintStatus.OPEN:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            OPEN
          </span>
        )
      case ManualComplaintStatus.ONGOING:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            ONGOING
          </span>
        )
      case ManualComplaintStatus.ESCALATED_E3:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldAlert className="w-3 h-3 text-purple-600" />
            ESCALATED (E3)
          </span>
        )
      case ManualComplaintStatus.CLOSED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            CLOSED
          </span>
        )
      default:
        return <span className="text-xs text-slate-600">{status}</span>
    }
  }

  // Platform badge renderer
  const renderPlatformBadge = (platform: string) => {
    const p = platform.toLowerCase()
    let bg = "bg-slate-100 text-slate-700 border-slate-200"
    if (p.includes("whatsapp")) bg = "bg-emerald-50 text-emerald-800 border-emerald-200"
    else if (p.includes("tiktok")) bg = "bg-slate-900 text-white border-slate-800"
    else if (p.includes("shopee")) bg = "bg-orange-50 text-orange-700 border-orange-200"
    else if (p.includes("lazada")) bg = "bg-blue-50 text-blue-700 border-blue-200"
    else if (p.includes("instagram")) bg = "bg-pink-50 text-pink-700 border-pink-200"
    else if (p.includes("facebook")) bg = "bg-sky-50 text-sky-700 border-sky-200"
    else if (p.includes("call")) bg = "bg-teal-50 text-teal-700 border-teal-200"

    return (
      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${bg}`}>
        {platform}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search complaint ID, customer, socials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value={ManualComplaintStatus.OPEN}>Open</option>
            <option value={ManualComplaintStatus.ONGOING}>Ongoing</option>
            <option value={ManualComplaintStatus.ESCALATED_E3}>Escalated (E3)</option>
            <option value={ManualComplaintStatus.CLOSED}>Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value={ManualComplaintPriority.GREEN}>Green (Low)</option>
            <option value={ManualComplaintPriority.YELLOW}>Yellow (Medium)</option>
            <option value={ManualComplaintPriority.RED}>Red (Critical)</option>
          </select>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* PIC Filter */}
          {pics.length > 0 && (
            <select
              value={selectedPic}
              onChange={(e) => setSelectedPic(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All PICs</option>
              {pics.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4">Complaint ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer & Number</th>
                <th className="py-3.5 px-4">Platform & Socials</th>
                <th className="py-3.5 px-4">Main Complaint</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">PIC Handling</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-700">No complaints found</div>
                      <p className="text-xs text-slate-400">
                        {search || selectedStatus !== "ALL" || selectedPriority !== "ALL"
                          ? "Try clearing your search or adjusting the filters above."
                          : "No manual customer complaints logged yet. Click '+ Log Manual Complaint' to record one."}
                      </p>
                      {canManage && onOpenCreateModal && (
                        <button
                          type="button"
                          onClick={onOpenCreateModal}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Log First Complaint
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const cleanPhone = item.customerNumber.replace(/\D/g, "")
                  const waUrl = cleanPhone.startsWith("60")
                    ? `https://wa.me/${cleanPhone}`
                    : `https://wa.me/6${cleanPhone}`
                  const isExpanded = !!expandedRows[item.id]

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Complaint ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {item.complaintNumber}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Customer Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.customerName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
                            title="Chat on WhatsApp"
                          >
                            <Phone className="w-3 h-3" />
                            {item.customerNumber}
                          </a>
                        </div>
                      </td>

                      {/* Platform & Socials */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>{renderPlatformBadge(item.customerPlatform)}</div>
                          {item.customerSocials ? (
                            <div className="text-[11px] font-medium text-slate-600 truncate max-w-[140px]">
                              {item.customerSocials}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">No handle</div>
                          )}
                        </div>
                      </td>

                      {/* Main Complaint */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <p
                            className={`text-slate-800 ${
                              isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                            }`}
                          >
                            {item.mainComplaint}
                          </p>
                          {item.mainComplaint.length > 80 && (
                            <button
                              type="button"
                              onClick={() => toggleRowExpand(item.id)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? (
                                <>
                                  Less <ChevronUp className="w-2.5 h-2.5" />
                                </>
                              ) : (
                                <>
                                  Read more <ChevronDown className="w-2.5 h-2.5" />
                                </>
                              )}
                            </button>
                          )}
                          {item.resolutionNotes && (
                            <div className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-lg mt-1 border border-slate-200">
                              <span className="font-bold text-slate-900">Note: </span>
                              {item.resolutionNotes}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPriorityBadge(item.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* PIC Handling */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                          {item.picHandling || "Customer Care"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item)
                            setIsEditOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{canManage ? "Edit / Resolve" : "View"}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Resolve Modal */}
      <ManualComplaintEditModal
        complaint={editingItem}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false)
          setEditingItem(null)
        }}
        canManage={canManage}
      />
    </div>
  )
}

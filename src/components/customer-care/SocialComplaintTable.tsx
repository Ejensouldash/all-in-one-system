"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Download,
  Filter,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  Share2,
  Sparkles,
  User,
  Heart,
  MessageCircle,
} from "lucide-react"
import { updateSocialComplaint, exportSocialComplaintsCsv } from "@/app/actions/social-complaints"
import { MANUAL_PIC_OPTIONS } from "@/components/customer-care/ManualComplaintModal"
import { useRouter } from "next/navigation"

export interface SocialComplaintItem {
  id: string
  complaintId: string
  date: string | Date
  takenAt?: number | null
  username: string
  fullName: string | null
  customerNumber: string
  platform: string
  postUrl: string | null
  mainComplaint: string
  rawText: string
  detectedBatchNo: string | null
  symptoms: string[]
  priority: string // High, Medium, Low
  status: string // Open, Ongoing, Closed
  picHandling: string
  likeCount: number
  replyCount: number
}

interface SocialComplaintTableProps {
  initialRecords: SocialComplaintItem[]
  canManage: boolean
}

const COMMON_SYMPTOMS = [
  "Cirit-birit",
  "Muntah / Loya",
  "Sakit Perut / Kembung",
  "Sakit Tekak / Batuk",
  "Sakit Kepala / Pening",
  "Demam",
  "Bau Tanah",
  "Bau Ubat",
  "Bau Petai",
  "Bau Busuk / Pelik",
  "Rasa Payau",
  "Rasa Pelik / Pahit",
  "Botol Buncit",
  "Stok Dibuang / Recall",
  "Tuntutan Refund / Ganti",
]

export function SocialComplaintTable({
  initialRecords,
  canManage,
}: SocialComplaintTableProps) {
  const router = useRouter()
  const [records, setRecords] = useState<SocialComplaintItem[]>(initialRecords)
  const [search, setSearch] = useState("")
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedPic, setSelectedPic] = useState<string>("ALL")
  const [selectedSymptom, setSelectedSymptom] = useState<string>("ALL")
  const [onlyBatch, setOnlyBatch] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Expandable row state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filtered dataset
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (selectedPriority !== "ALL" && r.priority !== selectedPriority) return false
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false
      if (selectedPic !== "ALL" && r.picHandling !== selectedPic) return false
      if (selectedSymptom !== "ALL" && !r.symptoms.includes(selectedSymptom)) return false
      if (onlyBatch && !r.detectedBatchNo) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchId = r.complaintId.toLowerCase().includes(q)
        const matchUser = r.username.toLowerCase().includes(q)
        const matchName = r.fullName?.toLowerCase().includes(q)
        const matchText = r.rawText.toLowerCase().includes(q)
        const matchBatch = r.detectedBatchNo?.toLowerCase().includes(q)
        const matchSymptom = r.symptoms.some((s) => s.toLowerCase().includes(q))
        if (!matchId && !matchUser && !matchName && !matchText && !matchBatch && !matchSymptom) {
          return false
        }
      }
      return true
    })
  }, [records, search, selectedPriority, selectedStatus, selectedPic, selectedSymptom, onlyBatch])

  // Handle inline PIC change
  const handlePicChange = async (id: string, newPic: string) => {
    if (!canManage) return
    setUpdatingId(id)
    try {
      const res = await updateSocialComplaint(id, { picHandling: newPic })
      if (res.success && res.data) {
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, picHandling: newPic } : item))
        )
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle inline Status change
  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!canManage) return
    setUpdatingId(id)
    try {
      const res = await updateSocialComplaint(id, { status: newStatus })
      if (res.success && res.data) {
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        )
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle Export CSV
  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const res = await exportSocialComplaintsCsv()
      if (!res.success || !res.csv) {
        alert(res.error || "Failed to export CSV.")
        return
      }

      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      link.setAttribute("download", `threads_complaints_structured_${dateStr}.csv`)
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

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High (Health)
          </span>
        )
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium (Quality)
          </span>
        )
      case "Low":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Low (Inquiry)
          </span>
        )
      default:
        return <span className="text-xs text-slate-500">{priority}</span>
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            OPEN
          </span>
        )
      case "Ongoing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            ONGOING
          </span>
        )
      case "Closed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            CLOSED
          </span>
        )
      default:
        return <span className="text-xs text-slate-600">{status}</span>
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search username, batch, symptom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High (Health Issues)</option>
            <option value="Medium">Medium (Taste/Quality)</option>
            <option value="Low">Low (Inquiries/Refund)</option>
          </select>

          {/* Symptom Filter */}
          <select
            value={selectedSymptom}
            onChange={(e) => setSelectedSymptom(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[170px]"
          >
            <option value="ALL">All Symptoms</option>
            {COMMON_SYMPTOMS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Closed">Closed</option>
          </select>

          {/* PIC Filter */}
          <select
            value={selectedPic}
            onChange={(e) => setSelectedPic(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[160px]"
          >
            <option value="ALL">All PICs</option>
            <option value="Unassigned">Unassigned</option>
            {MANUAL_PIC_OPTIONS.map((pic) => (
              <option key={pic} value={pic}>
                {pic}
              </option>
            ))}
          </select>

          {/* Batch Detected Toggle Button */}
          <button
            type="button"
            onClick={() => setOnlyBatch(!onlyBatch)}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all inline-flex items-center gap-1.5 ${
              onlyBatch
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Has Batch No</span>
          </button>

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

      {/* Table */}
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
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-700">No social complaints found</div>
                      <p className="text-xs text-slate-400">
                        Try clearing filters or search keyword.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isExpanded = !!expandedRows[item.id]
                  const formattedDate =
                    typeof item.date === "string" && item.date.includes("T")
                      ? new Date(item.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : typeof item.date === "string"
                      ? item.date
                      : new Date(item.date).toLocaleDateString("en-GB")

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Complaint ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {item.complaintId}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {formattedDate}
                      </td>

                      {/* Customer & Number */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {item.fullName || `@${item.username}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          @{item.username}
                        </div>
                      </td>

                      {/* Platform & Socials */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-neutral-900 text-white border border-neutral-800">
                            Threads
                          </span>
                          {item.postUrl && (
                            <div>
                              <a
                                href={item.postUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                View Post <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Main Complaint */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="space-y-1.5">
                          {/* Badges for Detected Symptoms & Batch */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.detectedBatchNo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10px]">
                                <Tag className="w-2.5 h-2.5" />
                                Batch: {item.detectedBatchNo}
                              </span>
                            )}
                            {item.symptoms.map((s, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  s.includes("Sakit") || s.includes("Cirit") || s.includes("Muntah") || s.includes("Demam")
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : s.includes("Bau") || s.includes("Rasa") || s.includes("Buncit")
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>

                          {/* Raw text */}
                          <p
                            className={`text-slate-800 leading-relaxed ${
                              isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
                            }`}
                          >
                            {item.rawText}
                          </p>
                          {item.rawText.length > 90 && (
                            <button
                              type="button"
                              onClick={() => toggleRow(item.id)}
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
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderPriorityBadge(item.priority)}
                      </td>

                      {/* Status with Quick Toggle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {canManage ? (
                          <select
                            value={item.status}
                            disabled={updatingId === item.id}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="Open">Open</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Closed">Closed</option>
                          </select>
                        ) : (
                          renderStatusBadge(item.status)
                        )}
                      </td>

                      {/* PIC Handling with Quick Assign */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {canManage ? (
                          <select
                            value={item.picHandling}
                            disabled={updatingId === item.id}
                            onChange={(e) => handlePicChange(item.id, e.target.value)}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[170px]"
                          >
                            <option value="Unassigned">Unassigned</option>
                            {MANUAL_PIC_OPTIONS.map((pic) => (
                              <option key={pic} value={pic}>
                                {pic}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                            {item.picHandling}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {item.postUrl ? (
                          <a
                            href={item.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Threads</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

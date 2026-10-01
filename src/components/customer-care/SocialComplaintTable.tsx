"use client"

import { useState, useMemo, useEffect } from "react"
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Tag,
  CheckCircle2,
  Share2,
  Sparkles,
  User,
  Heart,
  MessageCircle,
  HelpCircle,
  Layers,
  ArrowUpDown,
} from "lucide-react"
import { updateSocialComplaint, exportSocialComplaintsCsv } from "@/app/actions/social-complaints"
import { MANUAL_PIC_OPTIONS } from "@/components/customer-care/ManualComplaintModal"

export interface SocialComplaintItem {
  id: string
  complaintId: string
  categoryGroup: string
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
  priority: string // High, Medium, Low, Info
  status: string // Open, Ongoing, Closed
  picHandling: string
  likeCount: number
  replyCount: number
}

interface SocialComplaintTableProps {
  initialRecords: SocialComplaintItem[]
  canManage: boolean
}

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Groups" },
  { value: "Health Issue", label: "Health Issues (Urgent)" },
  { value: "Quality Defect", label: "Quality Defect (Taste/Smell)" },
  { value: "Inquiry & Refund", label: "Inquiry & Refund" },
  { value: "General Chatter", label: "General Chatter & Mentions" },
  { value: "Brand Official", label: "Brand Official (@bubbleso2)" },
  { value: "Meta AI Assistant", label: "Meta AI Assistant" },
]

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
  const [records, setRecords] = useState<SocialComplaintItem[]>(initialRecords)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedPic, setSelectedPic] = useState<string>("ALL")
  const [selectedSymptom, setSelectedSymptom] = useState<string>("ALL")
  const [onlyBatch, setOnlyBatch] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Pagination states - Default 5 rows as requested
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Expandable row state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Count totals by category for quick badge navigation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach((r) => {
      counts[r.categoryGroup] = (counts[r.categoryGroup] || 0) + 1
    })
    return counts
  }, [records])

  // Filtered dataset
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (selectedCategory !== "ALL" && r.categoryGroup !== selectedCategory) return false
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
        const matchCat = r.categoryGroup.toLowerCase().includes(q)
        if (!matchId && !matchUser && !matchName && !matchText && !matchBatch && !matchSymptom && !matchCat) {
          return false
        }
      }
      return true
    })
  }, [records, search, selectedCategory, selectedPriority, selectedStatus, selectedPic, selectedSymptom, onlyBatch])

  // Reset to page 1 whenever any filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory, selectedPriority, selectedStatus, selectedPic, selectedSymptom, onlyBatch, pageSize])

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const startIndex = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filtered.length)

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Generate pagination range numbers
  const paginationRange = useMemo(() => {
    const delta = 1
    const range: (number | string)[] = []
    const left = Math.max(2, currentPage - delta)
    const right = Math.min(totalPages - 1, currentPage + delta)

    range.push(1)
    if (left > 2) range.push("...")
    for (let i = left; i <= right; i++) {
      range.push(i)
    }
    if (right < totalPages - 1) range.push("...")
    if (totalPages > 1) range.push(totalPages)

    return range
  }, [currentPage, totalPages])

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
      link.setAttribute("download", `threads_all_grouped_complaints_${dateStr}.csv`)
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

  const renderCategoryBadge = (group: string) => {
    switch (group) {
      case "Health Issue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-2.5 h-2.5" />
            Health Issue
          </span>
        )
      case "Quality Defect":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
            <ShieldAlert className="w-2.5 h-2.5" />
            Quality Defect
          </span>
        )
      case "Inquiry & Refund":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
            <HelpCircle className="w-2.5 h-2.5" />
            Inquiry & Refund
          </span>
        )
      case "Brand Official":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
            <Sparkles className="w-2.5 h-2.5" />
            Brand Official
          </span>
        )
      case "Meta AI Assistant":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-300">
            AI Assistant
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            General Chatter
          </span>
        )
    }
  }

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "High":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High
          </span>
        )
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium
          </span>
        )
      case "Low":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Low
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
            Info
          </span>
        )
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
      {/* Category Group Quick Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Items ({records.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("Health Issue")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "Health Issue"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
          }`}
        >
          🚨 Health Issues ({categoryCounts["Health Issue"] || 0})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("Quality Defect")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "Quality Defect"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          }`}
        >
          ⚠️ Quality / Taste ({categoryCounts["Quality Defect"] || 0})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("Inquiry & Refund")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "Inquiry & Refund"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          }`}
        >
          💬 Inquiries & Refund ({categoryCounts["Inquiry & Refund"] || 0})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("General Chatter")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "General Chatter"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
          }`}
        >
          🗣️ Chatter & Tags ({categoryCounts["General Chatter"] || 0})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("Brand Official")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            selectedCategory === "Brand Official"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
          }`}
        >
          🏢 Brand Official ({categoryCounts["Brand Official"] || 0})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search username, batch, text, symptom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Info">Info</option>
          </select>

          {/* Symptom Filter */}
          <select
            value={selectedSymptom}
            onChange={(e) => setSelectedSymptom(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[150px]"
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
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[150px]"
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
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4 w-28 whitespace-nowrap">Complaint ID</th>
                <th className="py-3.5 px-4 w-36 whitespace-nowrap">Category / Group</th>
                <th className="py-3.5 px-4 w-28 whitespace-nowrap">Date</th>
                <th className="py-3.5 px-4 w-44">Customer</th>
                <th className="py-3.5 px-4 w-28 whitespace-nowrap">Platform</th>
                <th className="py-3.5 px-4 min-w-[380px] max-w-xl">Main Content & Symptoms</th>
                <th className="py-3.5 px-4 w-24 whitespace-nowrap">Priority</th>
                <th className="py-3.5 px-4 w-28 whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 w-40 whitespace-nowrap">PIC Handling</th>
                <th className="py-3.5 px-4 w-24 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-700">No records found</div>
                      <p className="text-xs text-slate-400">
                        Try adjusting your category filter, priority, or search keywords.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
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

                      {/* Category Group */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderCategoryBadge(item.categoryGroup)}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {formattedDate}
                      </td>

                      {/* Customer & Number */}
                      <td className="py-3.5 px-4 w-44">
                        <div className="font-bold text-slate-900 truncate max-w-[160px]">
                          {item.fullName || `@${item.username}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[160px]">
                          @{item.username}
                        </div>
                      </td>

                      {/* Platform & Socials */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
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
                      <td className="py-3.5 px-4 min-w-[380px] max-w-xl">
                        <div className="space-y-1.5">
                          {/* Badges for Detected Symptoms & Batch */}
                          {(item.detectedBatchNo || item.symptoms.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.detectedBatchNo && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10px] whitespace-nowrap">
                                  <Tag className="w-2.5 h-2.5" />
                                  Batch: {item.detectedBatchNo}
                                </span>
                              )}
                              {item.symptoms.map((s, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${
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
                          )}

                          {/* Raw text */}
                          <p
                            className={`text-slate-800 leading-relaxed ${
                              item.rawText.length > 180 && !isExpanded ? "line-clamp-3" : "whitespace-pre-wrap"
                            }`}
                          >
                            {item.rawText}
                          </p>
                          {item.rawText.length > 180 && (
                            <button
                              type="button"
                              onClick={() => toggleRow(item.id)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5 cursor-pointer mt-0.5"
                            >
                              {isExpanded ? (
                                <>
                                  Show less <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  Read more <ChevronDown className="w-3 h-3" />
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

        {/* Pagination Footer */}
        <div className="px-4 py-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          {/* Entries summary & Rows per page selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="font-medium">
              Showing <span className="font-bold text-slate-900">{startIndex}</span> to{" "}
              <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
              <span className="font-bold text-slate-900">{filtered.length}</span> records
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronsLeft className="w-4 h-4 text-slate-600" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous Page"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors inline-flex items-center gap-1 font-bold text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {/* Page Number Buttons */}
              <div className="hidden sm:flex items-center gap-1 mx-1">
                {paginationRange.map((page, idx) => {
                  if (page === "...") {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 font-bold">
                        ...
                      </span>
                    )
                  }
                  const pNum = Number(page)
                  const isActive = currentPage === pNum
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {pNum}
                    </button>
                  )
                })}
              </div>

              {/* Mobile current page indicator */}
              <span className="sm:hidden px-2 font-bold text-slate-700 text-xs">
                {currentPage} / {totalPages}
              </span>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                title="Next Page"
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors inline-flex items-center gap-1 font-bold text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronsRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

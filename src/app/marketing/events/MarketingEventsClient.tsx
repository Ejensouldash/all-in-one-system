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
  LayoutList,
  QrCode,
  FileDown,
  BarChart3,
  Copy,
  UploadCloud,
  Trash2,
  Sparkles,
  MessageSquareQuote,
  CheckCheck,
  FilePenLine,
  Edit3
} from "lucide-react"
import { updateEventRequisitionStatus, updateMarketingEventRequisition, AttachmentInfo } from "@/app/actions/marketing-events"
import { TablePagination } from "@/components/ui/TablePagination"
import { MarketingEventsCalendarView } from "./MarketingEventsCalendarView"
import { 
  getMarketingEventFeedbackSummary, 
  uploadMarketingEventGalleryImages, 
  deleteMarketingEventGalleryImage,
  FeedbackSummaryStats,
  GalleryImageItem
} from "@/app/actions/marketing-feedback"
import { QRCodeCanvas } from "qrcode.react"
import { PostEventReportModal } from "@/components/marketing/PostEventReportModal"

export interface EventRequisitionItem {
  id: string
  requestNumber: string
  name: string
  staffId: string
  email: string
  phone?: string | null
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
  galleryAttachments?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

interface MarketingEventsClientProps {
  initialRequisitions: EventRequisitionItem[]
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    role?: string | null
  }
  canEdit?: boolean
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

function parseGallery(raw: string | null | undefined): GalleryImageItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Helper: Compress and resize image in browser to prevent 413 / payload size errors on Vercel
async function compressImageForUpload(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= 350 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file)
            } else {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                { type: 'image/jpeg', lastModified: Date.now() }
              )
              resolve(compressedFile)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export function MarketingEventsClient({ initialRequisitions, user, canEdit = false }: MarketingEventsClientProps) {
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

  // QR Modal State
  const [qrModalItem, setQrModalItem] = useState<EventRequisitionItem | null>(null)
  const [copiedQrUrl, setCopiedQrUrl] = useState(false)

  // Edit Requisition Modal State
  const [editingItem, setEditingItem] = useState<EventRequisitionItem | null>(null)

  // Feedback & Gallery Manager Modal State
  const [feedbackModalItem, setFeedbackModalItem] = useState<EventRequisitionItem | null>(null)
  const [postEventReportItem, setPostEventReportItem] = useState<EventRequisitionItem | null>(null)
  const [activeFeedbackTab, setActiveFeedbackTab] = useState<"FEEDBACK" | "GALLERY">("FEEDBACK")
  const [feedbackStats, setFeedbackStats] = useState<FeedbackSummaryStats | null>(null)
  const [loadingFeedbackStats, setLoadingFeedbackStats] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

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

  // Base URL for QR generation
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://aio.bubbleso2.com"

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

  // Open QR Modal
  const handleOpenQrModal = (item: EventRequisitionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setQrModalItem(item)
    setCopiedQrUrl(false)
  }

  // Copy QR URL
  const handleCopyQrUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedQrUrl(true)
      setTimeout(() => setCopiedQrUrl(false), 2000)
    } catch (err) {
      console.warn("Failed to copy URL:", err)
    }
  }

  // Download QR Code PNG
  const handleDownloadQrPng = (item: EventRequisitionItem) => {
    const canvas = document.getElementById(`qr-feedback-canvas-${item.id}`) as HTMLCanvasElement
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png")
      const downloadLink = document.createElement("a")
      downloadLink.href = pngUrl
      downloadLink.download = `BubblesO2_QR_${item.requestNumber}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
  }

  // Open Feedback Modal & fetch stats
  const handleOpenFeedbackModal = async (item: EventRequisitionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setFeedbackModalItem(item)
    setActiveFeedbackTab("FEEDBACK")
    setLoadingFeedbackStats(true)
    setFeedbackError(null)

    try {
      const res = await getMarketingEventFeedbackSummary(item.id)
      if (res.success && res.stats) {
        setFeedbackStats(res.stats)
      } else {
        setFeedbackError(res.error || "Failed to load feedback summary")
      }
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to load feedback")
    } finally {
      setLoadingFeedbackStats(false)
    }
  }

  // Handle uploading extra gallery images with client-side compression and resilient API route
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!feedbackModalItem || !e.target.files || e.target.files.length === 0) return
    const rawFiles = Array.from(e.target.files)
    setUploadingGallery(true)
    setFeedbackError(null)
    setUploadProgressText(`Optimizing ${rawFiles.length} photo${rawFiles.length > 1 ? "s" : ""}...`)

    try {
      // 1. Compress images in the browser to prevent 413 / payload limit errors
      const optimizedFiles: File[] = []
      for (let i = 0; i < rawFiles.length; i++) {
        setUploadProgressText(`Optimizing photo ${i + 1} of ${rawFiles.length}...`)
        const opt = await compressImageForUpload(rawFiles[i])
        optimizedFiles.push(opt)
      }

      setUploadProgressText(`Uploading ${optimizedFiles.length} photo${optimizedFiles.length > 1 ? "s" : ""}...`)

      // 2. Upload via dedicated API route
      const formData = new FormData()
      optimizedFiles.forEach(file => {
        formData.append("images", file)
      })

      const response = await fetch(`/api/marketing/events/${feedbackModalItem.id}/gallery`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errMessage = "Upload failed"
        try {
          const errData = await response.json()
          errMessage = errData.error || errMessage
        } catch {
          if (response.status === 413) {
            errMessage = "Selected images exceed server upload limit. Please upload 1 or 2 images at a time."
          } else {
            errMessage = `Server returned status ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errMessage)
      }

      const res = await response.json()
      if (res.success && res.gallery) {
        const updatedItem = {
          ...feedbackModalItem,
          galleryAttachments: JSON.stringify(res.gallery)
        }
        setFeedbackModalItem(updatedItem)
        setRequisitions(prev => prev.map(r => r.id === updatedItem.id ? updatedItem : r))
        if (selectedItem?.id === updatedItem.id) {
          setSelectedItem(updatedItem)
        }
      } else {
        setFeedbackError(res.error || "Failed to upload gallery images")
      }
    } catch (err: any) {
      console.error("Gallery upload error:", err)
      setFeedbackError(err.message || "Error uploading images")
    } finally {
      setUploadingGallery(false)
      setUploadProgressText(null)
      e.target.value = ""
    }
  }

  // Handle deleting a gallery image
  const handleDeleteGalleryImage = async (imageUrl: string) => {
    if (!feedbackModalItem) return
    try {
      const response = await fetch(`/api/marketing/events/${feedbackModalItem.id}/gallery`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      })

      if (response.ok) {
        const res = await response.json()
        if (res.success && res.gallery) {
          const updatedItem = {
            ...feedbackModalItem,
            galleryAttachments: JSON.stringify(res.gallery)
          }
          setFeedbackModalItem(updatedItem)
          setRequisitions(prev => prev.map(r => r.id === updatedItem.id ? updatedItem : r))
          if (selectedItem?.id === updatedItem.id) {
            setSelectedItem(updatedItem)
          }
          return
        }
      }

      // Fallback to Server Action
      const resAction = await deleteMarketingEventGalleryImage(feedbackModalItem.id, imageUrl)
      if (resAction.success && resAction.gallery) {
        const updatedItem = {
          ...feedbackModalItem,
          galleryAttachments: JSON.stringify(resAction.gallery)
        }
        setFeedbackModalItem(updatedItem)
        setRequisitions(prev => prev.map(r => r.id === updatedItem.id ? updatedItem : r))
        if (selectedItem?.id === updatedItem.id) {
          setSelectedItem(updatedItem)
        }
      }
    } catch (err: any) {
      console.warn("Failed to delete gallery image:", err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Marketing Event Management &amp; Audit
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
              Event Requisitions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Review and manage event collaboration requisitions, deploy QR satisfaction surveys upon approval, and generate executive illustrated PDF reports.
            </p>
          </div>

          {/* View Mode Toggle (List / Calendar) */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-white text-slate-900 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5 text-teal-600" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("CALENDAR")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                viewMode === "CALENDAR"
                  ? "bg-teal-600 text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Requisitions</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{stats.total}</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Pending Review</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-800 mt-1 block">{stats.pending}</span>
          </div>

          <div
            onClick={() => setViewMode("CALENDAR")}
            className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 hover:shadow-xs transition group"
            title="Click to view Approved Events on Calendar"
          >
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved Events
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1 block">{stats.approved}</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Rejected</span>
            <span className="text-2xl sm:text-3xl font-black text-rose-800 mt-1 block">{stats.rejected}</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View: Calendar or List */}
      {viewMode === "CALENDAR" ? (
        <MarketingEventsCalendarView
          events={requisitions}
          onSelectEvent={(item) => setSelectedItem(item)}
          onSwitchToList={() => setViewMode("LIST")}
        />
      ) : (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL")
                  setCurrentPage(1)
                }}
                className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
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
                className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-amber-100 text-amber-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Pending ({stats.pending})
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("APPROVED")
                  setCurrentPage(1)
                }}
                className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                  statusFilter === "APPROVED"
                    ? "bg-emerald-100 text-emerald-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Approved ({stats.approved})
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("REJECTED")
                  setCurrentPage(1)
                }}
                className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
                  statusFilter === "REJECTED"
                    ? "bg-rose-100 text-rose-900 shadow-2xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Rejected ({stats.rejected})
              </button>
            </div>

            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search event, requester, ID..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("")
                    setCurrentPage(1)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Requisitions List Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {paginatedList.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No event requisitions found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== "ALL"
                    ? "Try adjusting your filters or search terms."
                    : "No event collaboration requisitions have been submitted yet from the QR portal."}
                </p>
              </div>
            ) : (
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
                              <Clock className="w-3.5 h-3.5" />
                              Pending Review
                            </span>
                          )}
                          {item.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approved
                            </span>
                          )}
                          {item.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              Rejected
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            Submitted {formatDateDisplay(item.createdAt)}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors">
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
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
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
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-100 text-teal-800 text-[10px] font-bold"
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
                      <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                        {/* Action buttons for PENDING */}
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

                        {/* Action buttons for APPROVED (Matching User Request & Red Box) */}
                        {item.status === "APPROVED" && (
                          <div className="flex items-center gap-1.5">
                            {/* 1. Public QR & Form Link Button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenQrModal(item, e)}
                              className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs uppercase tracking-wider transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              title="View Public Form QR Code & Link"
                            >
                              <QrCode className="w-3.5 h-3.5 text-teal-600" />
                              <span className="hidden sm:inline">QR Code</span>
                            </button>

                            {/* Post-Event Report Hub Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPostEventReportItem(item)
                              }}
                              className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 font-bold text-xs uppercase tracking-wider transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              title="Post-Event Report Hub (ISO BOMSB-MKT-A-850-001-QR05)"
                            >
                              <FileText className="w-3.5 h-3.5 text-teal-700" />
                              <span className="hidden md:inline">Post-Event</span>
                            </button>

                            {/* 2. Feedback & Gallery Button */}
                            <button
                              type="button"
                              onClick={(e) => handleOpenFeedbackModal(item, e)}
                              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              title="Live Feedback & Photo Gallery"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
                              <span className="hidden sm:inline">Feedback</span>
                            </button>

                            {/* 3. Generate 10-Page Illustrated PDF Report */}
                            <a
                              href={`/api/marketing/events/${item.id}/report/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              title="Download 10-Page Executive PDF Report"
                            >
                              <FileDown className="w-3.5 h-3.5 text-teal-300" />
                              <span>Report</span>
                            </a>
                          </div>
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
            )}

            {/* Table Pagination Component */}
            <TablePagination
              currentPage={safeCurrentPage}
              totalItems={filteredList.length}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
                setCurrentPage(1)
              }}
            />
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 1. QR CODE & PUBLIC LINK MODAL                                            */}
      {/* ========================================================================= */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 p-6 text-white relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-teal-600 text-white">
                      {qrModalItem.requestNumber}
                    </span>
                    <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
                      Public Feedback Portal
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {qrModalItem.eventName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setQrModalItem(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 text-center">
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan this QR code with any smartphone camera or share the public link. External participants can fill out the satisfaction form without logging in.
              </p>

              {/* QR Code Canvas */}
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-teal-200 inline-block shadow-sm">
                <QRCodeCanvas
                  id={`qr-feedback-canvas-${qrModalItem.id}`}
                  value={`${baseUrl}/public/marketing/events/${qrModalItem.id}/feedback`}
                  size={210}
                  level="H"
                  marginSize={3}
                />
              </div>

              {/* URL Display with Copy Button */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Public Feedback Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${baseUrl}/public/marketing/events/${qrModalItem.id}/feedback`}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyQrUrl(`${baseUrl}/public/marketing/events/${qrModalItem.id}/feedback`)}
                    className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Copy Link to Clipboard"
                  >
                    {copiedQrUrl ? (
                      <>
                        <CheckCheck className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setQrModalItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadQrPng(qrModalItem)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-800 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5 text-teal-600" />
                  <span>Download PNG</span>
                </button>

                <a
                  href={`/public/marketing/events/${qrModalItem.id}/feedback`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Form</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Event Report Hub Modal */}
      {postEventReportItem && (
        <PostEventReportModal
          isOpen={!!postEventReportItem}
          onClose={() => setPostEventReportItem(null)}
          requisitionId={postEventReportItem.id}
          eventName={postEventReportItem.eventName}
          currentUserRole={user?.role || "STAFF"}
          currentUserName={user?.name || "Staff"}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. LIVE FEEDBACK & PHOTO GALLERY MANAGER MODAL                            */}
      {/* ========================================================================= */}
      {feedbackModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 p-6 text-white relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-teal-600 text-white">
                      {feedbackModalItem.requestNumber}
                    </span>
                    <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
                      Event Performance &amp; Media Manager
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {feedbackModalItem.eventName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setFeedbackModalItem(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFeedbackTab("FEEDBACK")}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    activeFeedbackTab === "FEEDBACK"
                      ? "bg-white text-slate-900 font-black shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-teal-500" />
                  <span>Participant Feedback ({feedbackStats?.totalCount ?? 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFeedbackTab("GALLERY")}
                  className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    activeFeedbackTab === "GALLERY"
                      ? "bg-white text-slate-900 font-black shadow-xs"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-teal-500" />
                  <span>Report Photo Gallery</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {feedbackError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{feedbackError}</span>
                </div>
              )}

              {/* TAB 1: FEEDBACK RESPONSES & METRICS */}
              {activeFeedbackTab === "FEEDBACK" && (
                <div className="space-y-6">
                  {loadingFeedbackStats ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                      <span className="text-xs font-medium">Loading feedback analytics...</span>
                    </div>
                  ) : (
                    <>
                      {/* KPI Summary Tiles */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200">
                          <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                            Total Responses
                          </span>
                          <span className="text-2xl font-black text-teal-950 mt-1 block">
                            {feedbackStats?.totalCount ?? 0}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            Satisfaction Score
                          </span>
                          <span className="text-2xl font-black text-slate-900 mt-1 block">
                            {feedbackStats && feedbackStats.totalCount > 0 ? `${feedbackStats.satisfactionScore}/100` : "N/A"}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                            High Satisfaction
                          </span>
                          <span className="text-2xl font-black text-emerald-950 mt-1 block">
                            {feedbackStats && feedbackStats.totalCount > 0 ? `${feedbackStats.positiveSatisfactionPercent}%` : "0%"}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200">
                          <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                            Well Organized Rate
                          </span>
                          <span className="text-2xl font-black text-sky-950 mt-1 block">
                            {feedbackStats && feedbackStats.totalCount > 0 ? `${feedbackStats.organizationApprovalPercent}%` : "0%"}
                          </span>
                        </div>
                      </div>

                      {/* Ratings Breakdown Pills */}
                      {feedbackStats && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Satisfaction Tier Distribution:
                          </span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-3 py-1 rounded-xl bg-teal-100 text-teal-900 font-bold">
                              Extremely Satisfied: {feedbackStats.satisfactionCounts.EXTREMELY_SATISFIED}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 font-bold border border-teal-200">
                              Very Satisfied: {feedbackStats.satisfactionCounts.VERY_SATISFIED}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-sky-50 text-sky-800 font-bold border border-sky-200">
                              Somewhat Satisfied: {feedbackStats.satisfactionCounts.SOMEWHAT_SATISFIED}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 font-bold border border-amber-200">
                              Not so Satisfied: {feedbackStats.satisfactionCounts.NOT_SO_SATISFIED}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-800 font-bold border border-rose-200">
                              Not at all: {feedbackStats.satisfactionCounts.NOT_AT_ALL_SATISFIED}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Feedback List */}
                      <div className="space-y-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <MessageSquareQuote className="w-4 h-4 text-teal-600" />
                          Individual Participant Submissions ({feedbackStats?.recentFeedbacks.length ?? 0})
                        </h3>

                        {!feedbackStats || feedbackStats.recentFeedbacks.length === 0 ? (
                          <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-400 italic">
                              No participant feedback submitted yet. Share the QR code or link to collect responses.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {feedbackStats.recentFeedbacks.map((fb, idx) => (
                              <div
                                key={fb.id || idx}
                                className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 transition space-y-2 text-xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                  <span className="font-bold text-slate-900 text-sm">{fb.respondentName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
                                      {fb.satisfaction.replace(/_/g, " ")}
                                    </span>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                                        fb.wellOrganized
                                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                          : "bg-rose-50 text-rose-800 border border-rose-200"
                                      }`}
                                    >
                                      Organized: {fb.wellOrganized ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 pt-1">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block mb-0.5">
                                      Liked Most:
                                    </span>
                                    <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                      {fb.likedMost}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-0.5">
                                      Liked Least:
                                    </span>
                                    <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                      {fb.likedLeast}
                                    </p>
                                  </div>
                                </div>

                                {fb.comments && (
                                  <div className="pt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                                      Comments &amp; Suggestions:
                                    </span>
                                    <p className="text-slate-800 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                                      {fb.comments}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: REPORT PHOTO GALLERY */}
              {activeFeedbackTab === "GALLERY" && (
                <div className="space-y-6">
                  {/* Upload Box */}
                  <div className="p-6 rounded-2xl bg-teal-50/40 border-2 border-dashed border-teal-200 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Upload Event Highlight Photos</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add high-resolution photos of booth setup, crowds, and on-ground activities to feature in the PDF report gallery.
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer">
                      {uploadingGallery ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{uploadProgressText || "Uploading Photos..."}</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>Select Images</span>
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={uploadingGallery}
                        onChange={handleGalleryUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Photos Grid */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Report Gallery Photos ({parseGallery(feedbackModalItem.galleryAttachments).length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Images appear on Pages 7 &amp; 8 of the PDF report
                      </span>
                    </h3>

                    {parseGallery(feedbackModalItem.galleryAttachments).length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-400 italic">
                          No custom gallery photos uploaded yet. The PDF report will fall back to using requisition attachments if available.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {parseGallery(feedbackModalItem.galleryAttachments).map((gal, idx) => (
                          <div
                            key={gal.url || idx}
                            className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-2xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={gal.url}
                              alt={gal.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />

                            {/* Delete overlay button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryImage(gal.url)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove from gallery"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white truncate">
                              {gal.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setFeedbackModalItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenQrModal(feedbackModalItem)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-800 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-teal-600" />
                  <span>Show QR Code</span>
                </button>

                <a
                  href={`/api/marketing/events/${feedbackModalItem.id}/report/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5 text-teal-300" />
                  <span>Download 10-Page PDF</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EVENT REQUISITION DETAILS MODAL                                        */}
      {/* ========================================================================= */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 p-6 text-white relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded bg-teal-600 text-white">
                      {selectedItem.requestNumber}
                    </span>
                    <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
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

              {/* Special Satisfaction Survey & Report Panel for APPROVED events */}
              {selectedItem.status === "APPROVED" && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      Satisfaction Survey &amp; Report Tools
                    </span>
                    <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-teal-800 leading-relaxed">
                    This event is approved. You can display or download the public feedback QR code, view respondent analytics, or generate the 10-page executive PDF report.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenQrModal(selectedItem)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-teal-100/70 border border-teal-300 text-teal-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-teal-700" />
                      <span>View QR &amp; Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenFeedbackModal(selectedItem)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-teal-100/70 border border-teal-300 text-teal-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
                      <span>Feedback &amp; Gallery</span>
                    </button>

                    <a
                      href={`/api/marketing/events/${selectedItem.id}/report/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-teal-300" />
                      <span>Download PDF Report</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Event Dates & Schedule */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
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
                  <Tag className="w-4 h-4 text-teal-600" />
                  Support Requirements Requested
                </h3>

                <div className="flex flex-wrap gap-2">
                  {selectedItem.requirements.split(",").map(req => {
                    const clean = req.trim()
                    return (
                      <span
                        key={clean}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold text-xs flex items-center gap-1.5"
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
                  <User className="w-4 h-4 text-teal-600" />
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
                      className="text-teal-700 hover:underline flex items-center gap-1.5 pt-0.5"
                    >
                      <Mail className="w-3.5 h-3.5" /> {selectedItem.email}
                    </a>
                    {selectedItem.phone && (
                      <a
                        href={`tel:${selectedItem.phone}`}
                        className="text-teal-700 font-medium hover:underline flex items-center gap-1.5 pt-0.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> {selectedItem.phone}
                      </a>
                    )}
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
                    <Paperclip className="w-4 h-4 text-teal-600" />
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
                                className="p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition cursor-pointer"
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
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditingItem(selectedItem)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm hover:shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <FilePenLine className="w-3.5 h-3.5" />
                    <span>Edit Event</span>
                  </button>
                )}

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

                {selectedItem.status === "APPROVED" && (
                  <a
                    href={`/api/marketing/events/${selectedItem.id}/report/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5 text-teal-300" />
                    <span>Download Report</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REJECT CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 5. LIGHTBOX IMAGE PREVIEW                                                 */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* 6. EDIT EVENT REQUISITION MODAL                                           */}
      {/* ========================================================================= */}
      {editingItem && (
        <EditEventRequisitionModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={(updated) => {
            setRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r))
            if (selectedItem?.id === updated.id) {
              setSelectedItem(updated)
            }
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

// =========================================================================
// 8. EDIT EVENT REQUISITION MODAL COMPONENT
// =========================================================================

const EDIT_DEPARTMENTS = [
  "HR",
  "Finance",
  "Corporate",
  "Legal",
  "Marketing",
  "Online Sales",
  "Sales Ordering",
  "Logistic & Warehouse",
  "Business Development & Sales",
  "Kilang Pedas",
  "Kilang Rantau",
  "Information Technology",
  "Project",
  "Maintenance & Facilities",
  "Personal Driver",
  "Security",
  "Health & Safety Environment",
  "Cari Gali",
]

const EDIT_REQUIREMENTS = ["Activation", "Media", "Logistic"]

function toIsoDateInput(d: Date | string | null | undefined): string {
  if (!d) return ""
  try {
    const dateObj = typeof d === "string" ? new Date(d) : d
    if (isNaN(dateObj.getTime())) return ""
    return dateObj.toISOString().split("T")[0]
  } catch {
    return ""
  }
}

interface EditEventRequisitionModalProps {
  item: EventRequisitionItem
  onClose: () => void
  onSuccess: (updated: EventRequisitionItem) => void
}

function EditEventRequisitionModal({ item, onClose, onSuccess }: EditEventRequisitionModalProps) {
  // Requester fields
  const [name, setName] = useState(item.name || "")
  const [staffId, setStaffId] = useState(item.staffId || "")
  const [email, setEmail] = useState(item.email || "")
  const [phone, setPhone] = useState(item.phone || "")
  const [department, setDepartment] = useState(item.department || "")

  // Event details
  const [eventName, setEventName] = useState(item.eventName || "")
  const [eventType, setEventType] = useState(item.eventType || "")
  const [organizer, setOrganizer] = useState(item.organizer || "")
  const [eventDateFrom, setEventDateFrom] = useState(toIsoDateInput(item.eventDateFrom))
  const [eventDateTo, setEventDateTo] = useState(toIsoDateInput(item.eventDateTo))
  const [picContactName, setPicContactName] = useState(item.picContactName || "")
  const [picContactNumber, setPicContactNumber] = useState(item.picContactNumber || "")
  const [tentative, setTentative] = useState(item.tentative || "")
  const [remarks, setRemarks] = useState(item.remarks || "")

  // Requirements multi-select
  const [selectedReqs, setSelectedReqs] = useState<string[]>(() => {
    if (!item.requirements) return []
    return item.requirements.split(",").map(r => r.trim()).filter(Boolean)
  })

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const toggleReq = (req: string) => {
    setSelectedReqs(prev =>
      prev.includes(req) ? prev.filter(r => r !== req) : [...prev, req]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!name.trim()) return setErrorMsg("Requester full name is required.")
    if (!staffId.trim()) return setErrorMsg("Staff ID is required.")
    if (!email.trim()) return setErrorMsg("Email address is required.")
    if (!phone.trim()) return setErrorMsg("Requester contact phone number is required.")
    if (!department) return setErrorMsg("Please select a department.")

    if (!eventName.trim()) return setErrorMsg("Event name is required.")
    if (!eventType.trim()) return setErrorMsg("Event type is required.")
    if (!organizer.trim()) return setErrorMsg("Organizer name is required.")
    if (!eventDateFrom) return setErrorMsg("Event start date (From) is required.")
    if (!eventDateTo) return setErrorMsg("Event end date (To) is required.")
    if (eventDateTo < eventDateFrom) {
      return setErrorMsg("Event End Date (To) cannot be earlier than Event Start Date (From).")
    }

    if (!picContactName.trim()) return setErrorMsg("PIC contact name is required.")
    if (!picContactNumber.trim()) return setErrorMsg("PIC contact phone number is required.")
    if (!tentative.trim()) return setErrorMsg("Tentative schedule / details are required.")
    if (selectedReqs.length === 0) {
      return setErrorMsg("Please select at least one requirement (Activation, Media, Logistic).")
    }

    setSaving(true)

    try {
      const res = await updateMarketingEventRequisition(item.id, {
        name: name.trim(),
        staffId: staffId.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        department: department.trim(),
        eventName: eventName.trim(),
        eventType: eventType.trim(),
        organizer: organizer.trim(),
        eventDateFrom,
        eventDateTo,
        picContactName: picContactName.trim(),
        picContactNumber: picContactNumber.trim(),
        tentative: tentative.trim(),
        requirements: selectedReqs.join(", "),
        remarks: remarks.trim() || null,
      })

      if (res.success && res.data) {
        const updatedItem: EventRequisitionItem = {
          ...item,
          name: res.data.name,
          staffId: res.data.staffId,
          email: res.data.email,
          phone: res.data.phone || null,
          department: res.data.department,
          eventName: res.data.eventName,
          eventType: res.data.eventType,
          organizer: res.data.organizer,
          eventDateFrom: res.data.eventDateFrom,
          eventDateTo: res.data.eventDateTo,
          picContactName: res.data.picContactName,
          picContactNumber: res.data.picContactNumber,
          tentative: res.data.tentative,
          requirements: res.data.requirements,
          remarks: res.data.remarks,
          updatedAt: res.data.updatedAt,
        }
        onSuccess(updatedItem)
      } else {
        setErrorMsg(res.error || "Failed to update event requisition.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred."
      setErrorMsg(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 text-white relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px] tracking-wide uppercase">
                  {item.requestNumber}
                </span>
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                  Edit Event Requisition
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Edit Requisition Details
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Update event information for report generation and operational synchronization.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Department Requester Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              1. Department Requester Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 012-3456789"
                    className="w-full text-xs font-medium pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                >
                  <option value="">-- Select Department --</option>
                  {EDIT_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Event Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              2. Event Details &amp; Organizer
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Event Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Type <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    placeholder="e.g. CSR, Marathon, Expo"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Organizer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="e.g. Kelab Sukan"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Start Date (From) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDateFrom}
                    onChange={(e) => setEventDateFrom(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event End Date (To) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDateTo}
                    onChange={(e) => setEventDateTo(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tentative Schedule &amp; Location <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={tentative}
                  onChange={(e) => setTentative(e.target.value)}
                  className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Requirements */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              3. Support Requirements Allocated <span className="text-rose-500">*</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EDIT_REQUIREMENTS.map((req) => {
                const isSelected = selectedReqs.includes(req)
                return (
                  <button
                    key={req}
                    type="button"
                    onClick={() => toggleReq(req)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold">{req}</span>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 4: PIC Contact */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Phone className="w-4 h-4 text-indigo-600" />
              4. Event Coordinator / Person In Charge (PIC)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIC Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={picContactName}
                  onChange={(e) => setPicContactName(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIC Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={picContactNumber}
                  onChange={(e) => setPicContactNumber(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Administrative Remarks */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              5. Administrative / Approval Remarks (Optional)
            </h3>

            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved with logistics buffer / modified schedule"
              className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm hover:shadow-indigo-500/20 cursor-pointer flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

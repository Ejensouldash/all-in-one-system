"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Video,
  Palette,
  User,
  Calendar,
  Phone,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
  Copy,
  Check,
  Film,
  Smartphone,
  Monitor,
  Printer,
  Sparkles,
  Link as LinkIcon,
  Send,
  Cloud,
  FileCheck,
  ImageIcon,
} from "lucide-react"
import { submitVideoDesignRequisition } from "@/app/actions/marketing-video-design"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file

const DEPARTMENTS = [
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
  "Other",
]

const VIDEO_TYPES = [
  { id: "Corporate", label: "Corporate", desc: "Company profile, townhall, executive messaging, milestone showcase" },
  { id: "Social Media", label: "Social Media", desc: "TikTok, Reels, Instagram, YouTube shorts, promotional campaigns" },
]

const VIDEO_FORMATS = [
  { id: "Portrait", label: "Portrait (9:16)", icon: Smartphone, desc: "Mobile-first: TikTok, Instagram Reels, Shorts" },
  { id: "Landscape", label: "Landscape (16:9)", icon: Monitor, desc: "Widescreen: YouTube, TV display, Presentations" },
]

const DESIGN_TYPES = [
  { id: "Poster", label: "Poster" },
  { id: "Sticker", label: "Sticker" },
  { id: "T-Shirt", label: "T-Shirt" },
  { id: "Others", label: "Others" },
]

interface SelectedFileItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  previewUrl?: string
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface MarketingVideoDesignRequestFormProps {
  onBack?: () => void
}

export function MarketingVideoDesignRequestForm({ onBack }: MarketingVideoDesignRequestFormProps) {
  // Main Selection: "VIDEO" or "DESIGN"
  const [activeTab, setActiveTab] = useState<"VIDEO" | "DESIGN">("VIDEO")

  // Requester Details
  const [name, setName] = useState("")
  const [staffId, setStaffId] = useState("")
  const [department, setDepartment] = useState("")
  const [customDepartment, setCustomDepartment] = useState("")
  const [needBy, setNeedBy] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  // Video Specific
  const [videoType, setVideoType] = useState<string>("Social Media")
  const [format, setFormat] = useState<string>("Portrait")
  const [videoDetails, setVideoDetails] = useState("")
  const [videoContentFocus, setVideoContentFocus] = useState("")
  const [requiredShots, setRequiredShots] = useState("")

  // Design Specific
  const [designType, setDesignType] = useState<string>("Poster")
  const [customDesignType, setCustomDesignType] = useState("")
  const [designDetails, setDesignDetails] = useState("")
  const [designSize, setDesignSize] = useState("")
  const [designContent, setDesignContent] = useState("")
  const [needPrinting, setNeedPrinting] = useState<boolean>(false)

  // Reference & Uploads
  const [referenceLinks, setReferenceLinks] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Submission State
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{
    requestNumber: string
    type: string
    name: string
    staffId: string
    department: string
    needBy: string
    phoneNumber: string
    attachmentCount: number
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Clean up object URLs
  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [selectedFiles])

  // Handle file additions
  const handleIncomingFiles = (incoming: FileList | File[]) => {
    setErrorMsg(null)
    const newItems: SelectedFileItem[] = []
    const oversized: string[] = []

    for (const file of Array.from(incoming)) {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(`"${file.name}" (${formatFileSize(file.size)})`)
        continue
      }
      const isDuplicate = selectedFiles.some(
        (f) => f.name === file.name && f.size === file.size
      )
      if (isDuplicate) continue

      let previewUrl: string | undefined = undefined
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file)
      }

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        previewUrl,
      })
    }

    if (oversized.length > 0) {
      setErrorMsg(`The following files exceed the 50MB limit: ${oversized.join(", ")}`)
    }

    if (newItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newItems])
    }
  }

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const finalDept = department === "Other" ? customDepartment.trim() : department

    // Validation
    if (!name.trim()) return setErrorMsg("Please provide your full name.")
    if (!staffId.trim()) return setErrorMsg("Please provide your staff ID.")
    if (!finalDept) return setErrorMsg("Please select your department.")
    if (!needBy) return setErrorMsg("Please choose the 'Need By' (required date).")
    if (!phoneNumber.trim()) return setErrorMsg("Please provide your phone/contact number.")

    if (activeTab === "VIDEO") {
      if (!videoType) return setErrorMsg("Please choose a video type (Corporate or Social Media).")
      if (!format) return setErrorMsg("Please select video format (Portrait or Landscape).")
      if (!videoDetails.trim() && !videoContentFocus.trim()) {
        return setErrorMsg("Please provide Video Details / Description to ease the video preparation process.")
      }
    } else {
      if (!designType) return setErrorMsg("Please select a design type.")
      if (designType === "Others" && !customDesignType.trim()) {
        return setErrorMsg("Please specify the design type for 'Others'.")
      }
      if (!designDetails.trim() && !designContent.trim()) {
        return setErrorMsg("Please provide Design Details / Description to ease the design process.")
      }
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("type", activeTab)
      formData.append("name", name.trim())
      formData.append("staffId", staffId.trim())
      formData.append("department", finalDept)
      formData.append("needBy", needBy)
      formData.append("phoneNumber", phoneNumber.trim())

      if (activeTab === "VIDEO") {
        formData.append("videoType", videoType)
        formData.append("format", format)
        formData.append("videoDetails", videoDetails.trim())
        formData.append("videoContentFocus", videoContentFocus.trim())
        formData.append("requiredShots", requiredShots.trim())
      } else {
        formData.append("designType", designType)
        if (designType === "Others") {
          formData.append("customDesignType", customDesignType.trim())
        }
        formData.append("designDetails", designDetails.trim())
        formData.append("designSize", designSize.trim())
        formData.append("designContent", designContent.trim())
        formData.append("needPrinting", needPrinting ? "true" : "false")
      }

      if (referenceLinks.trim()) {
        formData.append("referenceLinks", referenceLinks.trim())
      }

      // Attachments for Cloudflare R2
      for (const item of selectedFiles) {
        formData.append("files", item.file)
      }

      const res = await submitVideoDesignRequisition(formData)

      if (res.success && res.data) {
        setSuccessResult({
          requestNumber: res.data.requestNumber,
          type: res.data.type,
          name: res.data.name,
          staffId: res.data.staffId,
          department: res.data.department,
          needBy: res.data.needBy,
          phoneNumber: res.data.phoneNumber,
          attachmentCount: selectedFiles.length,
        })
      } else {
        setErrorMsg(res.error || "Submission failed. Please try again.")
      }
    } catch (err: any) {
      console.error("Error submitting video & design requisition:", err)
      setErrorMsg(err?.message || "Failed to submit request. Please check your network and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // SUCCESS SCREEN
  if (successResult) {
    const isVideo = successResult.type === "VIDEO"
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-xl overflow-hidden p-6 sm:p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            Requisition Submitted
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            {isVideo ? "Video Production" : "Graphic Design"} Request Received!
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto mb-6">
            Your requisition has been dispatched to the Marketing &amp; Creative Team. Files have been securely stored in Cloudflare R2.
          </p>

          {/* Ticket Number Card */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 max-w-md mx-auto mb-6">
            <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">
              Official Reference Number
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                {successResult.requestNumber}
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(successResult.requestNumber)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm transition-all cursor-pointer"
                title="Copy reference number"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Key Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 max-w-md mx-auto text-left text-xs text-slate-600 space-y-2 mb-6 border border-slate-200">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-400 font-medium">Requisition Type:</span>
              <span className="font-bold text-slate-900">{isVideo ? "Video Production" : "Graphic Design"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-400 font-medium">Requester:</span>
              <span className="font-bold text-slate-900">{successResult.name} ({successResult.staffId})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-400 font-medium">Department:</span>
              <span className="font-bold text-slate-900">{successResult.department}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-400 font-medium">Contact:</span>
              <span className="font-bold text-slate-900">{successResult.phoneNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-400 font-medium">Need By:</span>
              <span className="font-bold text-rose-600">
                {new Date(successResult.needBy).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400 font-medium">Cloudflare R2 Files:</span>
              <span className="font-bold text-slate-900">{successResult.attachmentCount} file(s) uploaded</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <button
              type="button"
              onClick={() => {
                setSuccessResult(null)
                setSelectedFiles([])
                setVideoDetails("")
                setVideoContentFocus("")
                setRequiredShots("")
                setDesignDetails("")
                setDesignContent("")
                setReferenceLinks("")
              }}
              className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Submit Another
            </button>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Return to Portal
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // MAIN FORM
  const isVideo = activeTab === "VIDEO"

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal Menu</span>
          </button>
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Creative Studio Requisition
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-56 h-56 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-purple-400/20 border border-purple-300/30 text-purple-200 font-mono font-bold text-[10px] tracking-wide">
              MKT-CREATIVE-01
            </span>
            <span className="text-[11px] font-bold text-purple-200/80 uppercase tracking-wider">
              Marketing &amp; Media Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Video &amp; Design Requisition
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/80 max-w-xl leading-relaxed">
            Choose whether your request is for video production or graphic design, fill in the creative brief, and upload your reference examples. Files are stored securely on Cloudflare R2.
          </p>
        </div>
      </div>

      {/* TAB SELECTOR: Video vs Design */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/60 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("VIDEO")}
          className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "VIDEO"
              ? "bg-white text-purple-700 shadow-md scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === "VIDEO" ? "bg-purple-100 text-purple-700" : "bg-slate-200 text-slate-500"}`}>
            <Video className="w-4 h-4" />
          </div>
          <span>Video Requisition</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DESIGN")}
          className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "DESIGN"
              ? "bg-white text-pink-700 shadow-md scale-[1.01]"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
          }`}
        >
          <div className={`p-1.5 rounded-lg ${activeTab === "DESIGN" ? "bg-pink-100 text-pink-700" : "bg-slate-200 text-slate-500"}`}>
            <Palette className="w-4 h-4" />
          </div>
          <span>Design Requisition</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm animate-in fade-in duration-150">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Please check the required fields:</span>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* THE FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Requester Details */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                1. Requester Information
              </h2>
              <p className="text-[11px] text-slate-500">
                Contact information for delivery, clarifications, and approval updates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ahmad Bin Ali"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50"
              />
            </div>

            {/* Staff ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Staff ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. BOMSB001"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50"
              >
                <option value="">-- Select Department --</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {department === "Other" && (
                <input
                  type="text"
                  required
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  placeholder="Please specify department"
                  className="mt-2 w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 bg-white"
                />
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 012-3456789"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50"
                />
              </div>
            </div>

            {/* Need By (Required Date) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Need By (Required Date) <span className="text-rose-500">*</span>
              </label>
              <div className="relative max-w-sm">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={needBy}
                  onChange={(e) => setNeedBy(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                The target completion / handover date for this creative request.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Video or Design Specific Form */}
        {isVideo ? (
          /* VIDEO FORM */
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  2. Video Specifications &amp; Brief
                </h2>
                <p className="text-[11px] text-slate-500">
                  Provide detailed video requirements to ease the video preparation and production process.
                </p>
              </div>
            </div>

            {/* Video Type: Corporate / Social Media */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Video Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIDEO_TYPES.map((vt) => {
                  const isSelected = videoType === vt.id
                  return (
                    <div
                      key={vt.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVideoType(vt.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setVideoType(vt.id)
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                        isSelected
                          ? "border-purple-600 bg-purple-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-black text-xs uppercase tracking-wide ${isSelected ? "text-purple-800" : "text-slate-900"}`}>
                          {vt.label}
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-purple-600 bg-purple-600 text-white" : "border-slate-300"}`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{vt.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Format: Portrait / Landscape */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Video Format / Orientation <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIDEO_FORMATS.map((fmt) => {
                  const Icon = fmt.icon
                  const isSelected = format === fmt.id
                  return (
                    <div
                      key={fmt.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setFormat(fmt.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setFormat(fmt.id)
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition-all cursor-pointer text-left ${
                        isSelected
                          ? "border-purple-600 bg-purple-50/50 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-black text-xs uppercase tracking-wide ${isSelected ? "text-purple-800" : "text-slate-900"}`}>
                            {fmt.label}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-purple-600 bg-purple-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{fmt.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Video Details (Description) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Video Details (Description) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-purple-600">
                  Please be as detailed as possible to ease video preparation process
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={videoDetails}
                onChange={(e) => setVideoDetails(e.target.value)}
                placeholder="Describe the objective, tone, duration, background music preference, and overall expectations..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50 leading-relaxed"
              />
            </div>

            {/* Video content/focus */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Video Content / Focus
              </label>
              <textarea
                rows={3}
                value={videoContentFocus}
                onChange={(e) => setVideoContentFocus(e.target.value)}
                placeholder="What is the key message, hook, highlight, or product being showcased? (e.g. Natural oxygen content, eco-friendly bottle, sport marathon stamina)..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50 leading-relaxed"
              />
            </div>

            {/* Required shots */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Required Shots
              </label>
              <textarea
                rows={3}
                value={requiredShots}
                onChange={(e) => setRequiredShots(e.target.value)}
                placeholder="List any specific angles, scenes, or people needed (e.g. 1. Water bottle opening slow-motion, 2. Factory conveyor line, 3. Athlete drinking at finish line, 4. Logo outro)..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all bg-slate-50/50 leading-relaxed"
              />
            </div>
          </div>
        ) : (
          /* DESIGN FORM */
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  2. Graphic Design Specifications &amp; Brief
                </h2>
                <p className="text-[11px] text-slate-500">
                  Provide detailed creative specifications to ease the graphic design process.
                </p>
              </div>
            </div>

            {/* Design Type (Poster, Sticker, T-Shirt, Others) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Design Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DESIGN_TYPES.map((dt) => {
                  const isSelected = designType === dt.id
                  return (
                    <button
                      type="button"
                      key={dt.id}
                      onClick={() => setDesignType(dt.id)}
                      className={`p-3 rounded-2xl border-2 font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        isSelected
                          ? "border-pink-600 bg-pink-50 text-pink-700 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-pink-600 bg-pink-600 text-white" : "border-slate-300"}`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{dt.label}</span>
                    </button>
                  )
                })}
              </div>

              {designType === "Others" && (
                <div className="mt-3">
                  <input
                    type="text"
                    required
                    value={customDesignType}
                    onChange={(e) => setCustomDesignType(e.target.value)}
                    placeholder="Specify design type (e.g. Lanyard, Cap, Bunting, Brochure, Billboard)..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all bg-white"
                  />
                </div>
              )}
            </div>

            {/* Size of design */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Size of Design
              </label>
              <input
                type="text"
                value={designSize}
                onChange={(e) => setDesignSize(e.target.value)}
                placeholder="e.g. A4, A3, 1080 x 1080 px (Square), 2ft x 6ft (Bunting), Custom dimensions..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all bg-slate-50/50"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["A4", "A3", "1080x1080 (Square)", "1080x1920 (Story)", "2ft x 6ft (Bunting)", "3m x 3m (Backdrop)"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDesignSize(preset)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Design Details (Description) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Design Details (Description) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-pink-600">
                  Please provide as many details as possible to ease the design process
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={designDetails}
                onChange={(e) => setDesignDetails(e.target.value)}
                placeholder="Describe the aesthetic, branding guidelines, target audience, color preferences, mood, and overall design direction..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all bg-slate-50/50 leading-relaxed"
              />
            </div>

            {/* Content on design */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Content on Design
              </label>
              <textarea
                rows={3}
                value={designContent}
                onChange={(e) => setDesignContent(e.target.value)}
                placeholder="Provide exact texts, headlines, taglines, dates, venue, contact details, legal disclaimers, or partner logos required on the artwork..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-600 transition-all bg-slate-50/50 leading-relaxed"
              />
            </div>

            {/* Need Printing (Yes / No) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Need Printing? <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => setNeedPrinting(true)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    needPrinting
                      ? "border-pink-600 bg-pink-50 text-pink-800 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Yes, Need Printing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNeedPrinting(false)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    !needPrinting
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <span>Digital Only (No)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {needPrinting
                  ? "Marketing will prepare high-resolution print-ready files (CMYK, 300 DPI, bleed)."
                  : "Final artwork will be delivered in digital format (RGB / PNG / MP4 / PDF)."}
              </p>
            </div>
          </div>
        )}

        {/* SECTION 3: References & Examples (Cloudflare R2 Storage) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  3. References &amp; Examples
                </h2>
                <p className="text-[11px] text-slate-500">
                  Upload sample video, link, or images.
                </p>
              </div>
            </div>
          </div>

          {/* Reference Links Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Reference Links / Inspiration URLs
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={referenceLinks}
                onChange={(e) => setReferenceLinks(e.target.value)}
                placeholder="e.g. YouTube, Google Drive, Pinterest, Figma, TikTok, Instagram links..."
                className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-slate-50/50"
              />
            </div>
          </div>

          {/* Cloudflare R2 File Upload Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Upload Files (Sample Videos, Images, Documents)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files) {
                  handleIncomingFiles(e.dataTransfer.files)
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/60 scale-[1.01]"
                  : "border-slate-300 hover:border-indigo-500 hover:bg-slate-50/60 bg-slate-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.zip,.rar"
                onChange={(e) => {
                  if (e.target.files) {
                    handleIncomingFiles(e.target.files)
                  }
                }}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1">
                Drag and drop sample files here, or <span className="text-indigo-600 underline">browse</span>
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Supports Videos (MP4, MOV), Images (PNG, JPG, WEBP), and Documents (PDF, ZIP). Up to 50MB per file.
              </p>
            </div>

            {/* Uploaded File List Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                  <span>Selected Files ({selectedFiles.length})</span>
                  <span className="text-[11px] text-indigo-600">Will be uploaded to Cloudflare R2</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white shadow-sm gap-2"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            {item.type.startsWith("video/") ? (
                              <Film className="w-5 h-5" />
                            ) : (
                              <FileCheck className="w-5 h-5" />
                            )}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatFileSize(item.size)} • Cloudflare R2
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              submitting
                ? "bg-slate-400 cursor-not-allowed"
                : isVideo
                ? "bg-purple-600 hover:bg-purple-700 shadow-purple-600/20 hover:shadow-xl"
                : "bg-pink-600 hover:bg-pink-700 shadow-pink-600/20 hover:shadow-xl"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading to Cloudflare R2 &amp; Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit {isVideo ? "Video" : "Design"} Requisition</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            By submitting, your brief and references will be securely recorded and notified to the Marketing Department.
          </p>
        </div>
      </form>
    </div>
  )
}

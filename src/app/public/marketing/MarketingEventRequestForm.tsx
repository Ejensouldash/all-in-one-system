"use client"

import { useState, useRef, useEffect } from "react"
import { 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Flame, 
  Camera, 
  Truck, 
  Paperclip, 
  UploadCloud, 
  X, 
  FileText, 
  ImageIcon, 
  FileSpreadsheet
} from "lucide-react"
import { submitEventRequisition } from "@/app/actions/marketing-events"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB limit

// Exact department list specified by user
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
]

// 3 requirement options specified by user: activation, media, logistic
const REQUIREMENT_OPTIONS = [
  {
    id: "Activation",
    title: "Activation",
    subtitle: "Brand presence, on-ground engagement, booth setups, event sampling & brand ambassadors.",
    icon: Flame,
    color: "from-amber-500 to-orange-500",
    activeBorder: "border-orange-500 bg-orange-50/50",
    activeText: "text-orange-900",
  },
  {
    id: "Media",
    title: "Media",
    subtitle: "Photography, videography coverage, social media broadcasting, PR & promotional highlights.",
    icon: Camera,
    color: "from-blue-500 to-indigo-500",
    activeBorder: "border-blue-500 bg-blue-50/50",
    activeText: "text-blue-900",
  },
  {
    id: "Logistic",
    title: "Logistic",
    subtitle: "Stock dispatch, water delivery, transportation, display transport & on-site logistical support.",
    icon: Truck,
    color: "from-emerald-500 to-teal-500",
    activeBorder: "border-emerald-500 bg-emerald-50/50",
    activeText: "text-emerald-900",
  },
]

const COMMON_EVENT_TYPES = [
  "Exhibition / Trade Fair",
  "Corporate / Townhall",
  "Sports / Marathon / Fitness",
  "CSR / Community Outreach",
  "Product Launch / Campaign",
  "Sponsorship & Partnership",
  "Roadshow / Mall Activation",
  "Other",
]

interface AttachedFileItem {
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

function getFileIcon(type: string, name: string) {
  if (type.startsWith("image/")) {
    return <ImageIcon className="w-5 h-5 text-indigo-500" />
  }
  if (type.includes("sheet") || type.includes("excel") || name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
  }
  return <FileText className="w-5 h-5 text-blue-600" />
}

interface MarketingEventRequestFormProps {
  onBack?: () => void
}

export function MarketingEventRequestForm({ onBack }: MarketingEventRequestFormProps) {
  // Requester fields
  const [name, setName] = useState("")
  const [staffId, setStaffId] = useState("")
  const [email, setEmail] = useState("")
  const [department, setDepartment] = useState("")

  // Event details
  const [eventName, setEventName] = useState("")
  const [eventType, setEventType] = useState("")
  const [customEventType, setCustomEventType] = useState("")
  const [organizer, setOrganizer] = useState("")
  const [eventDateFrom, setEventDateFrom] = useState("")
  const [eventDateTo, setEventDateTo] = useState("")
  const [picContactName, setPicContactName] = useState("")
  const [picContactNumber, setPicContactNumber] = useState("")
  const [tentative, setTentative] = useState("")

  // Tentative Attached Files / Images
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Requirements: activation, media, logistic (can select multiple or single)
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([])

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    requestNumber: string
    requesterName: string
    eventName: string
    eventDateFrom: string
    eventDateTo: string
    tentative: string
    requirements: string
    attachmentCount: number
    attachments?: Array<{ name: string; url: string; size: number }>
  } | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [attachedFiles])

  // Handle file additions with 10MB limit enforcement
  const processIncomingFiles = (incoming: FileList | File[]) => {
    setErrorMsg(null)
    const newItems: AttachedFileItem[] = []
    const oversizedFiles: string[] = []

    Array.from(incoming).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`"${file.name}" (${formatFileSize(file.size)})`)
        return
      }

      // Check duplicates by filename & size
      const isDuplicate = attachedFiles.some(
        existing => existing.name === file.name && existing.size === file.size
      )
      if (isDuplicate) return

      const isImage = file.type.startsWith("image/")
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined

      newItems.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        previewUrl,
      })
    })

    if (oversizedFiles.length > 0) {
      setErrorMsg(
        `The following file(s) exceed the 10MB limit and were not added: ${oversizedFiles.join(", ")}. Please attach files under 10MB.`
      )
    }

    if (newItems.length > 0) {
      setAttachedFiles(prev => [...prev, ...newItems])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files)
      e.target.value = ""
    }
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files)
    }
  }

  const handleRemoveFile = (idToRemove: string) => {
    setAttachedFiles(prev => {
      const removed = prev.find(item => item.id === idToRemove)
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter(item => item.id !== idToRemove)
    })
  }

  // Toggle requirement option
  const toggleRequirement = (reqId: string) => {
    setSelectedRequirements(prev => {
      if (prev.includes(reqId)) {
        return prev.filter(item => item !== reqId)
      } else {
        return [...prev, reqId]
      }
    })
  }

  // Copy request code
  const handleCopyCode = () => {
    if (successData?.requestNumber && typeof window !== "undefined") {
      navigator.clipboard.writeText(successData.requestNumber)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    // Validations
    if (!name.trim()) return setErrorMsg("Please provide your full name.")
    if (!staffId.trim()) return setErrorMsg("Please provide your Staff ID.")
    if (!email.trim()) return setErrorMsg("Please provide your official email address.")
    if (!department) return setErrorMsg("Please select your department.")
    if (!eventName.trim()) return setErrorMsg("Please enter the event name.")
    
    const finalEventType = eventType === "Other" ? customEventType.trim() : eventType.trim()
    if (!finalEventType) return setErrorMsg("Please specify the event type.")

    if (!organizer.trim()) return setErrorMsg("Please provide the event organizer name.")
    if (!eventDateFrom) return setErrorMsg("Please specify the event start date (From).")
    if (!eventDateTo) return setErrorMsg("Please specify the event end date (To).")
    if (eventDateTo < eventDateFrom) {
      return setErrorMsg("Event End Date (To) cannot be earlier than Event Start Date (From).")
    }

    if (!picContactName.trim()) return setErrorMsg("Please provide the Person In Charge (PIC) contact name.")
    if (!picContactNumber.trim()) return setErrorMsg("Please provide the PIC contact phone number.")
    if (!tentative.trim()) return setErrorMsg("Please provide tentative event schedule / timeline.")
    if (selectedRequirements.length === 0) {
      return setErrorMsg("Please select at least one requirement (Activation, Media, or Logistic).")
    }

    // Verify all attached files are within 10MB
    for (const item of attachedFiles) {
      if (item.file.size > MAX_FILE_SIZE) {
        return setErrorMsg(`"${item.name}" exceeds the 10MB limit. Please remove it before submitting.`)
      }
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("staffId", staffId.trim())
      formData.append("email", email.trim())
      formData.append("department", department)
      formData.append("eventName", eventName.trim())
      formData.append("eventType", finalEventType)
      formData.append("organizer", organizer.trim())
      formData.append("eventDateFrom", eventDateFrom)
      formData.append("eventDateTo", eventDateTo)
      formData.append("picContactName", picContactName.trim())
      formData.append("picContactNumber", picContactNumber.trim())
      formData.append("tentative", tentative.trim())
      formData.append("requirements", selectedRequirements.join(", "))

      // Attach multiple files
      attachedFiles.forEach(item => {
        formData.append("attachments", item.file)
      })

      const res = await submitEventRequisition(formData)

      if (res.success && res.requestNumber) {
        setSuccessData({
          requestNumber: res.requestNumber,
          requesterName: res.requesterName,
          eventName: res.eventName,
          eventDateFrom: res.eventDateFrom || eventDateFrom,
          eventDateTo: res.eventDateTo || eventDateTo,
          tentative: res.tentative,
          requirements: res.requirements,
          attachmentCount: res.attachmentCount || 0,
          attachments: res.attachments,
        })
        // Reset inputs
        setName("")
        setStaffId("")
        setEmail("")
        setDepartment("")
        setEventName("")
        setEventType("")
        setCustomEventType("")
        setOrganizer("")
        setEventDateFrom("")
        setEventDateTo("")
        setPicContactName("")
        setPicContactNumber("")
        setTentative("")
        setSelectedRequirements([])
        setAttachedFiles([])
      } else {
        setErrorMsg(res.error || "Failed to submit event requisition.")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred."
      setErrorMsg(message)
    } finally {
      setSubmitting(false)
    }
  }

  // SUCCESS VIEW
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-xs border border-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Event Requisition Submitted!</h2>
          <p className="text-blue-100 text-xs mt-1 font-medium">
            Your event collaboration requisition has been forwarded to the Marketing Team for review.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Reference badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Requisition Reference Number
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                {successData.requestNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                title="Copy Reference"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Save this reference number for your department&apos;s follow-up with Marketing.
            </p>
          </div>

          {/* Details summary */}
          <div className="space-y-3 border-t border-slate-100 pt-5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Event Name:</span>
              <span className="font-bold text-slate-900">{successData.eventName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Event Dates:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {successData.eventDateFrom} &rarr; {successData.eventDateTo}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Requester:</span>
              <span className="font-bold text-slate-900">{successData.requesterName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Requirements:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {successData.requirements}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Tentative Schedule:</span>
              <span className="font-bold text-slate-900 text-right max-w-xs truncate">{successData.tentative}</span>
            </div>

            {successData.attachmentCount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Attachments:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {successData.attachmentCount} file(s) uploaded
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setSuccessData(null)}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
            >
              Submit Another Event Requisition
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Back to Requisition Options
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // FORM VIEW
  return (
    <div className="max-w-3xl mx-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 mb-4 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 shadow-xs border border-slate-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
          <span>Back to Requisition Options</span>
        </button>
      )}

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[10px] tracking-wide uppercase">
                Event Support
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Bubbles O2 Marketing
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-indigo-400" />
              Event Requisition
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Official departmental requisition form for company, CSR, sponsorship, and marketing events requiring activation, media coverage, and logistics.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-7">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Requester Information */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              1. Requester Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Abdul Rahman"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Staff ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="e.g. BOMSB001"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition uppercase"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. abdul@bubbleso2.com"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                >
                  <option value="">-- Select Your Department --</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Event Details */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              2. Event Information
            </h2>

            <div className="space-y-4">
              {/* Event Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Event Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. KL Standard Chartered Marathon 2026 / VIP Product Launch"
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />
              </div>

              {/* Event Type & Organizer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Event Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition mb-2"
                  >
                    <option value="">-- Select Event Type --</option>
                    {COMMON_EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {eventType === "Other" && (
                    <input
                      type="text"
                      required
                      value={customEventType}
                      onChange={(e) => setCustomEventType(e.target.value)}
                      placeholder="Please specify event type..."
                      className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-indigo-300 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                    />
                  )}
                </div>

                {/* Organizer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organizer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="e.g. Bubbles O2 / Kementerian Belia & Sukan / External Corp"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Event Dates (From & To) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Date (From) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDateFrom}
                    onChange={(e) => {
                      setEventDateFrom(e.target.value)
                      if (eventDateTo && e.target.value > eventDateTo) {
                        setEventDateTo(e.target.value)
                      }
                    }}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Date (To) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={eventDateFrom || undefined}
                    value={eventDateTo}
                    onChange={(e) => setEventDateTo(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* PIC Contact Name & Number Grid */}
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
                    placeholder="e.g. En. Razak (Event Coordinator)"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PIC Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={picContactNumber}
                    onChange={(e) => setPicContactNumber(e.target.value)}
                    placeholder="e.g. 019-8765432"
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Tentative Schedule / Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tentative Schedule &amp; Location <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={tentative}
                  onChange={(e) => setTentative(e.target.value)}
                  placeholder="e.g. 24 - 26 November 2026, 8:00 AM - 6:00 PM&#10;Location: MITEC Hall 3, Kuala Lumpur&#10;Tentative itinerary: Day 1 Booth setup, Day 2 Public exhibition, Day 3 Teardown"
                  className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition"
                />

                {/* Multiple Files & Images Attachment Upload Feature */}
                <div className="mt-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      Tentative Attachments (Files &amp; Images)
                      <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Limit: <span className="text-indigo-600 font-bold">Max 10MB</span> per file • Multiple files
                    </span>
                  </div>

                  {/* Dropzone Container */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-indigo-600 bg-indigo-50/70 scale-[0.99]"
                        : "border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />

                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop files here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Attach tentative itineraries, floor plans, posters, letters, or event briefs (PDF, Word, Excel, PNG, JPG, WEBP)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Attached Files List & Previews */}
                  {attachedFiles.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold text-slate-700">
                          Attached ({attachedFiles.length} {attachedFiles.length === 1 ? "file" : "files"}):
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                        >
                          + Add More Files
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {attachedFiles.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition shadow-2xs group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {/* Thumbnail preview for images or icon for documents */}
                              {item.previewUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={item.previewUrl}
                                  alt={item.name}
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  {getFileIcon(item.type, item.name)}
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {formatFileSize(item.size)}
                                </p>
                              </div>
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
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
            </div>
          </div>

          {/* Section 3: Requirements (Activation, Media, Logistic) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                3. Requirements Needed
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">
                Select all that apply <span className="text-rose-500">*</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Indicate the type of marketing support required for this event:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {REQUIREMENT_OPTIONS.map((req) => {
                const isSelected = selectedRequirements.includes(req.id)
                const IconComponent = req.icon
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => toggleRequirement(req.id)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${req.activeBorder} shadow-sm ring-2 ring-indigo-500/20`
                        : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${req.color} text-white shadow-xs`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <h3 className={`text-sm font-bold ${isSelected ? req.activeText : "text-slate-900"}`}>
                        {req.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {req.subtitle}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[10px] font-bold">
                      <span className={isSelected ? "text-indigo-600" : "text-slate-400"}>
                        {isSelected ? "Selected ✓" : "Click to select"}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Requisition...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Event Requisition</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2.5">
              By submitting, your request will be reviewed by the Marketing Department.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

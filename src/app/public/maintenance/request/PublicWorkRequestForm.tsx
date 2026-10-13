"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { publicCreateMaintenanceTicket, extractMaintenancePdfAction } from "@/app/actions/maintenance-ticket"
import { 
  Wrench, 
  Send, 
  Loader2, 
  AlertCircle, 
  Upload, 
  CheckCircle2, 
  MapPin, 
  Cog, 
  Building, 
  Zap, 
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Sparkles,
  Info,
  X,
  Plus
} from "lucide-react"
import Link from "next/link"

const LOCATIONS = [
  "Kilang Air Rantau (KAR)",
  "Kilang Botol Pedas (KBP) Block A",
  "Kilang Botol Pedas (KBP) Block B",
  "Kilang Botol Pedas (KBP) Block C",
  "Kilang Botol Pedas (KBP) Block D",
  "Other / Luar Kawasan",
]

async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg"
            const compressed = new File([blob], cleanName, { type: "image/jpeg" })
            resolve(compressed)
          },
          "image/jpeg",
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

export function PublicWorkRequestForm() {
  const searchParams = useSearchParams()
  const prefilledLocation = searchParams?.get("location") || ""

  const [activeTab, setActiveTab] = useState<"MANUAL" | "PDF">("MANUAL")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [pdfExtractionWarnings, setPdfExtractionWarnings] = useState<string[]>([])
  const [error, setError] = useState("")
  const [ticketResult, setTicketResult] = useState<{
    ticketId: string
    ticketNumber: number
    logNumber: string
    token: string
  } | null>(null)

  // Form field state (can be auto-filled by PDF or entered manually)
  const [ticketType, setTicketType] = useState<string>("MECHANICAL")
  const [priority, setPriority] = useState<string>("MEDIUM")
  const [title, setTitle] = useState("")
  const [reasonOfWork, setReasonOfWork] = useState("")
  const [specificArea, setSpecificArea] = useState("")
  const [requesterName, setRequesterName] = useState("")
  const [requesterPhone, setRequesterPhone] = useState("")
  const [requesterEmail, setRequesterEmail] = useState("")
  const [location, setLocation] = useState<string>(
    prefilledLocation && LOCATIONS.includes(prefilledLocation)
      ? prefilledLocation
      : (prefilledLocation ? "Other / Luar Kawasan" : "Kilang Air Rantau (KAR)")
  )
  const [customLocation, setCustomLocation] = useState<string>(
    prefilledLocation && !LOCATIONS.includes(prefilledLocation) ? prefilledLocation : ""
  )
  const [copied, setCopied] = useState(false)
  const [photoItems, setPhotoItems] = useState<{ file: File; previewUrl: string }[]>([])
  const [isCompressingImage, setIsCompressingImage] = useState(false)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsCompressingImage(true)
    const validNewItems: { file: File; previewUrl: string }[] = []
    let hasExceededSize = false

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        hasExceededSize = true
        continue
      }
      try {
        const processed = await compressImageFile(file)
        validNewItems.push({
          file: processed,
          previewUrl: URL.createObjectURL(processed),
        })
      } catch (err) {
        console.warn("Image optimization error, using original file:", err)
        validNewItems.push({
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
    }

    setIsCompressingImage(false)

    if (hasExceededSize) {
      setError("Some photos exceed the 10MB limit and were skipped.")
    } else {
      setError("")
    }

    setPhotoItems((prev) => [...prev, ...validNewItems].slice(0, 10))
    e.target.value = ""
  }

  const handleRemovePhoto = (index: number) => {
    setPhotoItems((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Handle PDF upload and AI extraction
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setError("Please select a valid PDF document.")
      return
    }

    setIsExtractingPdf(true)
    setError("")
    setPdfExtractionWarnings([])

    const formData = new FormData()
    formData.set("pdfFile", file)

    const res = await extractMaintenancePdfAction(formData)
    setIsExtractingPdf(false)

    if (res.success && res.data) {
      const d = res.data
      setTitle(d.title || "")
      setReasonOfWork(d.reasonOfWork || "")
      setTicketType(d.ticketType || "MECHANICAL")
      setPriority(d.priority || "MEDIUM")
      setSpecificArea(d.specificArea || "")
      if (d.requesterName && d.requesterName !== "Operator") setRequesterName(d.requesterName)
      if (d.requesterPhone && d.requesterPhone !== "-") setRequesterPhone(d.requesterPhone)
      if (d.requesterEmail) setRequesterEmail(d.requesterEmail)

      if (LOCATIONS.includes(d.location)) {
        setLocation(d.location)
      } else if (d.location) {
        setLocation("Other / Luar Kawasan")
        setCustomLocation(d.location)
      }

      setPdfExtractionWarnings(d.warnings || [])
      setActiveTab("MANUAL") // Switch back to manual form to review extracted fields
    } else {
      setError(res.error || "Failed to extract data from PDF. You can still fill the form manually.")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    if (!location) {
      setError("Please choose a plant location.")
      setIsSubmitting(false)
      return
    }

    if (!title.trim()) {
      setError("Please enter a work description.")
      setIsSubmitting(false)
      return
    }

    if (!requesterName.trim() || !requesterPhone.trim()) {
      setError("Please provide your name and phone number so the engineering team can reach you.")
      setIsSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.set("title", title.trim())
    formData.set("reasonOfWork", reasonOfWork.trim())
    formData.set("ticketType", ticketType)
    formData.set("priority", priority)
    formData.set("specificArea", specificArea.trim())
    formData.set("requesterName", requesterName.trim())
    formData.set("requesterPhone", requesterPhone.trim())
    if (requesterEmail.trim()) formData.set("requesterEmail", requesterEmail.trim())

    const finalLocation = location === "Other / Luar Kawasan" && customLocation.trim()
      ? customLocation.trim()
      : location
    formData.set("location", finalLocation)

    photoItems.forEach((item) => {
      formData.append("photos", item.file)
    })
    if (photoItems.length > 0) {
      formData.set("photo", photoItems[0].file)
    }

    const res = await publicCreateMaintenanceTicket(formData)
    setIsSubmitting(false)

    if (res.success && res.ticketId) {
      setTicketResult({
        ticketId: res.ticketId,
        ticketNumber: res.ticketNumber || 0,
        logNumber: res.logNumber || "BO2-MT-XXXX",
        token: res.requesterToken || "",
      })
    } else {
      setError(res.error || "Failed to submit work request.")
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
  }

  const copyTrackingLink = () => {
    if (!ticketResult) return
    const url = `${window.location.origin}/public/maintenance/track/${ticketResult.ticketId}?token=${ticketResult.token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Submission Receipt Card
  if (ticketResult) {
    const trackUrl = `/public/maintenance/track/${ticketResult.ticketId}?token=${ticketResult.token}`
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-lg mx-auto animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-center text-white">
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-black">Request Submitted!</h1>
          <p className="text-emerald-100 text-xs mt-1">
            BubblesO2 Engineering &amp; Maintenance Team has received your request.
          </p>
          <div className="mt-4 inline-block bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-mono font-bold">
            Ref: {ticketResult.logNumber}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Your request has been logged under SOP BOSB-FMS-850-001 (QR01). Use this private tracking link to check live technician assignment, progress updates, and verify completion:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}${trackUrl}` : trackUrl}
                className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono outline-none"
              />
              <button
                type="button"
                onClick={copyTrackingLink}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={trackUrl}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Track Ticket Status Now</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => {
                setTicketResult(null)
                setPhotoItems([])
                setTitle("")
                setReasonOfWork("")
                setSpecificArea("")
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-xl mx-auto">
      {/* Brand Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white uppercase">BubblesO2</h2>
              <p className="text-[10px] text-blue-300 font-bold tracking-widest uppercase">Plant Maintenance</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
            SOP QR01
          </span>
        </div>

        <div className="mt-6">
          <h1 className="text-xl sm:text-2xl font-black">Maintenance Work Request</h1>
          <p className="text-xs text-slate-400 mt-1">
            Submit machine breakdowns, repairs, or facility requests directly to engineering.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-6 flex bg-white/10 p-1 rounded-xl backdrop-blur-sm border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("MANUAL")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "MANUAL"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Quick Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PDF")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "PDF"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Scan PDF / Memo (AI)</span>
          </button>
        </div>
      </div>

      {/* PDF Upload Mode Banner */}
      {activeTab === "PDF" && (
        <div className="p-6 sm:p-8 bg-blue-50/50 border-b border-blue-100">
          <div className="text-center max-w-sm mx-auto space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              {isExtractingPdf ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Work Order or Breakdown Memo</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Our Gemini AI engine will analyze your PDF document and pre-fill all maintenance fields automatically.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all">
              <Upload className="h-4 w-4" />
              <span>{isExtractingPdf ? "Analyzing Document..." : "Choose PDF Document"}</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={isExtractingPdf}
                onChange={handlePdfUpload}
              />
            </label>
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {pdfExtractionWarnings.length > 0 && (
          <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <span>AI Extraction Notes (Please review):</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-700">
              {pdfExtractionWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Category of Issue */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Category of Issue <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "MECHANICAL", label: "Mechanical", icon: Cog, desc: "Machine, motor, pump, conveyor" },
              { id: "CIVIL", label: "Civil & Facility", icon: Building, desc: "Roof, floor, wall, toilet, piping" },
              { id: "ELECTRICAL", label: "Electrical", icon: Zap, desc: "Power, wiring, plug, light, trip" },
              { id: "OTHERS", label: "Others", icon: HelpCircle, desc: "General safety & facility" },
            ].map((cat) => {
              const Icon = cat.icon
              const isSelected = ticketType === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTicketType(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                  <p className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{cat.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Work Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Work Description / Machine Issue <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chiller pump 2 leaking, conveyor belt misaligned"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-800"
          />
        </div>

        {/* Reason / Breakdown Symptoms */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Symptoms &amp; Observations <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={reasonOfWork}
            onChange={(e) => setReasonOfWork(e.target.value)}
            placeholder="Describe abnormal sounds, water leakage, error codes, or safety risks..."
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
          />
        </div>

        {/* Location & Machine Specific Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Plant Location <span className="text-red-500">*</span>
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 font-medium"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {location === "Other / Luar Kawasan" && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Specify exact location"
                className="mt-2 w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Specific Area / Line / Asset
            </label>
            <input
              type="text"
              value={specificArea}
              onChange={(e) => setSpecificArea(e.target.value)}
              placeholder="e.g. Rotary BM3, Line 1, Compressor Room"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Urgency / Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "LOW", label: "Low", target: "14 Days" },
              { id: "MEDIUM", label: "Medium", target: "7 Days" },
              { id: "HIGH", label: "High", target: "3 Days" },
              { id: "URGENT", label: "Urgent", target: "< 24 Hours" },
            ].map((p) => {
              const isSelected = priority === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={`py-2 px-2 rounded-xl border text-center transition-all ${
                    isSelected
                      ? p.id === "URGENT"
                        ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20 font-bold"
                        : p.id === "HIGH"
                        ? "bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20 font-bold"
                        : "bg-blue-50 border-blue-600 text-blue-700 ring-2 ring-blue-500/20 font-bold"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs">{p.label}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{p.target}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Site/Item Photos Upload */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Site/Item Photos <span className="text-slate-400 text-[10px] font-normal">(Optional, Max 10MB each)</span>
            </label>
            {photoItems.length > 0 && (
              <span className="text-xs font-bold text-blue-600">
                {photoItems.length} {photoItems.length === 1 ? "photo" : "photos"} selected
              </span>
            )}
          </div>

          {photoItems.length === 0 ? (
            <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 text-center group">
              <div className="h-10 w-10 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors mb-2">
                <Upload className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                {isCompressingImage ? "Optimizing Photos..." : "Take or upload photo(s)"}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Select single or multiple photos (JPEG, PNG, WebP)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={isCompressingImage}
                onChange={handleImageChange}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {photoItems.map((item, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                    <img
                      src={item.previewUrl}
                      alt={`Damage preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/75 hover:bg-red-600 text-white transition-colors shadow-md"
                      title="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white bg-slate-900/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      #{idx + 1}
                    </div>
                  </div>
                ))}

                {photoItems.length < 10 && (
                  <label className="aspect-square border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 text-center p-2 group">
                    <Plus className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors mb-0.5" />
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Add More</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={isCompressingImage}
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Requester Contact Info */}
        <div className="pt-2 border-t border-slate-100 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Requester Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="e.g. Azlan / Operator Line 2"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="e.g. 012-3456789"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Email Address <span className="text-slate-400 text-[10px] font-normal">(Optional, for status updates)</span>
            </label>
            <input
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              placeholder="e.g. yourname@bubbleso2.com"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Logging Work Request...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Submit Work Request</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

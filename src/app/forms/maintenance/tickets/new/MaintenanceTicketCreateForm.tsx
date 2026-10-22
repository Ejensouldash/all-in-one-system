"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createMaintenanceTicket, extractMaintenancePdfAction } from "@/app/actions/maintenance-ticket"
import { 
  Wrench, 
  Send, 
  Loader2, 
  AlertCircle, 
  Upload, 
  CheckCircle2, 
  ArrowLeft,
  Cog,
  Building,
  Zap,
  Sparkles,
  FileText,
  Info,
  HelpCircle,
  X,
  Plus,
  ImageIcon,
  Camera,
  Paperclip,
  Trash2,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

/**
 * Automatically compress photos on mobile before upload to prevent network timeouts
 * and payload rejection, converting high-res smartphone camera files into crisp JPEG images.
 */
async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return file
  }
  if (file.size < 400 * 1024 && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
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

const LOCATIONS = [
  "Kilang Air Rantau (KAR)",
  "Kilang Botol Pedas (KBP) Block A",
  "Kilang Botol Pedas (KBP) Block B",
  "Kilang Botol Pedas (KBP) Block C",
  "Kilang Botol Pedas (KBP) Block D",
  "Other / Luar Kawasan",
]

interface PhotoItem {
  file: File
  previewUrl: string
}

interface AttachedPdf {
  url?: string
  name: string
  size: number
  file?: File
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MaintenanceTicketCreateForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string
  defaultEmail?: string
}) {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<"MANUAL" | "PDF">("MANUAL")
  const [attachedPdf, setAttachedPdf] = useState<AttachedPdf | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [isCompressingImage, setIsCompressingImage] = useState(false)
  const [pdfExtractionWarnings, setPdfExtractionWarnings] = useState<string[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Fields state
  const [ticketType, setTicketType] = useState<string>("MECHANICAL")
  const [priority, setPriority] = useState<string>("MEDIUM")
  const [title, setTitle] = useState("")
  const [reasonOfWork, setReasonOfWork] = useState("")
  const [specificArea, setSpecificArea] = useState("")
  const [requesterName, setRequesterName] = useState(defaultName)
  const [requesterPhone, setRequesterPhone] = useState("")
  const [requesterEmail, setRequesterEmail] = useState(defaultEmail)
  const [location, setLocation] = useState<string>(LOCATIONS[0])
  const [customLocation, setCustomLocation] = useState<string>("")
  
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || [])
    if (rawFiles.length === 0) return

    setIsCompressingImage(true)
    setError("")

    try {
      const validNewItems: PhotoItem[] = []
      let hasExceededSize = false

      for (const rawFile of rawFiles) {
        const compressedFile = await compressImageFile(rawFile)
        if (compressedFile.size > 10 * 1024 * 1024) {
          hasExceededSize = true
          continue
        }
        validNewItems.push({
          file: compressedFile,
          previewUrl: URL.createObjectURL(compressedFile),
        })
      }

      if (hasExceededSize) {
        setError("Some photos exceed the 10MB limit and were skipped.")
      }

      setPhotoItems((prev) => [...prev, ...validNewItems].slice(0, 10))
    } catch (err: any) {
      console.error("handleImageChange error:", err)
      setError("Failed to process images. Please try again.")
    } finally {
      setIsCompressingImage(false)
      e.target.value = ""
    }
  }

  const handleRemovePhoto = (index: number) => {
    setPhotoItems((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

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

      // Save uploaded PDF as attachment
      setAttachedPdf({
        url: res.pdfUrl,
        name: res.pdfName || file.name,
        size: res.pdfSize || file.size,
        file,
      })

      setPdfExtractionWarnings(d.warnings || [])
      setActiveTab("MANUAL")
    } else {
      setError(res.error || "Failed to extract PDF data.")
    }
  }

  const handleDirectPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setError("Please select a valid PDF document.")
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("PDF document exceeds 15MB limit.")
      return
    }

    setAttachedPdf({
      name: file.name,
      size: file.size,
      file,
    })
    e.target.value = ""
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    const formData = new FormData()
    formData.set("title", title.trim())
    formData.set("reasonOfWork", reasonOfWork.trim())
    formData.set("ticketType", ticketType)
    formData.set("priority", priority)
    formData.set("specificArea", specificArea.trim())
    formData.set("requesterName", requesterName.trim())
    formData.set("requesterPhone", requesterPhone.trim())
    if (requesterEmail.trim()) formData.set("requesterEmail", requesterEmail.trim())

    const finalLoc = location === "Other / Luar Kawasan" && customLocation.trim()
      ? customLocation.trim()
      : location
    formData.set("location", finalLoc)

    photoItems.forEach((item) => {
      formData.append("photos", item.file)
    })
    if (photoItems.length > 0) {
      formData.set("photo", photoItems[0].file)
    }

    // Attach PDF if uploaded
    if (attachedPdf?.url) {
      formData.set("requestPdfUrl", attachedPdf.url)
    }
    if (attachedPdf?.name) {
      formData.set("requestPdfName", attachedPdf.name)
    }
    if (attachedPdf?.file && !attachedPdf.url) {
      formData.set("pdfFile", attachedPdf.file)
    }

    const res = await createMaintenanceTicket(formData)
    setIsSubmitting(false)

    if (res.success) {
      setSuccess(`Work request submitted successfully! Ref: ${res.logNumber}`)
      setTimeout(() => {
        router.push("/forms/maintenance/tickets")
        router.refresh()
      }, 1200)
    } else {
      setError(res.error || "Failed to submit work request.")
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link 
          href="/forms/maintenance/tickets"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to FMS Work Request
        </Link>

        {/* Tab switch */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("MANUAL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "MANUAL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Standard Form</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PDF")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "PDF"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Scan PDF / Memo (AI)</span>
          </button>
        </div>
      </div>

      {activeTab === "PDF" && (
        <div className="p-8 bg-blue-50/60 border border-blue-200 rounded-3xl text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            {isExtractingPdf ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileText className="h-6 w-6" />}
          </div>
          <h3 className="text-sm font-bold text-slate-900">Upload Work Order or Breakdown Memo</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our Gemini AI will scan the document, pre-fill all form fields, and automatically attach the PDF to this work request.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all">
            <Upload className="h-4 w-4" />
            <span>{isExtractingPdf ? "Analyzing Document & Attaching PDF..." : "Choose PDF Document"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={isExtractingPdf}
              onChange={handlePdfUpload}
            />
          </label>
        </div>
      )}

      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6"
      >
        <div>
          <h1 className="text-xl font-black text-slate-900">New FMS Work Request</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log equipment breakdown or repair request into BubblesO2 facilities ledger (SOP BOSB-FMS-850-001 / QR01).
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {pdfExtractionWarnings.length > 0 && (
          <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Extracted by Gemini AI - Please verify details below:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-700">
              {pdfExtractionWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Category of Issue <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "MECHANICAL", label: "Mechanical", icon: Cog },
              { id: "CIVIL", label: "Civil & Facility", icon: Building },
              { id: "ELECTRICAL", label: "Electrical", icon: Zap },
              { id: "OTHERS", label: "Others", icon: HelpCircle },
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
            placeholder="e.g. Pump 2 leaking, conveyor motor vibrating"
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium text-slate-800"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Symptoms &amp; Observations <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={reasonOfWork}
            onChange={(e) => setReasonOfWork(e.target.value)}
            placeholder="Describe symptoms, error codes, water leaks, or safety risks..."
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800"
          />
        </div>

        {/* Location & Specific Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Plant Location <span className="text-red-500">*</span>
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
                placeholder="Specify location"
                className="mt-2 w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
              placeholder="e.g. Blow Moulder BM3, Changing Room"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Urgency / Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "LOW", label: "Low", target: "7 Days" },
              { id: "MEDIUM", label: "Medium", target: "5 Days" },
              { id: "HIGH", label: "High", target: "3 Days" },
              { id: "URGENT", label: "Urgent", target: "1 Day" },
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

        {/* Attached Document / PDF Memo */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Attached Document / Work Order Memo <span className="text-slate-400 text-[10px] font-normal">(PDF, Max 15MB)</span>
            </label>
            {attachedPdf && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> PDF Attached
              </span>
            )}
          </div>

          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleDirectPdfChange}
          />

          {attachedPdf ? (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {attachedPdf.name}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    {attachedPdf.size > 0 && <span>{formatFileSize(attachedPdf.size)}</span>}
                    {attachedPdf.size > 0 && <span>•</span>}
                    <span className="text-blue-700 font-semibold">Saved as work request attachment</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(attachedPdf.url || attachedPdf.file) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (attachedPdf.url) {
                        window.open(attachedPdf.url, "_blank")
                      } else if (attachedPdf.file) {
                        const blobUrl = URL.createObjectURL(attachedPdf.file)
                        window.open(blobUrl, "_blank")
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    <span>Preview</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttachedPdf(null)}
                  className="p-1.5 text-xs font-bold rounded-xl bg-white border border-slate-300 hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors shadow-xs"
                  title="Remove PDF attachment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => pdfInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600 text-slate-500 flex items-center justify-center transition-colors">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 group-hover:text-blue-800 transition-colors">
                    Upload PDF memo or work order
                  </p>
                  <p className="text-[10px] text-slate-400">
                    PDF will be saved as an official attachment with this work request
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 group-hover:underline px-2">
                + Choose PDF
              </span>
            </div>
          )}
        </div>

        {/* Site/Item Photos */}
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

          {/* Hidden inputs: One strictly for live camera, one for multi-file gallery selection */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={isCompressingImage}
            onChange={handleImageChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isCompressingImage}
            onChange={handleImageChange}
          />

          {isCompressingImage && (
            <div className="p-3 mb-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Memproses & memampatkan imej kamera...</span>
            </div>
          )}

          {photoItems.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: Live Mobile Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressingImage}
                className="border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-blue-50/40 hover:bg-blue-100/60 text-center group active:scale-[0.98]"
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-blue-600 transition-colors mb-2 shadow-sm">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Buka Kamera (Snap Foto)
                </span>
                <span className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Terus buka kamera telefon untuk tangkap foto kerosakan di tapak
                </span>
              </button>

              {/* Button 2: Choose from Gallery (Multiple) */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isCompressingImage}
                className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/70 hover:bg-slate-100 text-center group active:scale-[0.98]"
              >
                <div className="h-12 w-12 rounded-full bg-slate-100 group-hover:bg-slate-700 group-hover:text-white flex items-center justify-center text-slate-600 transition-colors mb-2 shadow-sm">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                  Pilih Dari Galeri
                </span>
                <span className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                  Pilih berbilang gambar (multiple photos) dari album / storan peranti
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {photoItems.map((item, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                    <img
                      src={item.previewUrl}
                      alt={`Site/Item Photos Preview ${idx + 1}`}
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
                  <>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isCompressingImage}
                      className="aspect-square border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-blue-50/40 hover:bg-blue-100/50 text-center p-2 group"
                    >
                      <Camera className="h-5 w-5 text-blue-600 mb-0.5" />
                      <span className="text-[10px] font-bold text-blue-700">Snap Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isCompressingImage}
                      className="aspect-square border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/70 hover:bg-slate-100 text-center p-2 group"
                    >
                      <Plus className="h-5 w-5 text-slate-500 mb-0.5" />
                      <span className="text-[10px] font-bold text-slate-700">+ Galeri</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Requester Info */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Your Name</label>
            <input
              type="text"
              required
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
            <input
              type="tel"
              value={requesterPhone}
              onChange={(e) => setRequesterPhone(e.target.value)}
              placeholder="e.g. 012-3456789"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

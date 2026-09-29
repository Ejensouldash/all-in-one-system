"use client"

import { useState } from "react"
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
  HelpCircle
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

export function MaintenanceTicketCreateForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string
  defaultEmail?: string
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"MANUAL" | "PDF">("MANUAL")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
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
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size exceeds 10MB limit.")
        return
      }
      setSelectedPhotoFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError("")
    } else {
      setSelectedPhotoFile(null)
      setPreviewUrl(null)
    }
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

      setPdfExtractionWarnings(d.warnings || [])
      setActiveTab("MANUAL")
    } else {
      setError(res.error || "Failed to extract PDF data.")
    }
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

    if (selectedPhotoFile) {
      formData.set("photo", selectedPhotoFile)
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
            Our Gemini AI will scan the document and pre-fill all maintenance form fields for your review.
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm transition-all">
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

        {/* Damage Photo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Damage Photo <span className="text-slate-400 text-[10px] font-normal">(Optional, Max 10MB)</span>
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
              <Upload className="h-5 w-5 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-600">Select damage photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
            {previewUrl && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
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

"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { publicCreateMaintenanceTicket } from "@/app/actions/maintenance-ticket"
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
  ShieldCheck,
  Copy,
  Check
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

export function PublicWorkRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledLocation = searchParams?.get("location") || ""

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [ticketResult, setTicketResult] = useState<{
    ticketId: string
    ticketNumber: number
    logNumber: string
  } | null>(null)

  const [ticketType, setTicketType] = useState<string>("MECHANICAL")
  const [location, setLocation] = useState<string>(
    prefilledLocation && LOCATIONS.includes(prefilledLocation)
      ? prefilledLocation
      : (prefilledLocation ? "Other / Luar Kawasan" : "")
  )
  const [customLocation, setCustomLocation] = useState<string>(
    prefilledLocation && !LOCATIONS.includes(prefilledLocation) ? prefilledLocation : ""
  )
  const [copied, setCopied] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image size exceeds 10MB limit.")
        return
      }
      setPreviewUrl(URL.createObjectURL(file))
      setError("")
    } else {
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    if (!location) {
      setError("Sila pilih lokasi kilang / cawangan terlebih dahulu.")
      setIsSubmitting(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    if (location === "Other / Luar Kawasan" && customLocation.trim()) {
      formData.set("location", customLocation.trim())
    }

    const res = await publicCreateMaintenanceTicket(formData)
    setIsSubmitting(false)

    if (res.success && res.ticketId) {
      setTicketResult({
        ticketId: res.ticketId,
        ticketNumber: res.ticketNumber || 0,
        logNumber: res.logNumber || "BO2-MT-XXXX",
      })
    } else {
      setError(res.error || "Failed to submit work request.")
    }
  }

  const copyTrackingLink = () => {
    if (!ticketResult) return
    const url = `${window.location.origin}/public/maintenance/track/${ticketResult.ticketId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If submitted successfully, show the instant Receipt & Tracking Card
  if (ticketResult) {
    const trackUrl = `/public/maintenance/track/${ticketResult.ticketId}`
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-lg mx-auto animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-center text-white">
          <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-black">Request Submitted!</h1>
          <p className="text-emerald-100 text-xs mt-1">
            BubblesO2 Maintenance Team has received your request.
          </p>
          <div className="mt-4 inline-block bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-mono font-bold">
            Ref: {ticketResult.logNumber}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Your request has been logged into the system (SOP QR01). You can check live progress, technician assignment, and resolution using this link:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? `${window.location.origin}${trackUrl}` : trackUrl}
                className="flex-1 bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-mono outline-none"
              />
              <button
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
              onClick={() => {
                setTicketResult(null)
                setPreviewUrl(null)
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
            QR01 PORTAL
          </span>
        </div>

        <div className="mt-6">
          <h1 className="text-xl sm:text-2xl font-black">Work Request Form</h1>
          <p className="text-xs text-slate-400 mt-1">
            Scan &amp; Submit repair requests directly to the engineering team.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Category Choice */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Category of Issue <span className="text-red-500">*</span>
          </label>
          <input type="hidden" name="ticketType" value={ticketType} />
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "MECHANICAL", label: "Mechanical", icon: Cog, desc: "Machine, motor, pump, conveyor" },
              { id: "CIVIL", label: "Civil & Facility", icon: Building, desc: "Roof, floor, wall, toilet, piping" },
              { id: "ELECTRICAL", label: "Electrical", icon: Zap, desc: "Power, wiring, plug, light, charger" },
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
            Work Description / Issue <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Repair air conditioning leakage at Changing Room"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>

        {/* Reason of Work */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Reason / Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            name="reasonOfWork"
            required
            rows={2}
            placeholder="e.g. Water is dripping and causing slippery floor, high risk for GMP/OSH"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-medium"
          />
        </div>

        {/* Plant / Location */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Factory Location / Plant <span className="text-red-500">*</span>
            </label>
            <select
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            >
              <option value="" disabled>-- Sila Pilih Lokasi Kilang / Cawangan --</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            {location === "Other / Luar Kawasan" && (
              <input
                type="text"
                placeholder="Type specific factory location..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                required
                className="mt-2 w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Specific Area / Line (Optional)
            </label>
            <input
              type="text"
              name="specificArea"
              placeholder="e.g. Changing Room Block C, Guardhouse, BM3 machine"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Priority Level <span className="text-red-500">*</span>
          </label>
          <select
            name="priority"
            defaultValue="MEDIUM"
            required
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          >
            <option value="LOW">Low Priority (&gt;14 days target)</option>
            <option value="MEDIUM">Medium Priority (7 to 14 days target)</option>
            <option value="HIGH">High Priority (&lt;3 days target)</option>
            <option value="URGENT">Urgent Breakdown (&lt;24 hours target)</option>
          </select>
        </div>

        {/* Camera / Photo Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Take / Upload Photo (Direct to Cloudflare R2)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:border-blue-400 transition-colors">
            {previewUrl ? (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="max-h-44 mx-auto rounded-xl object-contain shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Remove &amp; retake photo
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block py-2">
                <Upload className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Tap to take photo or choose file
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 10MB</p>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Requester Contact */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Your Contact Info
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="requesterName"
                required
                placeholder="e.g. En Ridzuan"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="requesterPhone"
                required
                placeholder="e.g. 013-3500940"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Email Address (Optional — for status updates)
            </label>
            <input
              type="email"
              name="requesterEmail"
              placeholder="e.g. yourname@bubbleso2.com"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Work Request...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Request to Maintenance
            </>
          )}
        </button>
      </form>
    </div>
  )
}

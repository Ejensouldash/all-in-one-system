"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMaintenanceTicket } from "@/app/actions/maintenance-ticket"
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
  Image as ImageIcon
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [ticketType, setTicketType] = useState<string>("MECHANICAL")
  const [location, setLocation] = useState<string>(LOCATIONS[0])
  const [customLocation, setCustomLocation] = useState<string>("")
  
  // Image preview state
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
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    // Adjust custom location if selected
    if (location === "Other / Luar Kawasan" && customLocation.trim()) {
      formData.set("location", customLocation.trim())
    }

    const res = await createMaintenanceTicket(formData)
    setIsSubmitting(false)

    if (res.success) {
      setSuccess(`Work request submitted successfully! Ref: ${res.logNumber}`)
      setTimeout(() => {
        router.push("/forms/maintenance/tickets")
        router.refresh()
      }, 1500)
    } else {
      setError(res.error || "Failed to submit work request.")
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link 
          href="/forms/maintenance/tickets"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Work Requests
        </Link>
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6"
      >
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            New Maintenance Work Request (QR01)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit a request for Mechanical, Civil, or Electrical maintenance work.
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
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {success}
          </div>
        )}

        {/* Category Selector (Radio Cards) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Ticket Category <span className="text-red-500">*</span>
          </label>
          <input type="hidden" name="ticketType" value={ticketType} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: "MECHANICAL", label: "Mechanical", icon: Cog, desc: "Pumps, motors, conveyors, rotary" },
              { id: "CIVIL", label: "Civil & Facility", icon: Building, desc: "Roof, floor, wall, plumbing, doors" },
              { id: "ELECTRICAL", label: "Electrical", icon: Zap, desc: "Wiring, sockets, lighting, chargers" },
              { id: "OTHERS", label: "Others", icon: Wrench, desc: "General plant equipment & safety" },
            ].map((cat) => {
              const Icon = cat.icon
              const isSelected = ticketType === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setTicketType(cat.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                  <p className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-slate-800"}`}>
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{cat.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Work Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Work Description <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g. Repair leaking air conditioning unit in changing room"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>

        {/* Reason of Work */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Reason of Work / Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            name="reasonOfWork"
            required
            rows={3}
            placeholder="e.g. Leaking frequently and causes water droplets on the floor, posing a slipping hazard (OSH requirement)"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-medium"
          />
        </div>

        {/* Location & Specific Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Plant / Location <span className="text-red-500">*</span>
            </label>
            <select
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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
                placeholder="Specify exact location..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                required
                className="mt-2 w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Specific Area / Line (Optional)
            </label>
            <input
              type="text"
              name="specificArea"
              placeholder="e.g. Changing Room Block C, IMM1 Line"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Priority Level <span className="text-red-500">*</span>
          </label>
          <select
            name="priority"
            defaultValue="MEDIUM"
            required
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          >
            <option value="LOW">Low Priority (&gt;14 days target to complete)</option>
            <option value="MEDIUM">Medium Priority (7 to 14 days target to complete)</option>
            <option value="HIGH">High Priority (&lt;3 days target to complete)</option>
            <option value="URGENT">Urgent Priority (&lt;24 hours target to complete)</option>
          </select>
        </div>

        {/* Damage Photo Upload (Cloudflare R2) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
            Photo of Damage / Issue (Cloudflare R2)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors">
            {previewUrl ? (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Remove &amp; select another photo
                </button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-blue-600 hover:text-blue-700">
                  Upload photo from camera or gallery
                </span>
                <p className="text-[11px] text-slate-400 mt-1">PNG, JPG up to 10MB</p>
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
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Requester Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="requesterName"
                defaultValue={defaultName}
                required
                placeholder="e.g. En Akmal"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="requesterPhone"
                required
                placeholder="e.g. 019-6084816"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="requesterEmail"
                defaultValue={defaultEmail}
                placeholder="name@bubbleso2.com"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Work Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

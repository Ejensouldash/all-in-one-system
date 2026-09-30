"use client"

import { useState } from "react"
import { 
  technicianStartWork, 
  uploadTechnicianPhoto, 
  technicianSubmitWork 
} from "@/app/actions/maintenance-ticket"
import { 
  Play, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Camera, 
  Image as ImageIcon,
  Check,
  Send,
  Info
} from "lucide-react"

export function TechnicianWorkForm({
  ticket,
  contractorToken,
}: {
  ticket: any
  contractorToken?: string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const [started, setStarted] = useState(!!ticket.startedAt)
  const [photos, setPhotos] = useState<any[]>(ticket.photos || [])
  const [selectedCategory, setSelectedCategory] = useState<"BEFORE" | "PROGRESS" | "AFTER">("BEFORE")
  
  const [rootCause, setRootCause] = useState(ticket.rootCause || "")
  const [resolution, setResolution] = useState(ticket.resolution || "")

  const handleStartWork = async () => {
    setIsSubmitting(true)
    setStatusMsg(null)
    const res = await technicianStartWork(ticket.id, contractorToken)
    setIsSubmitting(false)
    if (res.success) {
      setStarted(true)
      setStatusMsg({ type: "success", text: "Work officially started! Timer is running." })
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to record start." })
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.set("photo", file)
    formData.set("caption", `${selectedCategory} photo`)

    const res = await uploadTechnicianPhoto(ticket.id, selectedCategory, formData, contractorToken)
    setIsUploadingPhoto(false)

    if (res.success && res.photo) {
      setPhotos([...photos, res.photo])
      setStatusMsg({ type: "success", text: `${selectedCategory} photo uploaded successfully!` })
      e.target.value = ""
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to upload photo." })
    }
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMsg(null)

    const formData = new FormData()
    formData.set("rootCause", rootCause)
    formData.set("resolution", resolution)

    const res = await technicianSubmitWork(ticket.id, formData, contractorToken)
    setIsSubmitting(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: "Repair completed! The requester and supervisor have been notified to verify the work.",
      })
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } else {
      setStatusMsg({ type: "error", text: res.error || "Failed to submit work." })
    }
  }

  const hasBefore = photos.some((p) => p.category === "BEFORE")
  const hasAfter = photos.some((p) => p.category === "AFTER")
  const isCompletedOrClosed = ticket.status === "AWAITING_VERIFICATION" || ticket.status === "AWAITING_COSTING" || ticket.status === "CLOSED"

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Completion Banner if already submitted */}
      {isCompletedOrClosed && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Work Submitted</h4>
            <p className="text-[11px] text-emerald-800">
              This task is currently under review / verification. Thank you for completing the repair!
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Start Work */}
      {!started && !isCompletedOrClosed && (
        <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">Ready to Begin Repair?</h3>
            <p className="text-xs text-blue-800 mt-0.5">
              Press Start Work to record on-site commencement timestamp for SLA tracking.
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleStartWork}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
            <span>Start Work Now</span>
          </button>
        </div>
      )}

      {/* Step 2: Evidence Photos (BEFORE & AFTER) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Photographic Evidence <span className="text-red-500">*</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload at least 1 BEFORE photo (before dismantling) and 1 AFTER photo (restored).
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className={`px-2 py-0.5 rounded ${hasBefore ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              Before: {hasBefore ? 'Done' : 'Missing'}
            </span>
            <span className={`px-2 py-0.5 rounded ${hasAfter ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              After: {hasAfter ? 'Done' : 'Missing'}
            </span>
          </div>
        </div>

        {/* Existing Uploaded Photos */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, idx) => (
              <div key={p.id || idx} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-1.5">
                <img src={p.fileUrl} alt={p.caption || "evidence"} className="w-full h-28 object-cover rounded-lg" />
                <div className="mt-1 flex items-center justify-between text-[10px] px-1 font-bold">
                  <span className={p.category === 'BEFORE' ? 'text-amber-700' : p.category === 'AFTER' ? 'text-emerald-700' : 'text-slate-600'}>
                    {p.category}
                  </span>
                  <span className="text-slate-400 font-normal">{p.uploadedByName || 'Technician'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Controls if not finished */}
        {!isCompletedOrClosed && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Photo Type:</span>
              {(["BEFORE", "AFTER", "PROGRESS"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
              {isUploadingPhoto ? (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-slate-400 mb-1" />
              )}
              <span className="text-xs font-bold text-slate-700">
                {isUploadingPhoto ? "Uploading to Cloudflare R2..." : `Take / Upload ${selectedCategory} Photo`}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 10MB</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={isUploadingPhoto}
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
        )}
      </div>

      {/* Step 3: Technical Resolution & Submission Form */}
      {!isCompletedOrClosed && (
        <form onSubmit={handleSubmitWork} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Root Cause Analysis <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="e.g. Bearing wear and tear, loose wiring connector, clogged filter"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Resolution &amp; Corrective Actions Carried Out <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe what was repaired, replaced parts, testing conducted, and current equipment condition..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
            />
          </div>

          {(!hasBefore || !hasAfter) && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Mandatory Photographic Evidence Required</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  You must upload at least one <strong>BEFORE</strong> photo and one <strong>AFTER</strong> photo to submit this work order.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !hasBefore || !hasAfter || !resolution.trim()}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting Completion...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Submit Work as Completed</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}

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
  Info,
  FileText,
  ExternalLink
} from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

/**
 * Automatically compress photos on mobile before upload to prevent network timeouts
 * and payload rejection, converting 15MB camera files into crisp ~500KB JPEG images.
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

export function TechnicianWorkForm({
  ticket,
  contractorToken,
}: {
  ticket: any
  contractorToken?: string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [uploadStatusText, setUploadStatusText] = useState("Uploading photo...")
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  
  const [started, setStarted] = useState(!!ticket.startedAt)
  const [photos, setPhotos] = useState<any[]>(ticket.photos || [])
  const [selectedCategory, setSelectedCategory] = useState<"BEFORE" | "PROGRESS" | "AFTER">("BEFORE")
  
  const [rootCause, setRootCause] = useState(ticket.rootCause || "")
  const [resolution, setResolution] = useState(ticket.resolution || "")
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(ticket.technicianSignature || null)

  const handleStartWork = async () => {
    setIsSubmitting(true)
    setStatusMsg(null)
    try {
      const res = await technicianStartWork(ticket.id, contractorToken)
      if (res.success) {
        setStarted(true)
        setStatusMsg({ type: "success", text: "Work officially started! Timer is running." })
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to record start." })
      }
    } catch (err: any) {
      console.error("handleStartWork error:", err)
      setStatusMsg({ type: "error", text: err?.message || "Failed to record start." })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0]
    if (!originalFile) return

    setIsUploadingPhoto(true)
    setUploadStatusText("Optimizing photo for mobile...")
    setStatusMsg(null)

    try {
      const file = await compressImageFile(originalFile, 1600, 0.82)
      setUploadStatusText("Uploading to Cloudflare R2...")

      const formData = new FormData()
      formData.set("photo", file)
      formData.set("caption", `${selectedCategory} photo`)

      const res = await uploadTechnicianPhoto(ticket.id, selectedCategory, formData, contractorToken)

      if (res.success && res.photo) {
        setPhotos((prev) => [...prev, res.photo])
        setStatusMsg({ type: "success", text: `${selectedCategory} photo uploaded successfully!` })
      } else {
        setStatusMsg({ type: "error", text: res.error || "Failed to upload photo." })
      }
    } catch (err: any) {
      console.error("handlePhotoUpload error:", err)
      setStatusMsg({
        type: "error",
        text: err?.message || "Failed to upload photo. Please check your network connection and try again.",
      })
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ""
    }
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setStatusMsg(null)

    try {
      const formData = new FormData()
      formData.set("rootCause", rootCause)
      formData.set("resolution", resolution)
      if (technicianSignature) formData.set("signature", technicianSignature)

      const res = await technicianSubmitWork(ticket.id, formData, contractorToken)

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
    } catch (err: any) {
      console.error("handleSubmitWork error:", err)
      setStatusMsg({ type: "error", text: err?.message || "Failed to submit work." })
    } finally {
      setIsSubmitting(false)
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

      {/* Attached Request Memo / PDF */}
      {ticket.requestPdfUrl && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Attached Work Request Memo
              </h4>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {ticket.requestPdfName || "Intake Work Request Memo.pdf"}
              </p>
            </div>
          </div>
          <a
            href={ticket.requestPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            <span>View PDF</span>
          </a>
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

            {isUploadingPhoto ? (
              <div className="border-2 border-blue-200 bg-blue-50/80 rounded-xl p-4 flex flex-col items-center justify-center gap-2 animate-pulse">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                <span className="text-xs font-bold text-blue-900">{uploadStatusText}</span>
                <span className="text-[10px] text-blue-600">Please wait while the photo is optimized and uploaded...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer bg-slate-50/70 hover:bg-blue-50/40 transition-all">
                    <Camera className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700">Take Photo (Camera)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={isUploadingPhoto}
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer bg-slate-50/70 hover:bg-blue-50/40 transition-all">
                    <ImageIcon className="h-4 w-4 text-slate-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700">Choose from Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPhoto}
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  Auto-compressed for mobile upload &bull; Supports direct camera or gallery selection
                </p>
              </div>
            )}
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

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Technician / Contractor Signature (Optional / Profil)
            </label>
            <SignaturePadClient
              onSave={setTechnicianSignature}
              label="Technician Signature"
              savedSignatureUrl={ticket.technicianSignature}
              autoLoadSaved={true}
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

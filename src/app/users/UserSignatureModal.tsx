"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import SignatureCanvas from "react-signature-canvas"
import { saveUserSignature, removeUserSignature } from "@/app/actions/user"
import { 
  FileSignature, 
  X, 
  Eraser, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Check, 
  Clock 
} from "lucide-react"

interface UserSignatureProps {
  user: {
    id: string
    name: string
    email: string
    signatureUrl?: string | null
    signatureUpdatedAt?: string | Date | null
  }
}

export function UserSignatureButton({ user }: UserSignatureProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all flex items-center gap-1.5 mr-2 ${
          user.signatureUrl
            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
        }`}
        title={user.signatureUrl ? "Urus Tandatangan Digital" : "Rekod Tandatangan Digital"}
      >
        <FileSignature className="w-3.5 h-3.5" />
        <span>{user.signatureUrl ? "Signed" : "Sign"}</span>
      </button>

      {isOpen && (
        <UserSignatureModal user={user} onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}

export function UserSignatureModal({ 
  user, 
  onClose 
}: { 
  user: UserSignatureProps["user"]
  onClose: () => void 
}) {
  const router = useRouter()
  const sigCanvas = useRef<SignatureCanvas>(null)
  
  const [isEmpty, setIsEmpty] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(user.signatureUrl || null)
  const [signatureDate, setSignatureDate] = useState<string | Date | null>(user.signatureUpdatedAt || null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleClear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
    setError("")
  }

  const handleCanvasEnd = () => {
    if (sigCanvas.current?.isEmpty()) {
      setIsEmpty(true)
    } else {
      setIsEmpty(false)
    }
  }

  const handleSave = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setError("Sila tandatangan di dalam ruang yang disediakan terlebih dahulu.")
      return
    }

    try {
      setIsSaving(true)
      setError("")
      setSuccess("")

      // Get trimmed transparent PNG data URL
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png")
      const res = await saveUserSignature(user.id, dataUrl)

      if (res.success && res.signatureUrl) {
        setCurrentSignatureUrl(res.signatureUrl)
        setSignatureDate(new Date())
        setSuccess("Tandatangan digital berjaya disimpan ke Cloudflare R2!")
        sigCanvas.current.clear()
        setIsEmpty(true)
        router.refresh()
      } else {
        setError(res.error || "Gagal menyimpan tandatangan.")
      }
    } catch (err: any) {
      setError(err.message || "Ralat tidak dijangka berlaku.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Adakah anda pasti ingin memadamkan tandatangan bagi ${user.name}?`)) {
      return
    }

    try {
      setIsDeleting(true)
      setError("")
      setSuccess("")

      const res = await removeUserSignature(user.id)
      if (res.success) {
        setCurrentSignatureUrl(null)
        setSignatureDate(null)
        setSuccess("Tandatangan telah berjaya dipadam.")
        router.refresh()
      } else {
        setError(res.error || "Gagal memadam tandatangan.")
      }
    } catch (err: any) {
      setError(err.message || "Ralat semasa memadam tandatangan.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/60 to-indigo-50/60 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-200">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Tandatangan Digital</h3>
              <p className="text-xs text-gray-500 font-medium">
                {user.name} ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-white hover:bg-gray-100 rounded-full p-2 transition-colors border border-gray-200 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Saved Signature */}
          {currentSignatureUrl ? (
            <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    <Check className="w-3 h-3 mr-1" /> Aktif
                  </span>
                  <span className="text-xs font-semibold text-gray-700">Tandatangan Profil Semasa</span>
                </div>
                {signatureDate && (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(signatureDate).toLocaleDateString("ms-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl border border-purple-200/80 p-4 flex items-center justify-center min-h-[100px] shadow-inner relative group">
                <img
                  src={currentSignatureUrl}
                  alt={`Tandatangan ${user.name}`}
                  className="max-h-24 max-w-full object-contain"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Padam Tandatangan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200/70 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>Staf ini belum mempunyai tandatangan tersimpan. Sila tandatangan di bawah untuk mendaftar.</span>
            </div>
          )}

          {/* Signature Canvas Pad */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                {currentSignatureUrl ? "Tukar / Rekod Tandatangan Baharu" : "Ruang Tandatangan Staf"}
              </label>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-red-600 font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-100"
              >
                <Eraser className="w-3 h-3" /> Bersihkan Pad
              </button>
            </div>

            <div className="w-full border-2 border-dashed border-gray-300 hover:border-purple-400 bg-white rounded-2xl overflow-hidden transition-all relative shadow-sm">
              {isEmpty && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 select-none">
                  <FileSignature className="w-8 h-8 opacity-20 mb-1" />
                  <span className="font-bold text-sm tracking-wide opacity-40 uppercase">
                    Staf Sila Tandatangan Di Sini
                  </span>
                  <span className="text-[11px] opacity-40">Gunakan Stylus / Touchscreen / Mouse</span>
                </div>
              )}
              <SignatureCanvas
                ref={sigCanvas}
                onEnd={handleCanvasEnd}
                penColor="black"
                backgroundColor="rgba(0,0,0,0)"
                canvasProps={{
                  className: "w-full h-36 sm:h-44 cursor-crosshair",
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Tutup
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isEmpty || isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke R2...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Tandatangan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

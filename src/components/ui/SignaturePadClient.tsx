"use client"

import { useRef, useState, useEffect } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Eraser, PenTool, CheckCircle2, RefreshCw } from "lucide-react"
import { getCurrentUserSignature } from "@/app/actions/user"

interface SignaturePadClientProps {
  onSave: (signatureValue: string | null) => void
  label?: string
  savedSignatureUrl?: string | null
  autoLoadSaved?: boolean
}

export function SignaturePadClient({
  onSave,
  label = "Signature",
  savedSignatureUrl,
  autoLoadSaved = true,
}: SignaturePadClientProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [savedUrl, setSavedUrl] = useState<string | null>(savedSignatureUrl || null)
  const [isUsingSaved, setIsUsingSaved] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Fetch current user's profile signature on mount if autoLoadSaved is enabled
  useEffect(() => {
    let isMounted = true

    async function loadSignature() {
      if (savedSignatureUrl) {
        setSavedUrl(savedSignatureUrl)
        if (autoLoadSaved) {
          setIsUsingSaved(true)
          onSave(savedSignatureUrl)
        }
        return
      }

      if (autoLoadSaved) {
        try {
          setIsLoadingProfile(true)
          const res = await getCurrentUserSignature()
          if (isMounted && res.success && res.data?.signatureUrl) {
            setSavedUrl(res.data.signatureUrl)
            setIsUsingSaved(true)
            onSave(res.data.signatureUrl)
          }
        } catch (err) {
          console.error("Failed to load user profile signature:", err)
        } finally {
          if (isMounted) setIsLoadingProfile(false)
        }
      }
    }

    loadSignature()

    return () => {
      isMounted = false
    }
  }, [savedSignatureUrl, autoLoadSaved])

  const handleUseSaved = () => {
    if (savedUrl) {
      setIsUsingSaved(true)
      onSave(savedUrl)
    }
  }

  const handleSwitchToManual = () => {
    setIsUsingSaved(false)
    sigCanvas.current?.clear()
    setIsEmpty(true)
    onSave(null)
  }

  const clear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
    onSave(null)
  }

  const handleEnd = () => {
    if (sigCanvas.current?.isEmpty()) {
      setIsEmpty(true)
      onSave(null)
    } else {
      setIsEmpty(false)
      // Save as transparent PNG
      onSave(sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png") || null)
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-black uppercase tracking-wider text-gray-700">
            {label}
          </label>
          {isUsingSaved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Profile
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {savedUrl && isUsingSaved && (
            <button
              type="button"
              onClick={handleSwitchToManual}
              className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <PenTool className="w-3 h-3" /> Draw Manually
            </button>
          )}

          {savedUrl && !isUsingSaved && (
            <button
              type="button"
              onClick={handleUseSaved}
              className="text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 cursor-pointer mr-2"
            >
              <CheckCircle2 className="w-3 h-3" /> Use Profile Signature
            </button>
          )}

          {!isUsingSaved && (
            <button
              type="button"
              onClick={clear}
              className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Eraser className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {isUsingSaved && savedUrl ? (
        <div className="w-full border-[3px] border-black bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col items-center justify-center min-h-[8rem] md:min-h-[10rem] transition-all relative">
          <img
            src={savedUrl}
            alt="Profile Signature"
            className="max-h-24 md:max-h-28 max-w-full object-contain pointer-events-none"
          />
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 font-medium tracking-tight">
            Verified Profile Signature
          </div>
        </div>
      ) : (
        <div className="w-full border-[3px] border-black bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-crosshair relative">
          {isEmpty && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span className="text-gray-300 font-black text-xl tracking-widest opacity-50 uppercase text-center px-4">
                Sign Here
              </span>
            </div>
          )}
          <SignatureCanvas
            ref={sigCanvas}
            onEnd={handleEnd}
            penColor="black"
            backgroundColor="rgba(0,0,0,0)"
            canvasProps={{ className: "w-full h-32 md:h-40" }}
          />
        </div>
      )}
    </div>
  )
}

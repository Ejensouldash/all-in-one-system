"use client"

import { useState } from "react"
import { CheckCircle2, X } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

export function GenericSignatureModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName, 
  role, 
  title,
  description,
  defaultSignatureUrl,
}: { 
  isOpen: boolean
  onClose: () => void
  onConfirm: (signature: string) => Promise<void>
  userName: string
  role: string
  title: string
  description?: string
  defaultSignatureUrl?: string | null
}) {
  const [signature, setSignature] = useState<string | null>(defaultSignatureUrl || null)
  const [useCustomPad, setUseCustomPad] = useState<boolean>(!defaultSignatureUrl)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (!signature) return
    setIsSubmitting(true)
    try {
      await onConfirm(signature)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-black p-6 w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-500 hover:text-black hover:bg-gray-100 p-1 rounded-sm disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-black uppercase mb-2 border-b-[3px] border-black pb-2">{title}</h2>
        <p className="text-sm font-bold text-gray-600 mb-6 uppercase tracking-wider">
          {description || "By signing below, you verify the accuracy of this document."}
        </p>

        {defaultSignatureUrl && !useCustomPad ? (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500">
                Tandatangan Berdaftar ({userName} - {role})
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseCustomPad(true)
                  setSignature(null)
                }}
                className="text-xs text-blue-600 font-bold underline hover:text-blue-800"
              >
                Lukis tandatangan lain
              </button>
            </div>
            <div className="h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={defaultSignatureUrl} alt="Saved signature" className="max-h-28 max-w-full object-contain" />
            </div>
          </div>
        ) : (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500">
                Signature ({role})
              </label>
              {defaultSignatureUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomPad(false)
                    setSignature(defaultSignatureUrl)
                  }}
                  className="text-xs text-blue-600 font-bold underline hover:text-blue-800"
                >
                  Gunakan tandatangan berdaftar
                </button>
              )}
            </div>
            <SignaturePadClient 
              onSave={setSignature} 
              label={userName}
            />
          </div>
        )}

        <div className="flex justify-end pt-4 border-t-2 border-gray-100">
          <button
            onClick={handleConfirm}
            disabled={!signature || isSubmitting}
            className="bg-emerald-600 text-white px-6 py-3 font-black uppercase tracking-wider border-2 border-emerald-800 hover:bg-emerald-700 transition-all shadow-[4px_4px_0px_0px_rgba(6,78,59,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] disabled:opacity-50 flex items-center cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {isSubmitting ? "Mengesahkan..." : "Confirm & Sign"}
          </button>
        </div>
      </div>
    </div>
  )
}

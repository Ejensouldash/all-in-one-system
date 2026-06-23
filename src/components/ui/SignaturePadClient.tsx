"use client"

import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Eraser } from "lucide-react"

interface SignaturePadClientProps {
  onSave: (base64String: string | null) => void;
  label?: string;
}

export function SignaturePadClient({ onSave, label = "Signature" }: SignaturePadClientProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

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
      onSave(sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') || null)
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full flex justify-between items-center mb-2">
        <label className="text-xs font-black uppercase tracking-wider text-gray-700">{label}</label>
        <button 
          type="button" 
          onClick={clear}
          className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center"
        >
          <Eraser className="w-3 h-3 mr-1" /> Clear
        </button>
      </div>
      <div className="w-full border-[3px] border-black bg-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-crosshair relative">
        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-gray-300 font-black text-xl tracking-widest opacity-50 uppercase text-center px-4">Sign Here</span>
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
    </div>
  )
}

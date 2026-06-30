"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { X, Loader2 } from "lucide-react"

export function QRScannerModal({ 
  isOpen, 
  onClose, 
  onScan 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onScan: (decodedText: string) => void 
}) {
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanned = useRef(false)
  
  useEffect(() => {
    if (!isOpen) {
      return
    }

    isScanned.current = false
    let isMounted = true

    const initScanner = async () => {
      setIsStarting(true)
      try {
        const html5QrCode = new Html5Qrcode("qr-reader")
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!isScanned.current) {
              isScanned.current = true
              // Just call onScan, the parent will close the modal and trigger cleanup
              onScan(decodedText)
            }
          },
          (errorMessage) => {
            // ignore continuous scanning errors
          }
        )
      } catch (err: any) {
        if (isMounted) {
          console.error("Camera start error", err)
          setError("Camera permission denied or camera not found. Please allow camera access in your browser settings.")
        }
      } finally {
        if (isMounted) setIsStarting(false)
      }
    }

    setTimeout(initScanner, 100)

    return () => {
      isMounted = false
      if (scannerRef.current) {
        const scanner = scannerRef.current
        scannerRef.current = null
        try {
          scanner.stop().then(() => {
            scanner.clear()
          }).catch(() => {
            try { scanner.clear() } catch (e) {}
          })
        } catch (e) {
          try { scanner.clear() } catch (e2) {}
        }
      }
    }
  }, [isOpen, onScan])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-black w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b-4 border-black">
          <h2 className="text-xl font-black uppercase tracking-tight">Scan QR</h2>
          <button 
            onClick={onClose}
            className="text-black hover:bg-gray-200 p-1 rounded-sm transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col items-center">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 font-bold text-sm mb-4 border-2 border-red-500 w-full">
              {error}
            </div>
          )}
          
          <div className="relative w-full aspect-square bg-gray-100 border-4 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
            {isStarting && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-black mb-2" />
                <span className="font-bold text-sm uppercase">Starting Camera...</span>
              </div>
            )}
            <div id="qr-reader" className="w-full h-full"></div>
          </div>
          
          <p className="text-center text-xs font-bold text-gray-500 mt-4 uppercase">
            Point camera at the batch QR tag
          </p>
        </div>
      </div>
    </div>
  )
}

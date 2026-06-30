"use client"

import { useEffect, useRef, useState } from "react"
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode"
import { X } from "lucide-react"

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  
  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
      return
    }

    const onScanSuccess = (decodedText: string) => {
      // Pause or stop scanning to prevent multiple scans rapidly
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
      onScan(decodedText)
    }

    const onScanFailure = (err: any) => {
      // ignore failures, they happen every frame it doesn't find a code
    }

    const initScanner = () => {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      )
      scannerRef.current.render(onScanSuccess, onScanFailure)
    }

    // Small delay to ensure the DOM node is ready
    setTimeout(initScanner, 100)

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [isOpen, onScan])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-4 border-black p-6 w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black hover:bg-gray-100 p-1 rounded-sm z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-black uppercase mb-4 border-b-[3px] border-black pb-2 pr-8">Scan QR Code</h2>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 font-bold text-sm mb-4 border-2 border-red-500">
            {error}
          </div>
        )}
        
        <div id="qr-reader" className="w-full bg-black/5 overflow-hidden border-2 border-dashed border-gray-300 min-h-[300px]">
          {/* Scanner injects UI here */}
        </div>
        
        <p className="text-center text-xs font-bold text-gray-500 mt-4 uppercase">
          Align the QR code within the frame to scan automatically.
        </p>
      </div>
    </div>
  )
}

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
            { 
              fps: 15, 
              qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
                const boxSize = Math.max(220, Math.floor(minEdge * 0.85))
                return { width: boxSize, height: boxSize }
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              if (!isScanned.current) {
                isScanned.current = true
                try {
                  html5QrCode.pause(true)
                } catch (e) {}
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
        <div className="bg-white border-4 border-black w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in fade-in zoom-in duration-200 rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b-4 border-black bg-yellow-400">
            <h2 className="text-xl font-black uppercase tracking-tight text-black">Scan Batch QR Code</h2>
            <button 
              onClick={onClose}
              className="text-black hover:bg-black/10 p-1.5 rounded-lg transition-colors border-2 border-black bg-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-4 sm:p-6 flex flex-col items-center">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 font-bold text-sm mb-4 border-2 border-red-500 w-full rounded">
                {error}
              </div>
            )}
            
            <div className="relative w-full aspect-square bg-black border-4 border-black flex items-center justify-center overflow-hidden rounded-xl shadow-inner">
              {isStarting && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-yellow-400 mb-3" />
                  <span className="font-black text-sm uppercase tracking-wider">Starting Camera...</span>
                </div>
              )}
              <div id="qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>
            </div>
            
            <p className="text-center text-xs font-black text-gray-700 mt-4 uppercase tracking-wider bg-gray-100 px-4 py-2 border-2 border-black rounded-lg w-full">
              Align camera over the batch QR tag
            </p>
          </div>
        </div>
      </div>
    )
  }

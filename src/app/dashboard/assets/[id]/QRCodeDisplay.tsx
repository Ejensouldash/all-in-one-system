"use client"

import { useState } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { Printer, QrCode } from "lucide-react"

interface QRCodeDisplayProps {
  assetId: string
  assetTag: string
}

export function QRCodeDisplay({ assetId, assetTag }: QRCodeDisplayProps) {
  const [showPrint, setShowPrint] = useState(false)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const qrValue = `${baseUrl}/dashboard/assets/${assetId}`

  const handlePrint = () => {
    setShowPrint(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setShowPrint(false), 500)
    }, 200)
  }

  return (
    <>
      {/* Print-only overlay */}
      {showPrint && (
        <>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              .qr-single-print, .qr-single-print * { visibility: visible !important; }
              .qr-single-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
              }
              @page { size: auto; margin: 5mm; }
            }
          `}</style>
          <div className="qr-single-print fixed inset-0 z-[9999] bg-white flex items-start justify-start p-4">
            <AssetQRSticker assetTag={assetTag} qrValue={qrValue} />
          </div>
        </>
      )}

      {/* Preview Card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-300">
            <QrCode className="w-4 h-4 text-teal-400" />
            QR Code Sticker
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 bg-teal-950/50 hover:bg-teal-900/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>
        <div className="flex justify-center">
          <div style={{ transform: "scale(0.85)", transformOrigin: "center" }}>
            <AssetQRSticker assetTag={assetTag} qrValue={qrValue} />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-2">
          Scan this QR code to view asset details
        </p>
      </div>
    </>
  )
}
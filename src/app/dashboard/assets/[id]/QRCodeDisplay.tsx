"use client"

import { useState } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { Printer, QrCode, Sparkles } from "lucide-react"

interface QRCodeDisplayProps {
  assetId: string
  assetTag: string
  assetName?: string
  serialNumber?: string | null
  departmentCode?: string | null
}

export function QRCodeDisplay({
  assetId,
  assetTag,
  assetName,
  serialNumber,
  departmentCode,
}: QRCodeDisplayProps) {
  const [showPrint, setShowPrint] = useState(false)
  const [sizeMode, setSizeMode] = useState<"40x20" | "70x30">("40x20")
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const qrValue = `${baseUrl}/public/asset/${assetId}`

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
          <style dangerouslySetInnerHTML={{
            __html: sizeMode === "40x20" ? `
              @media print {
                body * { visibility: hidden !important; }
                .qr-single-print, .qr-single-print * { visibility: visible !important; }
                .qr-single-print {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 40mm !important;
                  height: 20mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  background: #ffffff !important;
                }
                @page { 
                  size: 40mm 20mm; 
                  margin: 0mm; 
                }
              }
            ` : `
              @media print {
                body * { visibility: hidden !important; }
                .qr-single-print, .qr-single-print * { visibility: visible !important; }
                .qr-single-print {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  padding: 5mm !important;
                }
                @page { 
                  size: auto; 
                  margin: 5mm; 
                }
              }
            `
          }} />
          <div className="qr-single-print fixed inset-0 z-[9999] bg-white flex items-center justify-center">
            <AssetQRSticker
              assetTag={assetTag}
              assetName={assetName}
              departmentCode={departmentCode}
              serialNumber={serialNumber}
              qrValue={qrValue}
              size={sizeMode}
              theme={sizeMode === "40x20" ? "thermal" : "dark"}
              bleed={sizeMode === "70x30"}
            />
          </div>
        </>
      )}

      {/* Preview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <QrCode className="w-4 h-4 text-teal-400" />
            Asset Sticker
          </div>

          {/* Size Selector */}
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setSizeMode("40x20")}
              className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                sizeMode === "40x20"
                  ? "bg-teal-500 text-slate-950 font-black shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              40×20mm
            </button>
            <button
              type="button"
              onClick={() => setSizeMode("70x30")}
              className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                sizeMode === "70x30"
                  ? "bg-teal-500 text-slate-950 font-black shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              70×30mm
            </button>
          </div>
        </div>

        {/* Visual Sticker Preview */}
        <div className="flex justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <div style={{ transform: sizeMode === "40x20" ? "scale(1.35)" : "scale(0.9)", transformOrigin: "center" }}>
            <AssetQRSticker
              assetTag={assetTag}
              assetName={assetName}
              departmentCode={departmentCode}
              serialNumber={serialNumber}
              qrValue={qrValue}
              size={sizeMode}
              theme={sizeMode === "40x20" ? "thermal" : "dark"}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">
            {sizeMode === "40x20" ? "🏷️ Niimbot Thermal (1 sticker / page)" : "📄 Standard 70×30mm"}
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-black text-white bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Sticker
          </button>
        </div>
      </div>
    </>
  )
}

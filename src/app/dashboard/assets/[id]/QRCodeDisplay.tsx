"use client"

import { useState } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { downloadNiimbotPdf } from "@/lib/pdf/generateNiimbotPdf"
import { Printer, QrCode, Download, Loader2 } from "lucide-react"

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const qrValue = `${baseUrl}/public/asset/${assetId}`

  const handlePrint = () => {
    setShowPrint(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setShowPrint(false), 500)
    }, 200)
  }

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true)
      const el = document.getElementById(`single-sticker-${assetId}`)
      if (!el) {
        alert("Sila tunggu sebentar untuk sticker dimuatkan.")
        return
      }

      await downloadNiimbotPdf({
        elements: [el],
        filename: `sticker_${assetTag || assetId}_40x20mm.pdf`,
      })
    } catch (err) {
      console.error("PDF download error:", err)
      alert("Gagal memuat turun PDF.")
    } finally {
      setIsGeneratingPdf(false)
    }
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
                .asset-qr-sticker-40x20 {
                  width: 39mm !important;
                  height: 19mm !important;
                  max-width: 39mm !important;
                  max-height: 19mm !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                  box-sizing: border-box !important;
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
              id={`single-sticker-${assetId}`}
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

        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400">
            {sizeMode === "40x20" ? "🏷️ Niimbot 40×20mm" : "📄 Standard 70×30mm"}
          </span>

          <div className="flex items-center gap-2">
            {sizeMode === "40x20" && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 rounded-xl transition shadow-sm"
                title="Muat turun fail PDF 40x20mm untuk buka di Niimbot App"
              >
                {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download PDF
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-black text-white bg-teal-600 hover:bg-teal-500 px-3.5 py-2 rounded-xl transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

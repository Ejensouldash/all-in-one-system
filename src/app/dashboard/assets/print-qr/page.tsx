"use client"

import React, { useEffect, useState } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { downloadNiimbotPdf } from "@/lib/pdf/generateNiimbotPdf"
import { Loader2, Printer, ArrowLeft, Download, Info, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface Asset {
  id: string
  assetTag: string
  name: string
  brand?: string | null
  model?: string | null
  serialNumber?: string | null
  department?: { id: string; name: string; code?: string | null } | null
}

export default function PrintQRPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sizeMode, setSizeMode] = useState<"40x20" | "70x30">("40x20")
  const [printingSingleId, setPrintingSingleId] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfProgress, setPdfProgress] = useState("")

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const storedIds = sessionStorage.getItem("printQrIds")
        if (!storedIds) {
          setError("No assets selected for printing.")
          setLoading(false)
          return
        }

        const ids = JSON.parse(storedIds)
        if (!ids || ids.length === 0) {
          setError("No assets selected for printing.")
          setLoading(false)
          return
        }

        const res = await fetch("/api/assets/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        })

        if (!res.ok) throw new Error("Failed to fetch assets")

        const data = await res.json()
        setAssets(data)
      } catch (err: any) {
        setError(err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchAssets()
  }, [])

  // Direct 40x20mm PDF Download via jsPDF (No browser print dialog needed)
  const handleDownloadPdf = async (singleAsset?: Asset) => {
    try {
      setIsGeneratingPdf(true)
      const targetAssets = singleAsset ? [singleAsset] : assets
      const elementIds = targetAssets.map(a => `sticker-${a.id}`)
      const filename = singleAsset
        ? `sticker_${singleAsset.assetTag || singleAsset.id}_40x20mm.pdf`
        : `niimbot_stickers_${targetAssets.length}_assets_40x20mm.pdf`

      const elements: HTMLElement[] = []
      for (const id of elementIds) {
        const el = document.getElementById(id)
        if (el) elements.push(el)
      }

      if (elements.length === 0) {
        alert("Sila tunggu sebentar untuk pelekat selesai dimuatkan.")
        return
      }

      await downloadNiimbotPdf({
        elements,
        filename,
        onProgress: (current, total) => {
          setPdfProgress(`Menjana PDF: ${current}/${total}...`)
        },
      })
    } catch (err) {
      console.error("Failed to generate Niimbot PDF:", err)
      alert("Gagal menjana fail PDF. Sila cuba lagi.")
    } finally {
      setIsGeneratingPdf(false)
      setPdfProgress("")
    }
  }

  const handlePrintAll = () => {
    setPrintingSingleId(null)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const handlePrintSingle = (assetId: string) => {
    setPrintingSingleId(assetId)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrintingSingleId(null), 500)
    }, 150)
  }

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        <span className="text-sm font-semibold text-slate-500">Loading asset stickers...</span>
      </div>
    )
  }

  if (error || assets.length === 0) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <div className="text-red-600 font-bold text-lg">{error || "No assets selected."}</div>
        <p className="text-sm text-slate-500">Please go back to the Asset List and select stickers to print.</p>
        <Link
          href="/dashboard/assets/list"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Asset List
        </Link>
      </div>
    )
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "https://bubbleso2-aio.vercel.app")
  const activeAssets = printingSingleId ? assets.filter(a => a.id === printingSingleId) : assets

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900">
      {/* -------------------------------------------------------- */}
      {/* Dynamic Print Stylesheet                                 */}
      {/* -------------------------------------------------------- */}
      <style dangerouslySetInnerHTML={{
        __html: sizeMode === "40x20" ? `
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .print-container {
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 40mm !important;
            }
            .thermal-page-item {
              width: 40mm !important;
              height: 20mm !important;
              max-width: 40mm !important;
              max-height: 20mm !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            .thermal-page-item:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .asset-qr-sticker-40x20 {
              width: 39mm !important;
              height: 19mm !important;
              max-width: 39mm !important;
              max-height: 19mm !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            @page {
              size: 40mm 20mm;
              margin: 0 !important;
            }
          }
        ` : `
          @media print {
            body {
              background-color: white !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .print-container {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 6mm !important;
              justify-content: center !important;
              padding: 5mm !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `
      }} />

      {/* -------------------------------------------------------- */}
      {/* Top Header & Actions                                     */}
      {/* -------------------------------------------------------- */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/assets/list"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Print Asset Stickers
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  {assets.length} {assets.length === 1 ? "sticker" : "stickers"}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                {sizeMode === "40x20"
                  ? "Niimbot Thermal Roll (40×20mm) — Download PDF tepat atau Print terus"
                  : "Standard Sheet (70×30mm) — A4 multi-grid layout"}
              </p>
            </div>
          </div>

          {/* Mode Switcher + Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSizeMode("40x20")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sizeMode === "40x20"
                    ? "bg-white text-teal-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🏷️ Niimbot 40×20mm
              </button>
              <button
                type="button"
                onClick={() => setSizeMode("70x30")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sizeMode === "70x30"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📄 Standard A4
              </button>
            </div>

            {/* DIRECT DOWNLOAD PDF BUTTON (PRIMARY ACTION FOR NIIMBOT APP) */}
            {sizeMode === "40x20" && (
              <button
                onClick={() => handleDownloadPdf()}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl text-xs transition shadow-sm"
                title="Muat turun fail PDF rasmi bersaiz tepat 40x20mm untuk dibuka terus di aplikasi Niimbot"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isGeneratingPdf ? (pdfProgress || "Menjana...") : `Download PDF (${assets.length})`}
              </button>
            )}

            <button
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Browser Print ({assets.length})
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------- */}
      {/* Niimbot PDF Recommendation Notice                       */}
      {/* -------------------------------------------------------- */}
      {sizeMode === "40x20" && (
        <div className="no-print max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-emerald-900 text-sm">
                Syor Terbaik untuk Pengguna Niimbot App:
              </div>
              <p className="text-emerald-800">
                Gunakan butang hijau <strong>"Download PDF"</strong> di atas. Sistem kami telah mengira dimensi tepat <strong>40mm × 20mm</strong> (1 page = 1 sticker) ke dalam fail PDF berkualiti tinggi (384 DPI). Anda tidak perlu risau tentang margin browser yang lari atau terpotong!
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Setelah fail PDF dimuat turun, buka aplikasi Niimbot pada PC atau telefon anda, pilih <em>"Print by PDF"</em>, dan ia akan dicetak dengan saiz yang tepat pada gulungan sticker.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* Main Preview Container                                  */}
      {/* -------------------------------------------------------- */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="print-container">
          {activeAssets.map((asset, index) => {
            const qrUrl = `${baseUrl}/public/asset/${asset.id}`

            return (
              <div
                key={asset.id}
                className={sizeMode === "40x20" ? "thermal-page-item" : "sheet-page-item"}
                style={sizeMode === "40x20" ? {
                  margin: "0 0 16px 0",
                } : undefined}
              >
                {/* Screen Card Wrapper with Actions */}
                <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <span>{asset.name}</span>
                        {asset.department?.code && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded">
                            {asset.department.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono font-semibold">
                        Tag: {asset.assetTag} {asset.serialNumber ? `| S/N: ${asset.serialNumber}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Render Visual Preview */}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center">
                      <AssetQRSticker
                        id={`sticker-${asset.id}`}
                        assetTag={asset.assetTag}
                        assetName={asset.name}
                        departmentCode={asset.department?.code}
                        serialNumber={asset.serialNumber}
                        qrValue={qrUrl}
                        size={sizeMode}
                        theme={sizeMode === "40x20" ? "thermal" : "dark"}
                        bleed={sizeMode === "70x30"}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      {sizeMode === "40x20" && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(asset)}
                          disabled={isGeneratingPdf}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          title="Muat turun PDF untuk sticker ini sahaja (1 page 40x20mm)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF 1x
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePrintSingle(asset.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        title="Print browser dialog untuk sticker ini"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print 1x
                      </button>
                    </div>
                  </div>
                </div>

                {/* Print Only Representation (Used when window.print() is called) */}
                <div className="hidden print:flex items-center justify-center w-[40mm] h-[20mm]">
                  <AssetQRSticker
                    assetTag={asset.assetTag}
                    assetName={asset.name}
                    departmentCode={asset.department?.code}
                    serialNumber={asset.serialNumber}
                    qrValue={qrUrl}
                    size={sizeMode}
                    theme={sizeMode === "40x20" ? "thermal" : "dark"}
                    bleed={sizeMode === "70x30"}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

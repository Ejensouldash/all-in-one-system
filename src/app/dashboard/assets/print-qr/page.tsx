"use client"

import React, { useEffect, useState } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { Loader2, Printer, ArrowLeft, Settings2, CheckCircle2, Info } from "lucide-react"
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
            @page {
              size: 40mm 20mm;
              margin: 0mm;
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
              justifyContent: center !important;
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
      {/* Top Header & Print Controls (Screen Only)               */}
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
                  ? "Niimbot Thermal Roll (40×20mm) — 1 label per page"
                  : "Standard Sheet (70×30mm) — A4 multi-grid layout"}
              </p>
            </div>
          </div>

          {/* Mode Switcher + Action Button */}
          <div className="flex items-center gap-3 flex-wrap">
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
                🏷️ Niimbot 40×20mm (1/page)
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
                📄 Standard A4 (70×30mm)
              </button>
            </div>

            <button
              onClick={handlePrintAll}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print All ({assets.length})
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------- */}
      {/* Niimbot Setup Helper Banner (Screen Only)                */}
      {/* -------------------------------------------------------- */}
      {sizeMode === "40x20" && (
        <div className="no-print max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-950 flex items-start gap-3">
            <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-teal-900">
                Panduan Cetak Thermal Niimbot (40mm × 20mm):
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-teal-800">
                <li>
                  <strong>Satu per satu:</strong> Anda boleh cetak sticker individu dengan klik butang{" "}
                  <span className="font-bold underline">"Cetak 1 Sticker Ini"</span> di bawah setiap pelekat.
                </li>
                <li>
                  <strong>Cetak Berkumpulan (Batch):</strong> Butang{" "}
                  <span className="font-bold underline">"Print All ({assets.length})"</span> akan menghantar setiap pelekat sebagai 1 muka surat berasingan (1 page = 1 sticker) secara automatik untuk gulungan thermal anda.
                </li>
                <li>
                  <strong>Tetapan Browser Print:</strong> Pastikan pilih Destination: <em>Niimbot Printer</em>, Paper Size: <em>40×20mm</em>, Margins: <em>None (0mm)</em>, Scale: <em>100% / Actual Size</em>.
                </li>
              </ul>
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
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-50 rounded-xl border border-dashed border-slate-300">
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

                    <button
                      type="button"
                      onClick={() => handlePrintSingle(asset.id)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
                      title="Cetak sticker ini sahaja (1 label)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak 1x
                    </button>
                  </div>
                </div>

                {/* Print Only Representation (Active when window.print() is called) */}
                <div className="hidden print:block">
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

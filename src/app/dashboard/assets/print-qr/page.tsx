"use client"

import React, { useEffect, useState } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import PrintButton from "./PrintButton"
import { Loader2 } from "lucide-react"

export default function PrintQRPage() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const storedIds = sessionStorage.getItem('printQrIds')
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

        const res = await fetch('/api/assets/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
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

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
  }

  if (error || assets.length === 0) {
    return <div className="p-10 text-center font-bold text-red-500">{error || "No assets found."}</div>
  }

  const blankCount = assets.filter(a => a.name === "[Blank QR - Ready to Register]").length
  const registeredCount = assets.length - blankCount

  return (
    <div className="bg-white min-h-screen text-black">
      {/* Print Controls (hidden on print) */}
      <div className="print:hidden p-6 bg-slate-100 border-b border-slate-200 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-xl font-bold">Print QR Codes</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            <span className="font-semibold text-slate-900">{assets.length} total stickers</span>
            {blankCount > 0 ? (
              <> ({registeredCount} registered + <span className="text-amber-600 font-semibold">{blankCount} blank QR</span>)</>
            ) : (
              <> ({registeredCount} registered)</>
            )}
            {" "}&bull; A4 Offset Layout (70&times;30mm)
          </p>
        </div>
        <PrintButton />
      </div>

      {/* A4 Print Layout */}
      <div className="max-w-[210mm] mx-auto p-[10mm] print:p-0 print:max-w-none print:m-0">
        <div className="flex flex-wrap gap-4 print:gap-[6mm] justify-center">
          {assets.map((asset) => {
            const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bubbleso2-aio.vercel.app'}/public/asset/${asset.id}`
            const isBlank = asset.name === "[Blank QR - Ready to Register]"

            return (
              <AssetQRSticker
                key={asset.id}
                assetTag={asset.assetTag}
                departmentCode={asset.department?.code}
                isBlank={isBlank}
                qrValue={qrUrl}
                bleed
              />
            )
          })}
        </div>
      </div>
      
      {/* Global styles for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}} />
    </div>
  )
}

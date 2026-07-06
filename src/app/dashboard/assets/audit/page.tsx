"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScanLine, Search, Package, AlertCircle, Camera } from "lucide-react"
import { QRScannerModal } from "@/components/forms/QRScannerModal"

export default function AuditScanPage() {
  const router = useRouter()
  const [assetTag, setAssetTag] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const [showScanner, setShowScanner] = useState(false)

  const handleLookup = async (tag: string) => {
    if (!tag.trim()) return

    setIsSearching(true)
    setError("")

    try {
      const res = await fetch(`/api/assets/lookup?tag=${encodeURIComponent(tag)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.id) {
          router.push(`/dashboard/assets/${data.id}`)
        } else {
          setError("Asset not found in the database.")
        }
      } else {
        setError("Error connecting to database. Please try again.")
      }
    } catch (err) {
      setError("Failed to search. Please check your connection.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleLookup(assetTag)
  }

  const handleQRScan = async (decodedText: string) => {
    setShowScanner(false)
    
    // If scanned text is a URL, extract asset ID from it
    if (decodedText.includes("/dashboard/assets/")) {
      const id = decodedText.split("/dashboard/assets/").pop()
      if (id) {
        router.push(`/dashboard/assets/${id}`)
        return
      }
    }
    
    // Otherwise treat it as an asset tag
    setAssetTag(decodedText.toUpperCase())
    await handleLookup(decodedText)
  }

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500 flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 text-center border-b border-slate-100 bg-teal-600">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ScanLine className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Audit & Scan</h1>
          <p className="text-teal-100 font-medium mt-2">Scan QR code or enter asset tag manually</p>
        </div>

            <div className="p-8">
              {/* Camera QR Scanner Button */}
              <button
                onClick={() => setShowScanner(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 mb-6 border-2 border-dashed border-teal-300 rounded-xl text-teal-700 font-bold hover:bg-teal-50 hover:border-teal-400 transition-all group"
              >
                <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-lg">Open Camera Scanner</span>
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-bold uppercase">or enter manually</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleScan} className="space-y-6">
                
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 text-center uppercase tracking-wider">Asset Tag / Barcode</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={assetTag}
                      onChange={(e) => setAssetTag(e.target.value.toUpperCase())}
                      className="block w-full pl-12 pr-4 py-4 text-center text-xl font-black text-slate-900 border-2 border-slate-200 rounded-xl focus:ring-teal-500 focus:border-teal-500 placeholder-slate-300 transition-colors"
                      placeholder="e.g. BBL-IT-001"
                    />
                  </div>
                  <p className="text-xs text-center text-slate-400 font-medium mt-3">
                    Tip: If you are using a USB barcode scanner, simply scan the tag. It will automatically submit.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !assetTag.trim()}
                  className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-black text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? "Searching..." : (
                    <>
                      <Search className="w-5 h-5 mr-2" /> Lookup Asset
                    </>
                  )}
                </button>
              </form>
            </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  )
}
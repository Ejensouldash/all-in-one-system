"use client"

import { useState } from "react"
import { ExternalLink, Eye, Maximize2, Minimize2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react"

type PdfPreviewModalProps = {
  isOpen: boolean
  onClose: () => void
  r2ObjectKey: string | null
  title?: string
}

export function PdfPreviewModal({ isOpen, onClose, r2ObjectKey, title }: PdfPreviewModalProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  if (!isOpen || !r2ObjectKey) return null

  const pdfUrl = r2ObjectKey.startsWith("/") 
    ? r2ObjectKey 
    : `/api/sales-ordering/pdf?key=${encodeURIComponent(r2ObjectKey)}&direct=true`

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">{title || "PDF Document Preview"}</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md">{r2ObjectKey.split("/").pop()}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700">
              <button
                onClick={handleZoomOut}
                title="Zoom Out"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-300 w-12 text-center">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                title="Zoom In"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                onClick={handleRotate}
                title="Rotate Document"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2.5 text-xs font-black text-cyan-400 hover:bg-slate-700 border border-slate-700 transition"
            >
              <ExternalLink className="h-4 w-4" /> New Tab
            </a>

            <button
              onClick={onClose}
              className="rounded-xl bg-rose-500/20 p-2.5 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Body Container */}
        <div className="relative flex-1 bg-slate-950 p-4 overflow-auto flex items-center justify-center">
          <div
            className="h-full w-full transition-transform duration-200 origin-center flex justify-center"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
          >
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              className="h-full w-full rounded-2xl border border-slate-800 bg-white shadow-2xl"
              title={title || "PDF Viewer"}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-2.5 text-xs text-slate-400">
          <span>Streamed directly from Cloudflare R2</span>
          <span>Press ESC or X button to close</span>
        </div>
      </div>
    </div>
  )
}

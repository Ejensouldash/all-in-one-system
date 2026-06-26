"use client"

import { useState, useRef } from "react"
import { X, Printer, MonitorSmartphone } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

interface QRCodeModalProps {
  asset: any
  onClose: () => void
}

export function QRCodeModal({ asset, onClose }: QRCodeModalProps) {
  // Using the exact structure expected by the system.
  // The QR code URL points to the asset's QR details page.
  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/assets/${asset.id}/qr` : ''

  const handlePrint = () => {
    const printContent = document.getElementById("qr-print-area")
    if (!printContent) return

    const originalContents = document.body.innerHTML
    document.body.innerHTML = printContent.innerHTML
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload() // Reload to restore React state bindings after brutal DOM replacement
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-gray-900">Asset QR Code</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div id="qr-print-area" className="p-8 flex flex-col items-center justify-center bg-white text-center">
          {/* Company Branding for Sticker */}
          <h3 className="font-black tracking-widest text-lg uppercase mb-1 print:text-black">BUBBLE O2</h3>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6 border-b-2 border-gray-100 pb-2 print:border-black">Property Of</p>

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
            <QRCodeSVG 
              value={qrUrl} 
              size={200}
              level={"H"}
              includeMargin={false}
              fgColor={"#000000"}
              bgColor={"#ffffff"}
            />
          </div>

          <div className="mt-6 w-full text-center">
            <p className="text-sm font-bold text-gray-900">{asset.brand} {asset.model}</p>
            <p className="text-xs text-gray-500 font-mono mt-1">SN: {asset.serialNumber || 'N/A'}</p>
            <p className="text-[10px] text-gray-400 font-medium uppercase mt-2 bg-gray-50 rounded-lg py-1 border border-gray-100 print:border-none print:bg-transparent">Scan to View Asset Details</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 shadow-sm shadow-blue-600/20"
          >
            <Printer className="h-4 w-4" /> Print Sticker
          </button>
        </div>

      </div>
    </div>
  )
}

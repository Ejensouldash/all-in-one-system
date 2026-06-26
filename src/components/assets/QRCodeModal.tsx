"use client"

import { useState, useRef } from "react"
import { X, Printer, MonitorSmartphone, Phone, Mail } from "lucide-react"
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
    
    document.body.innerHTML = `
      <style>
        @media print {
          @page { margin: 0; }
          body { 
            margin: 1cm; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
        }
      </style>
      ${printContent.outerHTML}
    `
    
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload()
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

        {/* Printable Area - Designed for 70mm x 30mm */}
        <div className="p-8 flex flex-col items-center justify-center bg-gray-100">
          <div 
            id="qr-print-area" 
            className="relative flex items-center justify-between p-2 rounded-lg bg-[#0b111a] border border-cyan-400 overflow-hidden"
            style={{ width: '70mm', height: '30mm', boxSizing: 'border-box' }}
          >
            {/* Left Content */}
            <div className="flex flex-col h-full justify-between flex-1 pr-2">
              
              {/* Header / Logo */}
              <div className="flex flex-col">
                <span className="text-white text-[6px] font-bold tracking-wider mb-0.5">PROPERTY OF</span>
                <div className="flex items-end leading-none">
                  <span className="text-cyan-400 text-sm font-black tracking-tighter">Bubbles</span>
                  <span className="text-white text-sm font-light">O2</span>
                  <div className="relative ml-0.5 mb-1 flex items-center justify-center">
                     {/* CSS imitation of the bubbles logo mark */}
                     <div className="w-1.5 h-1.5 border border-cyan-400 rounded-full"></div>
                     <div className="w-1 h-1 border border-cyan-400 rounded-full absolute -top-1 -right-0.5"></div>
                     <div className="w-0.5 h-0.5 border border-cyan-400 rounded-full absolute -top-0.5 -left-0.5"></div>
                  </div>
                </div>
                <div className="w-full h-px bg-cyan-400/50 mt-1 mb-1"></div>
              </div>

              {/* Asset ID Badge */}
              <div className="bg-white rounded py-0.5 px-2 flex items-center justify-center mb-1">
                <span className="text-black font-black text-xs tracking-wide">
                  {asset.id.length > 15 ? asset.id.substring(0, 15) : asset.id}
                </span>
              </div>

              {/* Contact Info */}
              <div className="flex flex-col space-y-0.5 mt-auto">
                <div className="flex items-center text-cyan-400">
                  <Phone className="w-2 h-2 mr-1" fill="currentColor" />
                  <span className="text-white text-[5px] font-medium">+60 19-608 9858 (HR)</span>
                </div>
                <div className="flex items-center text-cyan-400">
                  <Mail className="w-2 h-2 mr-1" fill="currentColor" />
                  <span className="text-white text-[5px] font-medium">HR@bubbleso2.com</span>
                </div>
              </div>

            </div>

            {/* Right Content - QR Code */}
            <div className="bg-white p-1 rounded-md h-full aspect-square flex items-center justify-center shrink-0">
              <QRCodeSVG 
                value={qrUrl} 
                size={90}
                level={"M"}
                includeMargin={false}
                fgColor={"#000000"}
                bgColor={"#ffffff"}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4 font-mono">Actual Print Size: 70mm x 30mm</p>
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

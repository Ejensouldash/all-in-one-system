"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Printer, ArrowLeft, QrCode, Copy, Check, ExternalLink } from "lucide-react"
import Link from "next/link"

export function MaintenanceQRPosterClient() {
  const [baseUrl, setBaseUrl] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin)
    }
  }, [])

  const qrLink = baseUrl
    ? `${baseUrl}/public/maintenance/request`
    : "/public/maintenance/request"

  const handlePrint = () => {
    window.print()
  }

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(qrLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Screen Controls (Hidden on Print) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/forms/maintenance/tickets"
              className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to FMS Work Request
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              FMS Work Request QR Poster
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Print this official QR poster and display it on factory notice boards, security guard posts, or near machinery. Staff, operators, and contractors can scan to submit breakdown and repair reports instantly without logging in.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copy Public Link"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={qrLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
              title="Open Public Portal"
            >
              <ExternalLink className="h-4 w-4 text-slate-500" />
              <span>Open Portal</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Poster (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Universal Printable Poster */}
      <div className="flex justify-center">
        <div className="bg-white rounded-3xl shadow-xl border-4 border-slate-900 p-8 sm:p-10 flex flex-col items-center text-center max-w-lg w-full print:shadow-none print:border-4 print:border-black print:max-w-none print:w-full print:p-6 print:rounded-none">
          {/* Header */}
          <div className="w-full border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-center gap-2.5 mb-1.5">
              <div className="h-9 w-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-base shadow-sm">
                B
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                BUBBLESO2
              </span>
            </div>
            <p className="text-xs font-black tracking-widest uppercase text-blue-700">
              FMS WORK REQUEST FORMS
            </p>
            <div className="mt-2 inline-block bg-slate-900 text-white text-[10px] font-mono px-3.5 py-0.5 rounded-full font-bold">
              SOP BOSB-FMS-850-001-QR01
            </div>
          </div>

          {/* Title & Call to action */}
          <div className="mb-6 space-y-1">
            <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tight">
              FMS WORK REQUEST
            </h2>
            <p className="text-xs font-black text-slate-700 uppercase tracking-wide">
              SCAN TO REPORT BREAKDOWN / REPAIR
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              Mechanical • Civil &amp; Facility • Electrical
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-5 bg-white border-2 border-slate-900 rounded-2xl shadow-inner mb-6 flex items-center justify-center">
            <QRCodeSVG
              value={qrLink}
              size={260}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Location Notice */}
          <div className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-3.5 mb-5 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Location / Plant Facilities
            </span>
            <span className="text-base font-black text-slate-900 block">
              All BubblesO2 Branches &amp; Plants
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">
              (Select your plant branch and machinery area in the form upon scanning)
            </span>
          </div>

          {/* Instructions */}
          <div className="w-full text-left bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-[11px] text-slate-700 space-y-1.5">
            <p className="font-bold text-blue-900">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium">
              <li>Open smartphone camera &amp; scan the QR code above.</li>
              <li>Select plant location (Rantau / Pedas), describe breakdown, and attach photos.</li>
              <li>Tap <span className="font-bold text-slate-800">Submit</span> — the maintenance team on duty will be notified immediately.</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="w-full mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>BubblesO2 All-in-One Digital System</span>
            <span className="font-bold text-slate-500">No Account Required</span>
          </div>
        </div>
      </div>
    </div>
  )
}

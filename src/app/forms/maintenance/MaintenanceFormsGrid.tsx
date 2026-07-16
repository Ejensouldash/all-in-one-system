"use client"

import { useState } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { QrCode, X, Printer } from "lucide-react"

type MaintenanceForm = {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  gradient: string
  accent: string
}

export function MaintenanceFormsGrid({ forms }: { forms: MaintenanceForm[] }) {
  const [qrForm, setQrForm] = useState<MaintenanceForm | null>(null)

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const qrUrl = qrForm ? `${origin}${qrForm.href}` : ""

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        {forms.map((form, index) => (
          <div key={index} className={`bg-gradient-to-br ${form.gradient} rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-white/10 hover:-translate-y-1 transition-transform`}>
            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-black/20 border border-white/10 text-white/90 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${form.accent} mr-2 animate-pulse`}></span>
                Maintenance Form
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">{form.title}</h2>
              <p className="text-white/70 text-sm font-medium">
                {form.description}
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <Link href={form.href} className="group flex items-center justify-center flex-1 bg-white text-gray-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition-colors shadow-lg uppercase tracking-wider">
                {form.icon} Open Form
              </Link>
              <button
                onClick={() => setQrForm(form)}
                title="Show QR Code"
                className="flex items-center justify-center bg-black/20 hover:bg-black/30 border border-white/10 text-white p-3 rounded-xl transition-colors shadow-lg"
              >
                <QrCode className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {qrForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
          {/* Screen preview modal */}
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl relative flex flex-col items-center">
            <button
              onClick={() => setQrForm(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2" className="h-10 object-contain mb-4" />

            <h2 className="text-lg font-black uppercase tracking-tight mb-1 text-center">{qrForm.title}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">Scan to Fill</p>

            <div className="border-4 border-gray-900 p-4 bg-white">
              <QRCodeSVG value={qrUrl} size={220} level="H" includeMargin={false} />
            </div>

            <p className="text-[10px] text-gray-400 mt-4 break-all text-center font-mono">{qrUrl}</p>

            <button
              onClick={() => window.print()}
              className="mt-6 w-full flex items-center justify-center px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md"
            >
              <Printer className="w-4 h-4 mr-2" /> Print A4 QR Poster
            </button>
          </div>
        </div>
      )}

      {qrForm && (
        <>
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body * { visibility: hidden; }
              #qr-a4-poster, #qr-a4-poster * { visibility: visible; }
              #qr-a4-poster {
                position: fixed;
                inset: 0;
                margin: 0;
                width: 210mm;
                height: 297mm;
              }
            }
          `}</style>
          {/* Print-only A4 poster */}
          <div
            id="qr-a4-poster"
            className="hidden print:flex flex-col items-center justify-between bg-white text-black"
            style={{ padding: "22mm 18mm" }}
          >
            <div className="w-full flex flex-col items-center">
              <img src="/assets/BubblesO2_Logo.png" alt="BubblesO2" style={{ height: "22mm" }} className="object-contain mb-3" />
              <p className="text-[13px] font-black uppercase tracking-widest text-center">BubblesO2 Sdn Bhd</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wide text-center mt-1">
                Kompleks Al-Ammar, Kg Kanchong, 71200 Rantau, Negeri Sembilan
              </p>
            </div>

            <div className="w-full flex flex-col items-center">
              <div className="w-full border-t-2 border-black mb-8" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">Maintenance Form QR Access</p>
              <h1 className="text-4xl font-black uppercase tracking-tight text-center mb-3">{qrForm.title}</h1>
              <p className="text-sm font-medium text-gray-600 text-center mb-10 max-w-md">
                Scan the QR code below with your phone camera to open this inspection form directly.
              </p>

              <div className="border-[6px] border-black p-6 bg-white">
                <QRCodeSVG value={qrUrl} size={420} level="H" includeMargin={false} />
              </div>

              <p className="text-xs text-gray-500 mt-8 break-all text-center font-mono">{qrUrl}</p>
            </div>

            <div className="w-full flex flex-col items-center">
              <div className="w-full border-t-2 border-black mb-3" />
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">
                Please log in before scanning &middot; Digitalized Forms &amp; Records &middot; Bubbles O2 Marketing
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}

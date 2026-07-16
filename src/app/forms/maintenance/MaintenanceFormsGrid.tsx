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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:p-0 print:static print:backdrop-blur-none">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl relative flex flex-col items-center print:shadow-none print:rounded-none">
            <button
              onClick={() => setQrForm(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black uppercase tracking-tight mb-1 text-center">{qrForm.title}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">Scan to Fill</p>

            <div className="border-4 border-gray-900 p-4 bg-white">
              <QRCodeSVG value={qrUrl} size={220} level="H" includeMargin={false} />
            </div>

            <p className="text-[10px] text-gray-400 mt-4 break-all text-center font-mono">{qrUrl}</p>

            <button
              onClick={() => window.print()}
              className="mt-6 w-full flex items-center justify-center px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md print:hidden"
            >
              <Printer className="w-4 h-4 mr-2" /> Print QR Code
            </button>
          </div>
        </div>
      )}
    </>
  )
}

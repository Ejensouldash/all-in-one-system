"use client"

import { useSearchParams } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

function formatSKU(sku: string | null) {
  if (!sku) return sku
  return sku.replace('p800_', '800ML X ').replace('p425_', '425ML X ').toUpperCase()
}

function QRTagContent() {
  const searchParams = useSearchParams()
  const batch = searchParams.get("batch")
  const sku = searchParams.get("sku")

  if (!batch || !sku) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 font-bold">
        Missing batch or SKU parameters.
      </div>
    )
  }

  // The QR value can just be the batch number to make scanning easy
  const qrValue = batch;

  return (
    <div className="flex flex-col items-center w-full">
      {/* TOOLBAR (Screen Only) */}
      <div className="w-full max-w-sm mb-6 flex justify-between items-center print:hidden">
        <Link 
          href="/forms/warehouse/dashboard" 
          className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Link>
        <button 
          onClick={() => window.print()}
          className="inline-flex items-center bg-emerald-600 text-white px-4 py-2 font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors border-2 border-emerald-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]"
        >
          <Printer className="h-4 w-4 mr-2" /> Print Tag
        </button>
      </div>

      {/* PRINTABLE TAG (Matching Hand-drawn Design) */}
      <div className="print-wrapper bg-white">
        <style>{`
          @media print {
            @page { size: auto; margin: 0mm; }
            body { background: white !important; display: flex; justify-content: center; align-items: flex-start; padding-top: 20mm; }
            .print-wrapper { width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
            .print\\:hidden { display: none !important; }
          }
        `}</style>
        
        <div className="border-[4px] border-black p-8 w-[400px] max-w-full flex flex-col items-center mx-auto" style={{ aspectRatio: '3/4' }}>
          
          <h1 className="text-3xl font-black text-center uppercase tracking-tighter leading-none mb-6">
            Bubbles O2<br/>Marketing
          </h1>
          
          <div className="text-2xl font-black uppercase tracking-widest mb-10 text-center w-full pb-4 border-b-4 border-black border-dashed">
            {formatSKU(sku)}
          </div>
          
          <div className="border-8 border-black p-4 mb-10 bg-white">
            <QRCodeSVG 
              value={qrValue} 
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          
          <div className="mt-auto w-full border-t-4 border-black pt-4">
            <div className="text-xl font-bold uppercase tracking-widest text-center text-gray-500 mb-1">
              Batch No
            </div>
            <div className="text-3xl font-black text-center tracking-tighter">
              {batch}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default function QRPrintPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center justify-start print:bg-white print:p-0">
      <Suspense fallback={<div className="font-bold">Loading Tag...</div>}>
        <QRTagContent />
      </Suspense>
    </div>
  )
}

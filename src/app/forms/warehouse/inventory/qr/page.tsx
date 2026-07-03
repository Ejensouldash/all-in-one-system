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
            @page { size: 90mm 140mm; margin: 0; }
            body { background: white !important; margin: 0; padding: 0; display: block; }
            .print-wrapper { margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
            .print\\:hidden { display: none !important; }
            /* Hide the gray background from the outer div when printing */
            #__next, html { background: white !important; }
          }
        `}</style>
        
        <div className="border-[3px] border-black flex flex-col items-center mx-auto bg-white" style={{ width: '90mm', height: '140mm', padding: '6mm', boxSizing: 'border-box' }}>
          
          <h1 className="text-[22px] font-black text-center uppercase tracking-tighter leading-none mb-3 mt-1">
            Bubbles O2<br/>Marketing
          </h1>
          
          <div className="text-[16px] font-black uppercase tracking-widest mb-4 text-center w-full pb-2 border-b-2 border-black border-dashed flex-none">
            {formatSKU(sku)}
          </div>
          
          <div className="border-4 border-black p-2 mb-4 bg-white flex items-center justify-center">
            <QRCodeSVG 
              value={qrValue} 
              size={130}
              level="H"
              includeMargin={false}
            />
          </div>
          
          <div className="mt-auto w-full border-t-[3px] border-black pt-2 flex-none">
            <div className="text-[11px] font-bold uppercase tracking-widest text-center text-gray-600 mb-0.5">
              Batch No
            </div>
            <div className="text-[20px] font-black text-center tracking-tighter leading-none">
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

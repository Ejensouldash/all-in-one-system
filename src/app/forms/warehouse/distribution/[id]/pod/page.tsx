"use client"
import { useEffect, useState } from "react"
import { notFound } from "next/navigation"
import { GMPHeader } from "@/components/GMPHeader"

export default function PrintPODPage({ params }: { params: Promise<{ id: string }> }) {
  const [doOrder, setDoOrder] = useState<any>(null)
  
  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/warehouse/distribution/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data || data.error) setDoOrder('not_found')
          else setDoOrder(data)
        })
    })
  }, [params])

  if (doOrder === 'not_found') return <div>DO Not Found</div>
  if (!doOrder) return <div className="p-10 font-bold">Loading...</div>

  // Aggregate items by SKU (Blind Batching logic)
  const aggregatedItems: Record<string, number> = {}
  doOrder.items.forEach((item: any) => {
    if (!aggregatedItems[item.sku]) {
      aggregatedItems[item.sku] = 0
    }
    aggregatedItems[item.sku] += item.qtySent
  })

  const labels: Record<string, string> = {
    "p425_24": "BUBBLES O2 425 ML x 24",
    "p425_6": "BUBBLES O2 425 ML x 6",
    "p800_12": "BUBBLES O2 800 ML x 12",
    "p800_20": "BUBBLES O2 800 ML x 20",
  }

  return (
    <div className="bg-white min-h-screen text-black p-4 sm:p-8 font-sans max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none print:shadow-none shadow-xl">
      <div className="print:hidden mb-6 flex justify-end">
        <button 
          onClick={() => window.print()} 
          className="bg-black text-white px-6 py-2 font-bold uppercase hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Print POD
        </button>
      </div>

      <GMPHeader />

      <div className="mt-8 mb-6 grid grid-cols-2 gap-4 border-2 border-black p-4 font-bold text-sm">
        <div>
          <p>DO NUMBER: <span className="font-normal">{doOrder.doNumber}</span></p>
          <p>DATE: <span className="font-normal">{new Date(doOrder.distributionDate).toLocaleDateString('en-GB')}</span></p>
          <p>METHOD: <span className="font-normal">{doOrder.distributionMethod}</span></p>
          {doOrder.distributionMethod === 'Sponsorship' && (
            <p>SPONSOR TO: <span className="font-normal">{doOrder.sponsorshipDetails}</span></p>
          )}
        </div>
        <div>
          <p>DESTINATION: <span className="font-normal">{doOrder.destination}</span></p>
          <p>VEHICLE NO: <span className="font-normal">{doOrder.vehicleNo || 'N/A'}</span></p>
          <p>DRIVER NAME: <span className="font-normal">{doOrder.driverName || 'N/A'}</span></p>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-black mb-12">
        <thead className="bg-gray-100">
          <tr>
            <th className="border-2 border-black p-3 text-left font-black uppercase w-16 text-center">No</th>
            <th className="border-2 border-black p-3 text-left font-black uppercase">Item Description</th>
            <th className="border-2 border-black p-3 text-center font-black uppercase w-32">Total Qty (Box)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(aggregatedItems).map(([sku, qty], idx) => (
            <tr key={sku}>
              <td className="border-2 border-black p-3 text-center font-bold">{idx + 1}</td>
              <td className="border-2 border-black p-3 font-bold">{labels[sku] || sku}</td>
              <td className="border-2 border-black p-3 text-center font-bold">{qty as React.ReactNode}</td>
            </tr>
          ))}
          {Object.entries(aggregatedItems).length === 0 && (
            <tr>
              <td colSpan={3} className="border-2 border-black p-6 text-center italic">No items found</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-8 text-sm font-bold mt-20">
        <div className="border-2 border-black p-4 h-48 relative">
          <p className="absolute top-[-12px] left-4 bg-white px-2 uppercase tracking-tighter">Sender Information</p>
          <div className="absolute bottom-4 left-4">
            <p className="border-t border-black pt-1 mb-1">Name & Signature</p>
            <p className="font-normal text-xs">{doOrder.createdBy?.name}</p>
          </div>
          {/* Circular Stamp Placeholder */}
          <div className="absolute top-6 right-6 w-24 h-24 border-2 border-black rounded-full flex items-center justify-center text-center p-2 opacity-30">
            <span className="text-[10px]">BUBBLES O2 SDN BHD<br/>STAMP</span>
          </div>
        </div>

        <div className="border-2 border-black p-4 h-48 relative">
          <p className="absolute top-[-12px] left-4 bg-white px-2 uppercase tracking-tighter">Recipient Information</p>
          <div className="absolute bottom-4 left-4 w-[80%]">
            <p className="border-t border-black pt-1 mb-1 w-full">Name & Signature / Cop</p>
          </div>
          <div className="absolute top-6 right-6 w-24 h-24 border-2 border-black rounded-full flex items-center justify-center text-center p-2 opacity-30">
            <span className="text-[10px]">RECIPIENT<br/>STAMP</span>
          </div>
        </div>
      </div>
    </div>
  )
}

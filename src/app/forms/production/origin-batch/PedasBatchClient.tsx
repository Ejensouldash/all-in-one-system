"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Printer, RefreshCw, Plus, ArrowLeft, Trash2, Tag, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { createPedasBatch, deletePedasBatch } from "@/app/actions/pedasBatch"

const SKU_OPTIONS = [
  { id: "BOTTLE 800ml", name: "BOTTLE 800ml", defaultMult: 225 },
  { id: "BOTTLE 425ml", name: "BOTTLE 425ml", defaultMult: 181 },
  { id: "CAP", name: "CAP (Penutup Botol)", defaultMult: 4000 },
  { id: "BOX", name: "BOX (Kotak)", defaultMult: 1 },
  { id: "LABEL", name: "LABEL", defaultMult: 1 },
  { id: "CARTON CAP", name: "CARTON CAP", defaultMult: 15 },
  { id: "WRAPPING HAND", name: "WRAPPING HAND", defaultMult: 6 },
  { id: "WRAPPING MACHINE", name: "WRAPPING MACHINE", defaultMult: 1 },
  { id: "TAPE OPP", name: "TAPE OPP", defaultMult: 96 },
  { id: "TAPE MACHINE", name: "TAPE MACHINE", defaultMult: 6 },
  { id: "MACHINE STRETCH FILM", name: "MACHINE STRETCH FILM", defaultMult: 1 }
]

export function PedasBatchClient({ initialBatches, userName }: { initialBatches: any[], userName: string }) {
  const [batches, setBatches] = useState(initialBatches)
  const [selectedSku, setSelectedSku] = useState("BOTTLE 800ml")
  const [batchNo, setBatchNo] = useState("")
  const [qtyPerBag, setQtyPerBag] = useState<number>(225)
  const [totalBags, setTotalBags] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [printTagData, setPrintTagData] = useState<any | null>(null)

  // Generate auto batch number suggestion
  const generateAutoBatchNo = () => {
    const today = new Date()
    const yy = String(today.getFullYear()).slice(-2)
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const randomSeq = String(Math.floor(100 + Math.random() * 900))
    setBatchNo(`PDS-${dd}${mm}${yy}-${randomSeq}`)
  }

  const handleSkuChange = (skuId: string) => {
    setSelectedSku(skuId)
    const found = SKU_OPTIONS.find(s => s.id === skuId)
    if (found) {
      setQtyPerBag(found.defaultMult)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let targetBatch = batchNo.trim().toUpperCase()
    if (!targetBatch) {
      alert("Sila masukkan Nombor Batch atau tekan 'Auto-Gen'.")
      return
    }

    setIsSubmitting(true)
    const res = await createPedasBatch({
      sku: selectedSku,
      batchNo: targetBatch,
      qtyPerBag: Number(qtyPerBag) || 0,
      totalBags: Number(totalBags) || 1
    })

    setIsSubmitting(false)

    if (res.success && res.data) {
      setBatches([res.data, ...batches])
      setPrintTagData(res.data)
      alert(`Batch ${res.data.batchNo} berjaya didaftarkan! Sila cetak tag sticker.`)
    } else {
      alert(`Gagal mendaftar batch: ${res.error}`)
    }
  }

  const handlePrint = (batch: any) => {
    setPrintTagData(batch)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const handleDelete = async (id: string, bNo: string) => {
    if (!confirm(`Adakah anda pasti mahu memadamkan Batch ${bNo}?`)) return
    const res = await deletePedasBatch(id)
    if (res.success) {
      setBatches(batches.filter(b => b.id !== id))
      if (printTagData?.id === id) setPrintTagData(null)
    } else {
      alert(`Gagal memadam: ${res.error}`)
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 text-black font-sans">
      
      {/* SCREEN ONLY UI */}
      <div className="max-w-5xl mx-auto print:hidden space-y-8">
        
        {/* Header */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <Link href="/forms/production" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 mb-4 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Production Forms
            </Link>
            <div className="flex items-center space-x-3">
              <Tag className="w-9 h-9 text-yellow-600" />
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Kilang Pedas - Batch QR Sticker Generator</h1>
            </div>
            <p className="text-gray-600 font-bold text-xs uppercase tracking-widest mt-1">Sticker Printer & Origin Batch Manager</p>
          </div>
        </div>

        {/* Form and Active Sticker Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create Batch Form */}
          <div className="lg:col-span-7 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
            <div className="border-b-4 border-black pb-3 bg-yellow-400 -mx-6 -mt-6 p-4">
              <h2 className="text-lg font-black uppercase tracking-tight text-black flex items-center">
                <Plus className="w-5 h-5 mr-2" /> Registration & Printing Form
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2">Select Product SKU</label>
                <select 
                  value={selectedSku} 
                  onChange={(e) => handleSkuChange(e.target.value)}
                  className="w-full border-2 border-black p-3 font-bold bg-white focus:ring-2 focus:ring-black outline-none"
                >
                  {SKU_OPTIONS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-2">Batch Number</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    placeholder="e.g. PDS-260723-001"
                    value={batchNo} 
                    onChange={(e) => setBatchNo(e.target.value.toUpperCase())}
                    className="w-full border-2 border-black p-3 font-bold bg-white focus:ring-2 focus:ring-black outline-none uppercase"
                  />
                  <button 
                    type="button" 
                    onClick={generateAutoBatchNo}
                    className="bg-black text-white font-black text-xs px-4 uppercase whitespace-nowrap hover:bg-gray-800 transition-colors border-2 border-black"
                  >
                    Auto-Gen
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-2">Qty per Bag / Box</label>
                  <input 
                    type="number" 
                    min="1"
                    value={qtyPerBag} 
                    onChange={(e) => setQtyPerBag(Number(e.target.value))}
                    className="w-full border-2 border-black p-3 font-bold bg-white focus:ring-2 focus:ring-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-2">Total Bags / Boxes</label>
                  <input 
                    type="number" 
                    min="1"
                    value={totalBags} 
                    onChange={(e) => setTotalBags(Number(e.target.value))}
                    className="w-full border-2 border-black p-3 font-bold bg-white focus:ring-2 focus:ring-black outline-none"
                  />
                </div>
              </div>

              <div className="bg-gray-100 p-3 border-2 border-black rounded text-xs font-bold flex justify-between">
                <span>Calculated Total Quantity:</span>
                <span className="font-black text-emerald-700 text-sm">{(Number(qtyPerBag) || 0) * (Number(totalBags) || 1)} pcs</span>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base uppercase py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all flex items-center justify-center space-x-2"
              >
                <Printer className="w-5 h-5" />
                <span>{isSubmitting ? "Generating..." : "Save & Generate QR Sticker"}</span>
              </button>
            </form>
          </div>

          {/* Active Printed Sticker Preview Card */}
          <div className="lg:col-span-5 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-between">
            <div className="w-full border-b-4 border-black pb-3 -mt-6 -mx-6 p-4 bg-emerald-400 mb-4 text-center">
              <h2 className="text-lg font-black uppercase tracking-tight text-black">Active Thermal Sticker Preview</h2>
            </div>

            {printTagData ? (
              <div className="w-full flex flex-col items-center space-y-4">
                {/* Thermal Sticker Layout Simulation */}
                <div className="w-full border-4 border-black p-4 bg-white shadow-inner flex flex-col items-center text-center space-y-2">
                  <div className="font-black text-sm uppercase tracking-wider border-b-2 border-black pb-1 w-full text-emerald-800">
                    BUBBLES02 - PEDAS ORIGIN TAG
                  </div>
                  
                  <div className="my-2 bg-white p-2 border-2 border-black">
                    <QRCodeSVG 
                      value={JSON.stringify({
                        batch: printTagData.batchNo,
                        sku: printTagData.sku,
                        qty: printTagData.qtyPerBag,
                        bags: printTagData.totalBags,
                        origin: "PEDAS"
                      })}
                      size={140}
                      level="H"
                    />
                  </div>

                  <div className="text-xl font-black uppercase tracking-tight text-black">
                    {printTagData.batchNo}
                  </div>

                  <div className="text-xs font-bold uppercase tracking-wider bg-gray-100 px-3 py-1 border border-black w-full">
                    SKU: {printTagData.sku}
                  </div>

                  <div className="text-xs font-bold text-gray-700 flex justify-between w-full pt-1 border-t border-gray-300">
                    <span>QTY/BAG: {printTagData.qtyPerBag}</span>
                    <span>BAGS: {printTagData.totalBags}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handlePrint(printTagData)}
                  className="w-full bg-black text-white font-black text-sm uppercase py-3 border-2 border-black hover:bg-gray-800 transition-all flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sticker (Thermal Printer)</span>
                </button>
              </div>
            ) : (
              <div className="my-12 text-center text-gray-400 font-bold text-sm uppercase">
                No active sticker selected.<br />Fill in the form to generate or select a batch below.
              </div>
            )}
          </div>
        </div>

        {/* History & Re-print Table */}
        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex justify-between items-center border-b-4 border-black pb-3">
            <h2 className="text-lg font-black uppercase tracking-tight">Recent Pedas Origin Batches ({batches.length})</h2>
            <span className="text-xs font-bold uppercase text-gray-500">Re-print stickers anytime</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-2 border-black text-left text-sm">
              <thead className="bg-black text-white uppercase text-xs">
                <tr>
                  <th className="p-3 border-r border-gray-700">Created At</th>
                  <th className="p-3 border-r border-gray-700">Batch Number</th>
                  <th className="p-3 border-r border-gray-700">SKU</th>
                  <th className="p-3 border-r border-gray-700">Qty / Bag</th>
                  <th className="p-3 border-r border-gray-700">Total Qty</th>
                  <th className="p-3 text-center">Action / Re-print</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black font-bold">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 uppercase">
                      No batches created yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-yellow-50 transition-colors">
                      <td className="p-3 border-r-2 border-black whitespace-nowrap text-xs">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 border-r-2 border-black font-black uppercase text-emerald-800">
                        {b.batchNo}
                      </td>
                      <td className="p-3 border-r-2 border-black uppercase">
                        {b.sku}
                      </td>
                      <td className="p-3 border-r-2 border-black">
                        {b.qtyPerBag} pcs ({b.totalBags} bags)
                      </td>
                      <td className="p-3 border-r-2 border-black font-black">
                        {b.totalQty} pcs
                      </td>
                      <td className="p-3 text-center space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => handlePrint(b)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs px-3 py-1.5 border-2 border-black uppercase inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Re-print Tag</span>
                        </button>

                        <button 
                          onClick={() => handleDelete(b.id, b.batchNo)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 p-1.5 border-2 border-black inline-flex items-center"
                          title="Delete Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PRINT ONLY THERMAL STICKER LAYOUT */}
      {printTagData && (
        <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:w-full print:h-screen bg-white p-2">
          <div className="w-[80mm] h-[50mm] border-2 border-black p-2 flex flex-col items-center justify-between text-center bg-white font-sans">
            <div className="text-[10px] font-black uppercase tracking-wider border-b border-black w-full pb-0.5">
              BUBBLES02 - PEDAS ORIGIN TAG
            </div>

            <div className="my-1">
              <QRCodeSVG 
                value={JSON.stringify({
                  batch: printTagData.batchNo,
                  sku: printTagData.sku,
                  qty: printTagData.qtyPerBag,
                  bags: printTagData.totalBags,
                  origin: "PEDAS"
                })}
                size={95}
                level="H"
              />
            </div>

            <div className="text-sm font-black uppercase tracking-tight text-black">
              {printTagData.batchNo}
            </div>

            <div className="text-[9px] font-black uppercase border border-black px-2 py-0.5 w-full bg-gray-100">
              SKU: {printTagData.sku}
            </div>

            <div className="text-[8px] font-bold flex justify-between w-full pt-0.5">
              <span>QTY: {printTagData.qtyPerBag}</span>
              <span>BAGS: {printTagData.totalBags}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

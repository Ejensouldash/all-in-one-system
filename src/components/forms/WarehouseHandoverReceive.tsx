"use client"

import { useState } from "react"
import { ArrowLeft, Save, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { receiveHandover } from "@/app/actions/handover"
import { GenericSignatureModal } from "./GenericSignatureModal"

function formatSKU(sku: string) {
  if (!sku) return sku;
  return sku.replace('p800_', '800ml x ').replace('p425_', '425ml x ').toUpperCase();
}

export function WarehouseHandoverReceive({ handover, userId, userName }: { handover: any, userId: string, userName: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)

  const handleSignAndReceive = async (signatureData: string) => {
    setIsSubmitting(true)
    const result = await receiveHandover(handover.id, signatureData, userId)
    setIsSubmitting(false)
    setIsSignModalOpen(false)

    if (result.success) {
      alert("Handover received successfully! The inventory has been updated.")
      window.location.href = "/forms/warehouse/dashboard"
    } else {
      alert("Error: " + result.error)
    }
  }

  const isReceived = handover.status === 'RECEIVED'

  return (
    <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
      <div className="border-b-[3px] border-black p-6 bg-emerald-50 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <Link href="/forms/warehouse/dashboard" className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-black px-4 py-2 mb-6 hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Link>
          <div className="flex items-center">
            <CheckCircle2 className="h-10 w-10 mr-4 text-emerald-700" />
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Receive Handover</h1>
          </div>
          <p className="font-bold text-gray-600 uppercase tracking-widest text-sm mt-2 ml-14">
            {handover.handoverNumber}
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 border-2 border-gray-200 p-6 rounded-xl">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Prepared By (Production)</p>
            <p className="text-lg font-black">{handover.productionStaff.name}</p>
            <p className="text-sm font-bold text-gray-600">{new Date(handover.createdAt).toLocaleString('en-GB')}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Status</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase ${isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {handover.status}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black uppercase tracking-wider mb-6">Transferred Items Summary</h2>
          
          <div className="space-y-4">
            {handover.items.map((item: any) => (
              <div key={item.id} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-4 border-b-2 border-gray-200 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">SKU</span>
                    <div className="font-black text-sm">{formatSKU(item.category)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Batch No</span>
                    <div className="font-bold text-indigo-700 text-sm">{item.batchNo}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Type</span>
                    <div className="font-bold text-gray-700 text-sm">{item.type || 'Standard'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Output</span>
                    <div className="font-black text-sm text-gray-600">{item.totalProducedPcs} Pcs</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Net Received</span>
                    <div className="font-black text-xl text-emerald-700">{item.netToWarehousePcs} <span className="text-xs">Pcs</span></div>
                  </div>
                </div>

                {item.deductions?.length > 0 && (
                  <div className="p-4 bg-white">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2">Direct Deductions Made in Production:</p>
                    <div className="space-y-2">
                      {item.deductions.map((d: any) => (
                        <div key={d.id} className="flex justify-between items-center text-sm border border-gray-100 p-2 bg-gray-50">
                          <span className="font-bold">{d.destination}</span>
                          <span className="text-gray-500 italic text-xs">{d.remarks}</span>
                          <span className="font-black text-red-600">- {d.qtyPcs} Pcs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isReceived && (
          <div className="pt-6 border-t-[3px] border-black">
            <div className="bg-amber-50 border-2 border-amber-200 p-4 mb-6">
              <p className="font-bold text-amber-900 text-sm">
                By signing and receiving this handover, the system will automatically log the net pieces into the warehouse inventory (as Transfer In / Delivery Order). Ensure you have verified the physical quantity.
              </p>
            </div>
            
            <button 
              disabled={isSubmitting} 
              onClick={() => setIsSignModalOpen(true)}
              className="w-full bg-emerald-600 text-white px-10 py-4 font-black uppercase tracking-widest text-lg hover:bg-emerald-700 transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[6px] hover:translate-x-[6px] flex items-center justify-center border-[3px] border-black disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-6 w-6 mr-3 animate-spin" /> : <Save className="h-6 w-6 mr-3" />} 
              Sign & Receive Stock
            </button>
          </div>
        )}

      </div>

      {isSignModalOpen && (
        <GenericSignatureModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          onConfirm={handleSignAndReceive}
          userName={userName}
          role="Warehouse Manager"
          title="Sign & Receive Handover"
        />
      )}
    </div>
  )
}

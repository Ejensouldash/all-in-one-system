"use client"

import { useState } from "react"
import { PackagePlus, Loader2, X, CheckCircle2 } from "lucide-react"
import { restockQuarantineItem } from "@/app/actions/warehouse"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

export function RestockButton({ returnId, userName }: { returnId: string, userName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reason, setReason] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  const handleRestock = async () => {
    if (!signature) {
      alert("Please provide a signature.")
      return
    }
    if (!reason.trim()) {
      alert("Please provide a reason for restocking.")
      return
    }
    setIsSubmitting(true)
    const res = await restockQuarantineItem({ id: returnId, signature, reason, staffName: userName })
    setIsSubmitting(false)
    if (res.success) {
      alert("Item successfully restocked to Warehouse!")
      setIsOpen(false)
    } else {
      alert("Failed to restock: " + res.error)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        disabled={isSubmitting}
        className="mt-2 inline-flex items-center px-3 py-1 bg-emerald-100 border border-emerald-500 text-emerald-800 text-[10px] font-black uppercase rounded hover:bg-emerald-200 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PackagePlus className="w-3 h-3 mr-1" />}
        Restock
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="bg-white border-4 border-black p-6 w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black hover:bg-gray-100 p-1 rounded-sm"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black uppercase mb-2 border-b-[3px] border-black pb-2">Restock to Warehouse</h2>
            <p className="text-sm font-bold text-gray-600 mb-6 uppercase tracking-wider">
              Please state the reason and sign to approve this restock.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Reason</label>
              <textarea 
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full border-2 border-black p-3 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="E.g. Inspection passed, ready for DO..."
                rows={3}
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Signature ({userName})</label>
              <SignaturePadClient 
                onSave={setSignature} 
                label={userName}
              />
            </div>

            <div className="flex justify-end pt-4 border-t-2 border-gray-100">
              <button
                onClick={handleRestock}
                disabled={!signature || !reason.trim() || isSubmitting}
                className="flex items-center px-6 py-3 bg-black text-white font-black uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

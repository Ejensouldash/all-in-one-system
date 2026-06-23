"use client"

import { useState } from "react"
import { CheckCircle2, X } from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { approveDailyReport } from "@/app/actions/dailyReport"
import { useRouter } from "next/navigation"

export function ApprovalSignatureModal({ reportId }: { reportId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleApprove = async () => {
    if (!signature) return
    setIsSubmitting(true)
    const res = await approveDailyReport(reportId, signature)
    setIsSubmitting(false)
    if (res.success) {
      setIsOpen(false)
      // refresh to show approved status
      router.refresh()
    } else {
      alert("Failed to approve: " + res.error)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-emerald-600 text-emerald-600 px-4 py-2 bg-white hover:bg-emerald-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(5,150,105,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]"
      >
        <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black p-6 w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black hover:bg-gray-100 p-1 rounded-sm"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-black uppercase mb-2 border-b-[3px] border-black pb-2">Supervisor Approval</h2>
            <p className="text-sm font-bold text-gray-600 mb-6 uppercase tracking-wider">
              By signing below, you verify that the production and inventory data in this report is accurate.
            </p>

            <div className="bg-gray-50 border-[3px] border-black p-4 mb-6">
              <SignaturePadClient 
                onSave={setSignature} 
                label="Supervisor Signature"
              />
            </div>

            <div className="flex gap-4 mt-auto justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 font-black uppercase tracking-wider border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={!signature || isSubmitting}
                onClick={handleApprove}
                className="bg-emerald-600 text-white px-6 py-3 font-black uppercase tracking-wider border-2 border-emerald-800 hover:bg-emerald-700 transition-all shadow-[4px_4px_0px_0px_rgba(6,78,59,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

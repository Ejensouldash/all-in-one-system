"use client"

import { useState } from "react"
import { receiveProductionTransfer } from "@/app/actions/warehouse"
import { CheckCircle2, Loader2 } from "lucide-react"

export function ReceiveTransferButton({ transferId, userId }: { transferId: string, userId: string }) {
  const [loading, setLoading] = useState(false)

  const handleReceive = async () => {
    setLoading(true)
    const result = await receiveProductionTransfer(transferId, userId)
    if (!result.success) {
      alert("Error: " + result.error)
      setLoading(false)
    }
    // if success, the server action revalidates the path, so it will disappear
  }

  return (
    <button 
      onClick={handleReceive}
      disabled={loading}
      className="w-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : (
        <CheckCircle2 className="w-5 h-5 mr-2" />
      )}
      {loading ? "Receiving..." : "Receive Stock"}
    </button>
  )
}

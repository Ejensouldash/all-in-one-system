"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, RotateCcw } from "lucide-react"

export function RetryIntakeButton({ intakeId }: { intakeId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function retry() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}/process`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Retry gagal")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Retry gagal")
    } finally {
      setBusy(false)
    }
  }

  return <div><button onClick={retry} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:bg-slate-400">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Process semula</button>{error && <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>}</div>
}


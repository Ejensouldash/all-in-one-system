"use client"

import { useState } from "react"
import { FileSpreadsheet, Loader2 } from "lucide-react"

/** Downloads the storeroom carry-forward balance as a formatted .xlsx, as at the given date. */
export function ExportStoreroomButton({ asOf }: { asOf: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/analytics/storeroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asOf }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Gagal menjana Excel (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Baki-Storeroom-${asOf}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message || "Gagal menjana Excel")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={download}
        disabled={busy}
        title={`Baki carry forward setakat ${asOf}`}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm transition-colors"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
        {busy ? "Menjana..." : "Export Balance"}
      </button>
      {error && <span className="text-[10px] font-bold text-red-600 max-w-[220px] leading-snug">{error}</span>}
    </div>
  )
}

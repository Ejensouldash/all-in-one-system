"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileSpreadsheet, Loader2, Upload } from "lucide-react"

export function CustomerMasterImport() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function importFile() {
    if (!file) return
    setBusy(true); setError(""); setMessage("")
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/sales-ordering/customers/import", { method: "POST", body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Import gagal")
      setMessage(`${result.total} customer diproses: ${result.created} baru, ${result.updated} dikemas kini, ${result.needsReview} perlu review.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import gagal") }
    finally { setBusy(false) }
  }

  return <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 font-black text-violet-950"><FileSpreadsheet className="h-5 w-5" /> Import Sage X3 Customer Master</div><p className="mt-1 text-sm text-violet-700">Sistem baca tab Master dan Address, kemudian upsert menggunakan Customer ID.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /><button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl border border-violet-300 bg-white px-4 py-3 text-sm font-black text-violet-800">{file ? file.name : "Choose Excel"}</button><button type="button" onClick={importFile} disabled={!file || busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white disabled:bg-violet-300">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import</button></div></div>{message && <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-emerald-700">{message}</p>}{error && <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-rose-700">{error}</p>}</div>
}


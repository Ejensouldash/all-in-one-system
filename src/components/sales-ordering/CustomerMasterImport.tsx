"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileSpreadsheet, Loader2, Upload } from "lucide-react"

export function CustomerMasterImport() {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function importFile() {
    if (!file) return
    setBusy(true); setProgress(0); setStage("Menyediakan fail Excel..."); setError(""); setMessage("")
    try {
      const result = await new Promise<{ total: number; created: number; updated: number; needsReview: number; sheetName?: string }>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open("POST", "/api/sales-ordering/customers/import")
        request.upload.onprogress = event => {
          if (!event.lengthComputable) return
          const uploaded = Math.max(1, Math.round(event.loaded / event.total * 70))
          setProgress(uploaded)
          setStage(`Memuat naik fail Excel... ${Math.round(event.loaded / event.total * 100)}%`)
        }
        request.upload.onload = () => {
          setProgress(78)
          setStage("Membaca lajur customer dan mengesahkan data...")
        }
        request.onreadystatechange = () => {
          if (request.readyState !== XMLHttpRequest.HEADERS_RECEIVED) return
          setProgress(88)
          setStage("Memasukkan customer ke dalam sistem...")
        }
        request.onload = () => {
          let payload: { error?: string; total?: number; created?: number; updated?: number; needsReview?: number; sheetName?: string } = {}
          try { payload = JSON.parse(request.responseText) } catch { /* handled below */ }
          if (request.status < 200 || request.status >= 300) {
            reject(new Error(payload.error || "Import gagal"))
            return
          }
          setProgress(100)
          setStage("Import selesai.")
          resolve({ total: payload.total || 0, created: payload.created || 0, updated: payload.updated || 0, needsReview: payload.needsReview || 0, sheetName: payload.sheetName })
        }
        request.onerror = () => reject(new Error("Sambungan terputus semasa import. Sila cuba lagi."))
        const form = new FormData()
        form.append("file", file)
        request.send(form)
      })
      setMessage(`${result.total.toLocaleString()} customer diproses daripada ${result.sheetName || "workbook"}: ${result.created.toLocaleString()} baru, ${result.updated.toLocaleString()} dikemas kini, ${result.needsReview.toLocaleString()} perlu review.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import gagal") }
    finally { setBusy(false) }
  }

  return <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 font-black text-violet-950"><FileSpreadsheet className="h-5 w-5" /> Import Sage X3 Customer Master</div><p className="mt-1 text-sm text-violet-700">Sistem mengesan tab yang mempunyai lajur Customer ID, kemudian upsert menggunakan Customer ID.</p></div><div className="flex flex-col gap-2 sm:flex-row"><input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /><button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="rounded-xl border border-violet-300 bg-white px-4 py-3 text-sm font-black text-violet-800 disabled:opacity-60">{file ? file.name : "Choose Excel"}</button><button type="button" onClick={importFile} disabled={!file || busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white disabled:bg-violet-300">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{busy ? "Importing" : "Import"}</button></div></div>{busy && <div className="mt-5 rounded-xl border border-violet-200 bg-white p-4" aria-live="polite"><div className="flex items-center justify-between gap-4"><p className="text-sm font-black text-violet-950">{stage}</p><span className="text-sm font-black text-violet-700">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs font-semibold text-violet-700">Jangan tutup halaman ini sehingga import selesai.</p></div>}{message && <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-emerald-700">{message}</p>}{error && <p className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-rose-700">{error}</p>}</div>
}

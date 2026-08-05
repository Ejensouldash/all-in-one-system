"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, Loader2, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react"

type ProgressStage = "IDLE" | "PREPARING" | "UPLOADING" | "READING_FILES" | "READING_PO" | "VERIFYING_PO" | "RETRYING_PO" | "READING_SOA" | "RETRYING_SOA" | "RECONCILING" | "COMPLETING"

const stages = [
  { key: "UPLOADING", label: "Upload PO dan SOA ke secure storage", progress: 28 },
  { key: "READING_FILES", label: "Membuka dan mengesahkan kedua-dua PDF", progress: 36 },
  { key: "READING_PO", label: "AI membaca Purchase Order", progress: 48 },
  { key: "VERIFYING_PO", label: "AI verify nombor, item dan jumlah PO", progress: 62 },
  { key: "READING_SOA", label: "AI membaca invoice dan payment dalam SOA", progress: 78 },
  { key: "RECONCILING", label: "Mengira aging dan keputusan pada tarikh PO", progress: 94 },
] as const

const stageAlias: Record<ProgressStage, string> = {
  IDLE: "",
  PREPARING: "UPLOADING",
  UPLOADING: "UPLOADING",
  READING_FILES: "READING_FILES",
  READING_PO: "READING_PO",
  VERIFYING_PO: "VERIFYING_PO",
  RETRYING_PO: "VERIFYING_PO",
  READING_SOA: "READING_SOA",
  RETRYING_SOA: "READING_SOA",
  RECONCILING: "RECONCILING",
  COMPLETING: "RECONCILING",
}

function uploadToR2(url: string, file: File, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", url)
    request.setRequestHeader("Content-Type", "application/pdf")
    request.upload.onprogress = event => event.lengthComputable && onProgress(event.loaded / event.total)
    request.onerror = () => reject(new Error("Sambungan upload ke Cloudflare R2 terputus."))
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Upload PDF gagal (${request.status}).`))
    request.send(file)
  })
}

async function readJson(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Server memberi respons tidak lengkap (${response.status}). Sila cuba semula.`)
  }
}

export function CreditCheckUploader() {
  const router = useRouter()
  const poRef = useRef<HTMLInputElement>(null)
  const soaRef = useRef<HTMLInputElement>(null)
  const [po, setPo] = useState<File | null>(null)
  const [soa, setSoa] = useState<File | null>(null)
  const [stage, setStage] = useState<ProgressStage>("IDLE")
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState("")
  const busy = stage !== "IDLE"
  const aliasedStage = stageAlias[stage]
  const activeIndex = stages.findIndex(item => item.key === aliasedStage)
  const retrying = stage === "RETRYING_PO" || stage === "RETRYING_SOA"

  useEffect(() => {
    if (!busy) return
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [busy])

  function applyServerStage(value: unknown) {
    if (typeof value !== "string" || !(value in stageAlias)) return
    const next = value as ProgressStage
    setStage(next)
    const mapped = stages.find(item => item.key === stageAlias[next])
    if (mapped) setProgress(current => Math.max(current, mapped.progress))
  }

  const choose = (setter: (file: File | null) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (file && (!file.name.toLowerCase().endsWith(".pdf") || file.size > 20 * 1024 * 1024)) {
      setError("Setiap fail mesti PDF, maksimum 20 MB.")
      return
    }
    setError("")
    setter(file)
  }

  async function start() {
    if (!po || !soa || busy) return
    setStage("PREPARING")
    setProgress(4)
    setElapsed(0)
    setError("")
    let pollTimer: number | undefined
    try {
      const preparedResponse = await fetch("/api/sales-ordering/credit-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ poName: po.name, poSize: po.size, soaName: soa.name, soaSize: soa.size }) })
      const prepared = await readJson(preparedResponse)
      if (!preparedResponse.ok) throw new Error(String(prepared.error || "Gagal menyediakan upload."))

      setStage("UPLOADING")
      let poProgress = 0
      let soaProgress = 0
      const updateUploadProgress = () => setProgress(8 + Math.round(((poProgress + soaProgress) / 2) * 20))
      await Promise.all([
        uploadToR2(String(prepared.poUploadUrl), po, value => { poProgress = value; updateUploadProgress() }),
        uploadToR2(String(prepared.soaUploadUrl), soa, value => { soaProgress = value; updateUploadProgress() }),
      ])

      const caseId = String(prepared.id)
      setStage("READING_FILES")
      setProgress(34)
      const processingPromise = fetch(`/api/sales-ordering/credit-check/${caseId}/process`, { method: "POST" })
      pollTimer = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/sales-ordering/credit-check/${caseId}/status`, { cache: "no-store" })
          if (!statusResponse.ok) return
          const status = await readJson(statusResponse)
          applyServerStage(status.status)
        } catch {
          // The processing request remains authoritative; polling can safely retry.
        }
      }, 1400)

      const processedResponse = await processingPromise
      const processed = await readJson(processedResponse)
      if (!processedResponse.ok) throw new Error(String(processed.error || "Semakan AI gagal."))
      setStage("COMPLETING")
      setProgress(100)
      router.push(`/forms/sales-ordering/credit-check/${caseId}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Semakan gagal.")
      setStage("IDLE")
      setProgress(0)
    } finally {
      if (pollTimer) window.clearInterval(pollTimer)
    }
  }

  const tile = (label: string, file: File | null, ref: React.RefObject<HTMLInputElement | null>, setter: (file: File | null) => void) => <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex min-h-44 flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-5 text-center transition hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"><input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={choose(setter)} />{file ? <FileText className="mb-3 h-9 w-9 text-emerald-600" /> : <UploadCloud className="mb-3 h-9 w-9 text-cyan-700" />}<p className="font-black text-slate-950">{file?.name || label}</p><p className="mt-1 text-xs font-semibold text-slate-500">PDF sahaja - maksimum 20 MB</p></button>

  return <section className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-2 text-cyan-700"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-black text-slate-950">Mulakan PO-SOA Check</h2><p className="text-sm text-slate-500">Kedua-dua dokumen diproses sebagai satu kes semakan.</p></div></div><div className="flex flex-col gap-4 md:flex-row">{tile("Upload Purchase Order", po, poRef, setPo)}{tile("Upload Statement of Account", soa, soaRef, setSoa)}</div><button type="button" disabled={!po || !soa || busy} onClick={start} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition disabled:bg-slate-300">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing {progress}%</> : "Run PO-SOA Credit Check"}</button>{busy && <div className="mt-4 rounded-2xl border border-cyan-100 bg-slate-50 p-4" aria-live="polite"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-slate-950">{retrying ? "Gemini sibuk - sistem sedang retry automatik" : stages[Math.max(0, activeIndex)]?.label || "Menyediakan semakan"}</p><p className="mt-1 text-xs font-semibold text-slate-500">Masa berjalan: {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}{retrying ? " - dokumen tidak perlu di-upload semula" : ""}</p></div>{retrying ? <RefreshCw className="h-5 w-5 animate-spin text-amber-600" /> : <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />}</div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-500 transition-all duration-700 ${busy ? "animate-pulse" : ""}`} style={{ width: `${progress}%` }} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{stages.map((item, index) => <div key={item.key} className={`flex items-center gap-2 text-xs font-bold ${index < activeIndex ? "text-emerald-700" : index === activeIndex ? "text-cyan-800" : "text-slate-400"}`}>{index < activeIndex ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${index === activeIndex ? "animate-pulse bg-cyan-500" : "bg-slate-300"}`} />}{item.label}</div>)}</div><p className="mt-4 text-xs font-semibold text-slate-500">Gemini boleh mengambil 1-3 minit ketika permintaan tinggi. Jangan tutup halaman sehingga selesai.</p></div>}{error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}</section>
}

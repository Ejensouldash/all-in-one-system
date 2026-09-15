"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileText, Loader2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react"

type Stage = "IDLE" | "PREPARING" | "UPLOADING" | "EXTRACTING" | "VERIFYING" | "VALIDATING"

const steps: { stage: Exclude<Stage, "IDLE">; label: string; threshold: number }[] = [
  { stage: "PREPARING", label: "Preparing secure upload", threshold: 8 },
  { stage: "UPLOADING", label: "Uploading PDF to Cloudflare R2", threshold: 62 },
  { stage: "EXTRACTING", label: "AI reading PDF layout and tables", threshold: 78 },
  { stage: "VERIFYING", label: "AI verifying spelling, codes, and totals", threshold: 92 },
  { stage: "VALIDATING", label: "Matching customer and validating data", threshold: 98 },
]

function uploadToR2(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", url)
    request.setRequestHeader("Content-Type", "application/pdf")
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    request.onerror = () => reject(new Error("Connection to Cloudflare R2 was lost."))
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`R2 upload failed (${request.status}). Check CORS and bucket credentials.`))
    request.send(file)
  })
}

export function IntakeUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>("IDLE")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")

  const busy = stage !== "IDLE"
  const activeStep = steps.findIndex(step => step.stage === stage)

  useEffect(() => {
    if (stage !== "EXTRACTING" && stage !== "VERIFYING" && stage !== "VALIDATING") return
    const timer = window.setInterval(() => {
      setProgress(current => {
        const ceiling = stage === "EXTRACTING" ? 84 : stage === "VERIFYING" ? 95 : 98
        return current < ceiling ? Math.min(ceiling, current + 1) : current
      })
    }, 700)
    return () => window.clearInterval(timer)
  }, [stage])

  async function start() {
    if (!file || busy) return
    setError("")
    setProgress(3)
    try {
      setStage("PREPARING")
      const prepare = await fetch("/api/sales-ordering/intake/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type || "application/pdf" }) })
      const prepared = await prepare.json()
      if (!prepare.ok) throw new Error(prepared.error || "Failed to prepare secure upload.")

      setStage("UPLOADING")
      await uploadToR2(prepared.uploadUrl, file, uploaded => setProgress(8 + Math.round(uploaded * 54)))

      setProgress(68)
      setStage("EXTRACTING")
      const verificationTimer = window.setTimeout(() => setStage(current => current === "EXTRACTING" ? "VERIFYING" : current), 3500)
      const validationTimer = window.setTimeout(() => setStage(current => current === "VERIFYING" ? "VALIDATING" : current), 8000)
      const process = await fetch(`/api/sales-ordering/intake/${prepared.intakeId}/process`, { method: "POST" })
      window.clearTimeout(verificationTimer)
      window.clearTimeout(validationTimer)
      const processed = await process.json()
      if (!process.ok) throw new Error(processed.error || "Gemini processing failed.")

      setStage("VALIDATING")
      setProgress(100)
      router.push(`/forms/sales-ordering/intake/${prepared.intakeId}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload process failed.")
      setStage("IDLE")
      setProgress(0)
    }
  }

  return <div className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-6 lg:flex-row lg:items-center"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="group flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/60 px-6 text-center transition hover:border-cyan-500 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={event => { const selected = event.target.files?.[0] || null; setError(""); if (selected && selected.size > 20 * 1024 * 1024) { setError("PDF exceeds 20 MB limit."); setFile(null); return } setFile(selected) }} />{file ? <FileText className="mb-3 h-10 w-10 text-cyan-700" /> : <UploadCloud className="mb-3 h-10 w-10 text-cyan-700 transition group-hover:-translate-y-1" />}<p className="font-black text-slate-950">{file ? file.name : "Select customer PO / invoice PDF"}</p><p className="mt-1 text-xs font-semibold text-slate-500">PDF only, maximum 20 MB</p>{file && <p className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}</button><div className="flex-1"><div className="space-y-3 text-sm text-slate-600"><p className="flex items-start gap-2"><UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> PDF is stored directly in private Cloudflare R2.</p><p className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" /> AI performs dual-pass extraction: reads document, then verifies spelling, codes, and totals.</p><p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> SOD must review before system creates draft SO.</p></div><button type="button" onClick={start} disabled={!file || busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing document... {progress}%</> : <><Sparkles className="h-4 w-4" /> Upload & Extract with AI</>}</button>{busy && <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4" aria-live="polite"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-slate-900">{steps[Math.max(0, activeStep)]?.label}</p><span className="text-sm font-black text-cyan-700">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-cyan-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid gap-2 text-xs font-semibold sm:grid-cols-2">{steps.map((step, index) => <div key={step.stage} className={`flex items-center gap-2 ${index <= activeStep ? "text-emerald-700" : "text-slate-400"}`}>{index < activeStep ? <CheckCircle2 className="h-4 w-4" /> : <span className={`h-2.5 w-2.5 rounded-full ${index === activeStep ? "animate-pulse bg-cyan-500" : "bg-slate-300"}`} />}{step.label}</div>)}</div><p className="mt-3 text-xs font-semibold text-cyan-800">Do not close this page until processing is complete.</p></div>}{error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}</div></div></div>
}

"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react"

type Stage = "IDLE" | "PREPARING" | "UPLOADING" | "PROCESSING"

export function IntakeUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<Stage>("IDLE")
  const [error, setError] = useState("")

  const busy = stage !== "IDLE"
  const stageLabel = stage === "PREPARING" ? "Menyediakan secure upload..."
    : stage === "UPLOADING" ? "Upload PDF terus ke Cloudflare R2..."
    : stage === "PROCESSING" ? "Gemini sedang membaca dokumen..."
    : ""

  async function start() {
    if (!file || busy) return
    setError("")
    try {
      setStage("PREPARING")
      const prepare = await fetch("/api/sales-ordering/intake/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type || "application/pdf" }),
      })
      const prepared = await prepare.json()
      if (!prepare.ok) throw new Error(prepared.error || "Secure upload gagal disediakan.")

      setStage("UPLOADING")
      const upload = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      })
      if (!upload.ok) throw new Error(`R2 upload gagal (${upload.status}). Semak CORS dan credential bucket.`)

      setStage("PROCESSING")
      const process = await fetch(`/api/sales-ordering/intake/${prepared.intakeId}/process`, { method: "POST" })
      const processed = await process.json()
      if (!process.ok) throw new Error(processed.error || "Gemini processing gagal.")

      router.push(`/forms/sales-ordering/intake/${prepared.intakeId}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proses upload gagal.")
      setStage("IDLE")
    }
  }

  return (
    <div className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="group flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/60 px-6 text-center transition hover:border-cyan-500 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={event => {
              const selected = event.target.files?.[0] || null
              setError("")
              if (selected && selected.size > 20 * 1024 * 1024) {
                setError("PDF melebihi had 20 MB.")
                setFile(null)
                return
              }
              setFile(selected)
            }}
          />
          {file ? <FileText className="mb-3 h-10 w-10 text-cyan-700" /> : <UploadCloud className="mb-3 h-10 w-10 text-cyan-700 transition group-hover:-translate-y-1" />}
          <p className="font-black text-slate-950">{file ? file.name : "Pilih customer PO / invoice PDF"}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">PDF sahaja, maksimum 20 MB</p>
          {file && <p className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </button>

        <div className="flex-1">
          <div className="space-y-3 text-sm text-slate-600">
            <p className="flex items-start gap-2"><UploadCloud className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /> PDF disimpan terus dalam private Cloudflare R2.</p>
            <p className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" /> Gemini extract customer, PO, item, price, terms dan alamat.</p>
            <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> SOD wajib review sebelum sistem create draft SO.</p>
          </div>
          <button
            type="button"
            onClick={start}
            disabled={!file || busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {stageLabel}</> : <><Sparkles className="h-4 w-4" /> Upload & Extract dengan AI</>}
          </button>
          {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
        </div>
      </div>
    </div>
  )
}


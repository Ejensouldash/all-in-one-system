"use client"

import { useState } from "react"
import { FileText, Loader2, X, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"

export function GenerateReportButton({ from, to }: { from: string; to: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [useAi, setUseAi] = useState(true)
  const [rangeFrom, setRangeFrom] = useState(from)
  const [rangeTo, setRangeTo] = useState(to)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const openModal = () => {
    setRangeFrom(from)
    setRangeTo(to)
    setError(null)
    setDone(null)
    setOpen(true)
  }

  const generate = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const res = await fetch("/api/analytics/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: rangeFrom, to: rangeTo, useAi }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Gagal menjana laporan (${res.status})`)
      }

      const source = res.headers.get("X-Summary-Source")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Laporan-Analitik-Pengeluaran-${rangeFrom}-ke-${rangeTo}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setDone(
        source === "ai"
          ? "Laporan siap dimuat turun dengan ringkasan AI."
          : "Laporan siap dimuat turun. AI tidak tersedia, ringkasan dijana daripada data."
      )
    } catch (e: any) {
      setError(e.message || "Gagal menjana laporan")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm transition-colors"
      >
        <FileText className="w-4 h-4" />
        Generate Report
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Jana Laporan PDF
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Dari</span>
                  <input
                    type="date"
                    value={rangeFrom}
                    max={rangeTo}
                    onChange={e => setRangeFrom(e.target.value)}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Hingga</span>
                  <input
                    type="date"
                    value={rangeTo}
                    min={rangeFrom}
                    onChange={e => setRangeTo(e.target.value)}
                    className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={e => setUseAi(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-600"
                />
                <span>
                  <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Executive Summary dengan AI
                  </span>
                  <span className="block text-[10px] text-gray-500 font-medium mt-0.5 leading-snug">
                    Jika AI tidak tersedia, ringkasan tetap dijana terus daripada data.
                  </span>
                </span>
              </label>

              <p className="text-[10px] text-gray-400 font-medium leading-snug">
                Laporan mengandungi muka depan, isi kandungan, executive summary, analisis SKU, shift,
                downtime, kualiti dan kepatuhan borang.
              </p>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-800 leading-snug">{error}</p>
                </div>
              )}
              {done && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-emerald-800 leading-snug">{done}</p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-600 hover:text-gray-900 disabled:opacity-40"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={busy || rangeFrom > rangeTo}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-black uppercase tracking-wide rounded-lg transition-colors"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {busy ? "Menjana..." : "Jana PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

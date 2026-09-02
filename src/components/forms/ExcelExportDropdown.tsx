"use client"

import { useState, useRef, useEffect } from "react"
import { FileSpreadsheet, ChevronDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

interface ExcelExportDropdownProps {
  from: string
  to: string
}

export function ExcelExportDropdown({ from, to }: ExcelExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tutup dropdown apabila pengguna klik di luar kawasan
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const exportBalance = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    setIsOpen(false)

    try {
      const res = await fetch("/api/analytics/storeroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asOf: to }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Gagal menjana Excel Balance (${res.status})`)
      }

      const blob = await res.blob()
      triggerDownload(blob, `Baki-Storeroom-${to}.xlsx`)
      setSuccess("Export Balance berjaya dimuat turun.")
      setTimeout(() => setSuccess(null), 4000)
    } catch (e: any) {
      setError(e.message || "Gagal menjana Excel Balance")
      setTimeout(() => setError(null), 6000)
    } finally {
      setBusy(false)
    }
  }

  const exportUsage = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    setIsOpen(false)

    try {
      const res = await fetch("/api/analytics/usage-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Gagal menjana Excel Usage (${res.status})`)
      }

      const blob = await res.blob()
      triggerDownload(blob, `BubblesO2_Usage_Report_${from}_to_${to}.xlsx`)
      setSuccess("Export Usage berjaya dimuat turun.")
      setTimeout(() => setSuccess(null), 4000)
    } catch (e: any) {
      setError(e.message || "Gagal menjana Excel Usage")
      setTimeout(() => setError(null), 6000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex flex-col items-stretch gap-1">
        <button
          type="button"
          onClick={() => !busy && setIsOpen(prev => !prev)}
          disabled={busy}
          title="Pilih eksport fail Excel (Balance atau Usage)"
          aria-haspopup="true"
          aria-expanded={isOpen}
          className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 select-none"
        >
          <div className="flex items-center gap-1.5">
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-100 shrink-0" />
            )}
            <span>{busy ? "Generating Excel…" : "Excel"}</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {error && (
          <div className="absolute top-full left-0 mt-1.5 z-50 flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-lg max-w-[280px]">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="absolute top-full left-0 mt-1.5 z-50 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-lg max-w-[280px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {isOpen && !busy && (
        <div className="origin-top-right absolute right-0 sm:left-0 sm:right-auto mt-2 w-56 rounded-xl shadow-xl bg-white ring-1 ring-black/5 divide-y divide-gray-100 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1.5">
            <button
              type="button"
              onClick={exportBalance}
              className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <div className="font-bold text-gray-900 group-hover:text-emerald-900">Export Balance</div>
                <div className="text-[10px] text-gray-500 font-normal">Baki carry forward storeroom setakat {to}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={exportUsage}
              className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <div className="font-bold text-gray-900 group-hover:text-emerald-900">Export Usage</div>
                <div className="text-[10px] text-gray-500 font-normal">Laporan 7-sheet penggunaan bahan ({from} – {to})</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

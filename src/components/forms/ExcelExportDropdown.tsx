"use client"

import { useState, useRef, useEffect } from "react"
import {
  FileSpreadsheet,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Boxes,
} from "lucide-react"
import { BatchTraceModal } from "./BatchTraceModal"

interface ExcelExportDropdownProps {
  from: string
  to: string
}

export function ExcelExportDropdown({ from, to }: ExcelExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside or Escape
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
        throw new Error(payload.error || `Failed to generate Storeroom Balance (${res.status})`)
      }

      const blob = await res.blob()
      triggerDownload(blob, `BubblesO2_Storeroom_Balance_${to}.xlsx`)
      setSuccess("Storeroom Balance Excel downloaded successfully.")
      setTimeout(() => setSuccess(null), 4000)
    } catch (e: any) {
      setError(e.message || "Failed to generate Storeroom Balance")
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
        throw new Error(payload.error || `Failed to generate Material Usage (${res.status})`)
      }

      const blob = await res.blob()
      triggerDownload(blob, `BubblesO2_Usage_Report_${from}_to_${to}.xlsx`)
      setSuccess("Material Usage Report downloaded successfully.")
      setTimeout(() => setSuccess(null), 4000)
    } catch (e: any) {
      setError(e.message || "Failed to generate Material Usage")
      setTimeout(() => setError(null), 6000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <div className="flex flex-col items-stretch gap-1">
          <button
            type="button"
            onClick={() => !busy && setIsOpen(prev => !prev)}
            disabled={busy}
            title="Export reports in Excel or batch print DPR"
            aria-haspopup="true"
            aria-expanded={isOpen}
            className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 select-none cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-100 shrink-0" />
              )}
              <span>{busy ? "Generating…" : "Export"}</span>
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
          <div className="origin-top-right absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 rounded-xl shadow-xl bg-white ring-1 ring-black/5 divide-y divide-gray-100 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100">
            <div className="p-1.5 space-y-1">
              {/* Option 1: Batch Traceability & DPR */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  setIsModalOpen(true)
                }}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-emerald-900 flex items-center gap-1.5">
                    <span>Batch Traceability &amp; DPR</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded uppercase">
                      New
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    Bottle-to-box Excel &amp; batch print DPRs by ISO week
                  </div>
                </div>
              </button>

              {/* Option 2: Export Storeroom Balance */}
              <button
                type="button"
                onClick={exportBalance}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-emerald-900">
                    Export Storeroom Balance
                  </div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    Storeroom carry-forward balance as of {to}
                  </div>
                </div>
              </button>

              {/* Option 3: Export Material Usage */}
              <button
                type="button"
                onClick={exportUsage}
                className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors group cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                <div>
                  <div className="font-bold text-gray-900 group-hover:text-emerald-900">
                    Export Material Usage
                  </div>
                  <div className="text-[10px] text-gray-500 font-normal">
                    Comprehensive 7-sheet usage report ({from} to {to})
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ISO Week Batch Traceability & DPR Modal */}
      <BatchTraceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

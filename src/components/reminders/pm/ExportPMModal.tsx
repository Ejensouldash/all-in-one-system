"use client"

import { useState } from "react"
import {
  FileText,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Lock,
  Calendar,
  X,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react"
import { ModalShell } from "../ModalShell"
import { buttonClass } from "./PMFields"

interface ExportPMModalProps {
  open: boolean
  onClose: () => void
  initialFormat?: "pdf" | "excel"
  defaultFrom: string
  defaultTo: string
  currentYear: number
  currentMonth: number
  onSuccess?: (msg: string) => void
  onError?: (msg: string) => void
}

export function ExportPMModal({
  open,
  onClose,
  initialFormat = "pdf",
  defaultFrom,
  defaultTo,
  currentYear,
  currentMonth,
  onSuccess,
  onError,
}: ExportPMModalProps) {
  const [format, setFormat] = useState<"pdf" | "excel">(initialFormat)
  const [mode, setMode] = useState<"INTERNAL" | "AUDITOR">("AUDITOR")

  // Date Range state
  const [rangePreset, setRangePreset] = useState<"month" | "year" | "custom">("month")
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  // Auditor Mode Toggles
  const [hideInternalNotes, setHideInternalNotes] = useState(true)
  const [hideOverduePending, setHideOverduePending] = useState(false)
  const [hidePersonalContact, setHidePersonalContact] = useState(true)
  const [hideSignatures, setHideSignatures] = useState(false)

  const [downloading, setDownloading] = useState(false)

  // Handle Range Preset changes
  const applyPreset = (preset: "month" | "year" | "custom") => {
    setRangePreset(preset)
    if (preset === "month") {
      const m = String(currentMonth + 1).padStart(2, "0")
      const start = `${currentYear}-${m}-01`
      const lastDay = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate()
      const end = `${currentYear}-${m}-${String(lastDay).padStart(2, "0")}`
      setFromDate(start)
      setToDate(end)
    } else if (preset === "year") {
      setFromDate(`${currentYear}-01-01`)
      setToDate(`${currentYear}-12-31`)
    }
  }

  // Handle Export Download Action
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const endpoint = format === "pdf" ? "/api/reminders/pm/export/pdf" : "/api/reminders/pm/export/excel"
      const params = new URLSearchParams()
      params.set("from", fromDate)
      params.set("to", toDate)
      params.set("mode", mode)

      if (mode === "AUDITOR") {
        if (hideInternalNotes) params.set("hideInternalNotes", "true")
        if (hideOverduePending) params.set("hideOverduePending", "true")
        if (hidePersonalContact) params.set("hidePersonalContact", "true")
        if (hideSignatures) params.set("hideSignatures", "true")
      }

      const url = `${endpoint}?${params.toString()}`

      // Fetch file as blob to guarantee error handling and clean download
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || `Gagal menjana fail ${format.toUpperCase()}.`)
      }

      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition")
      let filename = `SGMP03_${mode}_${fromDate}_ke_${toDate}.${format === "pdf" ? "pdf" : "xlsx"}`
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      }

      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(blobUrl)
      document.body.removeChild(a)

      onSuccess?.(`Fail ${format.toUpperCase()} (${mode === "AUDITOR" ? "Audit Luaran" : "Dalaman"}) berjaya dimuat turun.`)
      onClose()
    } catch (err: unknown) {
      console.error("Export download error:", err)
      onError?.(err instanceof Error ? err.message : "Ralat tidak dijangka semasa memuat turun fail.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                format === "pdf" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {format === "pdf" ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Eksport Laporan SGMP-03 ({format.toUpperCase()})
              </h3>
              <p className="text-xs text-gray-500">
                Pilih jenis laporan, tempoh masa, dan penapis kerahsiaan auditor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Switcher */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Format Fail
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormat("pdf")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                format === "pdf"
                  ? "border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <FileText className="h-4 w-4" /> PDF (Laporan Rasmi & Sijil)
            </button>
            <button
              type="button"
              onClick={() => setFormat("excel")}
              className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                format === "excel"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel (Jadual & Log 4-Tab)
            </button>
          </div>
        </div>

        {/* Mode Selector: Internal vs Auditor */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Sasaran Laporan (Target Audience) *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("AUDITOR")}
              className={`flex flex-col items-start p-3 rounded-2xl border transition text-left ${
                mode === "AUDITOR"
                  ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 mb-0.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                Laporan Auditor (Luaran)
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Disusun khas untuk semakan audit kualiti GMP dengan penapisan isu sensitif.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("INTERNAL")}
              className={`flex flex-col items-start p-3 rounded-2xl border transition text-left ${
                mode === "INTERNAL"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-800 mb-0.5">
                <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                Laporan Dalaman (Penuh)
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Semua catatan kerosakan dalaman, log tertunggak dan rekod dipaparkan tanpa sekatan.
              </p>
            </button>
          </div>
        </div>

        {/* Auditor Custom Filters (Visible only in Auditor Mode) */}
        {mode === "AUDITOR" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Pilihan Penapisan Auditor
              </span>
              <span className="text-[10px] font-normal text-emerald-600">Boleh diubahsuai</span>
            </div>

            <div className="space-y-2 text-xs text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideInternalNotes}
                  onChange={(e) => setHideInternalNotes(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sembunyikan catatan kerosakan dalaman / ulasan teknikal sensitif</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideOverduePending}
                  onChange={(e) => setHideOverduePending(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sembunyikan tugasan tertunggak (Hanya paparkan rekod patuh / selesai)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hidePersonalContact}
                  onChange={(e) => setHidePersonalContact(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sembunyikan nama peribadi staf (Gunakan gelaran rasmi jawatan)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSignatures}
                  onChange={(e) => setHideSignatures(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sembunyikan imej tandatangan (Gunakan status bertaip sahaja)</span>
              </label>
            </div>
          </div>
        )}

        {/* Date Range Presets */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Tempoh Tarikh Laporan
          </label>
          <div className="flex gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => applyPreset("month")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                rangePreset === "month"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset("year")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                rangePreset === "year"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tahun Ini ({currentYear})
            </button>
            <button
              type="button"
              onClick={() => setRangePreset("custom")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                rangePreset === "custom"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Pilihan Bebas
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400 font-medium block mb-1">Dari:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setRangePreset("custom")
                  setFromDate(e.target.value)
                }}
                className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <span className="text-gray-400 font-medium block mb-1">Hingga:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setRangePreset("custom")
                  setToDate(e.target.value)
                }}
                className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownload}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
              format === "pdf"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } disabled:opacity-50`}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menjana & Memuat Turun…
              </>
            ) : (
              <>
                {format === "pdf" ? <FileText className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                Jana {format.toUpperCase()} ({mode === "AUDITOR" ? "Auditor" : "Dalaman"})
              </>
            )}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

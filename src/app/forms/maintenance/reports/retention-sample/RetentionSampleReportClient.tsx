"use client"

import React, { useState, useEffect, useCallback, useTransition } from "react"
import Link from "next/link"
import {
  Plus,
  Printer,
  FileDown,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  Clock,
} from "lucide-react"
import { RetentionSampleHeader } from "../../retention-sample/RetentionSampleHeader"
import { RetentionSampleModal } from "../../retention-sample/RetentionSampleModal"
import {
  getRetentionSampleRecords,
  voidRetentionSampleRecord,
} from "../../retention-sample/actions"
import {
  RETENTION_SKU_OPTIONS,
  type RetentionSampleRecordDTO,
} from "../../retention-sample/types"

const MONTH_NAMES = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember"
]

interface RetentionSampleReportClientProps {
  initialRecords: RetentionSampleRecordDTO[]
  initialMonth: number
  initialYear: number
  canManage: boolean
  userName: string
}

export function RetentionSampleReportClient({
  initialRecords,
  initialMonth,
  initialYear,
  canManage,
  userName,
}: RetentionSampleReportClientProps) {
  const [records, setRecords] = useState<RetentionSampleRecordDTO[]>(initialRecords)
  const [month, setMonth] = useState<number>(initialMonth)
  const [year, setYear] = useState<number>(initialYear)
  const [search, setSearch] = useState<string>("")
  const [selectedSku, setSelectedSku] = useState<string>("ALL")
  const [includeVoided, setIncludeVoided] = useState<boolean>(false)

  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RetentionSampleRecordDTO | null>(null)

  // Void modal state
  const [voidingRecord, setVoidingRecord] = useState<RetentionSampleRecordDTO | null>(null)
  const [voidReason, setVoidReason] = useState("")
  const [voidError, setVoidError] = useState<string | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)

  // Feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Refetch records when filters change
  const refreshRecords = useCallback(() => {
    startTransition(async () => {
      const res = await getRetentionSampleRecords({
        month,
        year,
        search: search.trim() || undefined,
        sku: selectedSku !== "ALL" ? selectedSku : undefined,
        includeVoided,
      })
      if (res.success && res.data) {
        setRecords(res.data)
      }
    })
  }, [month, year, search, selectedSku, includeVoided])

  useEffect(() => {
    refreshRecords()
  }, [refreshRecords])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    refreshRecords()
  }

  function handleResetFilters() {
    setSearch("")
    setSelectedSku("ALL")
    setIncludeVoided(false)
  }

  function handlePrevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setMonth(1)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  function handlePrint() {
    const origTitle = document.title
    document.title = `Retention_Sample_Record_SGMP-21-RSR_${MONTH_NAMES[month - 1]}_${year}`
    window.print()
    document.title = origTitle
  }

  function handleExportPdf() {
    const paddedMonth = String(month).padStart(2, "0")
    const url = `/api/forms/maintenance/retention-sample/export?month=${year}-${paddedMonth}`
    window.open(url, "_blank")
  }

  async function handleConfirmVoid() {
    if (!voidingRecord) return
    if (!voidReason.trim() || voidReason.trim().length < 3) {
      setVoidError("Sila masukkan sebab pembatalan (sekurang-kurangnya 3 aksara).")
      return
    }

    setVoidLoading(true)
    setVoidError(null)

    const res = await voidRetentionSampleRecord(voidingRecord.id, voidReason)
    setVoidLoading(false)

    if (res.success) {
      setVoidingRecord(null)
      setVoidReason("")
      showToast("Rekod berjaya dibatalkan (VOID).")
      refreshRecords()
    } else {
      setVoidError(res.error || "Gagal membatalkan rekod.")
    }
  }

  // Format date-time for table display in local Malaysia time
  function formatRowDateTime(isoString: string) {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-700 text-white px-5 py-3.5 rounded-xl shadow-2xl border border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar (Hidden on Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/forms/maintenance/reports"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-700 transition-colors p-2 hover:bg-slate-100 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Senarai Laporan</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-semibold text-slate-500">
            Pengguna: <strong className="text-slate-800">{userName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/forms/maintenance/retention-sample"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Isi Borang Baharu</span>
          </Link>
        </div>
      </div>

      {/* Control Bar: Month/Year navigation & Export (Hidden on Print) */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month & Year Navigation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-2 hover:bg-white rounded-lg transition text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 font-black text-slate-800 uppercase tracking-wide text-sm sm:text-base select-none">
                {MONTH_NAMES[month - 1]} {year}
              </div>
              <button
                onClick={handleNextMonth}
                title="Bulan Seterusnya"
                className="p-2 hover:bg-white rounded-lg transition text-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons: Print, Export PDF */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition shadow-xs"
              title="Cetak format fizikal A4 Landscape"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Cetak (A4 Landscape)</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs sm:text-sm font-bold transition shadow-xs"
              title="Muat turun fail PDF"
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span>Eksport PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Controls: Search, SKU filter, Void toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari No Batch atau Prepared By..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-bold transition"
            >
              Cari
            </button>
          </form>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600 uppercase">SKU:</span>
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">Semua SKU</option>
                {RETENTION_SKU_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
              <input
                type="checkbox"
                checked={includeVoided}
                onChange={(e) => setIncludeVoided(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Papar Batal (VOID)</span>
            </label>

            {(search || selectedSku !== "ALL" || includeVoided) && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Set Semula</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Document & Records Display (Rendered for both Web & Print) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 print:p-0 print:border-none print:shadow-none">
        {/* Document Control Header */}
        <RetentionSampleHeader monthName={MONTH_NAMES[month - 1]} year={year} />

        {/* Records Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs sm:text-sm">
            <thead>
              <tr className="bg-white text-black font-black uppercase text-center border-b border-black">
                <th className="border border-black py-2.5 px-3 w-10">No</th>
                <th className="border border-black py-2.5 px-4 w-44">Date & Time</th>
                <th className="border border-black py-2.5 px-4 w-28">SKU</th>
                <th className="border border-black py-2.5 px-4 w-32">Amount Sample</th>
                <th className="border border-black py-2.5 px-4 w-36">No Batch</th>
                <th className="border border-black py-2.5 px-4">Prepared By</th>
                <th className="border border-black py-2.5 px-4 w-44 print:w-36">Pengesahan / Status</th>
                <th className="border border-black py-2.5 px-3 w-24 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Memuatkan rekod sampel...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Tiada rekod sampel simpanan bagi {MONTH_NAMES[month - 1]} {year}.
                  </td>
                </tr>
              ) : (
                records.map((record, index) => {
                  const isVoid = record.status === "VOID"
                  const isVerified = Boolean(record.verifiedBy)
                  return (
                    <tr
                      key={record.id}
                      className={`text-center border-b border-black hover:bg-slate-50 transition-colors ${
                        isVoid ? "bg-red-50/70 text-red-900 line-through opacity-75" : ""
                      }`}
                    >
                      <td className="border border-black py-2.5 px-2 font-bold text-slate-600">
                        {index + 1}
                      </td>
                      <td className="border border-black py-2.5 px-3 text-left font-medium">
                        {formatRowDateTime(record.sampleDateTime)}
                      </td>
                      <td className="border border-black py-2.5 px-3 font-black text-slate-900">
                        {record.sku}
                      </td>
                      <td className="border border-black py-2.5 px-3 font-bold">
                        {record.amountSample}
                      </td>
                      <td className="border border-black py-2.5 px-3 font-mono font-bold tracking-wider">
                        {record.batchNo}
                      </td>
                      <td className="border border-black py-2.5 px-3 text-left font-medium">
                        <div>{record.preparedByName}</div>
                        {record.remarks && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Catatan: {record.remarks}
                          </div>
                        )}
                      </td>
                      <td className="border border-black py-2 px-3 text-center">
                        {isVoid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-200 text-red-800">
                            BATAL (VOID)
                          </span>
                        ) : isVerified ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{record.verifiedBy}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Belum Disahkan</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-black py-2 px-2 print:hidden">
                        {isVoid ? (
                          <span className="text-[10px] text-red-600 italic">Batal</span>
                        ) : canManage ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingRecord(record)
                                setIsModalOpen(true)
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                              title="Kemaskini Rekod"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setVoidingRecord(record)
                                setVoidReason("")
                                setVoidError(null)
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                              title="Batal Rekod (VOID)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Signature Section for Physical Form Compliance */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            <span>Jumlah Rekod Bulan Ini: </span>
            <strong className="text-slate-800 font-bold">{records.length} entri</strong>
            {records.length > 0 && (
              <span className="ml-2 text-slate-400">
                (Jumlah Sampel:{" "}
                {records
                  .filter((r) => r.status === "ACTIVE")
                  .reduce((acc, r) => acc + r.amountSample, 0)}{" "}
                unit)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 italic">
            Dokumen Kualiti Bubbles O2 • Sistem Bersepadu AIO • Pengesahan Penyelia dibuat di tab Summary
          </div>
        </div>

        {/* Print-only Signatures Box */}
        <div className="hidden print:grid grid-cols-2 gap-8 mt-12 pt-6 border-t-2 border-black text-xs">
          <div className="border border-black p-4 h-28 flex flex-col justify-between">
            <span className="font-bold uppercase tracking-wider">Disediakan Oleh (Operator / QC):</span>
            <div className="border-t border-dotted border-black pt-1 flex justify-between text-[11px]">
              <span>Nama: _______________________</span>
              <span>Tarikh: ____________</span>
            </div>
          </div>
          <div className="border border-black p-4 h-28 flex flex-col justify-between">
            <span className="font-bold uppercase tracking-wider">Disahkan Oleh (Penyelia / Supervisor):</span>
            <div className="border-t border-dotted border-black pt-1 flex justify-between text-[11px]">
              <span>Nama: _______________________</span>
              <span>Tarikh: ____________</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Record Modal */}
      {isModalOpen && (
        <RetentionSampleModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingRecord(null)
          }}
          onSuccess={() => {
            showToast("Rekod sampel berjaya dikemaskini.")
            refreshRecords()
          }}
          recordToEdit={editingRecord}
          userName={userName}
        />
      )}

      {/* Void Confirmation Modal */}
      {voidingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Batal Rekod Sampel (VOID)</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan direkodkan dalam log audit.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500">No Batch:</span>{" "}
                <strong className="font-mono text-slate-900">{voidingRecord.batchNo}</strong>
              </div>
              <div>
                <span className="text-slate-500">SKU:</span>{" "}
                <strong className="text-slate-900">{voidingRecord.sku}</strong>
              </div>
              <div>
                <span className="text-slate-500">Kuantiti:</span>{" "}
                <strong className="text-slate-900">{voidingRecord.amountSample}</strong>
              </div>
            </div>

            {voidError && (
              <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {voidError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Sebab Pembatalan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Kesilapan nombor batch / botol rosak semasa persampelan..."
                rows={3}
                className="w-full text-xs sm:text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVoidingRecord(null)}
                disabled={voidLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={voidLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
              >
                {voidLoading ? "Memproses..." : "Sahkan Batal (VOID)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

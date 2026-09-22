"use client"

import React, { useState } from "react"
import { X, Save, PlusCircle, AlertCircle, CheckCircle2, Lock, Layers, Hash } from "lucide-react"
import {
  createRetentionSampleRecord,
  updateRetentionSampleRecord,
} from "./actions"
import {
  RETENTION_SKU_OPTIONS,
  isValidBatchFormat,
  type RetentionSampleRecordDTO,
} from "./types"

interface RetentionSampleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userName: string
  recordToEdit?: RetentionSampleRecordDTO | null
}

function getLocalMalaysiaDateTimeString(date?: Date): string {
  const d = date || new Date()
  const offset = 8 * 60 * 60 * 1000
  const localTime = new Date(d.getTime() + offset)
  return localTime.toISOString().slice(0, 16)
}

function formatDisplayDateTime(isoOrLocalString: string): string {
  if (!isoOrLocalString) return "-"
  const d = new Date(isoOrLocalString)
  if (isNaN(d.getTime())) return isoOrLocalString

  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function RetentionSampleFormContent({
  onClose,
  onSuccess,
  userName,
  recordToEdit,
}: {
  onClose: () => void
  onSuccess: () => void
  userName: string
  recordToEdit?: RetentionSampleRecordDTO | null
}) {
  const isEditing = !!recordToEdit

  const [dateTime, setDateTime] = useState<string>(() =>
    recordToEdit
      ? getLocalMalaysiaDateTimeString(new Date(recordToEdit.sampleDateTime))
      : getLocalMalaysiaDateTimeString()
  )
  const [sku, setSku] = useState<string>(() => recordToEdit?.sku || "425")
  const [amountSample, setAmountSample] = useState<string>(() =>
    recordToEdit ? String(recordToEdit.amountSample) : "24"
  )
  const [batchNo, setBatchNo] = useState<string>(() => recordToEdit?.batchNo || "")
  const [remarks, setRemarks] = useState<string>(() => recordToEdit?.remarks || "")
  const [editReason, setEditReason] = useState<string>("")

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  function validateInputs(): string | null {
    if (!dateTime) return "Sila pilih Tarikh & Masa."
    if (!sku) return "Sila pilih SKU."

    const parsedAmount = Number(amountSample)
    if (!amountSample || isNaN(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return "Amount Sample mestilah nombor bulat positif (contoh: 12, 24)."
    }

    const cleanBatch = batchNo.trim()
    if (!cleanBatch) return "Sila masukkan No Batch."
    if (!isValidBatchFormat(cleanBatch)) {
      return "Format No Batch mestilah 6 digit tarikh diikuti tanda sempang dan 2 digit running batch (contoh: 013526-01)."
    }

    if (isEditing && (!editReason || editReason.trim().length < 3)) {
      return "Sila masukkan sebab pindaan/edit untuk rekod audit GMP (minima 3 aksara)."
    }

    return null
  }

  async function handleSave(keepOpenForNext: boolean = false) {
    const valErr = validateInputs()
    if (valErr) {
      setError(valErr)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [datePart, timePart] = dateTime.split("T")
      const isoTimestamp = `${datePart}T${timePart}:00+08:00`

      if (isEditing && recordToEdit) {
        const res = await updateRetentionSampleRecord(recordToEdit.id, {
          sampleDateTime: isoTimestamp,
          sku,
          amountSample: parseInt(amountSample, 10),
          batchNo: batchNo.trim(),
          remarks: remarks.trim() || undefined,
          editReason: editReason.trim(),
        })

        if (!res.success) {
          setError(res.error || "Gagal mengemaskini rekod.")
          setLoading(false)
          return
        }

        onSuccess()
        onClose()
      } else {
        const res = await createRetentionSampleRecord({
          sampleDateTime: isoTimestamp,
          sku,
          amountSample: parseInt(amountSample, 10),
          batchNo: batchNo.trim(),
          remarks: remarks.trim() || undefined,
        })

        if (!res.success) {
          setError(res.error || "Gagal menyimpan rekod.")
          setLoading(false)
          return
        }

        onSuccess()

        if (keepOpenForNext) {
          setSuccessToast(`Rekod SKU ${sku} (${amountSample}) berjaya disimpan! Boleh tambah SKU seterusnya.`)
          setSku(sku === "425" ? "800" : "425")
          setAmountSample(sku === "425" ? "12" : "24")
          setTimeout(() => setSuccessToast(null), 4000)
        } else {
          onClose()
        }
      }
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "Ralat luar jangka berlaku semasa menyimpan."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden my-8">
      {/* Modal Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <div className="text-[11px] font-mono tracking-widest text-blue-400 uppercase font-bold">
            SGMP/21/RSR • Quality Control
          </div>
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
            {isEditing ? "Kemaskini Rekod Sampel Simpanan" : "Kemasukan Retention Sample Record"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-6 space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center space-x-2 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Field 1: Date & Time */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
              <span>Date &amp; Time (Tarikh &amp; Masa) <span className="text-red-600">*</span></span>
              <span className="text-[11px] font-normal text-gray-500">
                Format: {formatDisplayDateTime(dateTime)}
              </span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-xs sm:text-sm"
                required
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Waktu standard Malaysia (Asia/Kuala_Lumpur). Boleh diubah sekiranya sampel direkodkan selepas persampelan.
            </p>
          </div>

          {/* Field 2: SKU */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span>SKU <span className="text-red-600">*</span></span>
            </label>
            <select
              value={sku}
              onChange={e => {
                setSku(e.target.value)
                if (e.target.value.includes("425")) {
                  setAmountSample("24")
                } else if (e.target.value.includes("800")) {
                  setAmountSample("12")
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-semibold bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs sm:text-sm"
            >
              {RETENTION_SKU_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Field 3: Amount Sample */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center">
              <Hash className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span>Amount Sample (Kuantiti) <span className="text-red-600">*</span></span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={amountSample}
              onChange={e => setAmountSample(e.target.value)}
              placeholder="cth: 24 atau 12"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-bold focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs sm:text-sm"
              required
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Hanya nombor bulat positif (botol/unit).
            </p>
          </div>

          {/* Field 4: No Batch */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              <span>No Batch <span className="text-red-600">*</span></span>
            </label>
            <input
              type="text"
              value={batchNo}
              onChange={e => setBatchNo(e.target.value)}
              placeholder="013526-01"
              maxLength={9}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono font-bold uppercase tracking-wider focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-xs sm:text-sm"
              required
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Format kilang: 6 digit tarikh - 2 digit siri (cth: 013526-01).
            </p>
          </div>

          {/* Field 5: Prepared By (Read-Only) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 flex items-center justify-between">
              <span>Prepared By</span>
              <span className="inline-flex items-center text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                <Lock className="w-2.5 h-2.5 mr-1" /> Sistem
              </span>
            </label>
            <input
              type="text"
              value={isEditing ? recordToEdit?.preparedByName : userName}
              readOnly
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-800 font-bold text-xs sm:text-sm cursor-not-allowed select-none"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              {isEditing
                ? "Nama pencipta asal terpelihara bagi tujuan audit GMP."
                : "Ditetapkan secara automatik mengikut sesi log masuk."}
            </p>
          </div>

          {/* Edit Reason (Required if Editing) */}
          {isEditing && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                <span>Sebab Pindaan / Edit <span className="text-red-600">*</span></span>
              </label>
              <input
                type="text"
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="cth: Pembetulan kuantiti sampel mengikut fizikal rak"
                className="w-full px-3 py-2 border-2 border-amber-400 bg-amber-50/50 rounded-lg text-gray-900 font-medium text-xs sm:text-sm focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          )}

          {/* Field 6: Remarks (Optional) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Catatan / Remarks (Pilihan)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Catatan tambahan berkenaan sampel atau keadaan fizikal..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium text-xs sm:text-sm focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Modal Footer Actions */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-950 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Batal
        </button>

        <div className="flex items-center space-x-2">
          {!isEditing && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Simpan &amp; Tambah Lagi
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading}
            className="inline-flex items-center px-5 py-2 text-xs sm:text-sm font-black uppercase tracking-wider text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {loading ? "Menyimpan..." : isEditing ? "Simpan Pindaan" : "Simpan Rekod"}
          </button>
        </div>
      </div>
    </div>
  )
}

export function RetentionSampleModal({
  isOpen,
  onClose,
  onSuccess,
  userName,
  recordToEdit,
}: RetentionSampleModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <RetentionSampleFormContent
        key={recordToEdit ? recordToEdit.id : "new"}
        onClose={onClose}
        onSuccess={onSuccess}
        userName={userName}
        recordToEdit={recordToEdit}
      />
    </div>
  )
}

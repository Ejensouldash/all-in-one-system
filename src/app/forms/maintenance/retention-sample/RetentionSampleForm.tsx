"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  BookmarkCheck,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Package,
  Calendar,
  User,
  HelpCircle,
} from "lucide-react"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import {
  submitRetentionSampleBatch,
  type CreateRetentionSampleRow,
} from "./actions"
import { RETENTION_SKU_OPTIONS, isValidBatchFormat } from "./types"

interface RetentionSampleFormProps {
  userName: string
}

function getCurrentTimeStr() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

export function RetentionSampleForm({ userName }: RetentionSampleFormProps) {
  const todayStr = new Date().toISOString().split("T")[0]

  const [date, setDate] = useState<string>(todayStr)
  const [rows, setRows] = useState<CreateRetentionSampleRow[]>([
    {
      time: getCurrentTimeStr(),
      sku: "425",
      amountSample: 24,
      batchNo: "",
      remarks: "",
    },
  ])
  const [signature, setSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedCount, setSubmittedCount] = useState<number | null>(null)

  // Add a new row copying the previous batch number and updating time
  function handleAddRow() {
    const lastRow = rows[rows.length - 1]
    setRows((prev) => [
      ...prev,
      {
        time: getCurrentTimeStr(),
        sku: lastRow?.sku === "425" ? "800" : "425",
        amountSample: lastRow?.sku === "425" ? 12 : 24,
        batchNo: lastRow?.batchNo || "",
        remarks: "",
      },
    ])
  }

  function handleRemoveRow(index: number) {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function handleRowChange<K extends keyof CreateRetentionSampleRow>(
    index: number,
    field: K,
    val: CreateRetentionSampleRow[K]
  ) {
    setRows((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!date) {
      setError("Please select the sampling date.")
      return
    }

    if (rows.length === 0) {
      setError("Please add at least one sample row.")
      return
    }

    // Client side validation
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      if (!r.sku) {
        setError(`Row #${i + 1}: Please select SKU.`)
        return
      }
      if (!r.amountSample || r.amountSample < 1) {
        setError(`Row #${i + 1}: Sample amount must be at least 1.`)
        return
      }
      if (!r.batchNo.trim()) {
        setError(`Row #${i + 1}: Please enter Batch No.`)
        return
      }
      if (!isValidBatchFormat(r.batchNo)) {
        setError(
          `Row #${i + 1}: Invalid Batch No format '${r.batchNo}'. Please use 6 digits - 2 digits (e.g. 013526-01).`
        )
        return
      }
    }

    if (!signature) {
      setError("Please provide your digital signature before submitting.")
      return
    }

    setLoading(true)
    const res = await submitRetentionSampleBatch({
      date,
      rows,
      performedSignature: signature,
    })
    setLoading(false)

    if (res.success) {
      setSubmittedCount(res.count || rows.length)
    } else {
      setError(res.error || "Failed to submit retention sample records.")
    }
  }

  function handleResetForNewEntry() {
    setSubmittedCount(null)
    setRows([
      {
        time: getCurrentTimeStr(),
        sku: "425",
        amountSample: 24,
        batchNo: "",
        remarks: "",
      },
    ])
    setError(null)
  }

  // Calculate total sample items
  const totalSamples = rows.reduce(
    (sum, r) => sum + (Number(r.amountSample) || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/forms/maintenance"
          className="inline-flex items-center text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to GMP Dashboard
        </Link>

        <Link
          href="/forms/maintenance/reports/retention-sample"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition"
        >
          <span>View Monthly Reports</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Card Header matching GMP Style (Image 3) */}
        <div className="bg-blue-50/80 px-6 py-7 sm:p-9 border-b border-blue-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-200 text-blue-900 text-xs font-black uppercase tracking-widest mb-3">
              SGMP/21/RSR
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center tracking-tight">
              <BookmarkCheck className="w-8 h-8 mr-3 text-blue-600" />
              Retention Sample Record
            </h1>
            <p className="text-slate-600 font-medium mt-1.5 text-sm sm:text-base">
              Quality retention sample recording form for finished goods production batches.
            </p>
          </div>
        </div>

        {/* Form Body or Success View */}
        <div className="p-6 sm:p-10">
          {submittedCount !== null ? (
            /* Success View */
            <div className="py-8 text-center max-w-lg mx-auto space-y-6 animate-in fade-in zoom-in duration-200">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Samples Submitted Successfully!
                </h2>
                <p className="text-slate-600 text-sm mt-2">
                  Successfully recorded <strong className="text-slate-900">{submittedCount} sample entries</strong> for date{" "}
                  <strong className="text-slate-900">{date}</strong> into the database.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleResetForNewEntry}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Record More Samples</span>
                </button>

                <Link
                  href="/forms/maintenance/reports/retention-sample"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition"
                >
                  <span>View in Reports Page</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Active Entry Form */
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 flex items-start gap-3 font-medium text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {/* Metadata row: Date & Prepared By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Date of Sampling <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600" />
                    Prepared By
                  </label>
                  <div className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-between">
                    <span>{userName}</span>
                    <span className="text-[11px] font-normal text-slate-400">System Authenticated</span>
                  </div>
                </div>
              </div>

              {/* Paperlike Sampling Table Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      Retention Samples Table
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Record samples according to the physical form layout. You can add multiple rows at once.
                    </p>
                  </div>

                  <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                    Total: <strong className="text-blue-700">{rows.length} rows</strong> •{" "}
                    <strong className="text-blue-700">{totalSamples} bottles/packs</strong>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border-2 border-slate-800 rounded-xl shadow-xs">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black uppercase text-center">
                        <th className="py-3 px-2 border-r border-slate-700 w-10">#</th>
                        <th className="py-3 px-3 border-r border-slate-700 w-32">Time</th>
                        <th className="py-3 px-3 border-r border-slate-700 w-48">SKU</th>
                        <th className="py-3 px-3 border-r border-slate-700 w-36">Amount Sample</th>
                        <th className="py-3 px-3 border-r border-slate-700 w-44">Batch No</th>
                        <th className="py-3 px-3 border-r border-slate-700">Remarks</th>
                        <th className="py-3 px-2 w-14">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          {/* Row Number */}
                          <td className="py-3 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>

                          {/* Time */}
                          <td className="p-2 border-r border-slate-200">
                            <input
                              type="time"
                              value={row.time}
                              onChange={(e) =>
                                handleRowChange(idx, "time", e.target.value)
                              }
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 text-center text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>

                          {/* SKU */}
                          <td className="p-2 border-r border-slate-200">
                            <select
                              value={row.sku}
                              onChange={(e) => {
                                const newSku = e.target.value
                                handleRowChange(idx, "sku", newSku)
                                // Automatically adjust default amount for standard bottle runs
                                if (newSku.includes("800") && row.amountSample === 24) {
                                  handleRowChange(idx, "amountSample", 12)
                                } else if (newSku.includes("425") && row.amountSample === 12) {
                                  handleRowChange(idx, "amountSample", 24)
                                }
                              }}
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              {RETENTION_SKU_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Amount Sample */}
                          <td className="p-2 border-r border-slate-200">
                            <input
                              type="number"
                              min="1"
                              value={row.amountSample || ""}
                              onChange={(e) =>
                                handleRowChange(
                                  idx,
                                  "amountSample",
                                  parseInt(e.target.value, 10) || 1
                                )
                              }
                              placeholder="Qty"
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 text-center text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>

                          {/* Batch No */}
                          <td className="p-2 border-r border-slate-200">
                            <div>
                              <input
                                type="text"
                                value={row.batchNo}
                                onChange={(e) =>
                                  handleRowChange(idx, "batchNo", e.target.value)
                                }
                                placeholder="013526-01"
                                maxLength={9}
                                className={`w-full px-2.5 py-2 rounded-lg border font-mono font-bold text-xs text-center focus:ring-2 outline-none uppercase tracking-wider ${
                                  row.batchNo && !isValidBatchFormat(row.batchNo)
                                    ? "border-red-400 bg-red-50 text-red-900 focus:ring-red-400"
                                    : "border-slate-300 text-slate-900 focus:ring-blue-500"
                                }`}
                              />
                              {row.batchNo && !isValidBatchFormat(row.batchNo) && (
                                <p className="text-[10px] text-red-600 font-medium mt-0.5 text-center">
                                  Format: ######-##
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="p-2 border-r border-slate-200">
                            <input
                              type="text"
                              value={row.remarks || ""}
                              onChange={(e) =>
                                handleRowChange(idx, "remarks", e.target.value)
                              }
                              placeholder="Remarks (optional)..."
                              className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </td>

                          {/* Remove Action */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              disabled={rows.length <= 1}
                              title={
                                rows.length <= 1
                                  ? "At least 1 row required"
                                  : "Remove Row"
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-black text-xs uppercase tracking-wider transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Sample Row</span>
                  </button>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Batch No format: 6-digit date code - 2-digit batch run (e.g. 013526-01)</span>
                  </div>
                </div>
              </div>

              {/* Operator Signature Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  Operator / QC Digital Signature <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500">
                  By signing below, you certify the accuracy and physical authenticity of the retention samples recorded.
                </p>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-lg">
                  <SignaturePadClient
                    onSave={setSignature}
                    label={`Prepared By: ${userName}`}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  Supervisor verification and sign-off can be performed after submission in the{" "}
                  <strong className="text-slate-800">Summary</strong> section.
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    href="/forms/maintenance"
                    className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition text-center"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    <span>{loading ? "Submitting Samples..." : "Submit Retention Records"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

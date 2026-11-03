"use client"

import { useState } from "react"
import { ShieldCheck, CheckCircle2, ChevronLeft, Plus, Trash2, AlertTriangle, AlertCircle, Info, Sparkles } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import { createSEF } from "./actions"
import type { BatchRecord, BatchEvaluation, SampleEvaluation, SensoryAttributeResult, OverallResult, QCAction } from "./types"

const DEFAULT_PRODUCT_OPTIONS = [
  "800 ML X 20",
  "800 ML X 12",
  "425 ML X 24",
  "425 ML X 6",
]

function createInitialSample(sampleNo: number): SampleEvaluation {
  return {
    sampleNo,
    appearance: "NORMAL",
    odour: "NORMAL",
    taste: "NORMAL",
  }
}

function createInitialBatch(index: number = 0, defaultDate: string): BatchRecord & { samples: SampleEvaluation[], overallResult: OverallResult, action: QCAction } {
  return {
    batchNo: "",
    productSize: DEFAULT_PRODUCT_OPTIONS[index % DEFAULT_PRODUCT_OPTIONS.length],
    sampleQuantity: "3 BOTTLES",
    productionDate: defaultDate,
    evaluationDate: defaultDate,
    hold72HoursCompleted: true,
    samples: [
      createInitialSample(1),
      createInitialSample(2),
      createInitialSample(3),
    ],
    overallResult: "PASS",
    action: "RECOMMEND_QA_RELEASE",
  }
}

export function SEFForm({ userName }: { userName: string }) {
  const today = new Date().toISOString().split("T")[0]

  const [date, setDate] = useState(today)
  const [checkedBy, setCheckedBy] = useState(userName)
  const [remarks, setRemarks] = useState("")
  const [batches, setBatches] = useState<BatchEvaluation[]>([
    createInitialBatch(0, today),
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  // Draft integration
  const draft = useMaintenanceDraft("sef", {
    values: () => ({ date, checkedBy, remarks, batches }),
    apply: (v) => {
      if (v.date) setDate(v.date)
      if (v.checkedBy) setCheckedBy(v.checkedBy)
      if (v.remarks !== undefined) setRemarks(v.remarks)
      if (v.batches && Array.isArray(v.batches)) setBatches(v.batches)
    },
  })

  // Batch Management (Table 1)
  function handleAddBatch() {
    setBatches(prev => [
      ...prev,
      createInitialBatch(prev.length, date),
    ])
  }

  function handleRemoveBatch(batchIndex: number) {
    if (batches.length <= 1) return
    setBatches(prev => prev.filter((_, i) => i !== batchIndex))
  }

  function updateBatchField<K extends keyof BatchRecord>(
    batchIndex: number,
    field: K,
    value: BatchRecord[K]
  ) {
    setBatches(prev => prev.map((b, idx) => {
      if (idx !== batchIndex) return b

      const updated = { ...b, [field]: value }

      // 72-Hour Hold Safety Rule: If hold is not completed, enforce QC HOLD
      if (field === "hold72HoursCompleted" && value === false) {
        updated.overallResult = "FAIL_SUSPECT"
        updated.action = "CONTINUE_QC_HOLD"
      } else if (field === "hold72HoursCompleted" && value === true) {
        // Re-evaluate overall based on samples
        const hasAbnormal = updated.samples.some(
          s => s.appearance === "ABNORMAL" || s.odour === "ABNORMAL" || s.taste === "ABNORMAL"
        )
        if (!hasAbnormal) {
          updated.overallResult = "PASS"
          updated.action = "RECOMMEND_QA_RELEASE"
        }
      }

      return updated
    }))
  }

  // Sample Management (Table 2)
  function updateSampleField(
    batchIndex: number,
    sampleIndex: number,
    field: keyof Omit<SampleEvaluation, "sampleNo">,
    value: SensoryAttributeResult
  ) {
    setBatches(prev => prev.map((b, bIdx) => {
      if (bIdx !== batchIndex) return b

      const updatedSamples = b.samples.map((s, sIdx) => {
        if (sIdx !== sampleIndex) return s

        const newSample = { ...s, [field]: value }

        // Taste Safety Rule: If appearance or odour is abnormal, lock taste
        if (
          (field === "appearance" && value === "ABNORMAL") ||
          (field === "odour" && value === "ABNORMAL")
        ) {
          newSample.taste = "ABNORMAL"
        }

        return newSample
      })

      // Check if any sample in batch is abnormal
      const anyAbnormal = updatedSamples.some(
        s => s.appearance === "ABNORMAL" || s.odour === "ABNORMAL" || s.taste === "ABNORMAL"
      )

      let overallResult: OverallResult = b.overallResult
      let action: QCAction = b.action

      if (anyAbnormal || !b.hold72HoursCompleted) {
        overallResult = "FAIL_SUSPECT"
        action = "CONTINUE_QC_HOLD"
      } else {
        overallResult = "PASS"
        action = "RECOMMEND_QA_RELEASE"
      }

      return {
        ...b,
        samples: updatedSamples,
        overallResult,
        action,
      }
    }))
  }

  function updateBatchDecision(
    batchIndex: number,
    overallResult: OverallResult,
    action: QCAction
  ) {
    setBatches(prev => prev.map((b, idx) => {
      if (idx !== batchIndex) return b

      // Block Recommend QA release if hold is false
      if (!b.hold72HoursCompleted && action === "RECOMMEND_QA_RELEASE") {
        return {
          ...b,
          overallResult: "FAIL_SUSPECT",
          action: "CONTINUE_QC_HOLD",
        }
      }

      return {
        ...b,
        overallResult,
        action,
      }
    }))
  }

  async function handleSubmit() {
    if (!signature) {
      setError("Digital signature is required before submitting the form.")
      return
    }

    const invalidBatches = batches.filter(b => !b.batchNo.trim())
    if (invalidBatches.length > 0) {
      setError("Please ensure all batch rows have a valid Batch No.")
      return
    }

    setIsSubmitting(true)
    setError("")

    const res = await createSEF({
      date: new Date(date),
      batches,
      remarks: remarks.trim() || undefined,
      checkedBy,
      performedSignature: signature,
    })

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
    } else {
      setError(res.error || "Failed to submit Sensory Evaluation Form.")
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center max-w-2xl mx-auto mt-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4 uppercase">
          Submission Successful
        </h2>
        <p className="text-gray-500 mb-8 font-medium">
          The Sensory Evaluation Form (SGMP/06/SEF) has been securely recorded and queued for QA review.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/forms/maintenance"
            className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-md w-full sm:w-auto"
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> Return to Dashboard
          </Link>
          <Link
            href="/forms/maintenance/reports/sef"
            className="inline-flex items-center justify-center bg-blue-50 text-blue-700 hover:bg-blue-100 px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider transition-colors w-full sm:w-auto"
          >
            View Official Report
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-6 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Link
                  href="/forms/maintenance"
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-teal-400/20">
                  <ShieldCheck className="w-3.5 h-3.5 mr-2" /> SGMP/06/SEF
                </div>
                <span className="text-xs text-teal-200/80 font-medium">
                  Issue No: 2/10/2026 • Rev No: 1 • Effective Date: 2/10/2026
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">
                Sensory Evaluation Form
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl font-medium">
                Quality Control sensory evaluation, 72-hour hold verification, appearance, odour, and taste assessment per production batch.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-10">
          <DraftBanner draft={draft} />

          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-bold text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Form Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Evaluation Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Evaluated By (QC)
              </label>
              <input
                type="text"
                required
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold uppercase focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                placeholder="Enter QC Officer Name"
              />
            </div>
          </div>

          {/* TABLE 1: Batch Information & 72-Hour Hold */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b-2 border-slate-100 gap-3">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                  Table 1: Batch Information &amp; 72-Hour Hold Verification
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Enter production details and verify whether mandatory 72-hour hold quarantine is completed.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBatch}
                className="inline-flex items-center self-start sm:self-auto px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-black uppercase tracking-wider transition-colors border border-teal-200"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Batch
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm text-left min-w-[950px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center font-black uppercase text-xs text-slate-600">#</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700">Batch No.</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700">Product / Size</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700">Sample Quantity</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700">Production Date</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700">Evaluation Date</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 text-center">
                      72-Hour Hold Completed?
                    </th>
                    <th className="px-2 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {batches.map((batch, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                      <td className="px-3 py-3 text-center font-bold text-slate-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <input
                          type="text"
                          required
                          value={batch.batchNo}
                          onChange={(e) => updateBatchField(idx, "batchNo", e.target.value.toUpperCase())}
                          placeholder="e.g. B800-261002"
                          className="w-full px-3 py-2 text-xs font-bold uppercase rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <input
                          type="text"
                          list={`product-options-${idx}`}
                          value={batch.productSize}
                          onChange={(e) => updateBatchField(idx, "productSize", e.target.value.toUpperCase())}
                          placeholder="Select or type SKU"
                          className="w-full px-3 py-2 text-xs font-bold uppercase rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <datalist id={`product-options-${idx}`}>
                          {DEFAULT_PRODUCT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} />
                          ))}
                        </datalist>
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <input
                          type="text"
                          value={batch.sampleQuantity}
                          onChange={(e) => updateBatchField(idx, "sampleQuantity", e.target.value.toUpperCase())}
                          placeholder="3 BOTTLES"
                          className="w-full px-3 py-2 text-xs font-bold uppercase rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <input
                          type="date"
                          value={batch.productionDate}
                          onChange={(e) => updateBatchField(idx, "productionDate", e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <input
                          type="date"
                          value={batch.evaluationDate}
                          onChange={(e) => updateBatchField(idx, "evaluationDate", e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-100 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => updateBatchField(idx, "hold72HoursCompleted", true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                              batch.hold72HoursCompleted
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBatchField(idx, "hold72HoursCompleted", false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                              !batch.hold72HoursCompleted
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            NO
                          </button>
                        </div>
                        {!batch.hold72HoursCompleted && (
                          <div className="text-[10px] font-bold text-rose-600 mt-1 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Hold Not Completed (Release Blocked)
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {batches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBatch(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Batch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLE 2: Sensory Evaluation Table */}
          <div className="space-y-4">
            <div className="pb-2 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
                  Table 2: Sensory Evaluation
                </h2>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span className="font-semibold">
                  Tick one result for each attribute. Taste only if appearance and odour are normal and there is no suspected safety concern.
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm text-left min-w-[1050px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 w-36">Batch No</th>
                    <th className="px-3 py-3 font-black uppercase tracking-wider text-xs text-slate-700 w-24 text-center">Sample No.</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 text-center">Appearance</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 text-center">Odour</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 text-center">Taste</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 text-center w-48">Overall Result</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-700 text-center w-56">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {batches.map((batch, batchIdx) => {
                    const batchLabel = batch.batchNo.trim() || `Batch #${batchIdx + 1}`
                    const anyAbnormalInBatch = batch.samples.some(
                      s => s.appearance === "ABNORMAL" || s.odour === "ABNORMAL" || s.taste === "ABNORMAL"
                    )

                    return batch.samples.map((sample, sampleIdx) => {
                      const isFirstRow = sampleIdx === 0
                      const isTasteLocked = sample.appearance === "ABNORMAL" || sample.odour === "ABNORMAL"

                      return (
                        <tr
                          key={`${batchIdx}-${sampleIdx}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isFirstRow && batchIdx > 0 ? "border-t-2 border-slate-300" : ""
                          }`}
                        >
                          {/* Batch No (Rowspan 3) */}
                          {isFirstRow && (
                            <td
                              rowSpan={3}
                              className="px-4 py-3 font-black text-slate-900 border-r border-slate-200 bg-slate-50/50 align-top"
                            >
                              <div className="sticky top-2">
                                <div className="text-sm uppercase tracking-tight">{batchLabel}</div>
                                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                  {batch.productSize}
                                </div>
                                <div className="mt-2 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                  Qty: {batch.sampleQuantity}
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Sample No */}
                          <td className="px-3 py-3 text-center font-bold text-slate-800 border-r border-slate-200 bg-slate-50/30">
                            Sample {sample.sampleNo}
                          </td>

                          {/* Appearance */}
                          <td className="px-4 py-3 border-r border-slate-200 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => updateSampleField(batchIdx, sampleIdx, "appearance", "NORMAL")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  sample.appearance === "NORMAL"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Normal
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSampleField(batchIdx, sampleIdx, "appearance", "ABNORMAL")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  sample.appearance === "ABNORMAL"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Abnormal
                              </button>
                            </div>
                          </td>

                          {/* Odour */}
                          <td className="px-4 py-3 border-r border-slate-200 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => updateSampleField(batchIdx, sampleIdx, "odour", "NORMAL")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  sample.odour === "NORMAL"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Normal
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSampleField(batchIdx, sampleIdx, "odour", "ABNORMAL")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                  sample.odour === "ABNORMAL"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                              >
                                Abnormal
                              </button>
                            </div>
                          </td>

                          {/* Taste (with Safety Lock) */}
                          <td className="px-4 py-3 border-r border-slate-200 text-center">
                            {isTasteLocked ? (
                              <div className="inline-flex flex-col items-center">
                                <div className="px-3 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                  Taste Locked (Unsafe)
                                </div>
                                <span className="text-[10px] text-rose-600 font-medium mt-0.5">
                                  Do not taste abnormal sample
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => updateSampleField(batchIdx, sampleIdx, "taste", "NORMAL")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    sample.taste === "NORMAL"
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Normal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSampleField(batchIdx, sampleIdx, "taste", "ABNORMAL")}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    sample.taste === "ABNORMAL"
                                      ? "bg-rose-600 text-white shadow-sm"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Abnormal
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Overall Result (Rowspan 3 per batch) */}
                          {isFirstRow && (
                            <td
                              rowSpan={3}
                              className="px-4 py-3 border-r border-slate-200 bg-slate-50/40 text-center align-middle"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                  <button
                                    type="button"
                                    disabled={anyAbnormalInBatch || !batch.hold72HoursCompleted}
                                    onClick={() => updateBatchDecision(batchIdx, "PASS", batch.action)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                                      batch.overallResult === "PASS"
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                                    }`}
                                  >
                                    PASS
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateBatchDecision(batchIdx, "FAIL_SUSPECT", "CONTINUE_QC_HOLD")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                                      batch.overallResult === "FAIL_SUSPECT"
                                        ? "bg-rose-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    FAIL / SUSPECT
                                  </button>
                                </div>
                                {batch.overallResult === "PASS" ? (
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> All Samples Normal
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Abnormal / Hold Incomplete
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Action (Rowspan 3 per batch) */}
                          {isFirstRow && (
                            <td
                              rowSpan={3}
                              className="px-4 py-3 border-r border-slate-200 bg-slate-50/40 text-center align-middle"
                            >
                              <div className="flex flex-col items-center gap-2">
                                <button
                                  type="button"
                                  disabled={!batch.hold72HoursCompleted || batch.overallResult === "FAIL_SUSPECT"}
                                  onClick={() => updateBatchDecision(batchIdx, batch.overallResult, "RECOMMEND_QA_RELEASE")}
                                  className={`w-full px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border ${
                                    batch.action === "RECOMMEND_QA_RELEASE"
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                                      : "border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                  }`}
                                >
                                  Recommend QA release
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBatchDecision(batchIdx, batch.overallResult, "CONTINUE_QC_HOLD")}
                                  className={`w-full px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border ${
                                    batch.action === "CONTINUE_QC_HOLD"
                                      ? "bg-rose-50 border-rose-300 text-rose-800 shadow-sm"
                                      : "border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  Continue QC HOLD
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Abnormal Finding / Remarks */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Abnormal finding / remarks:
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record any abnormal findings, sediment, taste notes, or non-conformance details..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Signatures & Approvals Section */}
          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2">
              Signatures &amp; Approvals
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Evaluated by (QC) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-800">
                    Evaluated by (QC)
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{date}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-bold mb-1">Officer Name:</div>
                  <div className="text-sm font-black uppercase text-slate-900 mb-3">{checkedBy}</div>
                  <div className="text-xs text-slate-500 font-bold mb-1">QC Signature Pad:</div>
                  <SignaturePadClient onSave={setSignature} />
                </div>
              </div>

              {/* Reviewed / Approved by (QA) Placeholder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Reviewed / Approved by (QA)
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">Stage 2</span>
                </div>
                <div className="bg-slate-100/70 p-6 rounded-2xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center min-h-[220px]">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    QA Review &amp; Approval
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Pending QC submission. The QA supervisor will sign and approve this record under the GMP Summary &amp; Reports section.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Footer Note */}
          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed font-medium">
            <span className="font-bold uppercase tracking-wider text-amber-950 block mb-1">
              Note:
            </span>
            Any abnormal or conflicting result must remain on QC HOLD pending QA investigation. Do not taste samples with unusual odour, visible contamination, damaged packaging or suspected safety concerns. Opened samples must not be returned to saleable stock.
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <SaveDraftButton draft={draft} />

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href="/forms/maintenance"
                className="px-6 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors uppercase text-xs text-center w-full sm:w-auto"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Submit Sensory Form
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

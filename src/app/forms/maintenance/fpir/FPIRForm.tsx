"use client"

import { useState } from "react"
import { ShieldCheck, CheckCircle2, ChevronLeft, Save, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { DraftBanner, SaveDraftButton } from "../_components/DraftControls"
import { createFPIR, type FPIRRow } from "./actions"

// The printed form lists three SKUs; 425 ML X 6 is included because it is produced
// on Line 2 and inspected the same way. Line is derived from the SKU, never typed.
const SKU_OPTIONS = [
  { sku: "800 ML X 20", line: "LINE 1" },
  { sku: "800 ML X 12", line: "LINE 1" },
  { sku: "425 ML X 24", line: "LINE 2" },
  { sku: "425 ML X 6", line: "LINE 2" },
]

const lineForSku = (sku: string) => SKU_OPTIONS.find(o => o.sku === sku)?.line ?? ""

const EMPTY_ROW: FPIRRow = {
  line: SKU_OPTIONS[0].line,
  sku: SKU_OPTIONS[0].sku,
  time: "",
  weightKg: "",
  boxSealing: "OKAY",
  batchNumber: "AVAILABLE",
  pallet: "OKAY",
}

export function FPIRForm({ userName }: { userName: string }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [checkedBy, setCheckedBy] = useState(userName)
  const [remarks, setRemarks] = useState("")
  const [rows, setRows] = useState<FPIRRow[]>([{ ...EMPTY_ROW }])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  function updateRow(index: number, field: keyof FPIRRow, value: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r
      // Selecting a SKU also fixes the line, so the two can never disagree
      if (field === "sku") return { ...r, sku: value, line: lineForSku(value) }
      return { ...r, [field]: value }
    }))
  }

  function addRow() {
    setRows(prev => [...prev, { ...EMPTY_ROW }])
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const draft = useMaintenanceDraft("fpir", {
    values: () => ({ date, checkedBy, remarks, rows }),
    apply: (v) => {
      setDate(v.date)
      setCheckedBy(v.checkedBy)
      setRemarks(v.remarks)
      setRows(v.rows)
    },
  })

  async function handleSubmit() {
    if (!signature) {
      setError("Digital signature is required.")
      return
    }

    const filledRows = rows.filter(r => r.time.trim() !== "" || r.weightKg.trim() !== "")
    if (filledRows.length === 0) {
      setError("Please fill in at least one inspection row (time or weight).")
      return
    }

    setIsSubmitting(true)
    setError("")

    const res = await createFPIR({
      date: new Date(date),
      rows: filledRows,
      remarks: remarks.trim() || undefined,
      checkedBy,
      performedSignature: signature,
    })

    if (res.success) {
      await draft.clearDraft()
      setSuccess(true)
    } else {
      setError(res.error || "Failed to submit form.")
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-gray-100 text-center max-w-2xl mx-auto mt-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4 uppercase">Submission Successful</h2>
        <p className="text-gray-500 mb-8 font-medium">The Finished Product Inspection Record has been securely saved to the database.</p>
        <Link href="/forms/maintenance" className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors shadow-md">
          <ChevronLeft className="w-5 h-5 mr-2" /> Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-900 p-6 sm:p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link href="/forms/maintenance" className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/10 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-rose-400/20">
                  <ShieldCheck className="w-3.5 h-3.5 mr-2" /> SGMP/18/FPIR
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 uppercase">Finished Product Inspection Record</h1>
              <p className="text-slate-400 font-medium">Inspect weight, box sealing, batch number and pallet condition per SKU.</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 space-y-8">
          <DraftBanner draft={draft} />
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 font-bold text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">Checked By</label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-gray-100">
              <h2 className="text-lg font-black uppercase tracking-widest text-gray-800">Inspection Rows</h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm text-left min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Line</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Type SKU</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Time</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Weight (kg)</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Box Sealing</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Batch Number</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-xs text-slate-600">Pallet</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row, index) => (
                    <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-4 py-2 font-black text-slate-500 whitespace-nowrap">{row.line}</td>
                      <td className="p-1 border-r border-gray-100">
                        <select
                          value={row.sku}
                          onChange={(e) => updateRow(index, "sku", e.target.value)}
                          className="w-full p-2 outline-none bg-transparent focus:bg-blue-50 font-bold text-slate-700 rounded-lg"
                        >
                          {SKU_OPTIONS.map(o => <option key={o.sku} value={o.sku}>{o.sku}</option>)}
                        </select>
                      </td>
                      <td className="p-1 border-r border-gray-100">
                        <input
                          type="time"
                          value={row.time}
                          onChange={(e) => updateRow(index, "time", e.target.value)}
                          className="w-full p-2 outline-none bg-transparent focus:bg-blue-50 font-medium text-slate-700 rounded-lg"
                        />
                      </td>
                      <td className="p-1 border-r border-gray-100">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.weightKg}
                          onChange={(e) => updateRow(index, "weightKg", e.target.value)}
                          placeholder="0.00"
                          className="w-full p-2 outline-none bg-transparent focus:bg-blue-50 font-medium text-slate-700 rounded-lg"
                        />
                      </td>
                      <td className="p-1 border-r border-gray-100">
                        <select
                          value={row.boxSealing}
                          onChange={(e) => updateRow(index, "boxSealing", e.target.value)}
                          className={`w-full p-2 outline-none bg-transparent focus:bg-blue-50 font-bold rounded-lg ${row.boxSealing === "OKAY" ? "text-emerald-700" : "text-red-700"}`}
                        >
                          <option value="OKAY">Okay</option>
                          <option value="NOT_OKAY">Not Okay</option>
                        </select>
                      </td>
                      <td className="p-1 border-r border-gray-100">
                        <select
                          value={row.batchNumber}
                          onChange={(e) => updateRow(index, "batchNumber", e.target.value)}
                          className={`w-full p-2 outline-none bg-transparent focus:bg-blue-50 font-bold rounded-lg ${row.batchNumber === "AVAILABLE" ? "text-emerald-700" : "text-red-700"}`}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="NOT_AVAILABLE">Not Available</option>
                        </select>
                      </td>
                      <td className="p-1">
                        <select
                          value={row.pallet}
                          onChange={(e) => updateRow(index, "pallet", e.target.value)}
                          className={`w-full p-2 outline-none bg-transparent focus:bg-blue-50 font-bold rounded-lg ${row.pallet === "OKAY" ? "text-emerald-700" : "text-red-700"}`}
                        >
                          <option value="OKAY">Okay</option>
                          <option value="NOT_OKAY">Not Okay</option>
                        </select>
                      </td>
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          disabled={rows.length === 1}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-gray-500">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Any observations or corrective actions..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
            />
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-6">
            <SignaturePadClient
              onSave={setSignature}
              label="Staff Signature *"
            />
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:justify-end">
            <SaveDraftButton draft={draft} disabled={isSubmitting} />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

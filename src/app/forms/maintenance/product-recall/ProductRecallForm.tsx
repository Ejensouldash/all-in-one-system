"use client"

import React, { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  RotateCcw,
  Plus,
  Trash2,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  HelpCircle,
  FileText,
  Boxes,
  Layers,
  ArrowRight
} from "lucide-react"
import { useMaintenanceDraft } from "../_components/useMaintenanceDraft"
import { createProductRecall } from "./actions"
import type { ProductRecallItemInput } from "./types"

interface ProductRecallFormProps {
  userName: string
}

const INITIAL_ITEM: ProductRecallItemInput = {
  customer: "",
  sku: "",
  batchNumber: "",
  quantity: 0,
  remarks: "",
}

const STANDARD_SKUS = [
  "425 ML X 24",
  "425 ML X 6",
  "425ml",
  "800 ML X 12",
  "800 ML X 20",
  "800ml",
] as const

export function ProductRecallForm({ userName }: ProductRecallFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form State
  const [recallDate, setRecallDate] = useState(() => new Date().toISOString().split("T")[0])
  const [reason, setReason] = useState("")
  const [remarks, setRemarks] = useState("")
  const [items, setItems] = useState<ProductRecallItemInput[]>([
    { ...INITIAL_ITEM },
    { ...INITIAL_ITEM },
    { ...INITIAL_ITEM },
  ])

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ recallNo: string; message: string } | null>(null)

  // Draft Management Hook
  const {
    pendingDraft,
    isSaving: isSavingDraft,
    savedAt,
    saveDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useMaintenanceDraft("product-recall", {
    values: () => ({ recallDate, reason, remarks, items }),
    apply: (saved) => {
      if (saved.recallDate) setRecallDate(saved.recallDate)
      if (saved.reason) setReason(saved.reason)
      if (saved.remarks) setRemarks(saved.remarks)
      if (Array.isArray(saved.items) && saved.items.length > 0) setItems(saved.items)
    },
  })

  // Item Table Manipulation
  const handleItemChange = (index: number, field: keyof ProductRecallItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: field === "quantity" ? Math.max(0, parseInt(value, 10) || 0) : value,
      }
      return updated
    })
  }

  const addRow = () => {
    setItems((prev) => [...prev, { ...INITIAL_ITEM }])
  }

  const addMultipleRows = (count: number) => {
    setItems((prev) => {
      const newRows = Array.from({ length: count }, () => ({ ...INITIAL_ITEM }))
      return [...prev, ...newRows]
    })
  }

  const removeRow = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [{ ...INITIAL_ITEM }]
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const clearEmptyRows = () => {
    setItems((prev) => {
      const filtered = prev.filter(
        (i) => i.customer.trim() || i.sku.trim() || i.batchNumber.trim() || i.quantity > 0
      )
      return filtered.length > 0 ? filtered : [{ ...INITIAL_ITEM }]
    })
  }

  // Calculated totals
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const activeRowsCount = items.filter(
    (i) => i.customer.trim() || i.sku.trim() || i.batchNumber.trim() || i.quantity > 0
  ).length

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Basic validation
    const validItems = items.filter(
      (item) => item.customer.trim() || item.sku.trim() || item.batchNumber.trim() || item.quantity > 0
    )

    if (validItems.length === 0) {
      setErrorMessage("Please add at least one line item with Customer, SKU, Batch Number, and Quantity.")
      return
    }

    for (let i = 0; i < validItems.length; i++) {
      const row = validItems[i]
      if (!row.customer.trim()) {
        setErrorMessage(`Row ${i + 1}: Customer name is required.`)
        return
      }
      if (!row.sku.trim()) {
        setErrorMessage(`Row ${i + 1}: SKU description is required.`)
        return
      }
      if (!row.batchNumber.trim()) {
        setErrorMessage(`Row ${i + 1}: Batch Number is required.`)
        return
      }
      if (!row.quantity || row.quantity <= 0) {
        setErrorMessage(`Row ${i + 1}: Quantity must be greater than 0.`)
        return
      }
    }

    startTransition(async () => {
      const result = await createProductRecall({
        recallDate,
        reason: reason.trim(),
        remarks: remarks.trim(),
        items: validItems,
      })

      if (result.success && result.data) {
        await clearDraft()
        setSuccessInfo({
          recallNo: result.data.recallNo || "New Record",
          message: result.message || "Product recall record has been created successfully.",
        })
      } else {
        setErrorMessage(result.error || "Failed to submit product recall.")
      }
    })
  }

  const handleResetForNew = () => {
    setSuccessInfo(null)
    setRecallDate(new Date().toISOString().split("T")[0])
    setReason("")
    setRemarks("")
    setItems([{ ...INITIAL_ITEM }, { ...INITIAL_ITEM }, { ...INITIAL_ITEM }])
  }

  return (
    <div className="space-y-6">
      {/* Pending Draft Notification */}
      {pendingDraft && !successInfo && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">Unsaved draft found</p>
              <p className="text-xs text-amber-700">
                You have a saved draft from {new Date(pendingDraft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Would you like to restore it?
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold rounded-lg transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Success Modal / Banner */}
      {successInfo && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-8 shadow-xl text-center max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Product Recall Recorded</h2>
          <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-extrabold rounded-full mb-4">
            Reference No: {successInfo.recallNo}
          </div>
          <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
            {successInfo.message}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetForNew}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider rounded-xl transition-colors"
            >
              Create Another Recall
            </button>
            <Link
              href="/forms/maintenance/reports/product-recall"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              View Recall Reports
            </Link>
          </div>
        </div>
      )}

      {!successInfo && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Formal GMP Document Header */}
          <div className="p-6 sm:p-8 border-b border-gray-200 bg-white">
            <div className="w-full border-2 border-black font-sans text-black">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="border-2 border-black p-3 text-center w-[20%] align-middle" rowSpan={4}>
                      <img
                        src="/assets/BubblesO2_Logo.png"
                        alt="BubblesO2 Logo"
                        className="h-10 mx-auto object-contain"
                      />
                    </td>
                    <td className="border-2 border-black p-2 font-bold w-[50%] align-middle" rowSpan={4}>
                      BUBBLESO2 SDN BHD<br />
                      <span className="font-normal text-[9px] text-gray-500 leading-tight block mt-1">
                        KOMPLEKS AL-AMMAR,<br />
                        KG KANCHONG, 71200, RANTAU,<br />
                        NEGERI SEMBILAN.
                      </span>
                    </td>
                    <td className="border-2 border-black px-2 py-0.5 font-bold w-[30%]">
                      Rec. No : <span className="font-normal ml-1">SGMP/22/PR</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black px-2 py-0.5 font-bold">
                      Issue No : <span className="font-normal ml-1">1/10/2022</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black px-2 py-0.5 font-bold">
                      Rev No : <span className="font-normal ml-1">0</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black px-2 py-0.5 font-bold">
                      Effective date : <span className="font-normal ml-1">1/7/2026</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="text-center py-4 bg-gray-50 border-t border-black">
                <h2 className="text-base font-black uppercase tracking-wider underline decoration-2">
                  PRODUCT RECALL RECORD
                </h2>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Error Notification */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-center space-x-3 text-red-800 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Header Details (Date, PIC, Reason, Remarks) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Recall Date
                </label>
                <input
                  type="date"
                  value={recallDate}
                  onChange={(e) => setRecallDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Prepared By (Read-Only) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Prepared By (QC)
                </label>
                <input
                  type="text"
                  value={userName}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 cursor-not-allowed"
                />
              </div>

              {/* Reason for Recall */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center">
                  <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Reason / Trigger for Recall
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Packaging leakage, cap seal defect, customer complaint, sensory variance"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Additional Remarks */}
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Additional Remarks / Quarantine Instructions
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes, warehouse quarantine instructions, or disposal details"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Product Recall Table Section */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center">
                    <Boxes className="w-5 h-5 mr-2 text-rose-600" />
                    Recall Line Items
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Enter the Customer, SKU, Batch Number, and Quantity for each affected batch.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Row
                  </button>
                  <button
                    type="button"
                    onClick={() => addMultipleRows(5)}
                    className="inline-flex items-center px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    +5 Rows
                  </button>
                  <button
                    type="button"
                    onClick={clearEmptyRows}
                    title="Remove empty rows"
                    className="inline-flex items-center px-3 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors border border-gray-200"
                  >
                    Clean Rows
                  </button>
                </div>
              </div>

              {/* Responsive Table Container */}
              <div className="overflow-x-auto border-2 border-black rounded-lg shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[11px]">
                      <th className="p-3 w-12 text-center border-r border-slate-700">#</th>
                      <th className="p-3 min-w-[220px] border-r border-slate-700">CUSTOMER</th>
                      <th className="p-3 min-w-[180px] border-r border-slate-700">SKU</th>
                      <th className="p-3 min-w-[180px] border-r border-slate-700">BATCH NUMBER</th>
                      <th className="p-3 min-w-[140px] text-right border-r border-slate-700">QUANTITY</th>
                      <th className="p-3 w-16 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        {/* Row Index */}
                        <td className="p-2.5 text-center font-bold text-gray-500 bg-gray-50 border-r border-gray-200">
                          {index + 1}
                        </td>

                        {/* Customer */}
                        <td className="p-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={item.customer}
                            onChange={(e) => handleItemChange(index, "customer", e.target.value)}
                            placeholder="e.g. Lotus's / Giant / Speedmart"
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs font-medium focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* SKU */}
                        <td className="p-2 border-r border-gray-200">
                          <div className="space-y-1">
                            <select
                              value={(STANDARD_SKUS as readonly string[]).includes(item.sku) ? item.sku : (item.sku ? "__CUSTOM__" : "")}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === "__CUSTOM__") {
                                  handleItemChange(index, "sku", "Custom SKU")
                                } else {
                                  handleItemChange(index, "sku", val)
                                }
                              }}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-semibold focus:border-blue-500 focus:outline-none bg-white cursor-pointer"
                            >
                              <option value="">-- Select SKU --</option>
                              {STANDARD_SKUS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                              <option value="__CUSTOM__">Other / Custom...</option>
                            </select>
                            {(!(STANDARD_SKUS as readonly string[]).includes(item.sku) && item.sku !== "") && (
                              <input
                                type="text"
                                value={item.sku === "Custom SKU" ? "" : item.sku}
                                onChange={(e) => handleItemChange(index, "sku", e.target.value)}
                                placeholder="Type custom SKU..."
                                className="w-full px-2 py-1 border border-blue-300 rounded text-xs bg-blue-50/50 focus:outline-none font-medium"
                              />
                            )}
                          </div>
                        </td>

                        {/* Batch Number */}
                        <td className="p-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => handleItemChange(index, "batchNumber", e.target.value)}
                            placeholder="e.g. 013526-01"
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs font-mono font-bold text-slate-800 focus:border-blue-500 focus:outline-none uppercase"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="p-2 border-r border-gray-200">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.quantity === 0 ? "" : item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs font-mono font-bold text-right text-rose-700 focus:border-blue-500 focus:outline-none"
                          />
                        </td>

                        {/* Action */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={items.length <= 1}
                            title="Delete Row"
                            className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Table Footer with Summary */}
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-gray-900 border-t-2 border-black">
                      <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-xs">
                        Total Quantity:
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-rose-700 border-r border-gray-300">
                        {totalQuantity.toLocaleString()}
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Items</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{activeRowsCount}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Recalled Qty</span>
                <p className="text-2xl font-black text-rose-900 mt-1">{totalQuantity.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Document Code</span>
                <p className="text-2xl font-black text-blue-900 mt-1">SGMP/22/PR</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => saveDraft()}
                  disabled={isSavingDraft}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors border border-gray-300"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {isSavingDraft ? "Saving Draft..." : "Save Draft"}
                </button>
                {savedAt && (
                  <span className="text-xs text-gray-400">
                    Draft saved at {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <Link
                  href="/forms/maintenance"
                  className="w-1/2 sm:w-auto text-center px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-1/2 sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                  {isPending ? "Submitting..." : "Submit Product Recall"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { saveNrhoBqItems } from "@/app/actions/nrho-project"
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  FileSpreadsheet,
  Calculator,
  Lock,
  FileDown,
  Printer,
  FileText
} from "lucide-react"

const CATEGORIES = [
  "CIVIL & STRUCTURAL WORKS",
  "MECHANICAL & PLUMBING",
  "ELECTRICAL & WIRING",
  "FLOOR & WALL FINISHES",
  "PAINTING & WATERPROOFING",
  "DOORS, WINDOWS & JOINERY",
  "SANITARY APPLIANCES",
  "SITE CLEARING & CLEANING",
  "CONTINGENCIES & PRELIMINARIES",
]

const UNITS = ["UNIT", "LOT", "PCS", "M2", "M3", "METER", "SET", "L/SUM", "KG"]

interface BqRow {
  category: string
  description: string
  quantity: number
  unit: string
  unitRate: number
  amount: number
}

export function ProjectBqTab({
  projectId,
  initialItems = [],
  isApproved = false,
}: {
  projectId: string
  initialItems: any[]
  isApproved?: boolean
}) {
  const [items, setItems] = useState<BqRow[]>(
    initialItems.length > 0
      ? initialItems.map((item) => ({
          category: item.category || CATEGORIES[0],
          description: item.description || "",
          quantity: item.quantity || 1,
          unit: item.unit || "UNIT",
          unitRate: item.unitRate || 0,
          amount: item.amount || 0,
        }))
      : [
          {
            category: CATEGORIES[0],
            description: "",
            quantity: 1,
            unit: "UNIT",
            unitRate: 0,
            amount: 0,
          },
        ]
  )

  const [isSaving, setIsSaving] = useState(false)
  const [hidePricing, setHidePricing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  const handleItemChange = (index: number, field: keyof BqRow, value: any) => {
    const updated = [...items]
    const current = { ...updated[index], [field]: value }

    if (field === "quantity" || field === "unitRate") {
      const q = field === "quantity" ? parseFloat(value) || 0 : current.quantity
      const r = field === "unitRate" ? parseFloat(value) || 0 : current.unitRate
      current.amount = Math.round(q * r * 100) / 100
    }

    updated[index] = current
    setItems(updated)
  }

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        category: CATEGORIES[0],
        description: "",
        quantity: 1,
        unit: "UNIT",
        unitRate: 0,
        amount: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([
        {
          category: CATEGORIES[0],
          description: "",
          quantity: 1,
          unit: "UNIT",
          unitRate: 0,
          amount: 0,
        },
      ])
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSaveBq = async () => {
    setIsSaving(true)
    setStatusMsg(null)

    const cleanItems = items
      .filter((item) => item.description.trim().length > 0)
      .map((item) => {
        const q = Math.max(0, parseFloat(String(item.quantity)) || 0)
        const r = Math.max(0, parseFloat(String(item.unitRate)) || 0)
        return {
          category: item.category,
          description: item.description.trim(),
          quantity: q,
          unit: item.unit,
          unitRate: r,
          amount: Math.round(q * r * 100) / 100,
        }
      })

    if (cleanItems.length === 0) {
      setStatusMsg({
        type: "error",
        text: "Please provide a description for at least one Bill of Quantities line item.",
      })
      setIsSaving(false)
      return
    }

    const res = await saveNrhoBqItems(projectId, cleanItems)
    setIsSaving(false)

    if (res.success) {
      setStatusMsg({
        type: "success",
        text: `Bill of Quantities (BQ) saved successfully! (${cleanItems.length} items, Total: RM ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })})`,
      })
      setTimeout(() => window.location.reload(), 1200)
    } else {
      setStatusMsg({
        type: "error",
        text: res.error || "Failed to save BQ items.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Summary */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bill of Quantities (BQ) &amp; Quotation Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Itemized cost schedule by trade category, quantities, units, and rates for official contractor/client estimates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Estimate (RM):
            </span>
            <span className="text-xl font-black font-mono text-emerald-700">
              RM {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`/api/nrho-project/${projectId}/pdf?type=quotation`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              title="Download formal client quotation with validity terms"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Quotation PDF</span>
            </a>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hidePricing}
                  onChange={(e) => setHidePricing(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-medium">Unpriced (Tender)</span>
              </label>

              <a
                href={`/api/nrho-project/${projectId}/pdf?type=bq${hidePricing ? "&hidePricing=true" : ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                title="Download Bill of Quantities schedule"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate BQ PDF</span>
              </a>
            </div>

            <button
              onClick={handleSaveBq}
              disabled={isSaving}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save BQ Changes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {isApproved && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Note:</strong> This project has already received Management Boss Approval. Any amendments to the BQ ceiling will be recorded in the audit trail.
          </span>
        </div>
      )}

      {/* Spreadsheet Line Items Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 w-56">Category / Trade</th>
                <th className="py-3 px-3 min-w-[280px]">Item Description &amp; Specifications</th>
                <th className="py-3 px-3 w-24 text-right">Quantity</th>
                <th className="py-3 px-3 w-28 text-center">Unit</th>
                <th className="py-3 px-3 w-32 text-right">Unit Rate (RM)</th>
                <th className="py-3 px-3 w-36 text-right">Amount (RM)</th>
                <th className="py-3 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                    {idx + 1}
                  </td>

                  <td className="py-2.5 px-3">
                    <select
                      value={item.category}
                      onChange={(e) => handleItemChange(idx, "category", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      placeholder="e.g. Supply and install 600mm x 600mm porcelain floor tiles including screeding..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>

                  <td className="py-2.5 px-3">
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitRate}
                      onChange={(e) => handleItemChange(idx, "unitRate", e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    RM {(item.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={3} className="py-3 px-4">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Line Item</span>
                  </button>
                </td>
                <td colSpan={3} className="py-3 px-3 text-right text-xs font-bold uppercase text-slate-600 tracking-wider">
                  Total Bill of Quantities (RM):
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-sm text-emerald-700">
                  RM {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

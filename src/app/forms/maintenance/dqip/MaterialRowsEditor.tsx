"use client"

import { Fragment } from "react"
import { Plus, Trash2 } from "lucide-react"
import type { DQIPMaterialRow } from "./actions"

const SAMPLE_COUNT = 5

function emptyMaterialRow(): DQIPMaterialRow {
  return {
    time: "",
    quantity: "",
    batchNumber: "AVAILABLE",
    samples: Array.from({ length: SAMPLE_COUNT }, () => ({ weight: "", condition: "OKAY" })),
  }
}

export function MaterialRowsEditor({
  label,
  rows,
  onChange,
}: {
  label: string
  rows: DQIPMaterialRow[]
  onChange: (rows: DQIPMaterialRow[]) => void
}) {
  function addRow() {
    onChange([...rows, emptyMaterialRow()])
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: "time" | "quantity" | "batchNumber", value: string) {
    onChange(rows.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function updateSample(rowIndex: number, sampleIndex: number, field: "weight" | "condition", value: string) {
    onChange(rows.map((r, i) => {
      if (i !== rowIndex) return r
      const samples = r.samples.map((s, si) => si === sampleIndex ? { ...s, [field]: value } : s)
      return { ...r, samples }
    }))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">{label}</h3>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="text-sm text-left min-w-[1200px]">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th rowSpan={2} className="px-3 py-2 font-black uppercase tracking-wider text-[11px] text-slate-600 border-r border-gray-200 align-middle w-24">Time</th>
              <th rowSpan={2} className="px-3 py-2 font-black uppercase tracking-wider text-[11px] text-slate-600 border-r border-gray-200 align-middle w-24">Quantity</th>
              <th rowSpan={2} className="px-3 py-2 font-black uppercase tracking-wider text-[11px] text-slate-600 border-r border-gray-200 align-middle w-28">Batch Number</th>
              {Array.from({ length: SAMPLE_COUNT }, (_, i) => (
                <th key={i} colSpan={2} className="px-2 py-1.5 font-black uppercase tracking-wider text-[11px] text-slate-600 text-center border-r border-gray-200">Sample {i + 1}</th>
              ))}
              <th rowSpan={2} className="w-8"></th>
            </tr>
            <tr>
              {Array.from({ length: SAMPLE_COUNT }, (_, i) => (
                <Fragment key={i}>
                  <th className="px-2 py-1.5 font-bold text-[10px] text-slate-500 border-r border-gray-100">Weight (g)</th>
                  <th className="px-2 py-1.5 font-bold text-[10px] text-slate-500 border-r border-gray-200">Condition</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-1 border-r border-gray-200">
                  <input
                    type="text"
                    value={row.time}
                    onChange={(e) => updateRow(rIdx, "time", e.target.value)}
                    className="w-full p-1.5 outline-none bg-transparent focus:bg-blue-50 font-medium text-slate-700 rounded"
                    placeholder="e.g. 08:00"
                  />
                </td>
                <td className="p-1 border-r border-gray-200">
                  <input
                    type="text"
                    value={row.quantity}
                    onChange={(e) => updateRow(rIdx, "quantity", e.target.value)}
                    className="w-full p-1.5 outline-none bg-transparent focus:bg-blue-50 font-medium text-slate-700 rounded"
                    placeholder="-"
                  />
                </td>
                <td className="p-1 border-r border-gray-200">
                  <select
                    value={row.batchNumber}
                    onChange={(e) => updateRow(rIdx, "batchNumber", e.target.value)}
                    className={`w-full p-1.5 outline-none bg-transparent focus:bg-blue-50 font-bold rounded ${row.batchNumber === "AVAILABLE" ? "text-emerald-700" : "text-red-700"}`}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="NOT_AVAILABLE">Not Available</option>
                  </select>
                </td>
                {row.samples.map((sample, sIdx) => (
                  <Fragment key={sIdx}>
                    <td className="p-1 border-r border-gray-100">
                      <input
                        type="text"
                        value={sample.weight}
                        onChange={(e) => updateSample(rIdx, sIdx, "weight", e.target.value)}
                        className="w-full p-1.5 outline-none bg-transparent focus:bg-blue-50 font-medium text-slate-700 rounded"
                        placeholder="-"
                      />
                    </td>
                    <td className="p-1 border-r border-gray-200">
                      <select
                        value={sample.condition}
                        onChange={(e) => updateSample(rIdx, sIdx, "condition", e.target.value)}
                        className={`w-full p-1.5 outline-none bg-transparent focus:bg-blue-50 font-bold rounded ${sample.condition === "OKAY" ? "text-emerald-700" : "text-red-700"}`}
                      >
                        <option value="OKAY">Okay</option>
                        <option value="NOT_OKAY">Not Okay</option>
                      </select>
                    </td>
                  </Fragment>
                ))}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(rIdx)}
                    disabled={rows.length === 1}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function emptyMaterialRows(): DQIPMaterialRow[] {
  return [emptyMaterialRow()]
}

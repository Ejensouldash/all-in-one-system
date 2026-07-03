"use client"

import { useState } from "react"
import { resolveHoldItem } from "@/app/actions/holdItems"
import { Check, X, Recycle, Truck, AlertTriangle } from "lucide-react"

export function HoldItemsTable({ initialItems, userRole }: { initialItems: any[], userRole: string }) {
  const [items, setItems] = useState(initialItems)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [filter, setFilter] = useState("PENDING")

  const handleResolve = async (id: string, type: string) => {
    if (!confirm(`Are you sure you want to mark this as ${type.replace("_", " ")}?`)) return
    
    setLoadingId(id)
    const res = await resolveHoldItem(id, type)
    if (res.success) {
      setItems(items.map(item => item.id === id ? { ...item, status: type, resolvedAt: new Date() } : item))
    } else {
      alert("Failed: " + res.error)
    }
    setLoadingId(null)
  }

  const filteredItems = items.filter(item => filter === "ALL" || item.status === filter)

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg text-sm font-bold outline-none focus:border-indigo-500"
        >
          <option value="PENDING">Pending Quarantine</option>
          <option value="ALL">All Items</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider font-black">
              <th className="p-4 border-b">Date / Shift</th>
              <th className="p-4 border-b">Item & Batch</th>
              <th className="p-4 border-b text-center">Hold Qty</th>
              <th className="p-4 border-b">Reason</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                  No {filter.toLowerCase()} items found.
                </td>
              </tr>
            ) : filteredItems.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold">{new Date(item.report.date).toLocaleDateString('en-GB')}</div>
                  <div className="text-xs text-gray-500">Shift {item.report.shift} | {item.report.line}</div>
                </td>
                <td className="p-4">
                  <div className="font-black text-indigo-900">{item.sectionKey}</div>
                  <div className="text-xs text-gray-600 font-mono uppercase">{item.batchNo}</div>
                </td>
                <td className="p-4 text-center">
                  <span className="font-black text-lg">{item.qty}</span>
                  <span className="text-xs text-gray-500 ml-1">Bags/Boxes</span>
                  <div className="text-[10px] text-gray-400">x{item.mult}</div>
                </td>
                <td className="p-4 text-amber-700 font-semibold text-xs max-w-xs">
                  {item.reason || "-"}
                </td>
                <td className="p-4">
                  {item.status === "PENDING" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                      {item.status.replace("_", " ")}
                    </span>
                  )}
                </td>
                <td className="p-4 text-center">
                  {item.status === "PENDING" && (
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleResolve(item.id, "REUSE")}
                        disabled={loadingId === item.id}
                        className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Reuse (Return to Storeroom)"
                      >
                        <Recycle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleResolve(item.id, "REJECT_BEFORE")}
                        disabled={loadingId === item.id}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Reject (Before)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleResolve(item.id, "REJECT_AFTER")}
                        disabled={loadingId === item.id}
                        className="p-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                        title="Reject (After)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleResolve(item.id, "RETURN")}
                        disabled={loadingId === item.id}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Return to Supplier"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {item.status !== "PENDING" && item.resolvedAt && (
                    <div className="text-xs text-gray-500 font-bold">
                      Resolved {new Date(item.resolvedAt).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

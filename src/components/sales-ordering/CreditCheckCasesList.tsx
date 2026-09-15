"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, ShieldAlert, CheckCircle2, ArrowRight, FileText, AlertTriangle, UserCheck } from "lucide-react"

type CaseItem = {
  id: string
  poFileName: string
  soaFileName: string
  status: string
  recommendation: string | null
  finalDecision: string | null
  financeRemarks: string | null
  createdAt: Date | string
  poData?: any
}

export function CreditCheckCasesList({ items }: { items: CaseItem[] }) {
  const [activeTab, setActiveTab] = useState<"ALL" | "READY_FOR_SO" | "ON_HOLD" | "REJECTED_BD">("ALL")

  const readyItems = items.filter(i => i.status === "READY_FOR_SO" || i.status === "PROCEED" || (!i.finalDecision && i.recommendation === "APPROVE"))
  const onHoldItems = items.filter(i => i.status === "ON_HOLD" || i.status === "NEEDS_REVIEW" || (!i.finalDecision && i.recommendation === "HOLD"))
  const rejectedBdItems = items.filter(i => i.status === "REJECTED" || i.finalDecision === "REJECT" || i.finalDecision === "REJECTED" || (!i.finalDecision && i.recommendation === "REJECT"))
  
  const displayItems = activeTab === "READY_FOR_SO" ? readyItems : activeTab === "ON_HOLD" ? onHoldItems : activeTab === "REJECTED_BD" ? rejectedBdItems : items

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-black text-slate-950 text-lg">PO-SOA Evaluation & Approval Status List</h3>
          <p className="text-xs text-slate-500 mt-1">Credit control status: SOD reviews SOA → READY_FOR_SO (Approved) / ON_HOLD (Finance Review) / REJECTED (BD Follow-up)</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 text-xs font-bold flex-wrap">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${activeTab === "ALL" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <FileText className="h-3.5 w-3.5" /> All ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("READY_FOR_SO")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${activeTab === "READY_FOR_SO" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Passed / Ready SO ({readyItems.length})
          </button>
          <button
            onClick={() => setActiveTab("ON_HOLD")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${activeTab === "ON_HOLD" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <Clock className="h-3.5 w-3.5" /> ON_HOLD ({onHoldItems.length})
          </button>
          <button
            onClick={() => setActiveTab("REJECTED_BD")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${activeTab === "REJECTED_BD" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Rejected ({rejectedBdItems.length})
          </button>
        </div>
      </div>

      {/* Output 2 Requirement: Rejected / Need BD Follow-up Info Notice */}
      {activeTab === "REJECTED_BD" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm">Rejected Orders List (Need BD Follow-up)</p>
            <p className="mt-1 font-semibold text-rose-800">
              Orders in this list have been rejected by Finance due to overdue invoices or credit limit breaches. The BD team is required to follow up with the customer for payment settlement before new POs can be processed.
            </p>
          </div>
        </div>
      )}

      {/* Data Table */}
      {displayItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3">PO File</th>
                <th className="px-4 py-3">SOA File</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">System Status</th>
                <th className="px-4 py-3">Finance Decision</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map(item => {
                const poNumber = item.poData?.poNumber || item.poFileName
                const customerName = item.poData?.customerName || ""
                const isItemApproved = item.status === "READY_FOR_SO" || item.status === "PROCEED" || item.recommendation === "APPROVE"
                const isItemRejected = item.status === "REJECTED" || item.finalDecision === "REJECT" || item.recommendation === "REJECT"
                return (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{poNumber}</div>
                      {customerName && <div className="text-[10px] text-slate-500 font-semibold">{customerName}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[180px]">{item.soaFileName}</td>
                    <td className="px-4 py-3 text-slate-500">{String(item.createdAt).slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        isItemApproved ? "bg-emerald-100 text-emerald-800" :
                        isItemRejected ? "bg-rose-100 text-rose-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {item.status === "READY_FOR_SO" ? "READY FOR SO" : item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.finalDecision ? (
                        <span className="font-bold text-slate-900">{item.finalDecision}</span>
                      ) : (
                        <span className="text-slate-400 italic">Pending</span>
                      )}
                      {item.financeRemarks && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={item.financeRemarks}>
                          {item.financeRemarks}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/forms/sales-ordering/credit-check/${item.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 font-bold text-white hover:bg-cyan-700 transition"
                      >
                        Review Case <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200 rounded-2xl">
          No credit evaluation records found under this tab.
        </div>
      )}
    </div>
  )
}

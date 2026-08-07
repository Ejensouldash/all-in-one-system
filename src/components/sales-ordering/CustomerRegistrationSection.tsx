"use client"

import { useState } from "react"
import { Building2, Clock, CheckCircle2, XCircle, Search, Eye, Sparkles } from "lucide-react"
import { CustomerRegistrationReviewModal } from "./CustomerRegistrationReviewModal"

export function CustomerRegistrationSection({
  registrations,
  onRefresh,
}: {
  registrations: any[]
  onRefresh: () => void
}) {
  const [activeTab, setActiveTab] = useState<"PENDING" | "PROCESSED">("PENDING")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  const pendingItems = registrations.filter(r => r.status === "PENDING")
  const processedItems = registrations.filter(r => r.status === "APPROVED" || r.status === "REJECTED")

  const currentList = activeTab === "PENDING" ? pendingItems : processedItems

  const filteredList = currentList.filter(r => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      r.companyName.toLowerCase().includes(q) ||
      r.registrationNo.toLowerCase().includes(q) ||
      (r.companyRegNoNew && r.companyRegNoNew.toLowerCase().includes(q))
    )
  })

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            <h2 className="text-2xl font-black text-slate-950">Permohonan Pendaftaran Pelanggan</h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Semak borang pendaftaran pelanggan baharu daripada Google Form dan luluskan untuk masuk ke Customer Master.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari Syarikat, No. Permohonan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex items-center justify-between">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "PENDING"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Clock className="h-4 w-4 text-amber-600" />
            Menunggu Semakan BD ({pendingItems.length})
          </button>
          <button
            onClick={() => setActiveTab("PROCESSED")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
              activeTab === "PROCESSED"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Selesai Diproses ({processedItems.length})
          </button>
        </div>
      </div>

      {/* Registration Items Table / List */}
      <div className="mt-6">
        {filteredList.length > 0 ? (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {filteredList.map(item => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between px-3 transition hover:bg-slate-50/80 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                    item.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                    item.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-950 text-sm">{item.companyName}</p>
                      <span className="text-xs font-bold text-slate-300">·</span>
                      <span className="font-mono text-xs font-bold text-cyan-700">{item.registrationNo}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      No. Syarikat: {item.companyRegNoNew || item.companyRegNoOld || "N/A"} · Tarikh Hantar: {item.createdAt.slice(0, 10)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    item.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                    item.status === "REJECTED" ? "bg-rose-100 text-rose-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>
                    {item.status === "APPROVED" ? `LULUS (${item.createdCustomer?.customerCode || "CUSTOMER"})` :
                     item.status === "REJECTED" ? "DITOLAK" : "MENUNGGU SEMAKAN"}
                  </span>

                  <button
                    onClick={() => setSelectedItem(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-2 text-xs font-black text-cyan-800 hover:bg-cyan-100 transition shadow-sm"
                  >
                    <Eye className="h-4 w-4 text-cyan-600" /> Semak & View Dokumen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-600">Tiada borang pendaftaran di dalam senarai ini.</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <CustomerRegistrationReviewModal
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onRefresh={onRefresh}
      />
    </section>
  )
}

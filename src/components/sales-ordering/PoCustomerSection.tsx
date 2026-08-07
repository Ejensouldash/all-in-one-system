"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, Eye, FileText, Search, ShieldAlert, Sparkles, PenSquare } from "lucide-react"
import { PdfPreviewModal } from "./PdfPreviewModal"

export type CustomerPoItem = {
  id: string
  type: "SALES_ORDER" | "CREDIT_CASE" | "INTAKE"
  poNumber: string
  customerName: string
  documentDate: string
  amount: number
  status: "APPROVED" | "PENDING_SOA" | "REJECTED" | "HOLD"
  poR2ObjectKey?: string | null
  soaR2ObjectKey?: string | null
  rejectionReason?: string | null
  createdAt: string
  uploadedBy: string
}

export function PoCustomerSection({ items }: { items: CustomerPoItem[] }) {
  const [activeTab, setActiveTab] = useState<"APPROVED" | "PENDING">("APPROVED")
  const [searchQuery, setSearchQuery] = useState("")
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [previewTitle, setPreviewTitle] = useState("")

  const approvedItems = items.filter(item => item.status === "APPROVED")
  const pendingItems = items.filter(item => item.status === "PENDING_SOA" || item.status === "HOLD")

  const currentList = activeTab === "APPROVED" ? approvedItems : pendingItems

  const filteredList = currentList.filter(item => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      item.customerName.toLowerCase().includes(q) ||
      item.poNumber.toLowerCase().includes(q) ||
      item.uploadedBy.toLowerCase().includes(q)
    )
  })

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(val)

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            <h2 className="text-2xl font-black text-slate-950">PO Customer</h2>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Pengurusan pesanan pelanggan mengikut status kelulusan SOA & pemeriksaan kredit.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari PO, Customer..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex items-center justify-between">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === "APPROVED"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Approved SOA ({approvedItems.length})
          </button>
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
              activeTab === "PENDING"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-600 hover:text-slate-950"
            }`}
          >
            <Clock className="h-4 w-4 text-amber-600" />
            Pending SOA ({pendingItems.length})
          </button>
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Jumlah Nilai Sub-Seksyen</p>
          <p className="text-base font-black text-slate-900">
            {formatCurrency(filteredList.reduce((acc, i) => acc + i.amount, 0))}
          </p>
        </div>
      </div>

      {/* Item List */}
      <div className="mt-6">
        {filteredList.length ? (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {filteredList.map(item => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between px-2 transition hover:bg-slate-50/80 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-950 text-sm">{item.poNumber || "PO No. N/A"}</p>
                      <span className="text-xs font-bold text-slate-400">·</span>
                      <p className="font-black text-slate-700 text-sm">{item.customerName}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Tarikh: {item.documentDate || "N/A"} · Uploaded oleh {item.uploadedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-950">{formatCurrency(item.amount)}</p>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        item.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status === "APPROVED" ? "Lulus SOA" : "Pending SOA"}
                    </span>
                  </div>

                  {/* Actions Container */}
                  <div className="flex items-center gap-2">
                    {/* PDF Interactive Preview Icon */}
                    {(item.poR2ObjectKey || item.uploadedBy === "Google Form Webhook" || (item.poR2ObjectKey && item.poR2ObjectKey.startsWith("google-form-submissions/"))) ? (
                      <button
                        onClick={() => {
                          if (item.poR2ObjectKey && item.poR2ObjectKey.startsWith("google-form-submissions/")) {
                            // Map the R2 key (json) to our new dynamic PDF route URL instead of letting the modal fetch R2
                            setPreviewKey(`/api/sales-ordering/pdf/po/${item.id}`)
                          } else {
                            setPreviewKey(item.poR2ObjectKey || null)
                          }
                          setPreviewTitle(`Pratinjau PO - ${item.customerName} (${item.poNumber})`)
                        }}
                        title="Pratinjau PDF Asal"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:bg-cyan-100 hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <Eye className="h-4 w-4 text-cyan-600" />
                        PDF
                      </button>
                    ) : (
                      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                        Form Order
                      </span>
                    )}

                    {/* Review/View Link */}
                    {item.type === "INTAKE" && (
                      <Link
                        href={`/forms/sales-ordering/intake/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-100 hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <PenSquare className="h-4 w-4 text-amber-600" />
                        Review
                      </Link>
                    )}
                    {item.type === "CREDIT_CASE" && (
                      <Link
                        href={`/forms/sales-ordering/credit-check?highlight=${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <Eye className="h-4 w-4 text-slate-500" />
                        View
                      </Link>
                    )}
                    {item.type === "SALES_ORDER" && (
                      <Link
                        href={`/forms/sales-ordering/orders/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <Eye className="h-4 w-4 text-emerald-600" />
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-600">
              Tiada rekod PO Customer di dalam kategori ini.
            </p>
            <p className="text-xs text-slate-400">Muat naik PO baharu di bahagian AI Intake untuk bermula.</p>
          </div>
        )}
      </div>

      {/* PDF Modal */}
      <PdfPreviewModal
        isOpen={Boolean(previewKey)}
        onClose={() => setPreviewKey(null)}
        r2ObjectKey={previewKey}
        title={previewTitle}
      />
    </section>
  )
}

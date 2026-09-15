"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  PenSquare,
  Search,
  Sparkles,
} from "lucide-react"
import { PdfPreviewModal } from "./PdfPreviewModal"

export type CustomerPoItem = {
  id: string
  type: "SALES_ORDER" | "CREDIT_CASE" | "INTAKE"
  poNumber: string
  customerName: string
  documentDate: string
  amount: number
  status: "APPROVED" | "PENDING_SOA" | "REJECTED" | "HOLD"
  isMultiPo?: boolean
  subPoCount?: number
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (!openMenuId) return
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest("[data-pdf-menu]")) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("click", handleOutsideClick)
    return () => document.removeEventListener("click", handleOutsideClick)
  }, [openMenuId])

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
            Customer order management by SOA approval status & credit evaluation.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search PO, Customer..."
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
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subsection Total Value</p>
          <p className="text-base font-black text-slate-900">
            {formatCurrency(filteredList.reduce((acc, i) => acc + i.amount, 0))}
          </p>
        </div>
      </div>

      {/* Item List */}
      <div className="mt-6">
        {filteredList.length ? (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {filteredList.map(item => {
              const isManualPo = Boolean(
                (item.poR2ObjectKey && item.poR2ObjectKey.startsWith("google-form-submissions/")) ||
                item.uploadedBy === "Google Form Webhook"
              )

              return (
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-slate-950 text-sm">{item.poNumber || "PO No. N/A"}</p>
                        {item.isMultiPo && (
                          <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black text-cyan-800">
                            {item.subPoCount ? `${item.subPoCount} POs Batch` : "Multi-PO Batch"}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-400">·</span>
                        <p className="font-black text-slate-700 text-sm">{item.customerName}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Date: {item.documentDate || "N/A"} · Uploaded by {item.uploadedBy}
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
                        {item.status === "APPROVED" ? "SOA Approved" : "Pending SOA"}
                      </span>
                    </div>

                    {/* Actions Container */}
                    <div className="flex items-center gap-2">
                      {/* PDF Interactive Preview Menu / Button */}
                      {isManualPo ? (
                        <div className="relative" data-pdf-menu>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === item.id ? null : item.id)
                            }}
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === item.id}
                            title="Manual PO PDF Variant Options"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:bg-cyan-100 shadow-sm"
                          >
                            <FileText className="h-4 w-4 text-cyan-600" />
                            <span>PDF</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-cyan-600 transition-transform duration-200 ${
                                openMenuId === item.id ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {openMenuId === item.id && (
                            <div
                              role="menu"
                              aria-orientation="vertical"
                              onKeyDown={e => {
                                if (e.key === "Escape") setOpenMenuId(null)
                              }}
                              className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setPreviewKey(`/api/sales-ordering/pdf/po/${item.id}?variant=internal`)
                                  setPreviewTitle(`Internal Copy - ${item.customerName} (${item.poNumber})`)
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-800 transition hover:bg-cyan-50 hover:text-cyan-900"
                              >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 font-black text-[10px]">
                                  IN
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-xs">Internal Copy</p>
                                  <p className="text-[10px] text-slate-500 font-normal">SOA Review & Audit Trail</p>
                                </div>
                              </button>

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  setPreviewKey(`/api/sales-ordering/pdf/po/${item.id}?variant=external`)
                                  setPreviewTitle(`External Copy - ${item.customerName} (${item.poNumber})`)
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-800 transition hover:bg-slate-100 hover:text-slate-900 mt-1"
                              >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-black text-[10px]">
                                  EX
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 text-xs">External Copy</p>
                                  <p className="text-[10px] text-slate-500 font-normal">Official Customer Copy</p>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : item.poR2ObjectKey ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewKey(item.poR2ObjectKey || null)
                            setPreviewTitle(`Original PO Preview - ${item.customerName} (${item.poNumber})`)
                          }}
                          title="Original PDF Preview"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 shadow-sm"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
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
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 transition hover:bg-amber-100 shadow-sm"
                        >
                          <PenSquare className="h-4 w-4 text-amber-600" />
                          Review
                        </Link>
                      )}
                      {item.type === "CREDIT_CASE" && (
                        <Link
                          href={`/forms/sales-ordering/credit-check?highlight=${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 shadow-sm"
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                          View
                        </Link>
                      )}
                      {item.type === "SALES_ORDER" && (
                        <Link
                          href={`/forms/sales-ordering/orders/${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 shadow-sm"
                        >
                          <Eye className="h-4 w-4 text-emerald-600" />
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-600">
              No customer PO records found in this category.
            </p>
            <p className="text-xs text-slate-400">Upload a new PO in AI Intake to get started.</p>
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

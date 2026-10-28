"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Search,
  Package,
} from "lucide-react"

export type HandoverRecord = {
  id: string
  handoverNumber: string
  date: Date | string
  createdAt: Date | string
  productionStaff: {
    name: string
  }
  items: {
    netToWarehousePcs: number
  }[]
}

interface PendingHandoversSectionProps {
  handovers: HandoverRecord[]
}

export function PendingHandoversSection({ handovers }: PendingHandoversSectionProps) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return handovers
    return handovers.filter(h => {
      const matchNo = h.handoverNumber.toLowerCase().includes(q)
      const matchStaff = h.productionStaff?.name?.toLowerCase().includes(q)
      return matchNo || matchStaff
    })
  }, [handovers, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedHandovers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage
    return filtered.slice(startIndex, startIndex + itemsPerPage)
  }, [filtered, safeCurrentPage, itemsPerPage])

  // Compact smart status bar when all handovers are cleared (0 pending)
  if (handovers.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-emerald-900 shadow-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-950 sm:text-sm">
            All production handovers received
          </span>
          <span className="hidden text-xs text-emerald-700 md:inline">
            &mdash; No pending items awaiting warehouse receipt. All finished goods are in active stock.
          </span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
          Up to date
        </span>
      </div>
    )
  }

  // Expanded Action section when handovers are pending
  return (
    <section className="space-y-4 rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Action Required</p>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-950">Production Handovers</h2>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {handovers.length} pending
            </span>
          </div>
        </div>

        {handovers.length > 3 && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search handover no. or staff..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">No handovers matching &ldquo;{search}&rdquo;</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-2 text-xs font-black text-amber-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedHandovers.map(handover => {
              const totalNet = handover.items.reduce((sum, item) => sum + (item.netToWarehousePcs || 0), 0)
              return (
                <article
                  key={handover.id}
                  className="flex flex-col justify-between rounded-xl border border-amber-200 bg-white p-4.5 shadow-xs transition hover:border-amber-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        <ClipboardCheck className="h-3 w-3" /> Awaiting Receipt
                      </span>
                      <h3 className="mt-2.5 text-base font-black text-slate-950">{handover.handoverNumber}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        From {handover.productionStaff?.name || "Production Staff"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-emerald-700 tabular-nums">{totalNet.toLocaleString()}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Pcs</p>
                    </div>
                  </div>

                  <Link
                    href={`/forms/warehouse/handover/${handover.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                  >
                    Review &amp; Receive <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
              <p className="text-xs font-medium text-slate-500">
                Showing <span className="font-bold text-slate-900">{(safeCurrentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="font-bold text-slate-900">
                  {Math.min(safeCurrentPage * itemsPerPage, filtered.length)}
                </span>{" "}
                of <span className="font-bold text-slate-900">{filtered.length}</span> handovers
              </p>

              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNumber => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                      pageNumber === safeCurrentPage
                        ? "bg-amber-500 text-slate-950"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

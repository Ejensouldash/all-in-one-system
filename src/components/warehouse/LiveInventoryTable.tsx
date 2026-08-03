"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  PackageSearch,
  QrCode,
  Search,
} from "lucide-react"

function formatSKU(sku: string) {
  if (!sku) return sku
  return sku.replace("p800_", "800ml × ").replace("p425_", "425ml × ").toUpperCase()
}

function balanceLabel(balance: number) {
  if (balance <= 0) return { label: "Depleted", tone: "bg-slate-100 text-slate-600" }
  if (balance <= 100) return { label: "Low stock", tone: "bg-amber-100 text-amber-800" }
  return { label: "Available", tone: "bg-emerald-100 text-emerald-800" }
}

type InventoryBatchRow = {
  id: string
  sku: string
  batchNumber: string
  totalQtyIn: number
  totalQtyOut: number
  availableBalance: number
}

export function LiveInventoryTable({ inventoryBatches }: { inventoryBatches: InventoryBatchRow[] }) {
  const [search, setSearch] = useState("")
  const [skuFilter, setSkuFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [copied, setCopied] = useState<string | null>(null)
  const itemsPerPage = 8

  const skuOptions = useMemo(
    () => [...new Set(inventoryBatches.map(batch => batch.sku))].sort(),
    [inventoryBatches]
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return inventoryBatches.filter(batch => {
      const matchesSearch =
        !needle ||
        batch.batchNumber.toLowerCase().includes(needle) ||
        formatSKU(batch.sku).toLowerCase().includes(needle)
      const matchesSku = skuFilter === "ALL" || batch.sku === skuFilter
      return matchesSearch && matchesSku
    })
  }, [inventoryBatches, search, skuFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const copyBatch = async (batchNumber: string) => {
    await navigator.clipboard.writeText(batchNumber)
    setCopied(batchNumber)
    window.setTimeout(() => setCopied(null), 1400)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari batch atau produk..."
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={skuFilter}
            onChange={event => {
              setSkuFilter(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500"
            aria-label="Filter inventory by SKU"
          >
            <option value="ALL">Semua produk</option>
            {skuOptions.map(sku => <option key={sku} value={sku}>{formatSKU(sku)}</option>)}
          </select>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {filtered.length} batch ditemui
          </span>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest">Produk</th>
                <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-widest">Batch No.</th>
                <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-widest">Total In</th>
                <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-widest">Total Out</th>
                <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-widest">Available</th>
                <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-widest">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(batch => {
                const status = balanceLabel(batch.availableBalance)
                const traceHref = `/forms/warehouse/inventory/batch/${encodeURIComponent(batch.batchNumber)}?sku=${encodeURIComponent(batch.sku)}`
                const qrHref = `/forms/warehouse/inventory/qr?batch=${encodeURIComponent(batch.batchNumber)}&sku=${encodeURIComponent(batch.sku)}`
                return (
                  <tr key={batch.id} className="group transition hover:bg-emerald-50/40">
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-slate-900">{formatSKU(batch.sku)}</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${status.tone}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => copyBatch(batch.batchNumber)} className="inline-flex items-center gap-2 font-mono text-sm font-black text-indigo-700 hover:text-indigo-900" title="Copy batch number">
                        {batch.batchNumber}
                        <Copy className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                      </button>
                      {copied === batch.batchNumber && <p className="mt-1 text-[10px] font-bold text-emerald-700">Disalin</p>}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-bold text-slate-500">{batch.totalQtyIn.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right text-sm font-bold text-rose-600">{batch.totalQtyOut.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right text-xl font-black text-emerald-700">{batch.availableBalance.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={traceHref} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">
                          <Eye className="h-4 w-4" /> Trace
                        </Link>
                        <Link href={qrHref} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700">
                          <QrCode className="h-4 w-4" /> QR
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <PackageSearch className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-bold text-slate-600">Tiada batch sepadan dengan carian.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {paginated.map(batch => {
          const status = balanceLabel(batch.availableBalance)
          const traceHref = `/forms/warehouse/inventory/batch/${encodeURIComponent(batch.batchNumber)}?sku=${encodeURIComponent(batch.sku)}`
          const qrHref = `/forms/warehouse/inventory/qr?batch=${encodeURIComponent(batch.batchNumber)}&sku=${encodeURIComponent(batch.sku)}`
          return (
            <article key={batch.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${status.tone}`}>{status.label}</span>
                  <h3 className="mt-2 font-black text-slate-950">{formatSKU(batch.sku)}</h3>
                  <p className="mt-1 font-mono text-sm font-black text-indigo-700">{batch.batchNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available</p>
                  <p className="text-3xl font-black text-emerald-700">{batch.availableBalance.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-slate-500">Total In <strong className="float-right text-slate-900">{batch.totalQtyIn.toLocaleString()}</strong></p>
                <p className="text-slate-500">Total Out <strong className="float-right text-rose-600">{batch.totalQtyOut.toLocaleString()}</strong></p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href={traceHref} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 text-xs font-black"><Eye className="h-4 w-4" /> Trace</Link>
                <Link href={qrHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white"><QrCode className="h-4 w-4" /> QR</Link>
              </div>
            </article>
          )
        })}
      </div>

      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-bold text-slate-500">Halaman {currentPage} daripada {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(value => Math.max(1, value - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-300 p-2 disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-slate-300 p-2 disabled:opacity-30" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

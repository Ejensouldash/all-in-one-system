"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Filter,
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
    try {
      await navigator.clipboard.writeText(batchNumber)
      setCopied(batchNumber)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore clipboard error
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      {/* Integrated Search and Filter Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search batch number or SKU..."
            value={search}
            onChange={event => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={skuFilter}
              onChange={event => {
                setSkuFilter(event.target.value)
                setPage(1)
              }}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none"
              aria-label="Filter inventory by SKU"
            >
              <option value="ALL">All Products</option>
              {skuOptions.map(sku => (
                <option key={sku} value={sku}>{formatSKU(sku)}</option>
              ))}
            </select>
          </div>

          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {filtered.length} {filtered.length === 1 ? "batch" : "batches"}
          </span>
        </div>
      </div>

      {/* Desktop / Tablet Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3.5">Product SKU</th>
              <th scope="col" className="px-5 py-3.5">Batch Number</th>
              <th scope="col" className="px-5 py-3.5 text-right">Total In</th>
              <th scope="col" className="px-5 py-3.5 text-right">Total Out</th>
              <th scope="col" className="px-5 py-3.5 text-right">Available Balance</th>
              <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginated.map(batch => {
              const status = balanceLabel(batch.availableBalance)
              const traceHref = `/forms/warehouse/inventory/batch/${encodeURIComponent(batch.batchNumber)}?sku=${encodeURIComponent(batch.sku)}`
              const qrHref = `/forms/warehouse/inventory/qr?batch=${encodeURIComponent(batch.batchNumber)}&sku=${encodeURIComponent(batch.sku)}`
              const isCopied = copied === batch.batchNumber

              return (
                <tr key={batch.id} className="group transition hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-950">{formatSKU(batch.sku)}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${status.tone}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyBatch(batch.batchNumber)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700 transition hover:text-indigo-900"
                        title="Click to copy batch number"
                      >
                        {batch.batchNumber}
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </button>
                      {isCopied && (
                        <span className="rounded-sm bg-emerald-50 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                          Copied!
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-600 tabular-nums">
                    {batch.totalQtyIn.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-rose-600 tabular-nums">
                    {batch.totalQtyOut.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-base tabular-nums">
                    {batch.availableBalance.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <Link
                        href={traceHref}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" /> Trace
                      </Link>
                      <Link
                        href={qrHref}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <PackageSearch className="mx-auto mb-2.5 h-9 w-9 text-slate-300" />
                  <p className="font-bold text-slate-700">No batches match your search criteria.</p>
                  <p className="mt-1 text-xs text-slate-400">Try clearing the search query or selecting &quot;All Products&quot;.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="grid gap-3 p-4 md:hidden">
        {paginated.map(batch => {
          const status = balanceLabel(batch.availableBalance)
          const traceHref = `/forms/warehouse/inventory/batch/${encodeURIComponent(batch.batchNumber)}?sku=${encodeURIComponent(batch.sku)}`
          const qrHref = `/forms/warehouse/inventory/qr?batch=${encodeURIComponent(batch.batchNumber)}&sku=${encodeURIComponent(batch.sku)}`
          const isCopied = copied === batch.batchNumber

          return (
            <article key={batch.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${status.tone}`}>
                    {status.label}
                  </span>
                  <h3 className="mt-1.5 font-bold text-slate-950 text-sm">{formatSKU(batch.sku)}</h3>
                  <button
                    type="button"
                    onClick={() => copyBatch(batch.batchNumber)}
                    className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-700"
                  >
                    {batch.batchNumber}
                    <Copy className="h-3 w-3 text-slate-400" />
                  </button>
                  {isCopied && <span className="ml-1 text-[10px] font-bold text-emerald-700">Copied!</span>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available</p>
                  <p className="text-xl font-black text-emerald-700 tabular-nums">
                    {batch.availableBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                <p className="text-slate-500">Total In: <strong className="font-bold text-slate-900 tabular-nums">{batch.totalQtyIn.toLocaleString()}</strong></p>
                <p className="text-slate-500">Total Out: <strong className="font-bold text-rose-600 tabular-nums">{batch.totalQtyOut.toLocaleString()}</strong></p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href={traceHref}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-700 shadow-2xs"
                >
                  <Eye className="h-3.5 w-3.5" /> Trace
                </Link>
                <Link
                  href={qrHref}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-2xs"
                >
                  <QrCode className="h-3.5 w-3.5" /> QR Code
                </Link>
              </div>
            </article>
          )
        })}

        {paginated.length === 0 && (
          <div className="py-8 text-center">
            <PackageSearch className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="font-bold text-slate-700 text-xs">No batches found.</p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {filtered.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * itemsPerPage, filtered.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{filtered.length}</span> batches
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

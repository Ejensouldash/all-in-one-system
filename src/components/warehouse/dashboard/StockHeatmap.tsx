"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, Eye, Layers } from "lucide-react"
import type { DashboardBatch } from "@/lib/warehouse/dashboard-data"
import { formatSKU } from "@/lib/warehouse/format"
import { AGE_BUCKETS, type AgeBucketId, CARD, EYEBROW, ageBucketOf, batchTraceHref, compact, fmt, skuColor, sortSkus } from "./shared"

export type HeatmapSelection = { sku: string; bucket: AgeBucketId }

// Single-hue sequential scale (indigo-50 → indigo-700) for unit magnitude.
const LOW = [238, 242, 255]
const HIGH = [67, 56, 202]
function heat(t: number) {
  const mix = (index: number) => Math.round(LOW[index] + (HIGH[index] - LOW[index]) * t)
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`
}

export function StockHeatmap({ batches, onSelect }: { batches: DashboardBatch[]; onSelect: (selection: HeatmapSelection) => void }) {
  const skus = sortSkus([...new Set(batches.map(batch => batch.sku))])
  const cells = new Map<string, { units: number; count: number }>()
  for (const batch of batches) {
    const key = `${batch.sku}|${ageBucketOf(batch.ageDays)}`
    const cell = cells.get(key) ?? { units: 0, count: 0 }
    cell.units += batch.available
    cell.count += 1
    cells.set(key, cell)
  }
  const maxUnits = Math.max(1, ...[...cells.values()].map(cell => cell.units))
  const fefoQueue = [...batches].sort((a, b) => b.ageDays - a.ageDays).slice(0, 5)

  return (
    <section className={`${CARD} flex flex-col p-5`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3">
        <div>
          <p className={EYEBROW}>Stock Intelligence & Traceability</p>
          <h3 className="text-base font-semibold text-slate-900">Product × Batch Age Matrix & FEFO Priority Queue</h3>
        </div>
        <p className="text-xs text-slate-500">Click any cell to inspect batches and allocate orders.</p>
      </div>

      {skus.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No available stock in warehouse.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Heatmap Matrix */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Stock Aging Distribution</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-1.5 text-xs">
                  <thead>
                    <tr>
                      <th className="w-[30%] sm:w-[25%]" />
                      {AGE_BUCKETS.map(bucket => (
                        <th key={bucket.id} scope="col" className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {bucket.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map(sku => (
                      <tr key={sku}>
                        <th scope="row" className="pr-2 text-left font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: skuColor(sku) }} />
                            <span className="truncate">{formatSKU(sku)}</span>
                          </span>
                        </th>
                        {AGE_BUCKETS.map(bucket => {
                          const cell = cells.get(`${sku}|${bucket.id}`)
                          if (!cell) {
                            return <td key={bucket.id} className="h-12 rounded-xl bg-slate-50 text-center text-slate-300">—</td>
                          }
                          const t = 0.12 + 0.88 * (cell.units / maxUnits)
                          const fefo = bucket.id === "old"
                          return (
                            <td key={bucket.id} className="h-12 p-0">
                              <button
                                type="button"
                                onClick={() => onSelect({ sku, bucket: bucket.id })}
                                title={`${formatSKU(sku)} · ${bucket.label}: ${fmt(cell.units)} units in ${cell.count} batch${cell.count === 1 ? "" : "es"}`}
                                className={`relative flex h-12 w-full flex-col items-center justify-center rounded-xl transition hover:scale-[1.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${fefo ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                                style={{ backgroundColor: heat(t), color: t > 0.55 ? "#fff" : "#1e1b4b" }}
                              >
                                <span className="font-bold tabular-nums text-sm">{compact(cell.units)}</span>
                                <span className="text-[10px] opacity-80">{cell.count} batch{cell.count === 1 ? "" : "es"}</span>
                                {fefo && <AlertTriangle className="absolute right-1.5 top-1.5 h-3 w-3 text-amber-400" aria-label="FEFO priority" />}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span>Fewer units</span>
                <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${heat(0.12)}, ${heat(1)})` }} />
                <span>More units</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
                <span className="h-2.5 w-2.5 rounded-sm ring-2 ring-amber-400 bg-amber-100" />
                FEFO priority (&gt;60 days)
              </span>
            </div>
          </div>

          {/* Right Column: Traceability & Pick First Queue */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Traceability Ready · Pick First</p>
                <p className="text-[11px] text-slate-500">Oldest active batches for next DO</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                FEFO Order
              </span>
            </div>

            {fefoQueue.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No batches in queue.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {fefoQueue.map(batch => (
                  <li key={`${batch.sku}-${batch.batchNumber}`}>
                    <Link
                      href={batchTraceHref(batch)}
                      className="group flex items-center justify-between gap-3 py-2.5 transition hover:bg-white hover:px-2 rounded-lg"
                    >
                      <div className="min-w-0">
                        <span className="block truncate font-mono text-xs font-bold text-indigo-700 group-hover:text-indigo-900">
                          {batch.batchNumber}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {formatSKU(batch.sku)} · {fmt(batch.available)} units
                        </span>
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${batch.ageDays > 60 ? "bg-amber-100 text-amber-900" : "bg-slate-200 text-slate-700"}`}>
                          {batch.ageDays}d
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-700 group-hover:border-slate-400">
                          <Eye className="h-3 w-3" /> Trace
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 border-t border-slate-200 pt-2 text-right">
              <Link
                href="/forms/warehouse/dashboard#live-inventory"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                View all inventory batches <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

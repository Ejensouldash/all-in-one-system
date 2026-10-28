"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { Eye, QrCode } from "lucide-react"
import type { WarehouseDashboardData } from "@/lib/warehouse/dashboard-data"
import { formatSKU } from "@/lib/warehouse/format"
import { CommandBar } from "./CommandBar"
import { Drawer } from "./Drawer"
import { FlowPipeline } from "./FlowPipeline"
import { KpiCards } from "./KpiCards"
import { StockBreakdownCard } from "./StockBreakdownCard"
import { type HeatmapSelection, StockHeatmap } from "./StockHeatmap"
import { VelocityChart } from "./VelocityChart"
import { AGE_BUCKETS, PERIODS, type Period, ageBucketOf, batchQrHref, batchTraceHref, fmt, sliceDaily } from "./shared"

// Flow lines and transit stripes; both stop for users who prefer reduced motion.
const MOTION_CSS = `
@keyframes wh-flow { to { stroke-dashoffset: -16; } }
@keyframes wh-stripe { to { background-position: 16px 0; } }
.wh-flow { animation: wh-flow 1.2s linear infinite; }
.wh-stripe {
  background-image: linear-gradient(45deg, rgba(255,255,255,.28) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.28) 50%, rgba(255,255,255,.28) 75%, transparent 75%);
  background-size: 16px 16px;
  animation: wh-stripe 1s linear infinite;
}
@media (prefers-reduced-motion: reduce) { .wh-flow, .wh-stripe { animation: none; } }
`

export function WarehouseDashboardClient({ data }: { data: WarehouseDashboardData }) {
  const [period, setPeriod] = useState<Period>("7d")
  const [selection, setSelection] = useState<HeatmapSelection | null>(null)
  const closeDrawer = useCallback(() => setSelection(null), [])

  const days = useMemo(() => sliceDaily(data.daily, period, data.today, data.monthStart), [data, period])

  const selectedBatches = useMemo(() => {
    if (!selection) return []
    return data.batches
      .filter(batch => batch.sku === selection.sku && ageBucketOf(batch.ageDays) === selection.bucket)
      .sort((a, b) => b.ageDays - a.ageDays)
  }, [data.batches, selection])
  const selectedBucket = AGE_BUCKETS.find(bucket => bucket.id === selection?.bucket)
  const selectedUnits = selectedBatches.reduce((sum, batch) => sum + batch.available, 0)

  return (
    <div className="space-y-5">
      <style>{MOTION_CSS}</style>

      <CommandBar data={data} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Period" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {PERIODS.map(option => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={period === option.id}
              onClick={() => setPeriod(option.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${period === option.id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">Period applies to the pipeline and velocity chart. Stock figures are live.</p>
      </div>

      <KpiCards data={data} />

      <FlowPipeline data={data} days={days} period={period} />

      {/* Analytics Row 1: Stock Breakdown & Inflow/Outflow Velocity */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <StockBreakdownCard batches={data.batches} />
        <VelocityChart days={days} period={period} />
      </section>

      {/* Analytics Row 2: Wide Stock Heatmap & FEFO Traceability Queue */}
      <section className="w-full">
        <StockHeatmap batches={data.batches} onSelect={setSelection} />
      </section>

      <Drawer
        open={selection !== null}
        onClose={closeDrawer}
        title={selection ? `${formatSKU(selection.sku)} · ${selectedBucket?.label ?? ""}` : ""}
        subtitle="Batches in this cell, oldest first"
      >
        <dl className="grid grid-cols-3 gap-2">
          {[
            { label: "Batches", value: fmt(selectedBatches.length) },
            { label: "Units", value: fmt(selectedUnits) },
            { label: "Oldest", value: selectedBatches[0] ? `${selectedBatches[0].ageDays}d` : "—" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</dt>
              <dd className="text-lg font-bold text-slate-950 tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
        {selection?.bucket === "old" && selectedBatches.length > 0 && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            These batches are over 60 days old. Allocate them to the next DO first (FEFO).
          </p>
        )}

        <p className="mt-5 text-sm font-semibold text-slate-900">Traceability ready</p>
        <ul className="mt-2 space-y-2">
          {selectedBatches.map(batch => (
            <li key={batch.batchNumber} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-semibold text-indigo-700">{batch.batchNumber}</p>
                <p className="text-[11px] text-slate-500 tabular-nums">{fmt(batch.available)} units · {batch.ageDays} days old</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Link href={batchTraceHref(batch)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white">
                  <Eye className="h-3.5 w-3.5" /> Trace
                </Link>
                <Link href={batchQrHref(batch)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700">
                  <QrCode className="h-3.5 w-3.5" /> QR
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Drawer>
    </div>
  )
}

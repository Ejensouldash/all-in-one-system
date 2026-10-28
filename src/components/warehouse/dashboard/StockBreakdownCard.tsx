"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { AlertTriangle } from "lucide-react"
import type { DashboardBatch } from "@/lib/warehouse/dashboard-data"
import { formatSKU } from "@/lib/warehouse/format"
import { AGE_BUCKETS, CARD, EYEBROW, ageBucketOf, compact, fmt, skuColor, sortSkus } from "./shared"

export function StockBreakdownCard({ batches }: { batches: DashboardBatch[] }) {
  const total = batches.reduce((sum, batch) => sum + batch.available, 0)

  const bySku = new Map<string, number>()
  for (const batch of batches) bySku.set(batch.sku, (bySku.get(batch.sku) ?? 0) + batch.available)
  const slices = sortSkus([...bySku.keys()]).map(sku => ({ sku, name: formatSKU(sku), value: bySku.get(sku) ?? 0 }))

  const aging = AGE_BUCKETS.map(bucket => {
    const inBucket = batches.filter(batch => ageBucketOf(batch.ageDays) === bucket.id)
    return { ...bucket, units: inBucket.reduce((sum, batch) => sum + batch.available, 0), batches: inBucket.length }
  })

  return (
    <section className={`${CARD} flex flex-col p-5`}>
      <p className={EYEBROW}>Stock breakdown</p>
      <h3 className="text-base font-semibold text-slate-900">Units by product</h3>

      {total === 0 ? (
        <p className="mt-8 flex-1 text-center text-sm text-slate-500">No available stock.</p>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 200 }}>
                <PieChart>
                  <Pie data={slices} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                    {slices.map(slice => <Cell key={slice.sku} fill={skuColor(slice.sku)} />)}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [`${fmt(Number(value))} units`, ""]}
                    separator=""
                    contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, padding: "6px 10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-950 tabular-nums">{compact(total)}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">units</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {slices.map(slice => (
                <li key={slice.sku} className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex min-w-0 items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: skuColor(slice.sku) }} />
                    <span className="truncate">{slice.name}</span>
                  </span>
                  <span className="shrink-0 text-slate-900 tabular-nums">
                    <strong className="font-semibold">{fmt(slice.value)}</strong>
                    <span className="ml-1 text-slate-400">{((slice.value / total) * 100).toFixed(0)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-slate-900">Batch aging (FEFO)</p>
              <p className="text-[11px] text-slate-400">days since received</p>
            </div>
            <div className="mt-2.5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
              {aging.filter(bucket => bucket.units > 0).map(bucket => (
                <div
                  key={bucket.id}
                  title={`${bucket.label}: ${fmt(bucket.units)} units in ${bucket.batches} batches`}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${(bucket.units / total) * 100}%`, backgroundColor: bucket.color }}
                />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {aging.map(bucket => (
                <li key={bucket.id} className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: bucket.color }} />
                    {bucket.label}
                    {bucket.id === "old" && bucket.units > 0 && <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="FEFO priority" />}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 tabular-nums">{((bucket.units / total) * 100).toFixed(0)}%</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{bucket.batches} batches</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

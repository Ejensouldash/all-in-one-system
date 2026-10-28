"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { DailyFlow } from "@/lib/warehouse/dashboard-data"
import { CARD, EYEBROW, INFLOW_COLOR, OUTFLOW_COLOR, PERIOD_SUFFIX, type Period, compact, ddmm, fmt, sumDaily } from "./shared"

const SERIES = [
  { key: "inflow", label: "Handover inflow", color: INFLOW_COLOR },
  { key: "outflow", label: "DO outflow", color: OUTFLOW_COLOR },
] as const

function TodayBars({ inflow, outflow }: { inflow: number; outflow: number }) {
  const max = Math.max(1, inflow, outflow)
  const rows = [
    { ...SERIES[0], value: inflow },
    { ...SERIES[1], value: outflow },
  ]
  return (
    <div className="flex h-full flex-col justify-center gap-5 px-1">
      {rows.map(row => (
        <div key={row.key}>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-slate-600">{row.label}</span>
            <span className="font-semibold text-slate-900 tabular-nums">{fmt(row.value)} units</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-[width] duration-500" title={`${row.label}: ${fmt(row.value)} units`} style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function VelocityChart({ days, period }: { days: DailyFlow[]; period: Period }) {
  const totals = sumDaily(days)
  const net = totals.inflowUnits - totals.outflowUnits
  const chartData = days.map(day => ({ date: ddmm(day.date), inflow: day.inflowUnits, outflow: day.outflowUnits }))
  const hasMovement = totals.inflowUnits > 0 || totals.outflowUnits > 0

  return (
    <section className={`${CARD} flex flex-col p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={EYEBROW}>Velocity</p>
          <h3 className="text-base font-semibold text-slate-900">Inflow vs outflow</h3>
        </div>
        {hasMovement && (
          <div className="text-right">
            <p className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-indigo-700"}`}>
              {net >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
            </p>
            <p className="text-[11px] text-slate-400">{net >= 0 ? "net accumulation" : "net depletion"} · {PERIOD_SUFFIX[period]}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {SERIES.map(series => (
          <span key={series.key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
            {series.label}
            <strong className="font-semibold text-slate-900 tabular-nums">{compact(series.key === "inflow" ? totals.inflowUnits : totals.outflowUnits)}</strong>
          </span>
        ))}
      </div>

      <div className="mt-3 min-h-52 flex-1">
        {!hasMovement ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
            No movement in this period
          </div>
        ) : period === "today" ? (
          <TodayBars inflow={totals.inflowUnits} outflow={totals.outflowUnits} />
        ) : (
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 200 }}>
            <BarChart data={chartData} margin={{ top: 6, right: 6, left: -12, bottom: 0 }} barGap={2} barCategoryGap={period === "month" ? "18%" : "28%"}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={value => compact(Number(value))} width={44} />
              <RechartsTooltip
                cursor={{ fill: "#f8fafc" }}
                formatter={(value, name) => [`${fmt(Number(value))} units`, SERIES.find(series => series.key === name)?.label ?? String(name)]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12, padding: "6px 10px" }}
              />
              {SERIES.map(series => (
                <Bar key={series.key} dataKey={series.key} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

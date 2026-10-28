"use client"

import Link from "next/link"
import { Boxes, PackageCheck, ShieldCheck, ShieldAlert, TrendingDown, TrendingUp, Truck } from "lucide-react"
import type { WarehouseDashboardData } from "@/lib/warehouse/dashboard-data"
import { formatSKU } from "@/lib/warehouse/format"
import { CARD, EYEBROW, WARNING_COLOR, compact, ddmm, fmt, skuColor, sortSkus } from "./shared"

const AGED_DAYS = 60

function KpiShell({
  label, value, hint, icon: Icon, tone, href, children,
}: {
  label: string
  value: string
  hint: string
  icon: typeof Boxes
  tone: string
  href?: string
  children: React.ReactNode
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={EYEBROW}>{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="mt-4">{children}</div>
    </>
  )
  const className = `${CARD} flex flex-col p-5 transition hover:border-slate-300 hover:shadow-md`
  return href ? <Link href={href} className={className}>{body}</Link> : <div className={className}>{body}</div>
}

function Sparkline({ points }: { points: { date: string; count: number }[] }) {
  const width = 120
  const height = 36
  const max = Math.max(1, ...points.map(point => point.count))
  const step = width / Math.max(1, points.length - 1)
  const coords = points.map((point, index) => [index * step, height - 4 - (point.count / max) * (height - 8)] as const)
  const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full max-w-[140px] overflow-visible" role="img" aria-label="New batches per day, last 7 days">
      <path d={`${line} L${width},${height} L0,${height} Z`} fill="#6366f1" opacity={0.08} />
      <path d={line} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map(([x, y], index) => (
        <g key={points[index].date}>
          <circle cx={x} cy={y} r={index === coords.length - 1 ? 3 : 0} fill="#6366f1" stroke="#fff" strokeWidth={1.5} />
          <rect x={x - step / 2} y={0} width={step} height={height} fill="transparent">
            <title>{`${ddmm(points[index].date)}: ${points[index].count} new batch${points[index].count === 1 ? "" : "es"}`}</title>
          </rect>
        </g>
      ))}
    </svg>
  )
}

function Segments({ parts }: { parts: { label: string; value: number; color: string; striped?: boolean }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0)
  return (
    <div>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {total > 0 && parts.filter(part => part.value > 0).map(part => (
          <div
            key={part.label}
            title={`${part.label}: ${part.value.toLocaleString("en-MY")}`}
            className={`h-full first:rounded-l-full last:rounded-r-full ${part.striped ? "wh-stripe" : ""}`}
            style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {parts.map(part => (
          <span key={part.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: part.color }} />
            <strong className="font-semibold text-slate-900 tabular-nums">{part.value.toLocaleString("en-MY")}</strong> {part.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Ring({ percent, color, size = 64, children }: { percent: number; color: string; size?: number; children: React.ReactNode }) {
  const stroke = 7
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function KpiCards({ data }: { data: WarehouseDashboardData }) {
  const units = data.batches.reduce((sum, batch) => sum + batch.available, 0)
  const aged = data.batches.filter(batch => batch.ageDays > AGED_DAYS).length
  const newThisWeek = data.newBatchesByDay.reduce((sum, day) => sum + day.count, 0)
  const weekChange = data.newBatchesPrevWeek > 0 ? ((newThisWeek - data.newBatchesPrevWeek) / data.newBatchesPrevWeek) * 100 : null

  const capacityPct = (units / data.capacityUnits) * 100
  const capacityColor = capacityPct > 90 ? "#e11d48" : capacityPct > 80 ? WARNING_COLOR : "#10b981"
  const unitsBySku = new Map<string, number>()
  for (const batch of data.batches) unitsBySku.set(batch.sku, (unitsBySku.get(batch.sku) ?? 0) + batch.available)

  const transitUnits = data.inTransit.reduce((sum, order) => sum + order.units, 0)
  const transitParts = [
    { label: "≤ 1 day", value: data.inTransit.filter(order => order.daysInTransit <= 1).length, color: "#3b82f6", striped: true },
    { label: "2–3 days", value: data.inTransit.filter(order => order.daysInTransit >= 2 && order.daysInTransit <= 3).length, color: "#1d4ed8", striped: true },
    { label: "> 3 days", value: data.inTransit.filter(order => order.daysInTransit > 3).length, color: WARNING_COLOR, striped: true },
  ]

  const { quarantine } = data
  const clearance = quarantine.logged30d > 0 ? (quarantine.resolved30d / quarantine.logged30d) * 100 : 100
  const quarantineClear = quarantine.count === 0

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiShell label="Active Batches" value={fmt(data.batches.length)} hint="With available balance" icon={Boxes} tone="bg-indigo-50 text-indigo-600" href="/forms/warehouse/dashboard#live-inventory">
        <div className="flex items-end justify-between gap-3">
          <Sparkline points={data.newBatchesByDay} />
          <div className="text-right">
            {weekChange === null ? (
              <p className="text-xs font-semibold text-slate-600 tabular-nums">+{newThisWeek} new</p>
            ) : (
              <p className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${weekChange >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {weekChange >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {weekChange >= 0 ? "+" : ""}{weekChange.toFixed(1)}%
              </p>
            )}
            <p className="text-[10px] text-slate-400">new batches · 7d</p>
          </div>
        </div>
        <div className="mt-3">
          <Segments parts={[
            { label: "Fresh", value: data.batches.length - aged, color: "#10b981" },
            { label: `Aged > ${AGED_DAYS}d`, value: aged, color: WARNING_COLOR },
          ]} />
        </div>
      </KpiShell>

      <KpiShell label="Available Units" value={fmt(units)} hint="Current inventory balance" icon={PackageCheck} tone="bg-emerald-50 text-emerald-600" href="/forms/warehouse/dashboard#live-inventory">
        <div className="flex items-center gap-3" title={`${fmt(units)} of ${fmt(data.capacityUnits)} unit capacity`}>
          <Ring percent={capacityPct} color={capacityColor}>
            <span className="text-xs font-bold text-slate-900 tabular-nums">{capacityPct.toFixed(1)}%</span>
          </Ring>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900">Warehouse capacity used</p>
            <p className="text-[11px] text-slate-500">of {compact(data.capacityUnits)} max units</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sortSkus([...unitsBySku.keys()]).map(sku => (
            <span key={sku} title={`${formatSKU(sku)}: ${fmt(unitsBySku.get(sku) ?? 0)} units`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: skuColor(sku) }} />
              {formatSKU(sku)} <strong className="font-semibold tabular-nums">{compact(unitsBySku.get(sku) ?? 0)}</strong>
            </span>
          ))}
        </div>
      </KpiShell>

      <KpiShell label="In Transit" value={fmt(data.inTransit.length)} hint="DO with shipped status" icon={Truck} tone="bg-blue-50 text-blue-600" href="/forms/warehouse/distribution">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-50/60 px-3 py-2">
          <span className="text-xs text-slate-600">Units on trucks</span>
          <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(transitUnits)}</span>
        </div>
        {data.inTransit.length > 0 ? (
          <Segments parts={transitParts} />
        ) : (
          <p className="text-xs text-slate-500">No DOs on the road right now.</p>
        )}
      </KpiShell>

      <KpiShell label="Quarantine" value={fmt(quarantine.count)} hint="Pending action" icon={quarantineClear ? ShieldCheck : ShieldAlert} tone={quarantineClear ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"} href="/forms/warehouse/quarantine">
        <div className="flex items-center gap-3">
          <Ring percent={clearance} color={quarantineClear ? "#10b981" : WARNING_COLOR}>
            {quarantineClear ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
          </Ring>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900">
              {quarantineClear ? "No quality holds" : `${fmt(quarantine.units)} units on hold`}
            </p>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {clearance.toFixed(0)}% cleared · 30d ({quarantine.resolved30d}/{quarantine.logged30d} returns)
            </p>
          </div>
        </div>
      </KpiShell>
    </section>
  )
}

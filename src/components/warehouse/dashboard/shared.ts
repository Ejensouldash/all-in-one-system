import { SKU_COLORS } from "@/lib/analytics/types"
import type { DailyFlow, DashboardBatch } from "@/lib/warehouse/dashboard-data"

export type Period = "today" | "7d" | "month"

export const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "month", label: "This Month" },
]

export const PERIOD_SUFFIX: Record<Period, string> = {
  today: "today",
  "7d": "last 7 days",
  month: "this month",
}

// Ordinal single-hue ramp (validated light→dark): older stock reads darker.
export const AGE_BUCKETS = [
  { id: "fresh", label: "< 30 days", color: "#10b981", min: 0, max: 29 },
  { id: "mid", label: "30–60 days", color: "#047857", min: 30, max: 60 },
  { id: "old", label: "> 60 days", color: "#064e3b", min: 61, max: Infinity },
] as const

export type AgeBucketId = (typeof AGE_BUCKETS)[number]["id"]

export function ageBucketOf(ageDays: number): AgeBucketId {
  return AGE_BUCKETS.find(bucket => ageDays >= bucket.min && ageDays <= bucket.max)?.id ?? "old"
}

export const INFLOW_COLOR = "#10b981"
export const OUTFLOW_COLOR = "#6366f1"
export const WARNING_COLOR = "#f59e0b"
const OTHER_SKU_COLOR = "#64748b"

// Colour follows the SKU itself, never its rank, so filters never repaint a product.
export function skuColor(sku: string) {
  return SKU_COLORS[sku] ?? OTHER_SKU_COLOR
}

export function sortSkus(skus: string[]) {
  const known = Object.keys(SKU_COLORS)
  return [...skus].sort((a, b) => {
    const ia = known.indexOf(a)
    const ib = known.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b)
  })
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-MY")

export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

export const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export function sliceDaily(daily: DailyFlow[], period: Period, today: string, monthStart: string) {
  if (period === "today") return daily.filter(day => day.date === today)
  if (period === "7d") return daily.slice(-7)
  return daily.filter(day => day.date >= monthStart)
}

export function sumDaily(days: DailyFlow[]) {
  const total = days.reduce(
    (acc, day) => {
      acc.inflowUnits += day.inflowUnits
      acc.handoversReceived += day.handoversReceived
      acc.batchesReceived += day.batchesReceived
      acc.outflowUnits += day.outflowUnits
      acc.dosDispatched += day.dosDispatched
      acc.returnsLogged += day.returnsLogged
      acc.gatepassesScheduled += day.gatepassesScheduled
      acc.gateCheckouts += day.gateCheckouts
      acc.turnaroundMinutesTotal += day.turnaroundMinutesTotal
      acc.turnaroundSamples += day.turnaroundSamples
      return acc
    },
    {
      inflowUnits: 0, handoversReceived: 0, batchesReceived: 0, outflowUnits: 0, dosDispatched: 0,
      returnsLogged: 0, gatepassesScheduled: 0, gateCheckouts: 0, turnaroundMinutesTotal: 0, turnaroundSamples: 0,
    }
  )
  return {
    ...total,
    avgTurnaroundMinutes: total.turnaroundSamples > 0 ? total.turnaroundMinutesTotal / total.turnaroundSamples : null,
  }
}

export function batchTraceHref(batch: Pick<DashboardBatch, "batchNumber" | "sku">) {
  return `/forms/warehouse/inventory/batch/${encodeURIComponent(batch.batchNumber)}?sku=${encodeURIComponent(batch.sku)}`
}

export function batchQrHref(batch: Pick<DashboardBatch, "batchNumber" | "sku">) {
  return `/forms/warehouse/inventory/qr?batch=${encodeURIComponent(batch.batchNumber)}&sku=${encodeURIComponent(batch.sku)}`
}

export const doTraceHref = (id: string) => `/forms/warehouse/trace/do/${id}`

export const CARD = "rounded-2xl border border-slate-200 bg-white shadow-sm"
export const EYEBROW = "text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"

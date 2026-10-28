"use client"

import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Factory,
  Loader2,
  ScanLine,
  ShieldCheck,
  Truck,
  Warehouse,
  ChevronRight,
  Info,
} from "lucide-react"
import type { DailyFlow, WarehouseDashboardData } from "@/lib/warehouse/dashboard-data"
import { CARD, EYEBROW, PERIOD_SUFFIX, type Period, compact, fmt, sumDaily } from "./shared"
import { StageModal, type StageData, type StageStatus } from "./StageModal"

const STATUS_STYLE: Record<StageStatus, { dot: string; pill: string; border: string; icon: typeof CheckCircle2 }> = {
  ok: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
    border: "border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20",
    icon: CheckCircle2,
  },
  active: {
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700",
    border: "border-blue-200 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50/50",
    icon: Loader2,
  },
  attention: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800",
    border: "border-amber-200 bg-amber-50/20 hover:border-amber-400 hover:bg-amber-50/40",
    icon: AlertTriangle,
  },
}

function Connector({ status }: { status: StageStatus }) {
  const stroke = status === "attention" ? "#f59e0b" : "#10b981"
  return (
    <div aria-hidden className="hidden shrink-0 items-center justify-center lg:flex lg:w-5 xl:w-6">
      <svg viewBox="0 0 24 10" className="h-2.5 w-full">
        <line x1="0" y1="5" x2="18" y2="5" stroke={stroke} strokeWidth="2" strokeDasharray="3 3" className="wh-flow" />
        <path d="M16 2 L22 5 L16 8" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function StageStep({
  stage,
  onClick,
}: {
  stage: StageData
  onClick: () => void
}) {
  const style = STATUS_STYLE[stage.status]
  const StatusIcon = style.icon
  const Icon = stage.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-w-0 flex-1 flex-col rounded-xl border bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${style.border}`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Stage {stage.step}
          </span>
        </div>
        <span className="relative flex h-2 w-2 shrink-0">
          {stage.status !== "ok" && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${style.dot}`} />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${style.dot}`} />
        </span>
      </div>

      <p className="mt-2 truncate text-xs font-bold text-slate-900 transition group-hover:text-emerald-700">
        {stage.title}
      </p>

      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-sm font-black tabular-nums text-slate-950">
          {stage.primary}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1 border-t border-slate-100 pt-1.5">
        <span className={`inline-flex items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${style.pill}`}>
          <StatusIcon className={`h-2.5 w-2.5 shrink-0 ${stage.status === "active" ? "animate-spin motion-reduce:animate-none" : ""}`} />
          <span className="truncate">{stage.statusLabel}</span>
        </span>
        <span className="text-[10px] font-medium text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700">
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

export function FlowPipeline({
  data,
  days,
  period,
}: {
  data: WarehouseDashboardData
  days: DailyFlow[]
  period: Period
}) {
  const [selectedStage, setSelectedStage] = useState<StageData | null>(null)

  const totals = sumDaily(days)
  const suffix = PERIOD_SUFFIX[period]
  const units = data.batches.reduce((sum, batch) => sum + batch.available, 0)
  const agedBatches = data.batches.filter(batch => batch.ageDays > 60).length
  const oldest = data.batches.reduce((max, batch) => Math.max(max, batch.ageDays), 0)
  const longTransit = data.inTransit.filter(order => order.daysInTransit > 3).length
  const clearance = data.quarantine.logged30d > 0 ? (data.quarantine.resolved30d / data.quarantine.logged30d) * 100 : 100

  const stages: StageData[] = [
    {
      key: "handover",
      step: 1,
      title: "Production Handover",
      icon: Factory,
      href: "/forms/warehouse/dashboard#pending-handovers",
      status: data.pendingHandovers > 0 ? "attention" : "ok",
      statusLabel: data.pendingHandovers > 0 ? `${data.pendingHandovers} awaiting` : "All received",
      primary: `${fmt(totals.batchesReceived)} batches`,
      secondary: `${fmt(totals.handoversReceived)} handovers · ${compact(totals.inflowUnits)} units ${suffix}`,
      tooltip: "Production handovers (and legacy transfers) received by warehouse, and the net pieces they added to stock.",
    },
    {
      key: "quality",
      step: 2,
      title: "Quality & Quarantine",
      icon: ShieldCheck,
      href: "/forms/warehouse/quarantine",
      status: data.quarantine.count > 0 ? "attention" : "ok",
      statusLabel: data.quarantine.count > 0 ? `${data.quarantine.count} held` : "0 held",
      primary: `${clearance.toFixed(0)}% cleared`,
      secondary: `${fmt(totals.returnsLogged)} returns logged ${suffix}`,
      tooltip: "Goods return notes still in QUARANTINE, and the share of the last 30 days' returns already scrapped, repacked or restocked.",
    },
    {
      key: "storage",
      step: 3,
      title: "Active Storage",
      icon: Warehouse,
      href: "/forms/warehouse/dashboard#live-inventory",
      status: agedBatches > 0 ? "attention" : "ok",
      statusLabel: agedBatches > 0 ? `${agedBatches} aged >60d` : "FEFO ready",
      primary: `${fmt(data.batches.length)} batches`,
      secondary: `${compact(units)} units stored · oldest ${oldest}d`,
      tooltip: "Batches with available balance. Batches older than 60 days should be picked first (FEFO).",
    },
    {
      key: "gatepass",
      step: 4,
      title: "Gatepass Planning",
      icon: ClipboardList,
      href: "/forms/warehouse/gatepass",
      status: data.gatepass.loadingNow > 0 ? "active" : "ok",
      statusLabel: data.gatepass.loadingNow > 0 ? `${data.gatepass.loadingNow} loading` : `${data.gatepass.activeNow} open`,
      primary: `${fmt(totals.gatepassesScheduled)} scheduled`,
      secondary: `pickups ${suffix} · ${data.gatepass.activeNow} in progress`,
      tooltip: "Gatepasses with a requested pickup in this period (cancelled, rejected, expired and no-show excluded).",
    },
    {
      key: "security",
      step: 5,
      title: "Security Gate",
      icon: ScanLine,
      href: "/forms/warehouse/gatepass/security",
      status: "ok",
      statusLabel: totals.avgTurnaroundMinutes === null ? "No turnaround" : `Avg ${Math.round(totals.avgTurnaroundMinutes)}m`,
      primary: `${fmt(totals.gateCheckouts)} verified`,
      secondary: `vehicle check-outs ${suffix}`,
      tooltip: "Gatepasses checked out at the security gate. Turnaround is time from check-in to check-out.",
    },
    {
      key: "distribution",
      step: 6,
      title: "Distribution",
      icon: Truck,
      href: "/forms/warehouse/distribution",
      status: longTransit > 0 ? "attention" : data.inTransit.length > 0 ? "active" : "ok",
      statusLabel: longTransit > 0 ? `${longTransit} in transit >3d` : `${data.inTransit.length} in transit`,
      primary: `${fmt(totals.dosDispatched)} DOs`,
      secondary: `${compact(totals.outflowUnits)} units dispatched ${suffix}`,
      tooltip: "Delivery orders dispatched in this period, and DOs still marked SHIPPED.",
    },
  ]

  const bottlenecks = stages.filter(stage => stage.status === "attention").length

  return (
    <>
      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="mb-3.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Info className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className={EYEBROW}>End-to-end flow</p>
              <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                Live warehouse pipeline
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Click stage to view breakdown & actions
            </span>
            <p className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              bottlenecks > 0 ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20" : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
            }`}>
              {bottlenecks > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {bottlenecks > 0 ? `${bottlenecks} stage${bottlenecks > 1 ? "s" : ""} need attention` : "Flowing normally"}
            </p>
          </div>
        </div>

        {/* Stepper container: grid on mobile, linear flow on desktop */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:flex lg:items-center lg:gap-0">
          {stages.map((stage, index) => (
            <div key={stage.key} className="contents lg:flex lg:flex-1 lg:items-center">
              {index > 0 && <Connector status={stages[index - 1].status} />}
              <StageStep stage={stage} onClick={() => setSelectedStage(stage)} />
            </div>
          ))}
        </div>
      </section>

      {/* Pop-up Dialog Modal */}
      <StageModal stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </>
  )
}

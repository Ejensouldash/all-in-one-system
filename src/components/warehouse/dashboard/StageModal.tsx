"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, X } from "lucide-react"
import type { Factory } from "lucide-react"

export type StageStatus = "ok" | "active" | "attention"

export type StageData = {
  key: string
  step: number
  title: string
  icon: typeof Factory
  href: string
  status: StageStatus
  statusLabel: string
  primary: string
  secondary: string
  tooltip: string
}

const STATUS_CONFIG: Record<StageStatus, {
  dot: string
  badge: string
  banner: string
  icon: typeof CheckCircle2
  label: string
}> = {
  ok: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    banner: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
    label: "Normal Flow",
  },
  active: {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
    banner: "border-blue-200 bg-blue-50 text-blue-900",
    icon: Loader2,
    label: "In Progress",
  },
  attention: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
    banner: "border-amber-200 bg-amber-50 text-amber-900",
    icon: AlertTriangle,
    label: "Needs Attention",
  },
}

export function StageModal({
  stage,
  onClose,
}: {
  stage: StageData | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!stage) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [stage, onClose])

  if (!stage) return null

  const config = STATUS_CONFIG[stage.status]
  const StatusIcon = config.icon
  const Icon = stage.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 transition-all animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 shadow-sm ring-1 ring-slate-200/80">
            <Icon className="h-6 w-6 text-slate-700" />
          </div>
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Stage {stage.step} of 6
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${config.badge}`}>
                <StatusIcon className={`h-3 w-3 ${stage.status === "active" ? "animate-spin motion-reduce:animate-none" : ""}`} />
                {stage.statusLabel}
              </span>
            </div>
            <h3 id="stage-modal-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {stage.title}
            </h3>
          </div>
        </div>

        {/* Primary Metrics Highlight */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Primary Volume
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 tabular-nums">
              {stage.primary}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Flow Status
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {stage.statusLabel}
            </p>
          </div>
        </div>

        {/* Secondary Detail Text */}
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-medium text-slate-900">Period Performance:</p>
          <p className="mt-0.5">{stage.secondary}</p>
        </div>

        {/* Operational Description & Context Alert */}
        <div className={`mt-4 rounded-xl border p-3.5 text-xs leading-relaxed ${config.banner}`}>
          <div className="flex gap-2">
            <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{config.label}</p>
              <p className="mt-0.5 opacity-90">{stage.tooltip}</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Close
          </button>
          <Link
            href={stage.href}
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Open {stage.title} Module
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}


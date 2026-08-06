"use client"

import { CheckCircle2, Clock, FileClock, ShieldAlert, Sparkles, TrendingUp } from "lucide-react"

export type ProgressMetrics = {
  totalIntakes: number
  needsReviewCount: number
  approvedIntakeCount: number
  approvedSoaCount: number
  pendingSoaCount: number
  rejectedCount: number
  soCreatedCount: number
}

export function OrderProgressChart({ metrics }: { metrics: ProgressMetrics }) {
  const totalProcessed = metrics.totalIntakes || 1
  const approvalRate = Math.round((metrics.approvedSoaCount / (metrics.approvedSoaCount + metrics.rejectedCount || 1)) * 100)
  
  // Pipeline stage percentages
  const intakePct = Math.round((metrics.totalIntakes / totalProcessed) * 100)
  const reviewPct = Math.round((metrics.needsReviewCount / totalProcessed) * 100)
  const pendingSoaPct = Math.round((metrics.pendingSoaCount / totalProcessed) * 100)
  const approvedPct = Math.round((metrics.approvedSoaCount / totalProcessed) * 100)
  const rejectedPct = Math.round((metrics.rejectedCount / totalProcessed) * 100)

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-cyan-600">
            <TrendingUp className="h-4 w-4" /> Workflow Progress & Performance Analytics
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">Kemajuan Pemprosesan Dokumen Pesanan</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-right border border-emerald-100">
            <p className="text-[10px] font-black uppercase text-emerald-700">Kadar Kelulusan SOA</p>
            <p className="text-xl font-black text-emerald-950">{approvalRate}%</p>
          </div>
          <div className="rounded-2xl bg-cyan-50 px-4 py-2.5 text-right border border-cyan-100">
            <p className="text-[10px] font-black uppercase text-cyan-700">Jumlah Pesanan Disah</p>
            <p className="text-xl font-black text-cyan-950">{metrics.soCreatedCount}</p>
          </div>
        </div>
      </div>

      {/* Visual Multi-Segment Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs font-black text-slate-700 mb-2">
          <span>Taburan Status Aliran Dokumen (Jumlah: {metrics.totalIntakes})</span>
          <span className="text-cyan-700">{metrics.approvedSoaCount} Lulus / {metrics.pendingSoaCount} Pending SOA</span>
        </div>
        
        <div className="flex h-5 w-full overflow-hidden rounded-2xl bg-slate-100 p-1 shadow-inner">
          <div
            title={`Approved SOA: ${metrics.approvedSoaCount}`}
            style={{ width: `${Math.max(approvedPct, metrics.approvedSoaCount > 0 ? 5 : 0)}%` }}
            className="h-full rounded-l-xl bg-emerald-500 transition-all duration-500"
          />
          <div
            title={`Pending SOA: ${metrics.pendingSoaCount}`}
            style={{ width: `${Math.max(pendingSoaPct, metrics.pendingSoaCount > 0 ? 5 : 0)}%` }}
            className="h-full bg-amber-400 transition-all duration-500"
          />
          <div
            title={`Needs Review: ${metrics.needsReviewCount}`}
            style={{ width: `${Math.max(reviewPct, metrics.needsReviewCount > 0 ? 5 : 0)}%` }}
            className="h-full bg-cyan-500 transition-all duration-500"
          />
          <div
            title={`Rejected: ${metrics.rejectedCount}`}
            style={{ width: `${Math.max(rejectedPct, metrics.rejectedCount > 0 ? 5 : 0)}%` }}
            className="h-full rounded-r-xl bg-rose-500 transition-all duration-500"
          />
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs font-bold">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-100">
            <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <p className="text-slate-900 font-black">{metrics.approvedSoaCount} SOA Approved</p>
              <p className="text-[10px] text-slate-500">Kredit Lulus</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 p-2.5 border border-amber-100">
            <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400" />
            <div>
              <p className="text-slate-900 font-black">{metrics.pendingSoaCount} Pending SOA</p>
              <p className="text-[10px] text-slate-500">Menunggu SOA PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-cyan-50/70 p-2.5 border border-cyan-100">
            <span className="h-3 w-3 shrink-0 rounded-full bg-cyan-500" />
            <div>
              <p className="text-slate-900 font-black">{metrics.needsReviewCount} Needs Review</p>
              <p className="text-[10px] text-slate-500">Semakan SOD</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-rose-50/70 p-2.5 border border-rose-100">
            <span className="h-3 w-3 shrink-0 rounded-full bg-rose-500" />
            <div>
              <p className="text-slate-900 font-black">{metrics.rejectedCount} Rejected POs</p>
              <p className="text-[10px] text-slate-500">Hutang Melepasi Had</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Step Pipeline Cards */}
      <div className="grid gap-3 sm:grid-cols-3 pt-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500">Fasa 1: Intake (BD)</span>
            <Sparkles className="h-4 w-4 text-cyan-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.totalIntakes}</p>
          <p className="mt-0.5 text-xs text-slate-500 font-semibold">Dokumen dimuat naik</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500">Fasa 2: Review (SOD)</span>
            <FileClock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.approvedIntakeCount}</p>
          <p className="mt-0.5 text-xs text-slate-500 font-semibold">Dokumen disahkan SOD</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500">Fasa 3: PO-SOA Check</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-950">{metrics.approvedSoaCount + metrics.rejectedCount}</p>
          <p className="mt-0.5 text-xs text-slate-500 font-semibold">Semakan AI & Kewangan</p>
        </div>
      </div>
    </div>
  )
}

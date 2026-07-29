"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, ComposedChart, Line
} from "recharts"
import {
  Package, AlertOctagon, TrendingUp, Archive, Activity, Timer, ClipboardCheck,
  ArrowUpRight, ArrowDownRight, AlertTriangle, CalendarX2, Boxes, Wrench
} from "lucide-react"
import { SKU_COLORS, type AnalyticsPayload } from "@/lib/analytics/types"

const REJECT_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"]

const fmt = (n: number) => Math.round(n).toLocaleString("en-MY")
const dmy = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}`
}
const dmyFull = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export function FormsAnalyticsClient({ data }: { data: AnalyticsPayload }) {
  const { kpi, bySku, byDay, byShift, byLine, extremes, problems, rates, coverage, trends, storeroom, dataQuality } = data

  const hasProduction = kpi.totalBoxes > 0
  const skuChartData = byDay.map(d => ({ date: dmy(d.date), ...d.bySku }))
  const shiftChartData = byDay.map(d => ({ date: dmy(d.date), AM: d.byShift.AM || 0, PM: d.byShift.PM || 0 }))
  const activeSkus = bySku.filter(s => s.boxes > 0)
  const hasDataIssue =
    dataQuality.batchMismatch.length > 0 || dataQuality.duplicateSlots.length > 0 || dataQuality.emptyBatches > 0

  return (
    <div className="space-y-6">

      {/* ---------------------------------------------------------------- 1. KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Production"
          value={fmt(kpi.totalBoxes)}
          subtitle={`${fmt(kpi.totalPcs)} Botol`}
          icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}
          tone="indigo"
        />
        <KPICard
          title="Purata / Hari"
          value={fmt(kpi.avgBoxesPerWorkingDay)}
          subtitle={`${kpi.reportsExpected > 0 ? data.range.workingDays : 0} hari bekerja`}
          icon={<Boxes className="h-5 w-5 text-sky-500" />}
          tone="sky"
        />
        <KPICard
          title="Total Rejects"
          value={fmt(kpi.totalRejects)}
          subtitle="Unit Defektif"
          icon={<AlertOctagon className="h-5 w-5 text-red-500" />}
          tone="red"
        />
        <KPICard
          title="Reject Rate"
          value={`${kpi.rejectRate}%`}
          subtitle="Reject / Jumlah Input"
          icon={<Activity className="h-5 w-5 text-amber-500" />}
          tone="amber"
        />
        <KPICard
          title="Total Downtime"
          value={`${fmt(kpi.totalDowntime)}m`}
          subtitle={`${kpi.downtimeIncidents} insiden`}
          icon={<Timer className="h-5 w-5 text-orange-500" />}
          tone="orange"
        />
        <KPICard
          title="Form Compliance"
          value={`${kpi.compliancePct}%`}
          subtitle={`${kpi.reportsSubmitted} / ${kpi.reportsExpected} slot`}
          icon={<ClipboardCheck className="h-5 w-5 text-emerald-500" />}
          tone={kpi.compliancePct >= 100 ? "emerald" : "rose"}
        />
      </div>

      {/* ---------------------------------------------------------------- 2. Output by SKU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" title="Output Harian Ikut SKU (Kotak)">
          {hasProduction ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skuChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                    formatter={(v: any, n: any) => [`${fmt(Number(v))} kotak`, labelForSku(n, data)]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}
                    formatter={(v) => labelForSku(v, data)}
                  />
                  {activeSkus.map(s => (
                    <Bar key={s.key} dataKey={s.key} stackId="sku" fill={SKU_COLORS[s.key]} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="Tiada data pengeluaran dalam julat ini." />
          )}
        </Panel>

        <Panel title="Pecahan SKU">
          {hasProduction ? (
            <div className="space-y-3">
              {bySku.map(s => (
                <div key={s.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SKU_COLORS[s.key] }} />
                      {s.label}
                    </span>
                    <span className="font-black text-gray-900">{fmt(s.boxes)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${s.share}%`, background: SKU_COLORS[s.key] }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    <span>{s.share}% share</span>
                    <span>{fmt(s.pcs)} botol</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Tiada data SKU." />
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- 3. AM vs PM + Line */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" title="Perbandingan Shift AM vs PM (Kotak)">
          {hasProduction ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: any) => `${fmt(Number(v))} kotak`} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Bar dataKey="AM" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="PM" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="Tiada data shift." />
          )}
        </Panel>

        <Panel title="Ringkasan Shift & Line">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Ikut Shift</p>
              <div className="space-y-2">
                {byShift.map(s => (
                  <StatRow
                    key={s.shift}
                    label={`Shift ${s.shift}`}
                    primary={`${fmt(s.boxes)} kotak`}
                    secondary={`${s.reports} report · ${fmt(s.rejects)} reject · ${s.downtime}m`}
                    highlight={s.shift === extremes.bestShiftLabel}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Ikut Line</p>
              <div className="space-y-2">
                {byLine.map(l => (
                  <StatRow
                    key={l.line}
                    label={l.line}
                    primary={`${fmt(l.boxes)} kotak`}
                    secondary={`${l.reports} report · ${fmt(l.rejects)} reject`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- 4. Best / Worst day */}
      {(extremes.bestDay || extremes.worstDay) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {extremes.bestDay && (
            <ExtremeCard
              tone="emerald"
              icon={<ArrowUpRight className="w-5 h-5" />}
              caption="Hari Pengeluaran Tertinggi"
              date={`${extremes.bestDay.dayName}, ${dmyFull(extremes.bestDay.date)}`}
              value={`${fmt(extremes.bestDay.boxes)} kotak`}
              details={[
                `${fmt(extremes.bestDay.pcs)} botol`,
                `AM ${fmt(extremes.bestDay.byShift.AM || 0)} · PM ${fmt(extremes.bestDay.byShift.PM || 0)}`,
                `${fmt(extremes.bestDay.rejects)} reject · ${extremes.bestDay.downtime}m downtime`,
              ]}
            />
          )}
          {extremes.worstDay && (
            <ExtremeCard
              tone="rose"
              icon={<ArrowDownRight className="w-5 h-5" />}
              caption="Hari Pengeluaran Terendah"
              date={`${extremes.worstDay.dayName}, ${dmyFull(extremes.worstDay.date)}`}
              value={`${fmt(extremes.worstDay.boxes)} kotak`}
              details={[
                `${fmt(extremes.worstDay.pcs)} botol`,
                `${extremes.worstDay.reports}/${extremes.worstDay.expectedReports} report diterima`,
                `${fmt(extremes.worstDay.rejects)} reject · ${extremes.worstDay.downtime}m downtime`,
              ]}
            />
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- 5. Problems */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" title="Downtime Ikut Seksyen (Minit)" icon={<Wrench className="w-4 h-4 text-orange-500" />}>
          {problems.downtimeBySection.length > 0 ? (
            <div className="space-y-2.5">
              {problems.downtimeBySection.map(s => {
                const share = kpi.totalDowntime > 0 ? (s.minutes / kpi.totalDowntime) * 100 : 0
                return (
                  <div key={s.section} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-700 truncate pr-2">{s.section}</span>
                      <span className="font-black text-gray-900 shrink-0">
                        {s.minutes}m
                        <span className="ml-2 text-[10px] font-bold text-gray-400">{s.incidents}×</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${share}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState message="Tiada downtime direkodkan." />
          )}
        </Panel>

        <Panel title="Punca Downtime Utama">
          {problems.topReasons.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {problems.topReasons.map(r => (
                <div key={r.reason} className="py-2 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-gray-700 leading-snug">{r.reason}</span>
                  <span className="text-xs font-black text-orange-600 shrink-0">{r.minutes}m</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Tiada sebab direkodkan." />
          )}
          {problems.longestIncident && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-700">Insiden Terpanjang</p>
              <p className="text-sm font-black text-orange-900 mt-1">
                {problems.longestIncident.minutes} minit — {problems.longestIncident.section}
              </p>
              <p className="text-[11px] font-medium text-orange-700 mt-0.5">
                {dmyFull(problems.longestIncident.date)} · Shift {problems.longestIncident.shift}
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- 6. Reject analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" title="Analisis Pareto Reject">
          {problems.paretoRejects.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={problems.paretoRejects} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="value" name="Reject" radius={[4, 4, 0, 0]}>
                    {problems.paretoRejects.map((_, i) => (
                      <Cell key={i} fill={REJECT_COLORS[i % REJECT_COLORS.length]} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Kumulatif %" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="Tiada reject direkodkan." />
          )}
        </Panel>

        <Panel title="Kadar Reject Ikut Kategori">
          <div className="space-y-2">
            {Object.entries(rates.categoryStats).map(([cat, s]) => (
              <div key={cat} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-700">{cat}</span>
                  {s.comparable ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${s.rate > 5 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                      {s.rate}%
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-700">N/A</span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  {fmt(s.usage)} guna · {fmt(s.rejects)} reject
                </p>
                {!s.comparable && (
                  <p className="text-[10px] font-medium text-amber-700 mt-1 leading-snug">
                    Unit tak sepadan ({s.unit}) — kadar tidak boleh dibanding.
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- 7. Coverage */}
      <Panel title="Kepatuhan Pengisian Borang" icon={<CalendarX2 className="w-4 h-4 text-rose-500" />}>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {coverage.calendar.map(c => {
            const tone = !c.isWorkingDay
              ? "bg-gray-100 text-gray-400 border-gray-200"
              : c.submitted === 0
                ? "bg-red-100 text-red-700 border-red-300"
                : c.submitted < c.expected
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
            return (
              <div
                key={c.date}
                title={`${c.dayName} ${dmyFull(c.date)} — ${c.isWorkingDay ? `${c.submitted}/${c.expected} report` : "Bukan hari bekerja"}`}
                className={`w-14 h-14 rounded-lg border flex flex-col items-center justify-center ${tone}`}
              >
                <span className="text-[10px] font-bold uppercase leading-none">{c.dayName.slice(0, 3)}</span>
                <span className="text-sm font-black leading-tight">{c.date.split("-")[2]}</span>
                <span className="text-[9px] font-bold leading-none">
                  {c.isWorkingDay ? `${c.submitted}/${c.expected}` : "—"}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-4">
          <LegendDot className="bg-emerald-400" label="Lengkap" />
          <LegendDot className="bg-amber-400" label="Separa" />
          <LegendDot className="bg-red-400" label="Tiada" />
          <LegendDot className="bg-gray-300" label="Bukan hari bekerja" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-2">
              Borang Tidak Diisi ({coverage.missing.length})
            </p>
            {coverage.missing.length > 0 ? (
              <div className="border border-red-100 rounded-lg divide-y divide-red-50 max-h-48 overflow-y-auto">
                {coverage.missing.map((m, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between bg-red-50/40">
                    <span className="text-xs font-bold text-gray-800">{m.dayName}, {dmyFull(m.date)}</span>
                    <span className="text-[10px] font-black uppercase text-red-700">{m.shift} · {m.line}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-medium">Semua slot lengkap.</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 mb-2">
              Belum Diluluskan ({coverage.notApproved.length})
            </p>
            {coverage.notApproved.length > 0 ? (
              <div className="border border-amber-100 rounded-lg divide-y divide-amber-50 max-h-48 overflow-y-auto">
                {coverage.notApproved.map(n => (
                  <div key={n.id} className="px-3 py-2 flex items-center justify-between bg-amber-50/40">
                    <span className="text-xs font-bold text-gray-800">{dmyFull(n.date)} · {n.shift}</span>
                    <span className="text-[10px] font-black uppercase text-amber-700">{n.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 font-medium">Semua borang telah diluluskan.</p>
            )}
            <p className="text-[10px] text-gray-400 font-medium mt-2 leading-snug">
              Borang belum diluluskan tidak dikira dalam metrik pengeluaran di atas.
            </p>
          </div>
        </div>
      </Panel>

      {/* ---------------------------------------------------------------- 8. Incoming + storeroom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2" title="Trend Terimaan Bahan (Bags/Boxes)">
          {kpi.totalTransferBags > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.incoming.map(t => ({ date: dmy(t.date), bags: t.bags }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBags" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: any) => `${fmt(Number(v))} bags`} />
                  <Area type="monotone" dataKey="bags" stroke="#10b981" strokeWidth={2} fill="url(#colorBags)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="Tiada terimaan bahan dalam julat ini." />
          )}
        </Panel>

        <Panel title="Baki Storeroom" icon={<Archive className="w-4 h-4 text-emerald-600" />}>
          {storeroom.length > 0 ? (
            <div className="space-y-2">
              {storeroom.map(s => (
                <div key={s.category} className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                  <span className="text-xs font-black uppercase tracking-wide text-emerald-900">{s.category}</span>
                  <span className="text-sm font-black text-emerald-700">{fmt(s.pieces)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Tiada baki storeroom." />
          )}
          <p className="text-[10px] text-gray-400 font-medium mt-3 leading-snug">
            Berdasarkan report diluluskan terkini. Nilai dalam anggaran jumlah keping.
          </p>
        </Panel>
      </div>

      {/* ---------------------------------------------------------------- 9. Data quality */}
      {hasDataIssue && (
        <Panel title="Amaran Kualiti Data" icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}>
          <div className="space-y-2 text-xs">
            {dataQuality.batchMismatch.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-black text-amber-900 uppercase text-[10px] tracking-wider mb-1">
                  Jumlah kotak tak sepadan dengan pecahan batch ({dataQuality.batchMismatch.length})
                </p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {dataQuality.batchMismatch.map((b, i) => (
                    <p key={i} className="text-[11px] text-amber-800 font-medium">
                      {dmyFull(b.date)} {b.shift} · {b.sku}: total {fmt(b.totalBox)} vs batch {fmt(b.batchSum)}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {dataQuality.duplicateSlots.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-black text-red-900 uppercase text-[10px] tracking-wider mb-1">
                  Report berganda untuk slot yang sama ({dataQuality.duplicateSlots.length})
                </p>
                {dataQuality.duplicateSlots.map((d, i) => (
                  <p key={i} className="text-[11px] text-red-800 font-medium">
                    {dmyFull(d.date)} {d.shift} {d.line} — {d.count} report
                  </p>
                ))}
              </div>
            )}
            {dataQuality.emptyBatches > 0 && (
              <p className="text-[11px] text-gray-500 font-medium">
                {dataQuality.emptyBatches} baris batch kosong diabaikan dalam pengiraan.
              </p>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}

// -------------------------------------------------------------------------------- helpers

function labelForSku(key: string, data: AnalyticsPayload) {
  return data.bySku.find(s => s.key === key)?.label ?? key
}

const TONES: Record<string, { border: string; bg: string }> = {
  indigo: { border: "border-indigo-100", bg: "bg-indigo-50/40" },
  sky: { border: "border-sky-100", bg: "bg-sky-50/40" },
  red: { border: "border-red-100", bg: "bg-red-50/40" },
  amber: { border: "border-amber-100", bg: "bg-amber-50/40" },
  orange: { border: "border-orange-100", bg: "bg-orange-50/40" },
  emerald: { border: "border-emerald-100", bg: "bg-emerald-50/40" },
  rose: { border: "border-rose-200", bg: "bg-rose-50/60" },
}

function KPICard({ title, value, subtitle, icon, tone }: {
  title: string; value: string; subtitle: string; icon: React.ReactNode; tone: string
}) {
  const t = TONES[tone] ?? TONES.indigo
  return (
    <div className={`bg-white p-4 rounded-xl border ${t.border} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 leading-tight">{title}</p>
        <div className={`p-1.5 rounded-lg ${t.bg}`}>{icon}</div>
      </div>
      <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
      <p className="text-[11px] font-bold text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  )
}

function Panel({ title, icon, children, className = "" }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${className}`}>
      <h3 className="text-sm font-black uppercase text-gray-800 mb-4 tracking-tight border-b pb-2 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatRow({ label, primary, secondary, highlight }: {
  label: string; primary: string; secondary: string; highlight?: boolean
}) {
  return (
    <div className={`p-2.5 rounded-lg border ${highlight ? "border-indigo-200 bg-indigo-50/60" : "border-gray-100 bg-gray-50/60"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wide text-gray-700">{label}</span>
        <span className="text-xs font-black text-gray-900">{primary}</span>
      </div>
      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{secondary}</p>
    </div>
  )
}

function ExtremeCard({ tone, icon, caption, date, value, details }: {
  tone: "emerald" | "rose"; icon: React.ReactNode; caption: string; date: string; value: string; details: string[]
}) {
  const styles = tone === "emerald"
    ? { wrap: "border-emerald-200 bg-emerald-50/50", chip: "bg-emerald-600", text: "text-emerald-900", sub: "text-emerald-700" }
    : { wrap: "border-rose-200 bg-rose-50/50", chip: "bg-rose-600", text: "text-rose-900", sub: "text-rose-700" }

  return (
    <div className={`p-5 rounded-xl border shadow-sm ${styles.wrap}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`p-1.5 rounded-lg text-white ${styles.chip}`}>{icon}</span>
        <p className={`text-[10px] font-black uppercase tracking-wider ${styles.sub}`}>{caption}</p>
      </div>
      <p className={`text-lg font-black ${styles.text}`}>{date}</p>
      <p className={`text-3xl font-black tracking-tight mt-1 ${styles.text}`}>{value}</p>
      <div className="mt-3 space-y-0.5">
        {details.map((d, i) => (
          <p key={i} className={`text-[11px] font-bold ${styles.sub}`}>{d}</p>
        ))}
      </div>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${className}`} />
      {label}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-center">
      <Package className="w-8 h-8 text-gray-300 mb-2" />
      <p className="text-xs font-bold text-gray-400">{message}</p>
    </div>
  )
}

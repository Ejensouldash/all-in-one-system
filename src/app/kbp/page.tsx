import Link from "next/link"
import {
  QrCode, Package, Boxes, Factory, CalendarClock, AlertCircle, Plus, Sun, Moon,
} from "lucide-react"
import { getKbpDashboardStats } from "@/app/actions/kbpBatch"
import { formatDateOnly, formatIsoWeekLabel, getShiftLabel } from "@/lib/kbp/batchNumber"

export const dynamic = "force-dynamic"

function StatCard({
  label, value, sub, icon: Icon, tone,
}: {
  label: string; value: string | number; sub?: string; icon: any; tone: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</p>
          <p className="text-3xl font-black tracking-tighter text-gray-900 mt-2">{value}</p>
          {sub && <p className="text-xs font-medium text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function ShiftPill({ done, shift }: { done: boolean; shift: "01" | "02" }) {
  const Icon = shift === "01" ? Sun : Moon
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
        done
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-gray-50 text-gray-400 border-gray-200"
      }`}
    >
      <Icon className="h-3 w-3" />
      {shift === "01" ? "AM" : "PM"}
    </span>
  )
}

export default async function KbpDashboardPage() {
  const res = await getKbpDashboardStats()

  if (!res.success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <p className="font-bold text-gray-900">Gagal memuatkan dashboard</p>
        <p className="text-sm text-gray-500 mt-1">{res.error}</p>
      </div>
    )
  }

  const stats = res.data
  const now = new Date()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-widest">
          <CalendarClock className="h-4 w-4 mr-2" />
          {formatIsoWeekLabel(now)}
        </span>
        {stats.legacyCount > 0 && (
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-widest">
            <AlertCircle className="h-4 w-4 mr-2" />
            {stats.legacyCount} batch lama (format bebas)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Batch Hari Ini" value={stats.todayBatches} icon={QrCode} tone="bg-yellow-50 text-yellow-600" />
        <StatCard label="Batch Minggu Ini" value={stats.weekBatches} icon={Package} tone="bg-indigo-50 text-indigo-600" />
        <StatCard
          label="Qty Minggu Ini"
          value={stats.weekQty.toLocaleString()}
          sub="pcs"
          icon={Boxes}
          tone="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Mesin Aktif Hari Ini"
          value={`${stats.machinesActiveToday} / ${stats.machines.length}`}
          icon={Factory}
          tone="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Status Mesin</h2>
            <p className="text-xs text-gray-500 mt-0.5">Shift hari ini &amp; jumlah minggu ini</p>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.machines.map(m => (
              <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 tracking-tight">{m.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-100 text-gray-600 border border-gray-200">
                      {m.productCode}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{m.sku}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex gap-1.5">
                    <ShiftPill done={m.amDone} shift="01" />
                    <ShiftPill done={m.pmDone} shift="02" />
                  </div>
                  <div className="text-right w-28">
                    <p className="font-black text-gray-900 tabular-nums">{m.weekQty.toLocaleString()}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {m.weekBatches} batch / minggu
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900 via-amber-800 to-orange-900 rounded-2xl p-8 text-white shadow-xl border border-amber-700/50 flex flex-col justify-between">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-100 text-xs font-bold uppercase tracking-widest mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-2 animate-pulse" />
              Batch Baru
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-3">Generate Batch QR</h2>
            <p className="text-amber-200 text-sm font-medium">
              Pilih mesin, tarikh dan shift — Batch No dijana automatik dan sticker QR terus boleh dicetak.
            </p>
          </div>
          <Link
            href="/kbp/batch"
            className="flex items-center justify-center w-full bg-white text-amber-900 px-6 py-4 rounded-xl font-black hover:bg-amber-50 transition-colors shadow-lg uppercase tracking-wider"
          >
            <Plus className="h-5 w-5 mr-2" /> Buat Batch
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Batch Terkini</h2>
          <Link href="/kbp/batch" className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800">
            Lihat semua →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Batch No", "Mesin", "Produk", "Shift", "Tarikh Produksi", "Qty", "Oleh"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-gray-400">
                    Belum ada batch. Tekan &ldquo;Buat Batch&rdquo; untuk mula.
                  </td>
                </tr>
              ) : (
                stats.recent.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-black text-gray-900 whitespace-nowrap">{b.batchNo}</td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-700">{b.machine || "—"}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">{b.sku}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {b.shift ? getShiftLabel(b.shift) : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateOnly(b.productionDate)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {b.totalQty.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{b.createdBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

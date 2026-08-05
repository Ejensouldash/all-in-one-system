import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Ban, ArrowRight, PackageOpen, Plus, CalendarClock } from "lucide-react"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getWithdrawalHistory } from "@/app/actions/rawMaterialWithdrawal"
import { findSku } from "@/lib/warehouse/rawMaterialSkus"
import { VoidWithdrawalButton } from "../WithdrawalRow"

const dmy = (d: Date) => {
  const iso = new Date(d).toISOString().split("T")[0]
  const [y, m, day] = iso.split("-")
  return `${day}/${m}/${y}`
}

/** For timestamps rather than @db.Date columns: shift to Malaysia before reading the calendar day,
 *  otherwise anything logged after 8pm local shows the previous date. */
const dmyStamp = (d: Date) => dmy(new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000))

const PURPOSE_LABEL: Record<string, string> = {
  PRODUCTION: "Production",
  DISPOSAL: "Buang / Rosak",
  RETURN: "Pulang Supplier",
  ADJUSTMENT: "Pelarasan",
}

export default async function WithdrawalHistoryPage() {
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  if (!hasAnyModule(access, ["WAREHOUSE", "RAW_MATERIAL_WITHDRAWAL"])) redirect("/forms")

  const res = await getWithdrawalHistory()
  const rows = res.data

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/forms/warehouse/reports/raw-material/withdraw"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Ambil Bahan
          </Link>
          <h2 className="text-xl font-black uppercase tracking-tight mt-2">Sejarah Pengeluaran Bahan</h2>
          <p className="text-sm text-gray-500 font-medium">
            Semua bahan yang diambil dari warehouse, dan DO yang dijana untuk production.
          </p>
        </div>
        <Link
          href="/forms/warehouse/reports/raw-material/withdraw"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Ambil Bahan
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center text-center">
          <PackageOpen className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-500">Belum ada pengeluaran direkodkan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(w => {
            const isVoid = w.status === "VOID"
            return (
              <div
                key={w.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  isVoid ? "border-gray-200 opacity-70" : "border-gray-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                  <span className={`text-xs font-black ${isVoid ? "text-gray-400 line-through" : "text-gray-900"}`}>
                    {w.withdrawalNo}
                  </span>
                  <span className="text-[11px] font-bold text-gray-500">
                    {dmy(w.date)} · {w.time} · {w.shift}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                    {PURPOSE_LABEL[w.purpose] || w.purpose}
                  </span>
                  {w.backdateReason && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                      <CalendarClock className="w-3 h-3" /> Rekod Lewat
                    </span>
                  )}
                  {isVoid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px] font-black">
                      <Ban className="w-3 h-3" /> VOID
                    </span>
                  ) : w.linkedDoNumber ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700">
                      <ArrowRight className="w-3 h-3" /> {w.linkedDoNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-400">tiada DO</span>
                  )}
                  <span className="text-[11px] font-medium text-gray-500 ml-auto">oleh {w.takenBy}</span>
                  {!isVoid && (
                    <VoidWithdrawalButton id={w.id} withdrawalNo={w.withdrawalNo} linkedDoNumber={w.linkedDoNumber} />
                  )}
                </div>

                <div className="divide-y divide-gray-50">
                  {w.items.map(item => {
                    const sku = findSku(item.sku)
                    return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-800">{sku?.label || item.sku}</span>
                          <span className="text-[11px] font-mono text-gray-500 ml-2">{item.batchNo}</span>
                        </div>
                        <span className="text-xs font-black text-gray-900 shrink-0">
                          {item.qty.toLocaleString("en-MY")}{" "}
                          <span className="text-[10px] font-bold text-gray-400">
                            {(sku?.unit || "").toLowerCase()}
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>

                {w.backdateReason && (
                  <p className="px-5 py-2 text-[11px] font-medium text-amber-800 bg-amber-50 border-t border-amber-100">
                    Rekod lewat — diisi {dmyStamp(w.createdAt)}: {w.backdateReason}
                  </p>
                )}

                {isVoid && w.voidReason && (
                  <p className="px-5 py-2 text-[11px] font-medium text-gray-500 bg-gray-50 border-t border-gray-100">
                    Dibatalkan: {w.voidReason}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

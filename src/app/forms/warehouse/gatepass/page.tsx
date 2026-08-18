import Link from "next/link"
import { CalendarClock, ClipboardCheck, PackageCheck, Plus, Truck, ArrowRight } from "lucide-react"
import { listWarehouseGatePasses } from "@/lib/warehouse/gatepass-service"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Warehouse Gatepass Planning" }

const statusClass: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300",
  AWAITING_CUSTOMER: "bg-blue-100 text-blue-800 border-blue-200",
  CUSTOMER_SUBMITTED: "bg-cyan-100 text-cyan-800 border-cyan-300",
  WAREHOUSE_ACKNOWLEDGED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  PREPARING: "bg-amber-100 text-amber-800 border-amber-300",
  READY_FOR_PICKUP: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CHECKED_IN: "bg-violet-100 text-violet-800 border-violet-200",
  LOADING: "bg-orange-100 text-orange-800 border-orange-300",
  CHECKED_OUT: "bg-teal-100 text-teal-800 border-teal-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  EXPIRED: "bg-gray-200 text-gray-700 border-gray-300",
  NO_SHOW: "bg-rose-100 text-rose-800 border-rose-300",
}

export default async function GatePassDashboardPage() {
  const capabilities = await getWarehouseOperationAccess()
  if (!capabilities) redirect("/login?callbackUrl=/forms/warehouse/gatepass")
  if (!capabilities.requester) redirect("/forms")
  const gatePasses = await listWarehouseGatePasses()
  const active = gatePasses.filter(
    (row) => !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "NO_SHOW"].includes(row.status)
  )
  const plannedBoxes = active.reduce(
    (total, row) => total + row.items.reduce((sum, item) => sum + item.plannedQty, 0),
    0
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-900 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              <ClipboardCheck className="h-4 w-4" /> Pre-dispatch planning
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Gatepass Control Tower</h1>
            <p className="mt-2 max-w-2xl text-xs md:text-sm text-cyan-100/80 leading-relaxed">
              Rancang jadual lori, bilangan kotak dan pallet sebelum pengambilan barang di kilang. Gatepass tidak menolak stok fizikal produk atau mencipta DO baharu.
            </p>
          </div>
          <Link
            href="/forms/warehouse/gatepass/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-black text-slate-950 shadow-lg hover:bg-cyan-300 active:scale-98 transition-all"
          >
            <Plus className="h-5 w-5" /> Permintaan Gatepass Baharu
          </Link>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary icon={<Truck className="h-5 w-5" />} label="Permintaan Aktif" value={active.length} />
        <Summary icon={<PackageCheck className="h-5 w-5" />} label="Rancangan Kotak / Unit" value={plannedBoxes} />
        <Summary
          icon={<CalendarClock className="h-5 w-5" />}
          label="Sedia Diambil (Ready)"
          value={active.filter((row) => row.status === "READY_FOR_PICKUP").length}
        />
      </div>

      {/* Movement Planning Register Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900 text-base">Senarai Pendaftaran Gatepass</h2>
            <p className="text-xs text-slate-500">Permintaan operasi terkini dan pautan rujukan Delivery Order (DO).</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5 font-black">Gatepass</th>
                <th className="px-6 py-3.5 font-black">Waktu Pengambilan</th>
                <th className="px-6 py-3.5 font-black">Pelanggan / Destinasi</th>
                <th className="px-6 py-3.5 font-black">No. Kenderaan</th>
                <th className="px-6 py-3.5 font-black">Rancangan Muatan</th>
                <th className="px-6 py-3.5 font-black">Status</th>
                <th className="px-6 py-3.5 text-right font-black">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gatePasses.map((row) => {
                const planned = row.items.reduce((sum, item) => sum + item.plannedQty, 0)
                return (
                  <tr key={row.id} className="hover:bg-cyan-50/40 transition-colors group">
                    <td className="px-6 py-4">
                      <Link
                        href={`/forms/warehouse/gatepass/${row.id}`}
                        className="font-black text-cyan-800 group-hover:text-cyan-900 group-hover:underline text-base"
                      >
                        {row.gatePassNo}
                      </Link>
                      <div className="text-xs text-slate-500 font-medium">
                        {row.deliveryOrders.map((link) => link.distributionOrder.doNumber).join(", ") || "Tiada DO dipautkan"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-700 text-xs">
                      {row.requestedPickupAt.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{row.customerName}</div>
                      <div className="max-w-xs truncate text-xs text-slate-500">{row.destination}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800">
                      {row.vehicleNo || "Menunggu pemandu"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{planned} unit/kotak</div>
                      <div className="text-xs text-cyan-800 font-semibold">{row.plannedPalletQty} pallet kayu</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black border ${
                          statusClass[row.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/forms/warehouse/gatepass/${row.id}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-cyan-700 hover:text-cyan-900 group-hover:translate-x-0.5 transition-transform"
                      >
                        Buka ➔
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {!gatePasses.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Belum ada rekod Gatepass. Mulakan dengan menekan butang <strong>Permintaan Gatepass Baharu</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-cyan-700">
        {icon}
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-950 tracking-tight">{value.toLocaleString()}</div>
    </div>
  )
}

import Link from "next/link"
import { CalendarClock, ClipboardCheck, PackageCheck, Plus, Truck } from "lucide-react"
import { listWarehouseGatePasses } from "@/lib/warehouse/gatepass-service"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Warehouse Gatepass Planning" }

const statusClass: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  AWAITING_CUSTOMER: "bg-blue-100 text-blue-800",
  CUSTOMER_SUBMITTED: "bg-cyan-100 text-cyan-800",
  WAREHOUSE_ACKNOWLEDGED: "bg-indigo-100 text-indigo-800",
  PREPARING: "bg-amber-100 text-amber-800",
  READY_FOR_PICKUP: "bg-emerald-100 text-emerald-800",
  CHECKED_IN: "bg-violet-100 text-violet-800",
  LOADING: "bg-orange-100 text-orange-800",
  CHECKED_OUT: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-200 text-gray-700",
  NO_SHOW: "bg-rose-100 text-rose-800",
}

export default async function GatePassDashboardPage() {
  const capabilities = await getWarehouseOperationAccess()
  if (!capabilities) redirect("/login?callbackUrl=/forms/warehouse/gatepass")
  if (!capabilities.requester) redirect("/forms")
  const gatePasses = await listWarehouseGatePasses()
  const active = gatePasses.filter(row => !["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "NO_SHOW"].includes(row.status))
  const plannedBoxes = active.reduce((total, row) => total + row.items.reduce((sum, item) => sum + item.plannedQty, 0), 0)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-950 to-teal-900 p-7 text-white shadow-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <ClipboardCheck className="h-4 w-4" /> Pre-dispatch planning
            </div>
            <h2 className="text-3xl font-black tracking-tight">Gatepass Control Tower</h2>
            <p className="mt-2 max-w-2xl text-sm text-cyan-50/80">Rancang lori, kotak dan pallet sebelum pickup. Gatepass tidak menolak stok atau mencipta DO.</p>
          </div>
          <Link href="/forms/warehouse/gatepass/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg hover:bg-cyan-200">
            <Plus className="h-5 w-5" /> New Gatepass
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary icon={<Truck className="h-5 w-5" />} label="Active requests" value={active.length} />
        <Summary icon={<PackageCheck className="h-5 w-5" />} label="Planned boxes / units" value={plannedBoxes} />
        <Summary icon={<CalendarClock className="h-5 w-5" />} label="Ready for pickup" value={active.filter(row => row.status === "READY_FOR_PICKUP").length} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-black text-slate-900">Movement Planning Register</h3>
          <p className="text-xs text-slate-500">Latest operational requests and linked DO reference.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Gatepass</th><th className="px-5 py-3">Pickup</th><th className="px-5 py-3">Customer / Destination</th><th className="px-5 py-3">Vehicle</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gatePasses.map(row => {
                const planned = row.items.reduce((sum, item) => sum + item.plannedQty, 0)
                return (
                  <tr key={row.id} className="hover:bg-cyan-50/40">
                    <td className="px-5 py-4"><Link href={`/forms/warehouse/gatepass/${row.id}`} className="font-black text-cyan-800 hover:underline">{row.gatePassNo}</Link><div className="text-xs text-slate-500">{row.deliveryOrders.map(link => link.distributionOrder.doNumber).join(", ") || "No DO linked"}</div></td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">{row.requestedPickupAt.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-5 py-4"><div className="font-bold text-slate-900">{row.customerName}</div><div className="max-w-xs truncate text-xs text-slate-500">{row.destination}</div></td>
                    <td className="px-5 py-4 font-mono text-xs font-bold">{row.vehicleNo || "Pending customer"}</td>
                    <td className="px-5 py-4"><div className="font-bold">{planned} boxes/units</div><div className="text-xs text-slate-500">{row.plannedPalletQty} pallets</div></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass[row.status] || "bg-slate-100"}`}>{row.status.replaceAll("_", " ")}</span></td>
                  </tr>
                )
              })}
              {!gatePasses.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Belum ada Gatepass. Mulakan dengan New Gatepass.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-cyan-700">{icon}<span className="text-xs font-black uppercase tracking-widest">{label}</span></div><div className="text-3xl font-black text-slate-950">{value.toLocaleString()}</div></div>
}

import Link from "next/link"
import { CalendarClock, ClipboardCheck, PackageCheck, Plus, Truck } from "lucide-react"
import { listWarehouseGatePasses } from "@/lib/warehouse/gatepass-service"
import { getWarehouseOperationAccess } from "@/lib/warehouse/operations-access"
import { GatePassControlTowerTable } from "@/components/warehouse/GatePassControlTowerTable"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Warehouse Gatepass Planning" }



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

        <GatePassControlTowerTable gatePasses={gatePasses} />
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

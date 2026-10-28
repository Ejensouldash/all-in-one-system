import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import {
  Boxes,
  MapPinned,
  PackageCheck,
  ShieldAlert,
  Truck,
} from "lucide-react"
import { LiveInventoryTable } from "@/components/warehouse/LiveInventoryTable"
import { PendingHandoversSection } from "@/components/warehouse/PendingHandoversSection"

async function AsyncWarehouseContent() {
  const [pendingHandovers, inventoryBatches, shippedOrders, quarantineCount] = await Promise.all([
    prisma.productionHandover.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { dailyReport: true, items: true, productionStaff: true }
    }),
    prisma.inventoryBatch.findMany({
      where: { availableBalance: { gt: 0 } },
      orderBy: [{ updatedAt: "desc" }, { batchNumber: "asc" }]
    }),
    prisma.distributionOrder.count({ where: { status: "SHIPPED" } }),
    prisma.goodsReturnNote.count({ where: { status: "QUARANTINE" } })
  ])

  const availableUnits = inventoryBatches.reduce((sum, batch) => sum + batch.availableBalance, 0)

  const cards = [
    { label: "Active Batches", value: inventoryBatches.length, hint: "With available balance", icon: Boxes, tone: "bg-indigo-50 text-indigo-700" },
    { label: "Available Units", value: availableUnits.toLocaleString(), hint: "Current inventory balance", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700" },
    { label: "In Transit", value: shippedOrders, hint: "DO with shipped status", icon: Truck, tone: "bg-sky-50 text-sky-700" },
    { label: "Quarantine", value: quarantineCount, hint: "Pending action", icon: ShieldAlert, tone: "bg-rose-50 text-rose-700" },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5">
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-slate-950 sm:text-3xl tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-600">{card.label}</p>
            <p className="mt-1 hidden text-xs text-slate-400 sm:block">{card.hint}</p>
          </div>
        ))}
      </section>

      {/* Production Handover Alerts / Action Section */}
      <div id="pending-handovers" className="scroll-mt-24">
        <PendingHandoversSection handovers={pendingHandovers} />
      </div>

      {/* Live Inventory & Traceability Table */}
      <section id="live-inventory" className="scroll-mt-24 space-y-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Traceability Ready</p>
            <h2 className="mt-0.5 text-2xl font-black text-slate-950">Live Inventory</h2>
            <p className="text-xs text-slate-500 sm:text-sm">Click Trace to view batch origin, DO movement, driver and location check-in.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <MapPinned className="h-3.5 w-3.5 text-slate-500" /> Location check-in available on DO details page
          </div>
        </div>
        <LiveInventoryTable inventoryBatches={inventoryBatches} />
      </section>
    </div>
  )
}

function WarehouseSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-16 rounded-2xl bg-slate-100" />
      <div className="h-96 rounded-2xl bg-slate-100" />
    </div>
  )
}

export default function WarehouseDashboard() {
  return (
    <Suspense fallback={<WarehouseSkeleton />}>
      <AsyncWarehouseContent />
    </Suspense>
  )
}

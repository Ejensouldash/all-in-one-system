import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  MapPinned,
  PackageCheck,
  ShieldAlert,
  Truck,
} from "lucide-react"
import { LiveInventoryTable } from "@/components/warehouse/LiveInventoryTable"

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
    { label: "Batch Aktif", value: inventoryBatches.length, hint: "Dengan baki tersedia", icon: Boxes, tone: "bg-indigo-50 text-indigo-700" },
    { label: "Unit Tersedia", value: availableUnits.toLocaleString(), hint: "Baki inventori semasa", icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Dalam Perjalanan", value: shippedOrders, hint: "DO berstatus shipped", icon: Truck, tone: "bg-sky-50 text-sky-700" },
    { label: "Quarantine", value: quarantineCount, hint: "Menunggu tindakan", icon: ShieldAlert, tone: "bg-rose-50 text-rose-700" },
  ]

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-400">Warehouse Command Centre</p>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Stok, handover dan penghantaran dalam satu pandangan.</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300">Cari batch, buka sejarah penuh atau semak perjalanan DO tanpa mengubah aliran Production dan kiraan inventori sedia ada.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/forms/warehouse/distribution/new" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400">
              <Truck className="h-4 w-4" /> Cipta DO
            </Link>
            <Link href="/forms/warehouse/distribution" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-black transition hover:bg-white hover:text-slate-950">
              Lihat Penghantaran <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${card.tone}`}><card.icon className="h-5 w-5" /></div>
            <p className="text-2xl font-black text-slate-950 sm:text-3xl">{card.value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-600">{card.label}</p>
            <p className="mt-1 hidden text-xs text-slate-400 sm:block">{card.hint}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Action Required</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Handover dari Production</h2>
          </div>
          {pendingHandovers.length > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{pendingHandovers.length} pending</span>}
        </div>

        {pendingHandovers.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-black">Semua handover telah diterima</p>
              <p className="text-sm text-emerald-700">Tiada tindakan warehouse diperlukan sekarang.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingHandovers.map(handover => {
              const totalNet = handover.items.reduce((sum, item) => sum + item.netToWarehousePcs, 0)
              return (
                <article key={handover.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800"><ClipboardCheck className="h-3 w-3" /> Pending</span>
                      <h3 className="mt-3 text-lg font-black text-slate-950">{handover.handoverNumber}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Daripada {handover.productionStaff.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-700">{totalNet.toLocaleString()}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pcs net</p>
                    </div>
                  </div>
                  <Link href={`/forms/warehouse/handover/${handover.id}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-sm font-black text-white transition hover:bg-emerald-700">
                    Semak & Terima <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Traceability Ready</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Live Inventory</h2>
            <p className="mt-1 text-sm text-slate-500">Klik Trace untuk melihat asal batch, pergerakan DO, driver dan lokasi check-in.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400"><MapPinned className="h-4 w-4" /> Location Check-In tersedia pada halaman DO</div>
        </div>
        <LiveInventoryTable inventoryBatches={inventoryBatches} />
      </section>
    </div>
  )
}

function WarehouseSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-56 rounded-3xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-slate-100" />)}</div>
      <div className="h-80 rounded-2xl bg-slate-100" />
    </div>
  )
}

export default function WarehouseDashboard() {
  return <Suspense fallback={<WarehouseSkeleton />}><AsyncWarehouseContent /></Suspense>
}

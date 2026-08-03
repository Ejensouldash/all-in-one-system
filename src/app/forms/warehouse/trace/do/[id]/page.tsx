import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  Navigation,
  PackageCheck,
  Printer,
  Truck,
} from "lucide-react"
import { getDistributionTraceData } from "@/lib/warehouse/traceability"
import { SmartQrCard } from "@/components/warehouse/SmartQrCard"
import { LocationCheckIn } from "@/components/warehouse/LocationCheckIn"

function formatSku(sku: string) {
  return sku.replace("p800_", "800ml × ").replace("p425_", "425ml × ").toUpperCase()
}

function dateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date)
}

function eventName(eventType: string) {
  if (eventType === "DISPATCHED") return "Perjalanan dimulakan"
  if (eventType === "ARRIVED") return "Tiba di destinasi"
  if (eventType === "DELIVERED") return "Penghantaran selesai"
  return eventType
}

export default async function DistributionTracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getDistributionTraceData(id)
  if (!order) notFound()

  const latest = order.trackingEvents[order.trackingEvents.length - 1]
  const totalQty = order.items.reduce((sum, item) => sum + item.qtySent, 0)
  const qrPath = `/forms/warehouse/trace/do/${order.id}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/forms/warehouse/distribution" className="rounded-xl border border-slate-300 bg-white p-2.5 shadow-sm transition hover:border-slate-950 hover:bg-slate-950 hover:text-white" aria-label="Back to Distribution Orders"><ArrowLeft className="h-5 w-5" /></Link>
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">DO Traceability</p><h1 className="mt-1 font-mono text-2xl font-black text-slate-950 sm:text-3xl">{order.doNumber}</h1><p className="mt-1 text-sm font-bold text-slate-500">{order.destination}</p></div>
        </div>
        <div className="flex gap-2">
          <Link href={`/forms/warehouse/distribution/${order.id}/pod`} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-950 hover:text-white"><Printer className="h-4 w-4" /> Print DO</Link>
          <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase ${latest?.eventType === "DELIVERED" || order.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}>{latest?.eventType === "DELIVERED" ? <CheckCircle2 className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}{latest?.eventType || order.status}</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination</p><p className="mt-2 text-lg font-black text-emerald-400">{order.destination}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Quantity</p><p className="mt-2 text-3xl font-black">{totalQty.toLocaleString()}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver</p><p className="mt-2 font-black">{order.driverName || "Belum direkod"}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</p><p className="mt-2 font-black">{order.vehicleNo || "Belum direkod"}</p></div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /><h2 className="font-black">Distribution Details</h2></div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Prepared by</dt><dd className="text-right font-black">{order.createdBy.name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Method</dt><dd className="text-right font-bold">{order.distributionMethod}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Created</dt><dd className="text-right font-bold">{dateTime(order.createdAt)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Distribution date</dt><dd className="text-right font-bold">{dateTime(order.distributionDate)}</dd></div>
              </dl>
            </div>
            <LocationCheckIn distributionOrderId={order.id} latestEvent={latest?.eventType} />
          </section>
        </div>
        <SmartQrCard path={qrPath} label="DO Tracking QR" reference={order.doNumber} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Batch Manifest</p><h2 className="mt-1 text-xl font-black">Barang dalam penghantaran</h2></div>
        <div className="divide-y divide-slate-100">
          {order.items.map(item => (
            <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Produk</p><p className="mt-1 font-black">{formatSku(item.sku)}</p></div>
              <div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Batch No.</p><Link href={`/forms/warehouse/inventory/batch/${encodeURIComponent(item.batchNumber)}?sku=${encodeURIComponent(item.sku)}`} className="mt-1 inline-flex items-center gap-1 font-mono text-sm font-black text-indigo-700 hover:text-indigo-900">{item.batchNumber}<ExternalLink className="h-3.5 w-3.5" /></Link></div>
              <div className="text-left sm:text-right"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Quantity</p><p className="mt-1 text-2xl font-black text-emerald-700">{item.qtySent.toLocaleString()}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Journey Timeline</p><h2 className="mt-1 text-xl font-black">Status dan lokasi check-in</h2></div>
        <div className="p-5">
          <ol className="space-y-0">
            <li className="relative flex gap-4 pb-6">
              <span className="absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />
              <span className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"><ClipboardList className="h-4 w-4" /></span>
              <div className="flex-1"><p className="font-black">Distribution Order dicipta</p><p className="mt-1 text-sm text-slate-500">{order.createdBy.name} · {order.destination}</p><p className="mt-1 text-xs font-bold text-slate-400">{dateTime(order.createdAt)}</p></div>
            </li>
            {order.trackingEvents.map((event, index) => {
              const isLast = index === order.trackingEvents.length - 1
              const hasLocation = event.latitude != null && event.longitude != null
              const EventIcon = event.eventType === "DELIVERED" ? PackageCheck : event.eventType === "ARRIVED" ? MapPin : Truck
              return (
                <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && <span className="absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />}
                  <span className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.eventType === "DELIVERED" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}><EventIcon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><p className="font-black">{eventName(event.eventType)}</p><p className="mt-1 text-sm text-slate-500">{event.recordedBy.name}{event.remarks ? ` · ${event.remarks}` : ""}</p></div><p className="text-xs font-bold text-slate-400">{dateTime(event.recordedAt)}</p></div>
                    {hasLocation ? <a href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-black text-sky-700 hover:bg-sky-100"><MapPin className="h-3.5 w-3.5" /> Lihat lokasi · ±{Math.round(event.accuracy || 0)}m</a> : <span className="mt-2 inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">Check-in manual</span>}
                  </div>
                </li>
              )
            })}
            {order.trackingEvents.length === 0 && <li className="ml-12 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Belum ada location check-in. Gunakan panel di atas untuk memulakan perjalanan.</li>}
          </ol>
        </div>
      </section>

      {order.returns.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-amber-700" /><h2 className="font-black text-amber-950">Return / Quarantine</h2></div><p className="mt-2 text-sm font-semibold text-amber-800">DO ini mempunyai {order.returns.length} return record.</p></section>}
    </div>
  )
}

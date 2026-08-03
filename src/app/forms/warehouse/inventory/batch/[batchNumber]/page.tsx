import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Factory,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Truck,
  UserRound,
} from "lucide-react"
import { getBatchTraceData } from "@/lib/warehouse/traceability"
import { SmartQrCard } from "@/components/warehouse/SmartQrCard"

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

type TimelineItem = {
  key: string
  date: Date
  title: string
  description: string
  kind: "IN" | "OUT" | "RETURN" | "TRACK"
  qty?: number
}

export default async function BatchTracePage({
  params,
  searchParams,
}: {
  params: Promise<{ batchNumber: string }>
  searchParams: Promise<{ sku?: string }>
}) {
  const [{ batchNumber: rawBatch }, { sku: rawSku }] = await Promise.all([params, searchParams])
  if (!rawSku) redirect("/forms/warehouse/dashboard")

  const batchNumber = decodeURIComponent(rawBatch).trim().toUpperCase()
  const sku = decodeURIComponent(rawSku).trim()
  const trace = await getBatchTraceData(sku, batchNumber)
  if (!trace) notFound()

  const production = trace.productionBatches[0]
  const productionReport = production?.productionOutput.report
  const opening = trace.openingStocks[0]
  const handover = trace.handovers[0]?.handover
  const originName =
    productionReport?.createdBy?.name ||
    productionReport?.preparedBy ||
    handover?.productionStaff.name ||
    opening?.setBy.name ||
    "Rekod asal tidak tersedia"

  const timeline: TimelineItem[] = []

  trace.openingStocks.forEach(row => timeline.push({
    key: `opening-${row.id}`,
    date: row.createdAt,
    title: "Opening stock direkod",
    description: `${row.setBy.name} menetapkan stok awal untuk bulan ${row.month}/${row.year}.`,
    kind: "IN",
    qty: row.openingQty,
  }))
  trace.productionBatches.forEach(row => timeline.push({
    key: `production-${row.id}`,
    date: row.productionOutput.report.createdAt,
    title: "Batch dicipta oleh Production",
    description: `${row.productionOutput.report.preparedBy} · ${row.productionOutput.report.shift} · ${row.productionOutput.report.line}`,
    kind: "IN",
    qty: row.qty,
  }))
  trace.transfers.filter(row => row.status === "RECEIVED").forEach(row => timeline.push({
    key: `transfer-${row.id}`,
    date: row.receivedAt || row.updatedAt,
    title: "Diterima ke inventory warehouse",
    description: row.receivedBy?.name ? `Diterima oleh ${row.receivedBy.name}.` : "Production transfer diterima.",
    kind: "IN",
    qty: row.qtyProduced,
  }))
  trace.handovers.filter(row => row.handover.status === "RECEIVED").forEach(row => timeline.push({
    key: `handover-${row.id}`,
    date: row.handover.updatedAt,
    title: `Handover ${row.handover.handoverNumber} diterima`,
    description: `${row.handover.productionStaff.name} → ${row.handover.warehouseStaff?.name || "Warehouse"}`,
    kind: "IN",
    qty: row.netToWarehousePcs,
  }))
  trace.doItems.forEach(row => {
    const order = row.distributionOrder
    timeline.push({
      key: `do-${row.id}`,
      date: order.distributionDate,
      title: `Keluar melalui ${order.doNumber}`,
      description: `${order.destination} · ${order.driverName || "Driver belum direkod"} · ${order.vehicleNo || "No. plat belum direkod"}`,
      kind: "OUT",
      qty: row.qtySent,
    })
    order.trackingEvents.forEach(event => timeline.push({
      key: `tracking-${event.id}`,
      date: event.recordedAt,
      title: event.eventType === "ARRIVED" ? `Tiba di ${order.destination}` : event.eventType === "DELIVERED" ? `Dihantar ke ${order.destination}` : "Perjalanan dimulakan",
      description: `${event.recordedBy.name}${event.locationStatus === "CAPTURED" ? " · Lokasi disahkan" : " · Tanpa lokasi"}`,
      kind: "TRACK",
    }))
  })
  trace.returns.forEach(row => timeline.push({
    key: `return-${row.id}`,
    date: row.loggedAt,
    title: `Return daripada ${row.distributionOrder.doNumber}`,
    description: `${row.reason} · ${row.status}`,
    kind: "RETURN",
    qty: row.qtyReturned,
  }))
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime())

  const qrPath = `/forms/warehouse/inventory/batch/${encodeURIComponent(batchNumber)}?sku=${encodeURIComponent(sku)}&batch=${encodeURIComponent(batchNumber)}&v=2`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/forms/warehouse/dashboard" className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-slate-950 hover:bg-slate-950 hover:text-white" aria-label="Back to warehouse dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Batch Traceability</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{batchNumber}</h1>
            <p className="text-sm font-bold text-slate-500">{formatSku(sku)}</p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Active trace</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Balance</p><p className="mt-2 text-4xl font-black text-emerald-400">{trace.batch.availableBalance.toLocaleString()}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total In</p><p className="mt-2 text-2xl font-black">{trace.batch.totalQtyIn.toLocaleString()}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Out</p><p className="mt-2 text-2xl font-black text-rose-300">{trace.batch.totalQtyOut.toLocaleString()}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quarantine</p><p className="mt-2 text-2xl font-black text-amber-300">{trace.totals.quarantineQty.toLocaleString()}</p></div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Factory className="h-5 w-5 text-indigo-600" /><h2 className="font-black text-slate-950">Asal Batch</h2></div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Dicipta oleh</dt><dd className="text-right font-black text-slate-900">{originName}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Production line</dt><dd className="text-right font-bold">{productionReport?.line || "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Shift</dt><dd className="text-right font-bold">{productionReport?.shift || "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Verified by</dt><dd className="text-right font-bold">{productionReport?.verifiedBy || "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Handover</dt><dd className="text-right font-bold">{handover?.handoverNumber || "—"}</dd></div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald-600" /><h2 className="font-black text-slate-950">Ringkasan Pergerakan</h2></div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Distribution Orders</dt><dd className="font-black">{trace.doItems.length}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Jumlah returned</dt><dd className="font-black text-amber-700">{trace.totals.returnedQty.toLocaleString()}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Last updated</dt><dd className="text-right font-bold">{dateTime(trace.batch.updatedAt)}</dd></div>
              </dl>
            </div>
          </section>
        </div>

        <SmartQrCard path={qrPath} label="Smart Batch QR · V2" reference={batchNumber} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">Distribution Journey</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Ke mana batch ini dihantar</h2>
        </div>
        {trace.doItems.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm font-semibold text-slate-500"><Truck className="mx-auto mb-3 h-9 w-9 text-slate-300" />Batch ini belum mempunyai Distribution Order.</div>
        ) : (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {trace.doItems.map(item => {
              const order = item.distributionOrder
              const latest = order.trackingEvents.at(-1)
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-mono text-sm font-black text-indigo-700">{order.doNumber}</p><p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-700"><MapPin className="h-4 w-4 text-rose-500" /> {order.destination}</p></div>
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase text-sky-800">{latest?.eventType || order.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                    <p className="text-slate-500"><UserRound className="mb-1 h-4 w-4" />Driver<strong className="block text-slate-900">{order.driverName || "—"}</strong></p>
                    <p className="text-slate-500"><Truck className="mb-1 h-4 w-4" />No. plat<strong className="block text-slate-900">{order.vehicleNo || "—"}</strong></p>
                    <p className="text-slate-500"><Boxes className="mb-1 h-4 w-4" />Kuantiti<strong className="block text-slate-900">{item.qtySent.toLocaleString()}</strong></p>
                    <p className="text-slate-500"><CalendarClock className="mb-1 h-4 w-4" />Tarikh<strong className="block text-slate-900">{dateTime(order.distributionDate)}</strong></p>
                  </div>
                  <Link href={`/forms/warehouse/trace/do/${order.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-indigo-700 hover:text-indigo-900">Buka DO trace <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-700">Audit Timeline</p><h2 className="mt-1 text-xl font-black">Sejarah penuh batch</h2></div>
        <div className="p-5">
          {timeline.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Tiada sejarah ditemui.</p> : (
            <ol className="space-y-0">
              {timeline.map((item, index) => {
                const Icon = item.kind === "OUT" ? ArrowUpRight : item.kind === "RETURN" ? RotateCcw : item.kind === "TRACK" ? MapPin : ArrowDownLeft
                const tone = item.kind === "OUT" ? "bg-rose-100 text-rose-700" : item.kind === "RETURN" ? "bg-amber-100 text-amber-700" : item.kind === "TRACK" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
                return (
                  <li key={item.key} className="relative flex gap-4 pb-6 last:pb-0">
                    {index !== timeline.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />}
                    <span className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-500">{item.description}</p></div><div className="shrink-0 text-left sm:text-right"><p className="text-xs font-bold text-slate-400">{dateTime(item.date)}</p>{item.qty != null && <p className={`mt-1 text-sm font-black ${item.kind === "OUT" ? "text-rose-600" : item.kind === "RETURN" ? "text-amber-700" : "text-emerald-700"}`}>{item.kind === "OUT" ? "−" : "+"}{item.qty.toLocaleString()}</p>}</div></div></div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </section>

      {trace.totals.quarantineQty > 0 && <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900"><ShieldAlert className="h-6 w-6" /><p className="text-sm font-bold">Batch ini mempunyai {trace.totals.quarantineQty.toLocaleString()} unit dalam quarantine.</p></div>}
    </div>
  )
}

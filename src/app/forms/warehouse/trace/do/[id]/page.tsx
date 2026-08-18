import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  Layers,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  Printer,
  ShieldCheck,
  Truck,
  User,
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

type TimelineItem = {
  id: string
  title: string
  subtitle?: string
  remarks?: string | null
  timestamp: Date
  source: "DO" | "GATEPASS" | "SECURITY"
  icon: "create" | "submit" | "checkin" | "loading" | "checkout" | "dispatch" | "arrive" | "deliver"
  location?: { lat: number; lng: number; accuracy?: number | null } | null
}

const GATEPASS_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Permintaan Gatepass Dicipta",
  AWAITING_CUSTOMER: "Pautan Borang Dihantar kepada Pelanggan",
  CUSTOMER_SUBMITTED: "Pemandu Lengkapkan Butiran Lori",
  WAREHOUSE_ACKNOWLEDGED: "Gudang Sahkan Permintaan Gatepass",
  PREPARING: "Barang Mula Disediakan di Gudang",
  READY_FOR_PICKUP: "Muatan Sedia Diambil di Loading Bay",
  CHECKED_IN: "Lori Masuk (Check-In) di Pintu Pos Keselamatan",
  LOADING: "Barang Dimuatkan ke Dalam Lori",
  CHECKED_OUT: "Lori Disahkan Keluar (Check-Out) dari Kilang",
  COMPLETED: "Gatepass Selesai Sepenuhnya",
  CANCELLED: "Permintaan Dibatalkan",
  REJECTED: "Pelepasan Lori Ditolak di Pos Pintu",
  NO_SHOW: "Lori Tidak Hadir (No-Show)",
}

export default async function DistributionTracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await getDistributionTraceData(id)
  if (!order) notFound()

  const latest = order.trackingEvents[order.trackingEvents.length - 1]
  const totalQty = order.items.reduce((sum, item) => sum + item.qtySent, 0)
  const qrPath = `/forms/warehouse/trace/do/${order.id}`

  const linkedGatePass = order.gatePassLinks?.[0]?.gatePass

  // Build unified chronological timeline from DO and GatePass events
  const timeline: TimelineItem[] = []

  // 1. DO Creation event
  timeline.push({
    id: `do-create-${order.id}`,
    title: "Distribution Order (DO) dicipta & disahkan",
    subtitle: `${order.createdBy.name} · Destinasi: ${order.destination}`,
    timestamp: order.createdAt,
    source: "DO",
    icon: "create",
  })

  // 2. Gatepass Status Events
  if (linkedGatePass) {
    linkedGatePass.statusEvents.forEach((evt) => {
      let icon: TimelineItem["icon"] = "create"
      let source: TimelineItem["source"] = "GATEPASS"

      if (evt.toStatus === "CUSTOMER_SUBMITTED") icon = "submit"
      else if (evt.toStatus === "CHECKED_IN") {
        icon = "checkin"
        source = "SECURITY"
      } else if (evt.toStatus === "LOADING") icon = "loading"
      else if (evt.toStatus === "CHECKED_OUT") {
        icon = "checkout"
        source = "SECURITY"
      } else if (evt.toStatus === "COMPLETED") icon = "deliver"

      timeline.push({
        id: `gp-evt-${evt.id}`,
        title: GATEPASS_STATUS_LABELS[evt.toStatus] || evt.toStatus.replaceAll("_", " "),
        subtitle: `${evt.actorLabel || evt.actorUser?.name || "Sistem"} (${linkedGatePass.gatePassNo})`,
        remarks: evt.remarks,
        timestamp: evt.occurredAt,
        source,
        icon,
      })
    })
  }

  // 3. DO GPS & Milestones Tracking Events
  order.trackingEvents.forEach((evt) => {
    let icon: TimelineItem["icon"] = "dispatch"
    if (evt.eventType === "ARRIVED") icon = "arrive"
    if (evt.eventType === "DELIVERED") icon = "deliver"

    timeline.push({
      id: `do-trk-${evt.id}`,
      title: eventName(evt.eventType),
      subtitle: evt.recordedBy.name,
      remarks: evt.remarks,
      timestamp: evt.recordedAt,
      source: "DO",
      icon,
      location:
        evt.latitude != null && evt.longitude != null
          ? { lat: evt.latitude, lng: evt.longitude, accuracy: evt.accuracy }
          : null,
    })
  })

  // Sort unified timeline chronologically
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/forms/warehouse/distribution"
            className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
            aria-label="Kembali ke Distribution Orders"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                DO Traceability &amp; Logistics
              </span>
            </div>
            <h1 className="mt-1 font-mono text-2xl font-black text-slate-950 sm:text-3xl">{order.doNumber}</h1>
            <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-500">{order.destination}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/forms/warehouse/distribution/${order.id}/pod`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-800 shadow-sm transition hover:bg-slate-900 hover:text-white"
          >
            <Printer className="h-4 w-4" /> Cetak DO (PDF)
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider ${
              latest?.eventType === "DELIVERED" || order.status === "DELIVERED"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-cyan-100 text-cyan-800 border border-cyan-300"
            }`}
          >
            {latest?.eventType === "DELIVERED" ? <CheckCircle2 className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}
            {latest?.eventType || order.status}
          </span>
        </div>
      </div>

      {/* Linked Gatepass & Security Clearance Card */}
      {linkedGatePass ? (
        <section className="rounded-3xl border-2 border-cyan-400 bg-gradient-to-r from-cyan-950 via-teal-950 to-slate-950 p-6 md:p-7 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 border border-cyan-300/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" /> Pautan Gatepass &amp; Kawalan Pelepasan
                </span>
                <span className="rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-200">
                  {linkedGatePass.status.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <h2 className="text-2xl md:text-3xl font-black text-white">{linkedGatePass.gatePassNo}</h2>
                <span className="text-xs font-semibold text-cyan-200">
                  Pelanggan: <strong className="text-white">{linkedGatePass.customerName}</strong>
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-200/80 font-bold block">
                    No. Plat Lori (Fizikal)
                  </span>
                  <span className="font-mono font-black text-sm text-white mt-0.5 block">
                    {linkedGatePass.checkedInVehicleNo || linkedGatePass.vehicleNo || "Menunggu pemandu"}
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-200/80 font-bold block">
                    Nama Pemandu
                  </span>
                  <span className="font-bold text-sm text-white mt-0.5 block">
                    {linkedGatePass.checkedInDriverName || linkedGatePass.driverName || "Belum direkod"}
                  </span>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-200/80 font-bold block">
                    Muatan Pallet Kayu
                  </span>
                  <span className="font-black text-sm text-white mt-0.5 block">
                    {linkedGatePass.actualPalletQty ?? linkedGatePass.plannedPalletQty} Pallet
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 shrink-0">
              <Link
                href={`/forms/warehouse/gatepass/${linkedGatePass.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-xs font-black text-slate-950 shadow-md hover:bg-cyan-300 active:scale-98 transition-all"
              >
                <span>Buka Skrin Operasi Gatepass</span>
                <ExternalLink className="h-4 w-4" />
              </Link>

              {linkedGatePass.palletTransfers.length > 0 && (
                <Link
                  href={`/forms/maintenance/pallet-transfer/${linkedGatePass.palletTransfers[0].id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all"
                >
                  <Layers className="h-4 w-4 text-amber-300" />
                  <span>Lejar Pallet: {linkedGatePass.palletTransfers[0].transferNo}</span>
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <ClipboardCheck className="h-5 w-5 text-slate-400 shrink-0" />
            <span>
              DO ini belum dipautkan ke Gatepass pergerakan kenderaan. Anda boleh memautkannya di modul Gatepass untuk pengesahan pintu masuk automatik.
            </span>
          </div>
          <Link
            href="/forms/warehouse/gatepass"
            className="text-xs font-black text-cyan-700 hover:underline shrink-0 ml-4"
          >
            Pautkan di Gatepass ➔
          </Link>
        </div>
      )}

      {/* Main Grid: Details + Smart QR */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          {/* Metrics summary */}
          <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destinasi</p>
                <p className="mt-1.5 text-lg font-black text-emerald-400">{order.destination}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jumlah Kuantiti</p>
                <p className="mt-1.5 text-3xl font-black">{totalQty.toLocaleString()} <span className="text-xs font-bold text-slate-400">kotak</span></p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pemandu Lori</p>
                <p className="mt-1.5 font-bold text-white">{order.driverName || linkedGatePass?.driverName || "Belum direkod"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No. Kenderaan</p>
                <p className="mt-1.5 font-mono font-black text-white">{order.vehicleNo || linkedGatePass?.vehicleNo || "Belum direkod"}</p>
              </div>
            </div>
          </section>

          {/* Distribution Details & Check-In panel */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-indigo-700">
                <ClipboardList className="h-5 w-5" />
                <h2 className="font-black text-slate-950">Butiran Penghantaran</h2>
              </div>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 font-bold uppercase">Disediakan Oleh</dt>
                  <dd className="text-right font-black text-slate-900">{order.createdBy.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 font-bold uppercase">Kaedah Hantar</dt>
                  <dd className="text-right font-bold text-slate-900">{order.distributionMethod}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 font-bold uppercase">Tarikh Dicipta</dt>
                  <dd className="text-right font-bold text-slate-800">{dateTime(order.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500 font-bold uppercase">Tarikh Pengagihan</dt>
                  <dd className="text-right font-bold text-slate-800">{dateTime(order.distributionDate)}</dd>
                </div>
              </dl>
            </div>
            <LocationCheckIn distributionOrderId={order.id} latestEvent={latest?.eventType} />
          </section>
        </div>

        <SmartQrCard path={qrPath} label="DO Tracking QR" reference={order.doNumber} />
      </div>

      {/* Batch Manifest */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/60 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Batch Manifest</p>
            <h2 className="mt-0.5 text-lg font-black text-slate-950">Senarai Barangan &amp; Batch No</h2>
          </div>
          <span className="text-xs font-black text-slate-500">{order.items.length} jenis item</span>
        </div>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Produk</p>
                <p className="mt-0.5 font-bold text-slate-900 text-sm">{formatSku(item.sku)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nombor Batch</p>
                <Link
                  href={`/forms/warehouse/inventory/batch/${encodeURIComponent(item.batchNumber)}?sku=${encodeURIComponent(item.sku)}`}
                  className="mt-0.5 inline-flex items-center gap-1 font-mono text-sm font-black text-cyan-800 hover:text-cyan-950 hover:underline"
                >
                  {item.batchNumber}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kuantiti</p>
                <p className="mt-0.5 text-2xl font-black text-emerald-700">{item.qtySent.toLocaleString()} <span className="text-xs text-slate-500 font-bold">kotak</span></p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Unified Complete Lifecycle Journey Timeline */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-800">Unified Lifecycle Journey</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Kronologi Penuh Pergerakan &amp; Keselamatan</h2>
          <p className="text-xs text-slate-500 mt-1">
            Mengintegrasikan jejak permohonan Gatepass, rekod pos pintu keselamatan, pengesahan pemuatan gudang, dan imbasan GPS perjalanan.
          </p>
        </div>

        <ol className="space-y-0 relative">
          {timeline.map((item, index) => {
            const isLast = index === timeline.length - 1

            let IconComponent = ClipboardList
            let iconColor = "bg-indigo-100 text-indigo-700"

            if (item.icon === "submit") {
              IconComponent = User
              iconColor = "bg-blue-100 text-blue-700"
            } else if (item.icon === "checkin") {
              IconComponent = LogIn
              iconColor = "bg-amber-100 text-amber-800"
            } else if (item.icon === "loading") {
              IconComponent = PackageCheck
              iconColor = "bg-cyan-100 text-cyan-800"
            } else if (item.icon === "checkout") {
              IconComponent = LogOut
              iconColor = "bg-emerald-100 text-emerald-800"
            } else if (item.icon === "dispatch") {
              IconComponent = Truck
              iconColor = "bg-sky-100 text-sky-700"
            } else if (item.icon === "arrive") {
              IconComponent = MapPin
              iconColor = "bg-violet-100 text-violet-700"
            } else if (item.icon === "deliver") {
              IconComponent = CheckCircle2
              iconColor = "bg-emerald-600 text-white"
            }

            return (
              <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && <span className="absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-slate-200" />}
                <span
                  className={`relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm ${iconColor}`}
                >
                  <IconComponent className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{item.title}</span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            item.source === "SECURITY"
                              ? "bg-amber-100 text-amber-900"
                              : item.source === "GATEPASS"
                              ? "bg-cyan-100 text-cyan-900"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.source}
                        </span>
                      </div>
                      {item.subtitle && <p className="mt-0.5 text-xs text-slate-500 font-medium">{item.subtitle}</p>}
                      {item.remarks && (
                        <p className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-lg">
                          {item.remarks}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-400 shrink-0">{dateTime(item.timestamp)}</span>
                  </div>

                  {item.location && (
                    <a
                      href={`https://www.google.com/maps?q=${item.location.lat},${item.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 hover:bg-sky-100 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Lihat Lokasi GPS · ±{Math.round(item.location.accuracy || 0)}m
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Return & Quarantine if any */}
      {order.returns.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-amber-700" />
            <h2 className="font-black text-amber-950">Return / Quarantine</h2>
          </div>
          <p className="mt-2 text-xs text-amber-800">DO ini mempunyai {order.returns.length} rekod pemulangan.</p>
        </section>
      )}
    </div>
  )
}

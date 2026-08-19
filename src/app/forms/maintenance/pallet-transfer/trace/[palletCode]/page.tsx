import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { getAccessInfo } from "@/lib/access"
import { getPhysicalPalletTrace } from "@/lib/warehouse/pallet-ledger-service"

export const dynamic = "force-dynamic"

export default async function PhysicalPalletTracePage({ params }: { params: Promise<{ palletCode: string }> }) {
  const access = await getAccessInfo()
  if (!access) redirect("/login")
  const { palletCode } = await params
  const pallet = await getPhysicalPalletTrace(palletCode)
  if (!pallet) notFound()
  const traceUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/forms/maintenance/pallet-transfer/trace/${encodeURIComponent(pallet.palletCode)}`
  return <main className="min-h-screen bg-stone-50 p-6"><div className="mx-auto max-w-3xl space-y-6">
    <Link href="/forms/maintenance/pallet-transfer" className="text-sm font-bold text-amber-800 hover:underline">← Kembali ke Lejar Pallet</Link>
    <section className="rounded-3xl bg-stone-950 p-7 text-white shadow-xl"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-black tracking-widest text-amber-300">QR PALLET TRACE</p><h1 className="mt-2 text-3xl font-black">{pallet.palletCode}</h1><p className="mt-2 text-sm text-stone-300">{pallet.palletType.name} · {pallet.status.replaceAll("_", " ")}</p></div><div className="rounded-xl bg-white p-2">{traceUrl ? <QRCodeSVG value={traceUrl} size={112} /> : <span className="text-xs text-stone-600">Set NEXT_PUBLIC_APP_URL untuk cetak QR.</span>}</div></div></section>
    <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm sm:grid-cols-2"><Info label="Lokasi / Custodian" value={pallet.currentCustodian?.name || "Warehouse"}/><Info label="Condition" value={pallet.condition}/><Info label="Gatepass terakhir" value={pallet.currentGatePass?.gatePassNo || "—"}/><Info label="DO terakhir" value={pallet.currentDO?.doNumber || "—"}/></section>
    <section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="font-black text-stone-950">Timeline Pergerakan</h2><ol className="mt-4 space-y-4 border-l-2 border-amber-200 pl-4">{pallet.events.map(event => <li key={event.id}><div className="font-bold text-stone-900">{event.eventType}</div><div className="text-xs text-stone-500">{event.occurredAt.toLocaleString("en-MY")} · {event.fromCustodian?.name || "—"} → {event.toCustodian?.name || "—"}</div><div className="text-xs text-stone-600">{event.gatePass?.gatePassNo || ""} {event.distributionOrder?.doNumber || ""} {event.remarks || ""}</div></li>)}</ol></section>
  </div></main>
}
function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div><div className="mt-1 font-bold text-stone-900">{value}</div></div> }

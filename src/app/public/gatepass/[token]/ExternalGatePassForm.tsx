"use client"

import { useState } from "react"
import { CheckCircle2, Clock3, MapPin, PackageCheck, Send, Truck } from "lucide-react"

type Data = {
  alreadySubmitted: boolean
  expiresAt: string
  gatePass: {
    gatePassNo: string; purpose: string; requestedPickupAt: string; pickupLocation: string; destination: string; customerName: string; customerReference: string | null; plannedPalletQty: number
    transportCompany: string | null; driverName: string | null; driverPhone: string | null; vehicleNo: string | null; vehicleType: string | null; confirmedEta: string | null; customerRemarks: string | null
    items: Array<{ id: string; sku: string | null; description: string; uom: string; plannedQty: number }>
  }
}

function malaysiaDateTimeLocal(isoValue: string) {
  const date = new Date(isoValue)
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

export function ExternalGatePassForm({ token, data }: { token: string; data: Data }) {
  const [submitted, setSubmitted] = useState(data.alreadySubmitted)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"

  async function submit(formData: FormData) {
    setPending(true); setError("")
    try {
      const response = await fetch(`/api/public/gatepass/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transportCompany: formData.get("transportCompany"), driverName: formData.get("driverName"), driverPhone: formData.get("driverPhone"),
          vehicleNo: formData.get("vehicleNo"), vehicleType: formData.get("vehicleType"), confirmedEta: formData.get("confirmedEta"), customerRemarks: formData.get("customerRemarks"),
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Submission gagal.")
      setSubmitted(true)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Submission gagal.")
    } finally { setPending(false) }
  }

  if (submitted) return <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><h1 className="mt-4 text-2xl font-black text-slate-950">Transport details received</h1><p className="mt-2 text-sm text-slate-600">Gatepass <strong>{data.gatePass.gatePassNo}</strong> has been sent to the Warehouse team for preparation. Please keep the agreed pickup time.</p></div>

  return <form action={submit} className="space-y-5">
    <section className="overflow-hidden rounded-3xl border border-cyan-100 bg-white shadow-xl"><div className="bg-gradient-to-r from-slate-950 to-cyan-900 p-6 text-white"><div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Transport confirmation required</div><h1 className="mt-2 text-3xl font-black">{data.gatePass.gatePassNo}</h1><p className="mt-1 text-sm text-cyan-50/80">{data.gatePass.purpose}</p></div><div className="grid gap-4 p-6 sm:grid-cols-2"><Info icon={<Clock3 />} label="Requested pickup" value={new Date(data.gatePass.requestedPickupAt).toLocaleString("en-MY", { dateStyle: "full", timeStyle: "short" })} /><Info icon={<MapPin />} label="Pickup location" value={data.gatePass.pickupLocation} /><Info icon={<Truck />} label="Destination" value={data.gatePass.destination} /><Info icon={<PackageCheck />} label="Planned pallets" value={String(data.gatePass.plannedPalletQty)} /></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-black text-slate-950">Planned loading</h2><div className="mt-3 divide-y divide-slate-100">{data.gatePass.items.map(item => <div key={item.id} className="flex items-start justify-between gap-4 py-3"><div><div className="font-bold text-slate-800">{item.description}</div><div className="text-xs text-slate-500">{item.sku || "No SKU"}</div></div><div className="whitespace-nowrap font-black text-cyan-800">{item.plannedQty} {item.uom}</div></div>)}</div></section>
    <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"><h2 className="sm:col-span-2 font-black text-slate-950">Driver &amp; vehicle details</h2><Field label="Transport company"><input name="transportCompany" required defaultValue={data.gatePass.transportCompany || ""} className={inputClass} /></Field><Field label="Driver name"><input name="driverName" required defaultValue={data.gatePass.driverName || ""} className={inputClass} /></Field><Field label="Driver phone"><input name="driverPhone" required type="tel" defaultValue={data.gatePass.driverPhone || ""} className={inputClass} /></Field><Field label="Vehicle registration no."><input name="vehicleNo" required autoCapitalize="characters" defaultValue={data.gatePass.vehicleNo || ""} className={inputClass} /></Field><Field label="Vehicle type"><input name="vehicleType" required placeholder="e.g. 3-ton lorry" defaultValue={data.gatePass.vehicleType || ""} className={inputClass} /></Field><Field label="Confirmed ETA"><input name="confirmedEta" required type="datetime-local" defaultValue={malaysiaDateTimeLocal(data.gatePass.confirmedEta || data.gatePass.requestedPickupAt)} className={inputClass} /></Field><label className="sm:col-span-2 text-xs font-black uppercase tracking-wider text-slate-600">Remarks<textarea name="customerRemarks" rows={3} defaultValue={data.gatePass.customerRemarks || ""} className={inputClass} /></label></section>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">By submitting, you confirm the driver, vehicle and ETA for this pickup. BubblesO2 Warehouse will use these details for loading preparation and Security verification.</div>
    <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 py-3.5 text-sm font-black text-white shadow-lg hover:bg-cyan-800 disabled:opacity-50"><Send className="h-4 w-4" /> {pending ? "Submitting..." : "Confirm Transport Details"}</button>
  </form>
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="flex gap-3"> <span className="mt-0.5 [&>svg]:h-5 [&>svg]:w-5 text-cyan-700">{icon}</span><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="text-sm font-bold text-slate-800">{value}</div></div></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-black uppercase tracking-wider text-slate-600">{label}{children}</label> }

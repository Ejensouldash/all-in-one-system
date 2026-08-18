"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { ArrowLeft, CheckCircle2, ClipboardCopy, Link2, PackageCheck, RefreshCw, ShieldCheck, Truck } from "lucide-react"
import {
  linkWarehouseGatePassDOAction,
  publishWarehouseGatePassAction,
  transitionWarehouseGatePassAction,
  updateWarehouseGatePassActualsAction,
} from "@/app/actions/warehouse-gatepass"

type GatePassData = {
  id: string; gatePassNo: string; status: string; purpose: string; requestedPickupAt: string; pickupLocation: string; destination: string
  customerName: string; customerContactName: string | null; customerContactEmail: string | null; customerContactPhone: string | null; customerReference: string | null
  plannedPalletQty: number; actualPalletQty: number | null; transportCompany: string | null; driverName: string | null; driverPhone: string | null; vehicleNo: string | null; vehicleType: string | null
  checkedInVehicleNo: string | null; checkedInDriverName: string | null; confirmedEta: string | null; internalRemarks: string | null; customerRemarks: string | null; warehouseRemarks: string | null
  loadingCompletedAt: string | null
  items: Array<{ id: string; sku: string | null; description: string; uom: string; plannedQty: number; actualQty: number | null; varianceReason: string | null }>
  deliveryOrders: Array<{ distributionOrder: { id: string; doNumber: string; destination: string; status: string } }>
  palletTransfers: Array<{ id: string; transferNo: string; status: string; movementType: string }>
  statusEvents: Array<{ id: string; fromStatus: string | null; toStatus: string; actorLabel: string | null; remarks: string | null; occurredAt: string }>
  verificationTokens: Array<{ publicCode: string }>
}
type DOOption = { id: string; doNumber: string; destination: string; status: string; distributionDate: string }

const terminal = ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED", "NO_SHOW"]

export function GatePassOperations({ gatePass, doOptions, canWarehouse, canRequester }: { gatePass: GatePassData; doOptions: DOOption[]; canWarehouse: boolean; canRequester: boolean }) {
  const router = useRouter()
  const origin = useSyncExternalStore(() => () => undefined, () => window.location.origin, () => "")
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [customerUrl, setCustomerUrl] = useState("")
  const verificationCode = gatePass.verificationTokens[0]?.publicCode
  const verificationUrl = verificationCode && origin ? `${origin}/public/gatepass/verify/${verificationCode}` : ""

  function run(task: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setError(""); setMessage("")
    startTransition(async () => {
      const result = await task()
      if (!result.success) return setError(result.error || "Action failed.")
      setMessage(success); router.refresh()
    })
  }

  function publish() {
    setError(""); setMessage("")
    startTransition(async () => {
      const result = await publishWarehouseGatePassAction(gatePass.id)
      if (!result.success) return setError(result.error)
      setCustomerUrl(result.data.customerUrl)
      setMessage("Customer form generated. Share the green CUSTOMER FORM link or QR below—not the Security verification QR.")
      router.refresh()
    })
  }

  function status(toStatus: string, remarks?: string) {
    run(() => transitionWarehouseGatePassAction({ gatePassId: gatePass.id, toStatus: toStatus as never, actor: "WAREHOUSE", remarks }), `Status updated to ${toStatus.replaceAll("_", " ")}.`)
  }

  function requesterStatus(toStatus: string, remarks: string) {
    run(() => transitionWarehouseGatePassAction({ gatePassId: gatePass.id, toStatus: toStatus as never, actor: "REQUESTER", remarks }), `Status updated to ${toStatus.replaceAll("_", " ")}.`)
  }

  const nextWarehouseStatus: Record<string, { value: string; label: string }> = {
    CUSTOMER_SUBMITTED: { value: "WAREHOUSE_ACKNOWLEDGED", label: "Acknowledge Request" },
    WAREHOUSE_ACKNOWLEDGED: { value: "PREPARING", label: "Start Preparing" },
    PREPARING: { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
    CHECKED_IN: { value: "LOADING", label: "Start Loading" },
    CHECKED_OUT: { value: "COMPLETED", label: "Complete Gatepass" },
  }
  const next = nextWarehouseStatus[gatePass.status]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/forms/warehouse/gatepass" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Gatepass register</Link><div className="flex flex-wrap items-center gap-3"><h2 className="text-3xl font-black text-slate-950">{gatePass.gatePassNo}</h2><span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-900">{gatePass.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-slate-500">{gatePass.purpose}</p></div>
        <div className="flex flex-wrap gap-2">
          {canRequester && ["DRAFT", "AWAITING_CUSTOMER", "CUSTOMER_SUBMITTED"].includes(gatePass.status) && <button disabled={pending} onClick={publish} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-800"><RefreshCw className="h-4 w-4" /> {gatePass.status === "DRAFT" ? "Generate Customer Form Link" : "Regenerate Customer Form Link"}</button>}
          {canRequester && ["DRAFT", "AWAITING_CUSTOMER", "CUSTOMER_SUBMITTED"].includes(gatePass.status) && <button disabled={pending} onClick={() => { const reason = window.prompt("Reason for cancellation"); if (reason) requesterStatus("CANCELLED", reason) }} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700">Cancel Request</button>}
          {canWarehouse && next && <button disabled={pending} onClick={() => status(next.value)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" /> {next.label}</button>}
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}{message && <Notice tone="success">{message}</Notice>}
      {customerUrl && <div className="rounded-3xl border-4 border-emerald-500 bg-emerald-50 p-5 shadow-lg"><div className="grid gap-5 md:grid-cols-[200px_1fr]"><div className="flex flex-col items-center justify-center rounded-2xl bg-white p-4"><QRCodeSVG value={customerUrl} size={170} level="H" /><span className="mt-3 text-center text-xs font-black uppercase tracking-wider text-emerald-800">Customer Form QR</span></div><div><div className="inline-flex rounded-full bg-emerald-700 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">Share this with customer</div><h3 className="mt-3 text-2xl font-black text-emerald-950">Customer Transport Form</h3><p className="mt-1 text-sm font-semibold text-emerald-900">Customer akan isi transporter, driver, telefon, nombor/jenis lori, ETA dan catatan tambahan.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button onClick={() => navigator.clipboard.writeText(customerUrl)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"><ClipboardCopy className="h-4 w-4" /> Copy Customer Form Link</button><a href={customerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-black text-emerald-800">Open &amp; Check Form</a></div><input readOnly value={customerUrl} className="mt-3 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-600" /><p className="mt-2 text-xs text-emerald-800">Link ini hanya dipaparkan sekali. Jika hilang, regenerate; link lama akan dibatalkan.</p></div></div></div>}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Section title="Movement plan" icon={<Truck className="h-5 w-5" />}><div className="grid gap-4 text-sm sm:grid-cols-2"><Info label="Requested pickup" value={new Date(gatePass.requestedPickupAt).toLocaleString("en-MY", { dateStyle: "full", timeStyle: "short" })} /><Info label="Confirmed ETA" value={gatePass.confirmedEta ? new Date(gatePass.confirmedEta).toLocaleString("en-MY") : "Pending customer"} /><Info label="Pickup location" value={gatePass.pickupLocation} /><Info label="Destination" value={gatePass.destination} /><Info label="Customer" value={gatePass.customerName} /><Info label="Customer reference" value={gatePass.customerReference || "—"} /></div></Section>
          <Section title="Transport details" icon={<Truck className="h-5 w-5" />}><div className="grid gap-4 text-sm sm:grid-cols-3"><Info label="Transporter" value={gatePass.transportCompany || "Pending"} /><Info label="Driver" value={gatePass.driverName || "Pending"} /><Info label="Phone" value={gatePass.driverPhone || "Pending"} /><Info label="Vehicle" value={gatePass.vehicleNo || "Pending"} /><Info label="Vehicle type" value={gatePass.vehicleType || "Pending"} /><Info label="Observed at gate" value={gatePass.checkedInVehicleNo || "Not checked in"} /></div></Section>
          <Section title="Loading quantities" icon={<PackageCheck className="h-5 w-5" />}><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">SKU / Item</th><th className="px-3 py-2 text-right">Plan</th><th className="px-3 py-2 text-right">Actual</th><th className="px-3 py-2 text-left">Variance</th></tr></thead><tbody className="divide-y divide-slate-100">{gatePass.items.map(item => <tr key={item.id}><td className="px-3 py-3"><div className="font-bold">{item.description}</div><div className="text-xs text-slate-500">{item.sku || "No SKU"}</div></td><td className="px-3 py-3 text-right font-black">{item.plannedQty} {item.uom}</td><td className="px-3 py-3 text-right font-black">{item.actualQty ?? "—"}</td><td className="px-3 py-3 text-xs text-slate-500">{item.varianceReason || "—"}</td></tr>)}</tbody></table></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Planned pallets" value={String(gatePass.plannedPalletQty)} /><Info label="Actual pallets" value={gatePass.actualPalletQty == null ? "Pending" : String(gatePass.actualPalletQty)} /></div></Section>
          {canWarehouse && !terminal.includes(gatePass.status) && !["DRAFT", "AWAITING_CUSTOMER"].includes(gatePass.status) && <ActualsForm gatePass={gatePass} pending={pending} run={run} />}
        </div>

        <div className="space-y-5">
          <Section title="Security / DO Verification QR" icon={<ShieldCheck className="h-5 w-5" />}>{verificationUrl ? <div className="text-center"><div className="mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs font-black uppercase tracking-wider text-amber-900">Security only — do not send this QR as the customer form</div><div className="mx-auto inline-block rounded-2xl border border-slate-200 bg-white p-4"><QRCodeSVG value={verificationUrl} size={170} level="H" /></div><p className="mt-3 text-xs font-bold text-slate-600">Read-only verification for Security and printed DO.</p><p className="mt-2 break-all text-[10px] text-slate-400">{verificationUrl}</p></div> : <p className="text-sm text-slate-500">Generate customer form link first to activate the permanent Security verification QR.</p>}</Section>
          <Section title="Linked documents" icon={<Link2 className="h-5 w-5" />}><div className="space-y-2">{gatePass.deliveryOrders.map(link => <div key={link.distributionOrder.id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="font-black">{link.distributionOrder.doNumber}</div><div className="text-xs text-slate-500">{link.distributionOrder.destination}</div></div>)}{!gatePass.deliveryOrders.length && <p className="text-sm text-slate-500">No DO linked.</p>}{gatePass.palletTransfers.map(transfer => <Link key={transfer.id} href={`/forms/maintenance/pallet-transfer/${transfer.id}`} className="block rounded-lg bg-amber-50 p-3 text-sm"><div className="font-black text-amber-900">{transfer.transferNo}</div><div className="text-xs text-amber-700">{transfer.movementType} · {transfer.status}</div></Link>)}</div>{canWarehouse && <DOLinkForm gatePassId={gatePass.id} options={doOptions} pending={pending} run={run} />}</Section>
          {(gatePass.internalRemarks || gatePass.customerRemarks || gatePass.warehouseRemarks) && <Section title="Remarks" icon={<ClipboardCopy className="h-5 w-5" />}><Info label="Internal" value={gatePass.internalRemarks || "—"} /><Info label="Customer" value={gatePass.customerRemarks || "—"} /><Info label="Warehouse" value={gatePass.warehouseRemarks || "—"} /></Section>}
          <Section title="Audit timeline" icon={<RefreshCw className="h-5 w-5" />}><ol className="space-y-4 border-l-2 border-cyan-100 pl-4">{gatePass.statusEvents.map(event => <li key={event.id}><div className="text-xs font-black text-slate-900">{event.toStatus.replaceAll("_", " ")}</div><div className="text-[11px] text-slate-500">{new Date(event.occurredAt).toLocaleString("en-MY")} · {event.actorLabel || "System"}</div>{event.remarks && <p className="mt-1 text-xs text-slate-600">{event.remarks}</p>}</li>)}</ol></Section>
          {canWarehouse && ["CUSTOMER_SUBMITTED", "WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP"].includes(gatePass.status) && <button disabled={pending} onClick={() => { const reason = window.prompt("Reason for rejection"); if (reason) status("REJECTED", reason) }} className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">Reject Gatepass</button>}
          {canWarehouse && ["WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP"].includes(gatePass.status) && <button disabled={pending} onClick={() => { const remarks = window.prompt("No-show remarks"); if (remarks) status("NO_SHOW", remarks) }} className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800">Mark No-Show</button>}
        </div>
      </div>
    </div>
  )
}

function ActualsForm({ gatePass, pending, run }: { gatePass: GatePassData; pending: boolean; run: (task: () => Promise<{ success: boolean; error?: string }>, success: string) => void }) {
  const [actualPalletQty, setActualPalletQty] = useState(gatePass.actualPalletQty ?? gatePass.plannedPalletQty)
  const [remarks, setRemarks] = useState(gatePass.warehouseRemarks || "")
  const [items, setItems] = useState(gatePass.items.map(item => ({ id: item.id, actualQty: item.actualQty ?? item.plannedQty, varianceReason: item.varianceReason || "" })))
  return <Section title="Warehouse actual confirmation" icon={<PackageCheck className="h-5 w-5" />}><div className="space-y-3">{items.map((item, index) => <div key={item.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_140px]"><div className="text-xs font-bold text-slate-700">{gatePass.items[index].description}<input value={item.varianceReason} onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, varianceReason: event.target.value } : row))} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Variance reason (required if different)" /></div><input aria-label={`Actual ${gatePass.items[index].description}`} type="number" min="0" value={item.actualQty} onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, actualQty: Number(event.target.value) } : row))} className="rounded-lg border border-slate-300 px-3 py-2 text-right font-black" /></div>)}<label className="block text-xs font-black uppercase text-slate-600">Actual pallets<input type="number" min="0" value={actualPalletQty} onChange={event => setActualPalletQty(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><textarea value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Warehouse remarks / pallet variance reason" /><div className={`grid gap-2 ${gatePass.status === "LOADING" ? "sm:grid-cols-2" : ""}`}><button disabled={pending} onClick={() => run(() => updateWarehouseGatePassActualsAction({ gatePassId: gatePass.id, actualPalletQty, warehouseRemarks: remarks, items }), "Actual quantities saved.")} className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">Save Actuals</button>{gatePass.status === "LOADING" && <button disabled={pending} onClick={() => run(() => updateWarehouseGatePassActualsAction({ gatePassId: gatePass.id, actualPalletQty, warehouseRemarks: remarks, loadingCompleted: true, items }), "Loading marked complete. Security may check out after DO/pallet checks.")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">Confirm Loading Complete</button>}</div></div></Section>
}

function DOLinkForm({ gatePassId, options, pending, run }: { gatePassId: string; options: DOOption[]; pending: boolean; run: (task: () => Promise<{ success: boolean; error?: string }>, success: string) => void }) {
  const [id, setId] = useState("")
  return <div className="mt-4 border-t border-slate-100 pt-4"><label className="text-xs font-black uppercase text-slate-600">Link existing DO<select value={id} onChange={event => setId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Select DO</option>{options.map(option => <option key={option.id} value={option.id}>{option.doNumber} — {option.destination}</option>)}</select></label><button disabled={!id || pending} onClick={() => run(() => linkWarehouseGatePassDOAction({ gatePassId, distributionOrderId: id }), "Distribution Order linked." )} className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Link Existing DO</button><p className="mt-2 text-[11px] text-slate-500">This only creates a reference link. It never creates or ships a DO.</p></div>
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 text-cyan-800">{icon}<h3 className="font-black text-slate-900">{title}</h3></div>{children}</section> }
function Info({ label, value }: { label: string; value: string }) { return <div className="mb-3"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="whitespace-pre-wrap font-semibold text-slate-800">{value}</div></div> }
function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) { return <div role="status" className={`rounded-xl border p-4 text-sm font-bold ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{children}</div> }

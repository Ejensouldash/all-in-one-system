"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, LogIn, LogOut, ShieldAlert, Truck } from "lucide-react"
import { transitionWarehouseGatePassAction } from "@/app/actions/warehouse-gatepass"

type Data = {
  id: string; gatePassNo: string; status: string; requestedPickupAt: string; pickupLocation: string; destination: string; customerName: string
  transportCompany: string | null; driverName: string | null; driverPhone: string | null; vehicleNo: string | null; vehicleType: string | null
  checkedInVehicleNo: string | null; checkedInDriverName: string | null; checkedInAt: string | null; loadingCompletedAt: string | null; checkedOutAt: string | null
  plannedPalletQty: number; actualPalletQty: number | null
  items: Array<{ id: string; description: string; sku: string | null; uom: string; plannedQty: number; actualQty: number | null }>
  deliveryOrders: Array<{ id: string; doNumber: string }>
}

export function SecurityGatePassControl({ gatePass }: { gatePass: Data }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [vehicleNo, setVehicleNo] = useState(gatePass.checkedInVehicleNo || gatePass.vehicleNo || "")
  const [driverName, setDriverName] = useState(gatePass.checkedInDriverName || gatePass.driverName || "")
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  function transition(toStatus: "CHECKED_IN" | "CHECKED_OUT" | "REJECTED") {
    setError(""); setMessage("")
    startTransition(async () => {
      const result = await transitionWarehouseGatePassAction({ gatePassId: gatePass.id, toStatus, actor: "SECURITY", remarks, observedVehicleNo: vehicleNo, observedDriverName: driverName })
      if (!result.success) return setError(result.error)
      setMessage(`${toStatus.replaceAll("_", " ")} recorded successfully.`); router.refresh()
    })
  }
  const canReject = ["CUSTOMER_SUBMITTED", "WAREHOUSE_ACKNOWLEDGED", "PREPARING", "READY_FOR_PICKUP", "CHECKED_IN"].includes(gatePass.status)
  return <div className="mx-auto max-w-4xl space-y-6"><div><Link href="/forms/warehouse/gatepass/security" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><ArrowLeft className="h-4 w-4" /> Scan another</Link><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="text-3xl font-black">{gatePass.gatePassNo}</h2><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{gatePass.status.replaceAll("_", " ")}</span></div></div>{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}{message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</div>}<div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 font-black"><Truck className="h-5 w-5 text-amber-700" /> Registered movement</h3><div className="mt-5 grid gap-4 sm:grid-cols-2"><Info label="Pickup" value={new Date(gatePass.requestedPickupAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })} /><Info label="Customer" value={gatePass.customerName} /><Info label="Vehicle" value={gatePass.vehicleNo || "Not provided"} /><Info label="Vehicle type" value={gatePass.vehicleType || "—"} /><Info label="Driver" value={gatePass.driverName || "Not provided"} /><Info label="Phone" value={gatePass.driverPhone || "—"} /><Info label="Destination" value={gatePass.destination} /><Info label="Linked DO" value={gatePass.deliveryOrders.map(order => order.doNumber).join(", ") || "Not linked"} /></div><div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">Plan: {gatePass.items.reduce((sum, item) => sum + item.plannedQty, 0)} boxes/units · {gatePass.plannedPalletQty} pallets<br />Actual: {gatePass.items.reduce((sum, item) => sum + (item.actualQty || 0), 0)} boxes/units · {gatePass.actualPalletQty ?? "pending"} pallets</div></section><section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm"><h3 className="flex items-center gap-2 font-black"><ShieldAlert className="h-5 w-5 text-amber-700" /> Physical gate observation</h3><label className="mt-5 block text-xs font-black uppercase text-slate-600">Vehicle registration observed<input value={vehicleNo} onChange={event => setVehicleNo(event.target.value.toUpperCase())} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-black" /></label><label className="mt-4 block text-xs font-black uppercase text-slate-600">Driver observed<input value={driverName} onChange={event => setDriverName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /></label><label className="mt-4 block text-xs font-black uppercase text-slate-600">Security remarks / mismatch reason<textarea value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm" /></label><div className="mt-5 space-y-2">{gatePass.status === "READY_FOR_PICKUP" && <button disabled={pending} onClick={() => transition("CHECKED_IN")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white"><LogIn className="h-5 w-5" /> Record Check-In</button>}{gatePass.status === "LOADING" && <button disabled={pending} onClick={() => transition("CHECKED_OUT")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white"><LogOut className="h-5 w-5" /> Record Check-Out</button>}{gatePass.status === "CHECKED_OUT" && <div className="flex items-center gap-2 rounded-xl bg-emerald-100 p-4 text-sm font-black text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Vehicle checked out</div>}{canReject && <button disabled={pending || !remarks.trim()} onClick={() => transition("REJECTED")} className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 disabled:opacity-40">Reject / deny entry (remarks required)</button>}</div></section></div><div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">Check-out is enforced by the server: loading must be complete, at least one existing DO must be linked, and an ISSUE_OUT pallet record is required whenever actual pallet quantity is above zero.</div></div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="font-bold text-slate-800">{value}</div></div> }

"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"
import { createPalletCustodianAction, createPalletTransferAction } from "@/app/actions/warehouse-pallet"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

type Custodian = { id: string; kind: string; name: string; externalReference: string | null }
type PalletType = { id: string; code: string; name: string }
type Data = { palletTypes: PalletType[]; custodians: Custodian[]; gatePasses: Array<{ id: string; gatePassNo: string; customerName: string }>; distributionOrders: Array<{ id: string; doNumber: string; destination: string }> }
type Movement = "OPENING_BALANCE" | "ISSUE_OUT" | "RETURN_IN" | "TRANSFER" | "DAMAGE_RETURN" | "LOST_WRITE_OFF" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"

export function PalletTransferForm({ data }: { data: Data }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const custodianByKind = (kind: string) => data.custodians.find(row => row.kind === kind)?.id || ""
  const firstExternal = data.custodians.find(row => row.kind === "CUSTOMER" || row.kind === "TRANSPORTER")?.id || ""
  function routeDefaults(type: Movement) {
    if (type === "OPENING_BALANCE" || type === "ADJUSTMENT_IN") return [custodianByKind("SYSTEM_OPENING"), custodianByKind("WAREHOUSE_USABLE")] as const
    if (type === "ISSUE_OUT") return [custodianByKind("WAREHOUSE_USABLE"), firstExternal] as const
    if (type === "RETURN_IN") return [firstExternal, custodianByKind("WAREHOUSE_USABLE")] as const
    if (type === "DAMAGE_RETURN") return [firstExternal, custodianByKind("WAREHOUSE_DAMAGED")] as const
    if (type === "LOST_WRITE_OFF" || type === "ADJUSTMENT_OUT") return [custodianByKind("WAREHOUSE_USABLE"), custodianByKind("WRITTEN_OFF")] as const
    return ["", ""] as const
  }
  const initialRoute = routeDefaults("ISSUE_OUT")
  const [movementType, setMovementType] = useState<Movement>("ISSUE_OUT")
  const [fromId, setFromId] = useState(initialRoute[0])
  const [toId, setToId] = useState(initialRoute[1])
  const [palletTypeId, setPalletTypeId] = useState(data.palletTypes[0]?.id || "")
  const [quantity, setQuantity] = useState(1)
  const [releasedSignature, setReleasedSignature] = useState<string | null>(null)
  const [receivedSignature, setReceivedSignature] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [custodianKind, setCustodianKind] = useState<"CUSTOMER" | "TRANSPORTER">("CUSTOMER")
  const [custodianName, setCustodianName] = useState("")

  function changeMovement(type: Movement) {
    const [from, to] = routeDefaults(type)
    setMovementType(type)
    setFromId(from)
    setToId(to)
  }

  function create(formData: FormData) {
    setError("")
    startTransition(async () => {
      const result = await createPalletTransferAction({ movementType, occurredAt: String(formData.get("occurredAt") || ""), fromCustodianId: fromId, toCustodianId: toId, gatePassId: String(formData.get("gatePassId") || "") || null, distributionOrderId: String(formData.get("distributionOrderId") || "") || null, transportCompany: String(formData.get("transportCompany") || ""), driverName: String(formData.get("driverName") || ""), vehicleNo: String(formData.get("vehicleNo") || ""), remarks: String(formData.get("remarks") || ""), evidenceUrl: String(formData.get("evidenceUrl") || ""), releasedSignature, receivedByName: String(formData.get("receivedByName") || ""), receivedSignature, lines: [{ palletTypeId, quantity }] })
      if (!result.success) return setError(result.error)
      router.push(`/forms/maintenance/pallet-transfer/${result.data.id}`)
    })
  }

  function addCustodian() {
    setError("")
    startTransition(async () => {
      const result = await createPalletCustodianAction({ kind: custodianKind, name: custodianName })
      if (!result.success) return setError(result.error)
      if (movementType === "ISSUE_OUT") setToId(result.data.id)
      if (movementType === "RETURN_IN" || movementType === "DAMAGE_RETURN") setFromId(result.data.id)
      setCustodianName(""); router.refresh()
    })
  }
  const input = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
  if (!data.palletTypes.length || !data.custodians.length) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><h1 className="font-black">Pallet reference data is not installed</h1><p className="mt-2 text-sm">Apply <code>prisma/warehouse_gatepass_pallet_migration.sql</code> before using this form.</p></div>
  return <form action={create} className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/forms/maintenance/pallet-transfer" className="inline-flex items-center gap-1 text-xs font-bold text-stone-500"><ArrowLeft className="h-4 w-4" /> Pallet ledger</Link><h1 className="mt-2 text-3xl font-black text-stone-950">New Pallet Movement</h1><p className="text-sm text-stone-500">Saved first as DRAFT. Posting later writes the immutable ledger entries.</p></div><button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-black text-white"><Save className="h-4 w-4" /> {pending ? "Saving..." : "Save Draft"}</button></div>{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<section className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2"><Field label="Movement type"><select value={movementType} onChange={event => changeMovement(event.target.value as Movement)} className={input}>{["OPENING_BALANCE", "ISSUE_OUT", "RETURN_IN", "TRANSFER", "DAMAGE_RETURN", "LOST_WRITE_OFF", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"].map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Movement date & time"><input name="occurredAt" required type="datetime-local" className={input} /></Field><Field label="From custodian"><select required value={fromId} onChange={event => setFromId(event.target.value)} className={input}><option value="">Select source</option>{data.custodians.map(row => <option key={row.id} value={row.id}>{row.kind} — {row.name}</option>)}</select></Field><Field label="To custodian"><select required value={toId} onChange={event => setToId(event.target.value)} className={input}><option value="">Select recipient</option>{data.custodians.map(row => <option key={row.id} value={row.id}>{row.kind} — {row.name}</option>)}</select></Field><Field label="Pallet type"><select required value={palletTypeId} onChange={event => setPalletTypeId(event.target.value)} className={input}>{data.palletTypes.map(row => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></Field><Field label="Quantity"><input required type="number" min="1" value={quantity} onChange={event => setQuantity(Number(event.target.value))} className={input} /></Field></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-black text-amber-950">Add external custodian</h2><p className="mt-1 text-xs text-amber-800">Create a customer/transporter ledger account before selecting it above.</p><div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]"><select value={custodianKind} onChange={event => setCustodianKind(event.target.value as "CUSTOMER" | "TRANSPORTER")} className={input}><option>CUSTOMER</option><option>TRANSPORTER</option></select><input value={custodianName} onChange={event => setCustodianName(event.target.value)} placeholder="Company / transporter name" className={input} /><button type="button" disabled={!custodianName.trim() || pending} onClick={addCustodian} className="mt-1 inline-flex items-center justify-center gap-1 rounded-xl bg-amber-900 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add</button></div></section><section className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2"><Field label="Gatepass reference"><select name="gatePassId" className={input}><option value="">None</option>{data.gatePasses.map(row => <option key={row.id} value={row.id}>{row.gatePassNo} — {row.customerName}</option>)}</select></Field><Field label="Existing DO reference"><select name="distributionOrderId" className={input}><option value="">None</option>{data.distributionOrders.map(row => <option key={row.id} value={row.id}>{row.doNumber} — {row.destination}</option>)}</select></Field><Field label="Transport company"><input name="transportCompany" className={input} /></Field><Field label="Driver name"><input name="driverName" className={input} /></Field><Field label="Vehicle no."><input name="vehicleNo" className={input} /></Field><Field label="Received by"><input name="receivedByName" className={input} /></Field><Field label="Evidence URL"><input name="evidenceUrl" type="url" className={input} /></Field><label className="sm:col-span-2 text-xs font-black uppercase text-stone-600">Remarks<textarea name="remarks" rows={3} className={input} /></label></section><section className="grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:grid-cols-2"><SignaturePadClient label="Released By Signature" onSave={setReleasedSignature} /><SignaturePadClient label="Received By Signature" onSave={setReceivedSignature} /></section></form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-black uppercase tracking-wider text-stone-600">{label}{children}</label> }

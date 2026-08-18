"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react"
import { createWarehouseGatePassAction } from "@/app/actions/warehouse-gatepass"

type Item = { sku: string; description: string; uom: string; plannedQty: number }

const SKU_OPTIONS = [
  { value: "p425_24", label: "425ML X 24", description: "BUBBLES O2 Mineral Water 425 ML x 24" },
  { value: "p425_6", label: "425ML X 6", description: "BUBBLES O2 Mineral Water 425 ML x 6" },
  { value: "p800_20", label: "800ML X 20", description: "BUBBLES O2 Mineral Water 800 ML x 20" },
  { value: "p800_12", label: "800ML X 12", description: "BUBBLES O2 Mineral Water 800 ML x 12" },
] as const

export function GatePassCreateForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [items, setItems] = useState<Item[]>([{ sku: "", description: "", uom: "BOX", plannedQty: 1 }])

  function updateItem(index: number, key: keyof Item, value: string | number) {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item))
  }

  function updateSku(index: number, sku: string) {
    const selected = SKU_OPTIONS.find(option => option.value === sku)
    setItems(current => current.map((item, itemIndex) => itemIndex === index
      ? { ...item, sku, description: selected?.description || "" }
      : item))
  }

  function submit(formData: FormData) {
    setError("")
    startTransition(async () => {
      const result = await createWarehouseGatePassAction({
        purpose: String(formData.get("purpose") || ""),
        requestedPickupAt: String(formData.get("requestedPickupAt") || ""),
        pickupLocation: String(formData.get("pickupLocation") || ""),
        destination: String(formData.get("destination") || ""),
        customerName: String(formData.get("customerName") || ""),
        customerContactName: String(formData.get("customerContactName") || ""),
        customerContactEmail: String(formData.get("customerContactEmail") || ""),
        customerContactPhone: String(formData.get("customerContactPhone") || ""),
        customerReference: String(formData.get("customerReference") || ""),
        plannedPalletQty: Number(formData.get("plannedPalletQty") || 0),
        internalRemarks: String(formData.get("internalRemarks") || ""),
        items,
      })
      if (!result.success) return setError(result.error)
      router.push(`/forms/warehouse/gatepass/${result.data.id}`)
    })
  }

  const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
  return (
    <form action={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div><Link href="/forms/warehouse/gatepass" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-cyan-700"><ArrowLeft className="h-4 w-4" /> Gatepass register</Link><h2 className="text-3xl font-black text-slate-950">New Gatepass Request</h2><p className="text-sm text-slate-500">Warehouse planning record only. No product stock movement is posted here.</p></div>
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-50"><Save className="h-4 w-4" /> {pending ? "Saving..." : "Save Draft"}</button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <Field label="Purpose"><input name="purpose" required className={inputClass} placeholder="Customer pickup / scheduled delivery" /></Field>
        <Field label="Requested pickup date & time"><input name="requestedPickupAt" required type="datetime-local" className={inputClass} /></Field>
        <Field label="Pickup location"><input name="pickupLocation" required className={inputClass} placeholder="BubblesO2 Rantau - Loading Bay" /></Field>
        <Field label="Destination"><input name="destination" required className={inputClass} /></Field>
      </section>

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <Field label="Customer / company"><input name="customerName" required className={inputClass} /></Field>
        <Field label="Customer reference"><input name="customerReference" className={inputClass} placeholder="PO / request reference (optional)" /></Field>
        <Field label="Contact person"><input name="customerContactName" className={inputClass} /></Field>
        <Field label="Contact phone"><input name="customerContactPhone" className={inputClass} /></Field>
        <Field label="Contact email"><input name="customerContactEmail" type="email" className={inputClass} /></Field>
        <Field label="Planned wooden pallets"><input name="plannedPalletQty" type="number" min="0" defaultValue="0" className={inputClass} /></Field>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Planned Loading Items</h3><p className="text-xs text-slate-500">Planning quantity only; actual quantity is confirmed by Warehouse later.</p></div><button type="button" onClick={() => setItems(current => [...current, { sku: "", description: "", uom: "BOX", plannedQty: 1 }])} className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800"><Plus className="h-4 w-4" /> Add item</button></div>
        <div className="space-y-3">
          {items.map((item, index) => <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_2fr_100px_120px_40px]">
            <select aria-label={`SKU item ${index + 1}`} required value={item.sku} onChange={event => updateSku(index, event.target.value)} className={inputClass}>
              <option value="">Select SKU</option>
              {SKU_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input aria-label={`Description item ${index + 1}`} required readOnly value={item.description} className={`${inputClass} bg-slate-100 text-slate-600`} placeholder="Description fills automatically" />
            <input aria-label={`UOM item ${index + 1}`} required value={item.uom} onChange={event => updateItem(index, "uom", event.target.value)} className={inputClass} />
            <input aria-label={`Quantity item ${index + 1}`} required type="number" min="1" value={item.plannedQty} onChange={event => updateItem(index, "plannedQty", Number(event.target.value))} className={inputClass} />
            <button aria-label={`Remove item ${index + 1}`} type="button" disabled={items.length === 1} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="mt-1 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 className="mx-auto h-4 w-4" /></button>
          </div>)}
        </div>
      </section>
      <Field label="Internal Warehouse remarks"><textarea name="internalRemarks" rows={4} className={inputClass} placeholder="Special handling, loading bay or planning notes. This is not shown to the external customer." /></Field>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="text-xs font-black uppercase tracking-wider text-slate-600">{label}{children}</label>
}

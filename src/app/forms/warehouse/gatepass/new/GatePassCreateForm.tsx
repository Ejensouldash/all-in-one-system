"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Save, Trash2, PackageCheck, Truck, ClipboardList } from "lucide-react"
import { createWarehouseGatePassAction } from "@/app/actions/warehouse-gatepass"
import { TactileButton } from "@/components/ui/TactileButton"

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
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    )
  }

  function updateSku(index: number, sku: string) {
    const selected = SKU_OPTIONS.find((option) => option.value === sku)
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, sku, description: selected?.description || "" }
          : item
      )
    )
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

  const inputClass =
    "mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 font-medium"

  return (
    <form action={submit} className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/forms/warehouse/gatepass"
            className="group mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Gatepass List
          </Link>
          <h1 className="text-3xl font-black text-slate-950">New Gatepass Request</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Record truck dispatch planning and load. No product stock is deducted here.
          </p>
        </div>

        <TactileButton
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          loadingText="Saving..."
          icon={<Save className="h-4 w-4" />}
        >
          Save Draft Request
        </TactileButton>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Movement & Destination Planning */}
      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <Field label="Pickup Purpose">
          <input
            name="purpose"
            required
            className={inputClass}
            placeholder="e.g. Customer pickup / Branch transfer"
          />
        </Field>

        <Field label="Requested Pickup Date & Time">
          <input name="requestedPickupAt" required type="datetime-local" className={inputClass} />
        </Field>

        <Field label="Pickup Location (Warehouse)">
          <input
            name="pickupLocation"
            required
            defaultValue="BubblesO2 Rantau - Loading Bay"
            className={inputClass}
          />
        </Field>

        <Field label="Final Destination">
          <input
            name="destination"
            required
            placeholder="e.g. Shah Alam Main Warehouse / Customer Store"
            className={inputClass}
          />
        </Field>
      </section>

      {/* Customer & Pallet Info */}
      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <Field label="Customer / Company Name">
          <input name="customerName" required placeholder="e.g. AEON Big / Mydin" className={inputClass} />
        </Field>

        <Field label="Customer Reference No. / PO (Optional)">
          <input name="customerReference" placeholder="e.g. PO-2026-0881" className={inputClass} />
        </Field>

        <Field label="Contact Person (PIC)">
          <input name="customerContactName" placeholder="Customer PIC name..." className={inputClass} />
        </Field>

        <Field label="PIC Phone Number">
          <input name="customerContactPhone" placeholder="e.g. 0123456789" className={inputClass} />
        </Field>

        <Field label="PIC Email">
          <input name="customerContactEmail" type="email" placeholder="pic@company.com" className={inputClass} />
        </Field>

        <Field label="Estimated Wooden Pallets">
          <input
            name="plannedPalletQty"
            type="number"
            min="0"
            defaultValue="0"
            className={`${inputClass} font-black text-cyan-900`}
          />
        </Field>
      </section>

      {/* Planned Loading Items */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-cyan-700" /> Planned Item List
            </h3>
            <p className="text-xs text-slate-500">
              Preliminary planning quantities only; actual quantities will be confirmed by Warehouse PIC during loading.
            </p>
          </div>

          <TactileButton
            variant="secondary"
            size="sm"
            onClick={() => setItems((current) => [...current, { sku: "", description: "", uom: "BOX", plannedQty: 1 }])}
            icon={<Plus className="h-4 w-4" />}
            className="bg-cyan-50 text-cyan-900 border-cyan-200"
          >
            Add Item
          </TactileButton>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200 md:grid-cols-[1fr_2fr_100px_120px_40px] items-center"
            >
              <select
                aria-label={`Item ${index + 1} SKU`}
                required
                value={item.sku}
                onChange={(event) => updateSku(index, event.target.value)}
                className={inputClass}
              >
                <option value="">— Select SKU —</option>
                {SKU_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                aria-label={`Item ${index + 1} description`}
                required
                readOnly
                value={item.description}
                className={`${inputClass} bg-slate-100 text-slate-600`}
                placeholder="Automatic description"
              />

              <input
                aria-label={`Item ${index + 1} UOM`}
                required
                value={item.uom}
                onChange={(event) => updateItem(index, "uom", event.target.value)}
                className={inputClass}
              />

              <input
                aria-label={`Item ${index + 1} quantity`}
                required
                type="number"
                min="1"
                value={item.plannedQty}
                onChange={(event) => updateItem(index, "plannedQty", Number(event.target.value))}
                className={`${inputClass} font-black text-right text-slate-950`}
              />

              <button
                aria-label={`Delete item ${index + 1}`}
                type="button"
                disabled={items.length === 1}
                onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Internal Remarks */}
      <Field label="Warehouse Internal Remarks">
        <textarea
          name="internalRemarks"
          rows={3}
          className={inputClass}
          placeholder="Internal staging notes for Warehouse PIC. Not visible to external customers."
        />
      </Field>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
      {label}
      {children}
    </label>
  )
}

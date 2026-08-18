"use client"

import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save } from "lucide-react"
import { createPalletCustodianAction, createPalletTransferAction } from "@/app/actions/warehouse-pallet"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"

type Custodian = { id: string; kind: string; name: string; externalReference: string | null }
type PalletType = { id: string; code: string; name: string }
type GatePassReference = {
  id: string
  gatePassNo: string
  customerName: string
  customerContactName: string | null
  transportCompany: string | null
  driverName: string | null
  vehicleNo: string | null
  plannedPalletQty: number
  actualPalletQty: number | null
  loadingCompletedAt: Date | null
  deliveryOrders: Array<{ distributionOrderId: string; isPrimary: boolean }>
}
type Data = { palletTypes: PalletType[]; custodians: Custodian[]; gatePasses: GatePassReference[]; distributionOrders: Array<{ id: string; doNumber: string; destination: string }> }
type Movement = "OPENING_BALANCE" | "ISSUE_OUT" | "RETURN_IN" | "TRANSFER" | "DAMAGE_RETURN" | "LOST_WRITE_OFF" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"

function currentLocalDateTime() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function PalletTransferForm({ data }: { data: Data }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const selectedGatePassRef = useRef("")
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
  const [occurredAt, setOccurredAt] = useState("")
  const [releasedSignature, setReleasedSignature] = useState<string | null>(null)
  const [receivedSignature, setReceivedSignature] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [custodianKind, setCustodianKind] = useState<"CUSTOMER" | "TRANSPORTER">("CUSTOMER")
  const [custodianName, setCustodianName] = useState("")
  const [gatePassId, setGatePassId] = useState("")
  const [distributionOrderId, setDistributionOrderId] = useState("")
  const [transportCompany, setTransportCompany] = useState("")
  const [driverName, setDriverName] = useState("")
  const [vehicleNo, setVehicleNo] = useState("")
  const [receivedByName, setReceivedByName] = useState("")
  const [autofillMessage, setAutofillMessage] = useState("")

  function changeMovement(type: Movement) {
    const [from, to] = routeDefaults(type)
    setMovementType(type)
    setFromId(from)
    setToId(to)
  }

  function selectGatePass(selectedId: string) {
    selectedGatePassRef.current = selectedId
    setGatePassId(selectedId)
    setError("")
    setAutofillMessage("")
    const gatePass = data.gatePasses.find(row => row.id === selectedId)
    if (!gatePass) {
      setDistributionOrderId("")
      setTransportCompany("")
      setDriverName("")
      setVehicleNo("")
      setReceivedByName("")
      setCustodianName("")
      return
    }

    setMovementType("ISSUE_OUT")
    setOccurredAt(currentLocalDateTime())
    setFromId(custodianByKind("WAREHOUSE_USABLE"))
    setPalletTypeId(data.palletTypes.find(row => row.code === "WOODEN_STANDARD")?.id || data.palletTypes[0]?.id || "")
    setDistributionOrderId(gatePass.deliveryOrders[0]?.distributionOrderId || "")
    setTransportCompany(gatePass.transportCompany || "")
    setDriverName(gatePass.driverName || "")
    setVehicleNo(gatePass.vehicleNo || "")
    setReceivedByName(gatePass.customerContactName || gatePass.customerName)

    const gatePassPalletQty = gatePass.loadingCompletedAt
      ? (gatePass.actualPalletQty ?? 0)
      : gatePass.plannedPalletQty
    setQuantity(gatePassPalletQty)

    const normalize = (value: string) => value.trim().toLocaleLowerCase("en-MY")
    const matchingCustomer = data.custodians.find(row => row.kind === "CUSTOMER" && normalize(row.name) === normalize(gatePass.customerName))
    const matchingTransporter = gatePass.transportCompany
      ? data.custodians.find(row => row.kind === "TRANSPORTER" && normalize(row.name) === normalize(gatePass.transportCompany || ""))
      : undefined
    const matchingExternal = matchingCustomer || matchingTransporter
    if (matchingExternal) {
      setCustodianName("")
      setToId(matchingExternal.id)
      setAutofillMessage(`Semua butiran daripada ${gatePass.gatePassNo} telah disediakan. Sila semak dan simpan.`)
    } else {
      setToId("")
      setCustodianKind("CUSTOMER")
      setCustodianName(gatePass.customerName)
      startTransition(async () => {
        const result = await createPalletCustodianAction({ kind: "CUSTOMER", name: gatePass.customerName })
        if (selectedGatePassRef.current !== selectedId) return
        if (!result.success) return setError(result.error)
        setToId(result.data.id)
        setCustodianName("")
        setAutofillMessage(`Semua butiran daripada ${gatePass.gatePassNo} telah disediakan. Sila semak dan simpan.`)
        router.refresh()
      })
    }
  }

  function create(formData: FormData) {
    setError("")
    startTransition(async () => {
      const result = await createPalletTransferAction({ movementType, occurredAt, fromCustodianId: fromId, toCustodianId: toId, gatePassId: gatePassId || null, distributionOrderId: distributionOrderId || null, transportCompany, driverName, vehicleNo, remarks: String(formData.get("remarks") || ""), evidenceUrl: String(formData.get("evidenceUrl") || ""), releasedSignature, receivedByName, receivedSignature, lines: [{ palletTypeId, quantity }] })
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
  const selectedGatePass = data.gatePasses.find(row => row.id === gatePassId)
  const selectedDO = data.distributionOrders.find(row => row.id === distributionOrderId)
  const selectedRecipient = data.custodians.find(row => row.id === toId)
  const selectedPalletType = data.palletTypes.find(row => row.id === palletTypeId)

  return (
    <form action={create} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/forms/maintenance/pallet-transfer" className="inline-flex items-center gap-1 text-xs font-bold text-stone-500"><ArrowLeft className="h-4 w-4" /> Pallet ledger</Link>
          <h1 className="mt-2 text-3xl font-black text-stone-950">Rekod Pallet Keluar</h1>
          <p className="text-sm text-stone-500">Pilih Gatepass. Sistem akan sediakan butiran yang diperlukan secara automatik.</p>
        </div>
        <button disabled={pending || !fromId || !toId || !occurredAt || quantity < 1} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" /> {pending ? "Sedang menyediakan..." : "Save Draft"}</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {autofillMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{autofillMessage}</div>}

      <section className="rounded-3xl border-2 border-cyan-300 bg-cyan-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-800 text-sm font-black text-white">1</div>
          <div className="w-full">
            <h2 className="text-xl font-black text-cyan-950">Pilih Gatepass</h2>
            <p className="mt-1 text-sm text-cyan-800">Itu sahaja yang diperlukan untuk menyediakan rekod pallet biasa.</p>
            <select disabled={pending} value={gatePassId} onChange={event => selectGatePass(event.target.value)} className={`${input} border-cyan-300 text-base font-bold`}>
              <option value="">— Pilih nombor Gatepass —</option>
              {data.gatePasses.map(row => <option key={row.id} value={row.id}>{row.gatePassNo} — {row.customerName}</option>)}
            </select>
          </div>
        </div>
      </section>

      {selectedGatePass && (
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white">2</div>
            <div><h2 className="text-xl font-black text-stone-950">Semak ringkasan</h2><p className="text-sm text-stone-500">Maklumat ini diambil terus daripada Gatepass.</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Rekod" value="Pallet keluar" />
            <Summary label="Daripada" value="Warehouse" />
            <Summary label="Diserah kepada" value={selectedRecipient?.name || (pending ? "Sedang disediakan..." : "Belum tersedia")} />
            <Summary label="Kuantiti" value={`${quantity} ${selectedPalletType?.name || "pallet"}`} />
            <Summary label="DO" value={selectedDO?.doNumber || "Tiada DO dilink"} />
            <Summary label="Transporter" value={transportCompany || "—"} />
            <Summary label="Driver" value={driverName || "—"} />
            <Summary label="Kenderaan" value={vehicleNo || "—"} />
          </div>
          {quantity < 1 && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">Gatepass ini merekodkan 0 pallet. Pallet Transfer tidak diperlukan kecuali kuantiti Gatepass dibetulkan.</div>}
        </section>
      )}

      {selectedGatePass && (
        <section className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <Field label="Nama penerima"><input value={receivedByName} onChange={event => setReceivedByName(event.target.value)} className={input} /></Field>
          <Field label="Bukti (jika ada)"><input name="evidenceUrl" type="url" placeholder="Link gambar / dokumen" className={input} /></Field>
          <label className="sm:col-span-2 text-xs font-black uppercase text-stone-600">Catatan tambahan (jika ada)<textarea name="remarks" rows={3} className={input} /></label>
        </section>
      )}

      <details className="rounded-2xl border border-stone-300 bg-stone-100 p-5">
        <summary className="cursor-pointer font-black text-stone-700">Kes khas / tetapan manual</summary>
        <p className="mt-2 text-xs text-stone-500">Bahagian ini hanya untuk opening balance, pallet return, rosak, hilang atau pembetulan khas.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Jenis pergerakan"><select value={movementType} onChange={event => changeMovement(event.target.value as Movement)} className={input}>{["OPENING_BALANCE", "ISSUE_OUT", "RETURN_IN", "TRANSFER", "DAMAGE_RETURN", "LOST_WRITE_OFF", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"].map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Tarikh dan masa"><input required type="datetime-local" value={occurredAt} onChange={event => setOccurredAt(event.target.value)} className={input} /></Field>
          <Field label="Pallet dari"><select required value={fromId} onChange={event => setFromId(event.target.value)} className={input}><option value="">Pilih lokasi asal</option>{data.custodians.map(row => <option key={row.id} value={row.id}>{row.kind} — {row.name}</option>)}</select></Field>
          <Field label="Pallet kepada"><select required value={toId} onChange={event => setToId(event.target.value)} className={input}><option value="">Pilih penerima</option>{data.custodians.map(row => <option key={row.id} value={row.id}>{row.kind} — {row.name}</option>)}</select></Field>
          <Field label="Jenis pallet"><select required value={palletTypeId} onChange={event => setPalletTypeId(event.target.value)} className={input}>{data.palletTypes.map(row => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></Field>
          <Field label="Kuantiti"><input required type="number" min="1" value={quantity} onChange={event => setQuantity(Number(event.target.value))} className={input} /></Field>
          <Field label="DO"><select value={distributionOrderId} onChange={event => setDistributionOrderId(event.target.value)} className={input}><option value="">Tiada</option>{data.distributionOrders.map(row => <option key={row.id} value={row.id}>{row.doNumber} — {row.destination}</option>)}</select></Field>
          <Field label="Syarikat transporter"><input value={transportCompany} onChange={event => setTransportCompany(event.target.value)} className={input} /></Field>
          <Field label="Nama driver"><input value={driverName} onChange={event => setDriverName(event.target.value)} className={input} /></Field>
          <Field label="Nombor kenderaan"><input value={vehicleNo} onChange={event => setVehicleNo(event.target.value)} className={input} /></Field>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-black text-amber-950">Tambah customer / transporter secara manual</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
            <select value={custodianKind} onChange={event => setCustodianKind(event.target.value as "CUSTOMER" | "TRANSPORTER")} className={input}><option>CUSTOMER</option><option>TRANSPORTER</option></select>
            <input value={custodianName} onChange={event => setCustodianName(event.target.value)} placeholder="Nama syarikat" className={input} />
            <button type="button" disabled={!custodianName.trim() || pending} onClick={addCustodian} className="mt-1 inline-flex items-center justify-center gap-1 rounded-xl bg-amber-900 px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Add</button>
          </div>
        </div>
        {!selectedGatePass && <div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Nama penerima"><input value={receivedByName} onChange={event => setReceivedByName(event.target.value)} className={input} /></Field><Field label="Bukti (jika ada)"><input name="evidenceUrl" type="url" placeholder="Link gambar / dokumen" className={input} /></Field><label className="sm:col-span-2 text-xs font-black uppercase text-stone-600">Catatan tambahan (jika ada)<textarea name="remarks" rows={3} className={input} /></label></div>}
        {!selectedGatePass && <div className="mt-5 grid gap-6 md:grid-cols-2"><SignaturePadClient label="Released By Signature" onSave={setReleasedSignature} /><SignaturePadClient label="Received By Signature" onSave={setReceivedSignature} /></div>}
      </details>

      {selectedGatePass && <section className="grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:grid-cols-2"><SignaturePadClient label="Released By Signature" onSave={setReleasedSignature} /><SignaturePadClient label="Received By Signature" onSave={setReceivedSignature} /></section>}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-black uppercase tracking-wider text-stone-600">{label}{children}</label> }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-stone-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div><div className="mt-1 text-sm font-black text-stone-900">{value}</div></div> }

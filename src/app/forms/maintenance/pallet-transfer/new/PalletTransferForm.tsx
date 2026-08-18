"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ChevronDown,
  Layers,
  Plus,
  Save,
  Truck,
  Warehouse,
  XCircle,
} from "lucide-react"
import { createPalletCustodianAction, createPalletTransferAction } from "@/app/actions/warehouse-pallet"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { TactileButton } from "@/components/ui/TactileButton"

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
type Data = {
  palletTypes: PalletType[]
  custodians: Custodian[]
  gatePasses: GatePassReference[]
  distributionOrders: Array<{ id: string; doNumber: string; destination: string }>
}
type Movement =
  | "OPENING_BALANCE"
  | "ISSUE_OUT"
  | "RETURN_IN"
  | "TRANSFER"
  | "DAMAGE_RETURN"
  | "LOST_WRITE_OFF"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"

function currentLocalDateTime() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function PalletTransferForm({ data }: { data: Data }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const selectedGatePassRef = useRef("")

  const custodianByKind = (kind: string) => data.custodians.find((row) => row.kind === kind)?.id || ""
  const firstExternal = data.custodians.find((row) => row.kind === "CUSTOMER" || row.kind === "TRANSPORTER")?.id || ""

  function routeDefaults(type: Movement) {
    if (type === "OPENING_BALANCE" || type === "ADJUSTMENT_IN")
      return [custodianByKind("SYSTEM_OPENING"), custodianByKind("WAREHOUSE_USABLE")] as const
    if (type === "ISSUE_OUT") return [custodianByKind("WAREHOUSE_USABLE"), firstExternal] as const
    if (type === "RETURN_IN") return [firstExternal, custodianByKind("WAREHOUSE_USABLE")] as const
    if (type === "DAMAGE_RETURN") return [firstExternal, custodianByKind("WAREHOUSE_DAMAGED")] as const
    if (type === "LOST_WRITE_OFF" || type === "ADJUSTMENT_OUT")
      return [custodianByKind("WAREHOUSE_USABLE"), custodianByKind("WRITTEN_OFF")] as const
    return ["", ""] as const
  }

  const initialRoute = routeDefaults("ISSUE_OUT")
  const [movementType, setMovementType] = useState<Movement>("ISSUE_OUT")
  const [fromId, setFromId] = useState(initialRoute[0])
  const [toId, setToId] = useState(initialRoute[1])
  const [palletTypeId, setPalletTypeId] = useState(data.palletTypes[0]?.id || "")
  const [quantity, setQuantity] = useState(1)
  const [occurredAt, setOccurredAt] = useState(currentLocalDateTime())
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

  // Form Mode: "GATEPASS_OUT" | "OPENING_STOCK" | "CUSTOM"
  const [mode, setMode] = useState<"GATEPASS_OUT" | "OPENING_STOCK">("GATEPASS_OUT")

  function changeMovement(type: Movement) {
    const [from, to] = routeDefaults(type)
    setMovementType(type)
    setFromId(from)
    setToId(to)
  }

  function setupOpeningStockMode() {
    setMode("OPENING_STOCK")
    setMovementType("OPENING_BALANCE")
    setFromId(custodianByKind("SYSTEM_OPENING"))
    setToId(custodianByKind("WAREHOUSE_USABLE"))
    setGatePassId("")
    setDistributionOrderId("")
    setTransportCompany("")
    setDriverName("")
    setVehicleNo("")
    setReceivedByName("Warehouse PIC")
    setOccurredAt(currentLocalDateTime())
    setError("")
    setAutofillMessage("Mod Setup Stok Awal Pallet diaktifkan.")
  }

  function setupGatePassMode() {
    setMode("GATEPASS_OUT")
    setMovementType("ISSUE_OUT")
    setFromId(custodianByKind("WAREHOUSE_USABLE"))
    setToId(firstExternal)
    setError("")
    setAutofillMessage("")
  }

  function selectGatePass(selectedId: string) {
    selectedGatePassRef.current = selectedId
    setGatePassId(selectedId)
    setError("")
    setAutofillMessage("")

    const gatePass = data.gatePasses.find((row) => row.id === selectedId)
    if (!gatePass) {
      setDistributionOrderId("")
      setTransportCompany("")
      setDriverName("")
      setVehicleNo("")
      setReceivedByName("")
      setCustodianName("")
      return
    }

    setMode("GATEPASS_OUT")
    setMovementType("ISSUE_OUT")
    setOccurredAt(currentLocalDateTime())
    setFromId(custodianByKind("WAREHOUSE_USABLE"))
    setPalletTypeId(data.palletTypes.find((row) => row.code === "WOODEN_STANDARD")?.id || data.palletTypes[0]?.id || "")
    setDistributionOrderId(gatePass.deliveryOrders[0]?.distributionOrderId || "")
    setTransportCompany(gatePass.transportCompany || "")
    setDriverName(gatePass.driverName || "")
    setVehicleNo(gatePass.vehicleNo || "")
    setReceivedByName(gatePass.customerContactName || gatePass.customerName)

    const gatePassPalletQty = gatePass.loadingCompletedAt
      ? gatePass.actualPalletQty ?? 0
      : gatePass.plannedPalletQty
    setQuantity(gatePassPalletQty)

    const normalize = (value: string) => value.trim().toLocaleLowerCase("en-MY")
    const matchingCustomer = data.custodians.find(
      (row) => row.kind === "CUSTOMER" && normalize(row.name) === normalize(gatePass.customerName)
    )
    const matchingTransporter = gatePass.transportCompany
      ? data.custodians.find(
          (row) => row.kind === "TRANSPORTER" && normalize(row.name) === normalize(gatePass.transportCompany || "")
        )
      : undefined
    const matchingExternal = matchingCustomer || matchingTransporter

    if (matchingExternal) {
      setCustodianName("")
      setToId(matchingExternal.id)
      setAutofillMessage(`Semua butiran daripada Gatepass ${gatePass.gatePassNo} telah diisi secara automatik. Sila semak dan simpan draf.`)
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
        setAutofillMessage(`Akaun lejar untuk ${gatePass.customerName} telah disediakan dan dipautkan secara automatik.`)
        router.refresh()
      })
    }
  }

  // Handle URL param gatepassId on initial load
  useEffect(() => {
    const urlGatepassId = searchParams.get("gatepassId")
    if (urlGatepassId && data.gatePasses.some((g) => g.id === urlGatepassId)) {
      selectGatePass(urlGatepassId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function create(formData: FormData) {
    if (mode === "OPENING_STOCK") {
      const confirmed = window.confirm(
        `Anda akan menetapkan stok awal Warehouse sebanyak ${quantity} pallet. Teruskan?`
      )
      if (!confirmed) return
    }

    setError("")
    startTransition(async () => {
      const result = await createPalletTransferAction({
        movementType,
        occurredAt,
        fromCustodianId: fromId,
        toCustodianId: toId,
        gatePassId: gatePassId || null,
        distributionOrderId: distributionOrderId || null,
        transportCompany,
        driverName,
        vehicleNo,
        remarks: String(formData.get("remarks") || ""),
        evidenceUrl: String(formData.get("evidenceUrl") || ""),
        releasedSignature,
        receivedByName,
        receivedSignature,
        lines: [{ palletTypeId, quantity }],
      })
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
      setCustodianName("")
      router.refresh()
    })
  }

  const inputClass =
    "mt-1 w-full rounded-2xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:border-amber-600 focus:ring-2 focus:ring-amber-100"

  if (!data.palletTypes.length || !data.custodians.length) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h1 className="font-black text-lg">Data rujukan lejar pallet belum dipasang</h1>
        <p className="mt-2 text-sm">
          Sila jalankan migrasi pangkalan data lejar pallet terlebih dahulu sebelum menggunakan modul ini.
        </p>
      </div>
    )
  }

  const selectedGatePass = data.gatePasses.find((row) => row.id === gatePassId)
  const selectedDO = data.distributionOrders.find((row) => row.id === distributionOrderId)
  const selectedRecipient = data.custodians.find((row) => row.id === toId)
  const selectedPalletType = data.palletTypes.find((row) => row.id === palletTypeId)

  return (
    <form action={create} className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-stone-950 via-amber-950 to-yellow-950 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/forms/maintenance/pallet-transfer"
              className="group mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Kembali ke Lejar Pallet
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {mode === "OPENING_STOCK" ? "Setup Stok Awal Pallet" : "Rekod Pallet Keluar (Serahan)"}
              </h1>
              <span className="rounded-full bg-amber-400/20 border border-amber-300/30 px-3 py-1 text-xs font-black tracking-wider uppercase text-amber-200">
                Draf Pergerakan
              </span>
            </div>
            <p className="mt-2 text-sm text-amber-100/80 max-w-xl">
              {mode === "OPENING_STOCK"
                ? "Tetapkan baki pembukaan pallet fizikal di Warehouse sebelum memulakan rekod harian."
                : "Pilih nombor Gatepass. Semua butiran pemandu, kuantiti dan penerima akan diisi secara automatik."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {mode === "GATEPASS_OUT" ? (
              <TactileButton
                variant="secondary"
                size="md"
                onClick={setupOpeningStockMode}
                className="bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200"
              >
                <Boxes className="h-4 w-4" /> Setup Stok Awal Pallet
              </TactileButton>
            ) : (
              <TactileButton
                variant="secondary"
                size="md"
                onClick={setupGatePassMode}
                className="bg-amber-100/90 text-amber-950 border-amber-300 hover:bg-amber-200"
              >
                <Truck className="h-4 w-4" /> Tukar ke Rekod Gatepass Biasa
              </TactileButton>
            )}

            <TactileButton
              type="submit"
              variant="amber"
              size="lg"
              loading={pending}
              loadingText="Sedang Menyimpan Draf..."
              disabled={!fromId || !toId || !occurredAt || quantity < 1}
              icon={<Save className="h-4 w-4" />}
            >
              Simpan Draf (Save Draft)
            </TactileButton>
          </div>
        </div>
      </div>

      {/* Interactive Error & Success Alerts */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm animate-in fade-in">
          <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}
      {autofillMessage && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">{autofillMessage}</div>
        </div>
      )}

      {/* MODE 1: Gatepass Auto-fill Flow */}
      {mode === "GATEPASS_OUT" && (
        <div className="space-y-6">
          {/* Step 1: Select Gatepass */}
          <section className="rounded-3xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white p-6 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-800 text-base font-black text-white shadow-md">
                1
              </div>
              <div className="w-full">
                <h2 className="text-xl font-black text-cyan-950">Langkah 1: Pilih Gatepass</h2>
                <p className="mt-0.5 text-xs font-semibold text-cyan-800">
                  Pilih nombor Gatepass untuk mengisi semua data pelanggan, pemandu dan kuantiti secara automatik.
                </p>
                <select
                  disabled={pending}
                  value={gatePassId}
                  onChange={(event) => selectGatePass(event.target.value)}
                  className="mt-3 w-full rounded-2xl border-2 border-cyan-300 bg-white px-4 py-3 text-base font-bold text-slate-900 shadow-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="">— Sila Pilih Nombor Gatepass —</option>
                  {data.gatePasses.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.gatePassNo} — {row.customerName} ({row.plannedPalletQty} Pallet)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Step 2: Summary of Movement */}
          {selectedGatePass && (
            <section className="rounded-3xl border-2 border-emerald-300 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-base font-black text-white shadow-md">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Langkah 2: Semak Ringkasan Pergerakan</h2>
                  <p className="text-xs text-slate-500">Maklumat diselaraskan terus daripada rekod Gatepass.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Summary label="Jenis Tindakan" value="Pallet Keluar (Serahan)" />
                <Summary label="Lokasi Asal" value="Warehouse Usable" />
                <Summary
                  label="Diserah Kepada"
                  value={selectedRecipient?.name || (pending ? "Sedang disediakan..." : "Belum tersedia")}
                  isHighlight
                />
                <Summary
                  label="Jumlah Pallet"
                  value={`${quantity} ${selectedPalletType?.name || "Wooden Pallet"}`}
                  isHighlight
                />
                <Summary label="Delivery Order (DO)" value={selectedDO?.doNumber || "Tiada DO dipautkan"} />
                <Summary label="Transporter / Lori" value={transportCompany || "—"} />
                <Summary label="Nama Pemandu" value={driverName || "—"} />
                <Summary label="No. Pendaftaran Lori" value={vehicleNo || "—"} />
              </div>

              {quantity < 1 && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                  <span>
                    Gatepass ini merekodkan 0 pallet. Rekod pergerakan pallet lejar tidak diperlukan kecuali kuantiti pallet pada Gatepass diperbetulkan.
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Step 3: Acknowledgement & Remarks */}
          {selectedGatePass && (
            <section className="grid gap-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2">
              <Field label="Nama Penerima / Pengesah">
                <input
                  value={receivedByName}
                  onChange={(event) => setReceivedByName(event.target.value)}
                  placeholder="Nama individu yang menerima pallet..."
                  className={inputClass}
                />
              </Field>

              <Field label="Pautan Bukti / Dokumen (Pilihan)">
                <input
                  name="evidenceUrl"
                  type="url"
                  placeholder="Link gambar serahan / dokumen (jika ada)..."
                  className={inputClass}
                />
              </Field>

              <label className="sm:col-span-2 text-xs font-black uppercase tracking-wider text-stone-600">
                Catatan Tambahan
                <textarea
                  name="remarks"
                  rows={2}
                  placeholder="Sebarang catatan berkaitan serahan pallet..."
                  className={inputClass}
                />
              </label>
            </section>
          )}

          {/* Signatures */}
          {selectedGatePass && (
            <section className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:grid-cols-2">
              <SignaturePadClient label="Tandatangan Pegawai Gudang (Released By)" onSave={setReleasedSignature} />
              <SignaturePadClient label="Tandatangan Pemandu / Penerima (Received By)" onSave={setReceivedSignature} />
            </section>
          )}
        </div>
      )}

      {/* MODE 2: Setup Stok Awal Pallet (Opening Balance Flow) */}
      {mode === "OPENING_STOCK" && (
        <section className="rounded-3xl border-2 border-amber-400 bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-950">Setup Stok Awal Pallet Gudang (Opening Stock)</h2>
              <p className="mt-1 text-xs md:text-sm text-stone-600 leading-relaxed">
                Gunakan borang ini sekali sahaja untuk menetapkan baki pallet kayu fizikal yang telah sedia ada di gudang sebelum sistem mula merekod transaksi harian.
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <Field label="Jenis Pallet">
              <select
                required
                value={palletTypeId}
                onChange={(event) => setPalletTypeId(event.target.value)}
                className={inputClass}
              >
                {data.palletTypes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} — {row.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kuantiti Fizikal Pallet Sedia Ada">
              <input
                required
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className={`${inputClass} text-lg font-black text-amber-950`}
              />
            </Field>

            <Field label="Tarikh & Masa Kuatkuasa">
              <input
                required
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Pegawai Bertanggungjawab">
              <input
                value={receivedByName}
                onChange={(event) => setReceivedByName(event.target.value)}
                className={inputClass}
              />
            </Field>

            <label className="sm:col-span-2 text-xs font-black uppercase tracking-wider text-stone-600">
              Catatan Pengiraan Stok Awal
              <textarea
                name="remarks"
                rows={2}
                placeholder="Cth: Stok awal fizikal semasa pelancaran sistem..."
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2 pt-2">
            <SignaturePadClient label="Tandatangan Pengesahan Stok Awal" onSave={setReleasedSignature} />
          </div>
        </section>
      )}

      {/* Collapsible Section: Technical & Manual Edge Cases */}
      <details className="group rounded-3xl border border-stone-300 bg-stone-100 p-6 transition-all">
        <summary className="flex items-center justify-between cursor-pointer font-black text-stone-800 select-none">
          <span className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-stone-600" /> Kes Khas / Tetapan Manual (Tetapan Lanjutan)
          </span>
          <ChevronDown className="h-5 w-5 text-stone-500 group-open:rotate-180 transition-transform" />
        </summary>

        <p className="mt-2 text-xs text-stone-500 leading-relaxed">
          Bahagian ini hanya digunakan untuk transaksi pemulangan pallet (Return In), kerosakan, pelupusan, atau pemindahan manual tanpa Gatepass.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Jenis Pergerakan">
            <select
              value={movementType}
              onChange={(event) => changeMovement(event.target.value as Movement)}
              className={inputClass}
            >
              {[
                "OPENING_BALANCE",
                "ISSUE_OUT",
                "RETURN_IN",
                "TRANSFER",
                "DAMAGE_RETURN",
                "LOST_WRITE_OFF",
                "ADJUSTMENT_IN",
                "ADJUSTMENT_OUT",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>

          <Field label="Tarikh & Masa Pergerakan">
            <input
              required
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Lokasi / Pihak Asal (From)">
            <select
              required
              value={fromId}
              onChange={(event) => setFromId(event.target.value)}
              className={inputClass}
            >
              <option value="">Pilih Lokasi Asal</option>
              {data.custodians.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.kind} — {row.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lokasi / Pihak Penerima (To)">
            <select
              required
              value={toId}
              onChange={(event) => setToId(event.target.value)}
              className={inputClass}
            >
              <option value="">Pilih Penerima</option>
              {data.custodians.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.kind} — {row.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Jenis Pallet">
            <select
              required
              value={palletTypeId}
              onChange={(event) => setPalletTypeId(event.target.value)}
              className={inputClass}
            >
              {data.palletTypes.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.code} — {row.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kuantiti">
            <input
              required
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={inputClass}
            />
          </Field>

          <Field label="Delivery Order (DO)">
            <select
              value={distributionOrderId}
              onChange={(event) => setDistributionOrderId(event.target.value)}
              className={inputClass}
            >
              <option value="">Tiada DO</option>
              {data.distributionOrders.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.doNumber} — {row.destination}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Syarikat Pengangkutan">
            <input
              value={transportCompany}
              onChange={(event) => setTransportCompany(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Nama Pemandu">
            <input
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="No. Pendaftaran Lori">
            <input
              value={vehicleNo}
              onChange={(event) => setVehicleNo(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Manual Custodian Creator */}
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-black text-sm text-amber-950">Daftar Pihak Luar Baharu Secara Manual</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
            <select
              value={custodianKind}
              onChange={(event) => setCustodianKind(event.target.value as "CUSTOMER" | "TRANSPORTER")}
              className={inputClass}
            >
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="TRANSPORTER">TRANSPORTER</option>
            </select>
            <input
              value={custodianName}
              onChange={(event) => setCustodianName(event.target.value)}
              placeholder="Nama syarikat pelanggan / transporter..."
              className={inputClass}
            />
            <TactileButton
              variant="amber"
              size="sm"
              disabled={!custodianName.trim() || pending}
              loading={pending}
              onClick={addCustodian}
              icon={<Plus className="h-4 w-4" />}
            >
              Daftar
            </TactileButton>
          </div>
        </div>
      </details>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-black uppercase tracking-wider text-stone-600">
      {label}
      {children}
    </label>
  )
}

function Summary({ label, value, isHighlight }: { label: string; value: string; isHighlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-4 transition-all ${
        isHighlight ? "bg-amber-50 border border-amber-200 shadow-sm" : "bg-stone-50 border border-stone-100"
      }`}
    >
      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{label}</div>
      <div className={`mt-1 text-sm font-black truncate ${isHighlight ? "text-amber-950" : "text-stone-900"}`}>
        {value}
      </div>
    </div>
  )
}

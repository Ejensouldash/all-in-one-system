"use client"

import { useState } from "react"
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  Send,
  ShieldCheck,
  Truck,
  User,
  Phone,
  Building,
  FileText,
} from "lucide-react"
import { TactileButton } from "@/components/ui/TactileButton"

type Data = {
  alreadySubmitted: boolean
  expiresAt: string
  gatePass: {
    gatePassNo: string
    purpose: string
    requestedPickupAt: string
    pickupLocation: string
    destination: string
    customerName: string
    customerReference: string | null
    plannedPalletQty: number
    transportCompany: string | null
    driverName: string | null
    driverPhone: string | null
    vehicleNo: string | null
    vehicleType: string | null
    confirmedEta: string | null
    customerRemarks: string | null
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

  // Form local state for immediate feedback on the Digital Pass
  const [formDataSummary, setFormDataSummary] = useState({
    transportCompany: data.gatePass.transportCompany || "",
    driverName: data.gatePass.driverName || "",
    driverPhone: data.gatePass.driverPhone || "",
    vehicleNo: data.gatePass.vehicleNo || "",
    vehicleType: data.gatePass.vehicleType || "",
    confirmedEta: data.gatePass.confirmedEta || data.gatePass.requestedPickupAt,
    customerRemarks: data.gatePass.customerRemarks || "",
  })

  const inputClass =
    "mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 min-h-[50px]"

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError("")

    const form = e.currentTarget
    const fd = new FormData(form)

    const payload = {
      transportCompany: String(fd.get("transportCompany") || ""),
      driverName: String(fd.get("driverName") || ""),
      driverPhone: String(fd.get("driverPhone") || ""),
      vehicleNo: String(fd.get("vehicleNo") || "").toUpperCase(),
      vehicleType: String(fd.get("vehicleType") || ""),
      confirmedEta: String(fd.get("confirmedEta") || ""),
      customerRemarks: String(fd.get("customerRemarks") || ""),
    }

    try {
      const response = await fetch(`/api/public/gatepass/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Pendaftaran gagal. Sila cuba lagi.")

      setFormDataSummary(payload)
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Pendaftaran gagal.")
    } finally {
      setPending(false)
    }
  }

  // SUCCESS STATE: Digital Arrival Pass
  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-5 animate-in fade-in zoom-in-95 duration-300">
        {/* Digital Pass Card */}
        <div className="overflow-hidden rounded-3xl border-2 border-emerald-500 bg-white shadow-2xl">
          {/* Brand Header */}
          <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-900 p-6 text-white text-center relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Pas Digital Ketibaan Pemandu
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{data.gatePass.gatePassNo}</h1>
            <p className="text-xs text-emerald-100/80 mt-1">BubblesO2 Factory Dispatch Gatepass</p>
          </div>

          {/* Pass Body */}
          <div className="p-6 space-y-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-2" />
              <h2 className="text-lg font-black text-emerald-950">Maklumat Pengangkutan Telah Diterima</h2>
              <p className="text-xs text-emerald-900 mt-1">
                Pasukan Gudang BubblesO2 sedang membuat persediaan muatan berdasarkan masa tiba anda.
              </p>
            </div>

            {/* Vehicle & Driver Summary */}
            <div className="space-y-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-500">No. Pendaftaran Lori</span>
                <span className="text-base font-black text-slate-950 font-mono tracking-wider">
                  {formDataSummary.vehicleNo || data.gatePass.vehicleNo || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-bold text-slate-500">Nama Pemandu</span>
                <span className="text-sm font-black text-slate-900">
                  {formDataSummary.driverName || data.gatePass.driverName || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-bold text-slate-500">No. Telefon Pemandu</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formDataSummary.driverPhone || data.gatePass.driverPhone || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-bold text-slate-500">Syarikat Lori</span>
                <span className="text-sm font-semibold text-slate-800">
                  {formDataSummary.transportCompany || data.gatePass.transportCompany || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-xs font-bold text-slate-500">Waktu Anggaran Tiba (ETA)</span>
                <span className="text-xs font-black text-emerald-800">
                  {new Date(formDataSummary.confirmedEta).toLocaleString("en-MY", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 text-xs text-cyan-950 space-y-1.5">
              <div className="font-black flex items-center gap-1.5 text-cyan-900">
                <MapPin className="h-4 w-4 text-cyan-700 shrink-0" /> Arahan Semasa Ketibaan:
              </div>
              <p className="leading-relaxed">
                1. Tiba di <strong>{data.gatePass.pickupLocation}</strong> mengikut waktu yang telah dipersetujui.
              </p>
              <p className="leading-relaxed">
                2. Tunjukkan nombor Gatepass <strong>{data.gatePass.gatePassNo}</strong> atau pas digital ini kepada Pengawal Keselamatan di pos pintu masuk.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // FORM INPUT STATE: Mobile-first 1-Page Form
  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-5 pb-24">
      {/* Top Banner Card */}
      <section className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-900 p-6 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 border border-cyan-300/30 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-200">
            <Truck className="h-3.5 w-3.5" /> Pendaftaran Pengangkutan Pelanggan
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{data.gatePass.gatePassNo}</h1>
          <p className="mt-1 text-xs text-cyan-100/80 font-medium">
            Pelanggan: <strong className="text-white">{data.gatePass.customerName}</strong>
          </p>
        </div>

        {/* Pickup Details Grid */}
        <div className="grid gap-3.5 p-5 sm:grid-cols-2 bg-slate-50/50 border-t border-slate-100 text-xs">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-500 uppercase text-[10px]">Waktu Pengambilan</div>
              <div className="font-bold text-slate-900">
                {new Date(data.gatePass.requestedPickupAt).toLocaleString("en-MY", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-500 uppercase text-[10px]">Lokasi Pengambilan</div>
              <div className="font-bold text-slate-900">{data.gatePass.pickupLocation}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Truck className="h-4 w-4 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-500 uppercase text-[10px]">Destinasi Hantar</div>
              <div className="font-bold text-slate-900">{data.gatePass.destination}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <PackageCheck className="h-4 w-4 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-500 uppercase text-[10px]">Muatan Pallet</div>
              <div className="font-bold text-slate-900">{data.gatePass.plannedPalletQty} Wooden Pallet</div>
            </div>
          </div>
        </div>
      </section>

      {/* Planned Cargo Items */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
          <PackageCheck className="h-4 w-4 text-cyan-700" /> Senarai Barangan Yang Akan Diambil
        </h2>
        <div className="divide-y divide-slate-100">
          {data.gatePass.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <div className="font-bold text-slate-900">{item.description}</div>
                {item.sku && <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>}
              </div>
              <div className="font-black text-cyan-800">
                {item.plannedQty} {item.uom}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Driver & Vehicle Inputs Form */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-950">Butiran Pemandu &amp; Lori</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sila isi maklumat kenderaan yang sah untuk urusan pelepasan keselamatan di pintu kilang.
          </p>
        </div>

        {/* Transport Company */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-cyan-700" /> Syarikat Pengangkutan / Transporter{" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            name="transportCompany"
            required
            placeholder="Cth: ABC Logistics Sdn Bhd / Pelanggan Sendiri"
            defaultValue={data.gatePass.transportCompany || ""}
            className={inputClass}
          />
        </label>

        {/* Vehicle Registration No */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-cyan-700" /> No. Pendaftaran Lori (Plat Kenderaan){" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            name="vehicleNo"
            required
            autoCapitalize="characters"
            placeholder="Cth: BND 1234 / WXY 9876"
            defaultValue={data.gatePass.vehicleNo || ""}
            className={`${inputClass} uppercase font-mono tracking-wider`}
            style={{ textTransform: "uppercase" }}
          />
        </label>

        {/* Vehicle Type */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-cyan-700" /> Jenis Kenderaan / Muatan{" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            name="vehicleType"
            required
            placeholder="Cth: Lori 3 Tan / Lori 5 Tan / Van / Kontena"
            defaultValue={data.gatePass.vehicleType || ""}
            className={inputClass}
          />
        </label>

        {/* Driver Name */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-cyan-700" /> Nama Penuh Pemandu{" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            name="driverName"
            required
            placeholder="Cth: Ahmad bin Ali"
            defaultValue={data.gatePass.driverName || ""}
            className={inputClass}
          />
        </label>

        {/* Driver Phone */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-cyan-700" /> No. Telefon Pemandu (WhatsApp / Panggilan){" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            name="driverPhone"
            required
            type="tel"
            placeholder="Cth: 0123456789"
            defaultValue={data.gatePass.driverPhone || ""}
            className={inputClass}
          />
        </label>

        {/* Confirmed ETA */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-cyan-700" /> Waktu Anggaran Tiba di Kilang (ETA){" "}
            <span className="text-red-500">*</span>
          </span>
          <input
            name="confirmedEta"
            required
            type="datetime-local"
            defaultValue={malaysiaDateTimeLocal(data.gatePass.confirmedEta || data.gatePass.requestedPickupAt)}
            className={inputClass}
          />
        </label>

        {/* Customer Remarks */}
        <label className="block">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-cyan-700" /> Catatan Tambahan (Pilihan)
          </span>
          <textarea
            name="customerRemarks"
            rows={3}
            placeholder="Sebarang maklumat khas mengenai pemandu atau masa pengambilan..."
            defaultValue={data.gatePass.customerRemarks || ""}
            className={`${inputClass} font-normal`}
          />
        </label>
      </section>

      {/* Error Notice */}
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Legal & Security Confirmation Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs font-medium text-amber-900 leading-relaxed">
        Dengan menekan butang serahan di bawah, anda mengesahkan butiran kenderaan, pemandu dan masa ketibaan ini adalah tepat untuk tujuan pelepasan keselamatan di kilang BubblesO2.
      </div>

      {/* Sticky Bottom Submit Bar for Mobile Reach */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-lg">
          <TactileButton
            type="submit"
            variant="primary"
            size="xl"
            fullWidth
            loading={pending}
            loadingText="Sedang Menghantar Maklumat..."
            icon={<Send className="h-5 w-5" />}
          >
            Hantar &amp; Sahkan Butiran Pengangkutan
          </TactileButton>
        </div>
      </div>
    </form>
  )
}

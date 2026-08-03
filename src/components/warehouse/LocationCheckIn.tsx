"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, LocateFixed, MapPinOff, Navigation, PackageCheck } from "lucide-react"
import { recordDistributionCheckIn } from "@/app/actions/warehouseTracking"

type EventType = "DISPATCHED" | "ARRIVED" | "DELIVERED"

const FLOW: Record<EventType, { label: string; help: string; icon: typeof Navigation }> = {
  DISPATCHED: { label: "Mula Perjalanan", help: "Rekod masa kenderaan keluar dari warehouse.", icon: Navigation },
  ARRIVED: { label: "Check-In Tiba", help: "Rekod lokasi apabila tiba di destinasi.", icon: LocateFixed },
  DELIVERED: { label: "Sahkan Dihantar", help: "Tutup perjalanan selepas barang diterima.", icon: PackageCheck },
}

function nextEvent(latest?: string | null): EventType | null {
  if (!latest) return "DISPATCHED"
  if (latest === "DISPATCHED") return "ARRIVED"
  if (latest === "ARRIVED") return "DELIVERED"
  return null
}

export function LocationCheckIn({
  distributionOrderId,
  latestEvent,
}: {
  distributionOrderId: string
  latestEvent?: string | null
}) {
  const router = useRouter()
  const next = useMemo(() => nextEvent(latestEvent), [latestEvent])
  const [remarks, setRemarks] = useState("")
  const [busy, setBusy] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!next) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" />
        <div><p className="font-black">Penghantaran selesai</p><p className="text-sm text-emerald-700">Tiada check-in tambahan diperlukan.</p></div>
      </div>
    )
  }

  const config = FLOW[next]
  const Icon = config.icon

  const save = async (location: {
    latitude?: number
    longitude?: number
    accuracy?: number
    locationStatus: "CAPTURED" | "DENIED" | "UNAVAILABLE" | "TIMEOUT"
  }) => {
    setBusy(true)
    setMessage(null)
    const result = await recordDistributionCheckIn({
      distributionOrderId,
      eventType: next,
      remarks,
      ...location,
    })
    setBusy(false)
    if (!result.success) {
      setMessage(result.error || "Check-in gagal direkod.")
      return
    }
    setRemarks("")
    setLocationError(null)
    setMessage("Check-in berjaya direkod.")
    router.refresh()
  }

  const checkInWithLocation = () => {
    setLocationError(null)
    setMessage(null)
    if (!("geolocation" in navigator)) {
      setLocationError("Peranti ini tidak menyokong location. Gunakan check-in manual.")
      return
    }

    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        void save({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          locationStatus: "CAPTURED",
        })
      },
      error => {
        setBusy(false)
        const status = error.code === error.TIMEOUT ? "TIMEOUT" : error.code === error.PERMISSION_DENIED ? "DENIED" : "UNAVAILABLE"
        setLocationError(
          status === "DENIED"
            ? "Akses location ditolak. Benarkan location dalam browser atau gunakan check-in manual."
            : status === "TIMEOUT"
              ? "Location mengambil masa terlalu lama. Cuba lagi atau gunakan check-in manual."
              : "Location tidak dapat diperoleh. Cuba di kawasan terbuka atau gunakan check-in manual."
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex rounded-xl bg-sky-100 p-2.5 text-sky-700"><Icon className="h-5 w-5" /></span>
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Location Check-In</p><h3 className="mt-1 text-lg font-black text-slate-950">{config.label}</h3><p className="mt-1 text-sm text-slate-500">{config.help}</p></div>
      </div>

      <label className="mt-5 block text-xs font-black uppercase tracking-wider text-slate-500" htmlFor="tracking-remarks">Catatan (optional)</label>
      <textarea id="tracking-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} maxLength={500} rows={2} placeholder="Contoh: Barang diterima oleh Encik Ahmad" className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100" />

      {locationError && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{locationError}</div>}
      {message && <div className={`mt-3 rounded-xl p-3 text-sm font-semibold ${message.includes("berjaya") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} aria-live="polite">{message}</div>}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <button onClick={checkInWithLocation} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {busy ? "Mendapatkan lokasi..." : `${config.label} dengan Lokasi`}
        </button>
        <button onClick={() => void save({ locationStatus: "UNAVAILABLE" })} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:opacity-50">
          <MapPinOff className="h-4 w-4" /> Manual
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">Location hanya diminta sekali untuk milestone ini. Sistem tidak menjejak peranti secara berterusan.</p>
    </div>
  )
}

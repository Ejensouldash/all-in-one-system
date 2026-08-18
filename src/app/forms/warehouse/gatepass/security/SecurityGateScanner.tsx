"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Search, ShieldCheck } from "lucide-react"
import { QRScannerModal } from "@/components/forms/QRScannerModal"

function extractCode(value: string) {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    const marker = "/public/gatepass/verify/"
    const index = url.pathname.indexOf(marker)
    if (index >= 0) return decodeURIComponent(url.pathname.slice(index + marker.length).split("/")[0] || "")
  } catch {}
  return trimmed.split("/").filter(Boolean).at(-1) || ""
}

export function SecurityGateScanner() {
  const router = useRouter()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  function open(value: string) {
    const parsed = extractCode(value)
    if (!parsed) return setError("QR atau verification code tidak sah.")
    setScannerOpen(false)
    router.push(`/forms/warehouse/gatepass/security/${encodeURIComponent(parsed)}`)
  }
  return <div className="mx-auto max-w-3xl space-y-6"><div className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-950 to-orange-900 p-8 text-white shadow-xl"><ShieldCheck className="h-12 w-12 text-amber-300" /><h2 className="mt-4 text-3xl font-black">Security Gate Control</h2><p className="mt-2 max-w-xl text-sm text-amber-50/80">Scan the Gatepass verification QR. Security records physical arrival and departure only; loading details remain under Warehouse.</p></div><div className="grid gap-4 sm:grid-cols-2"><button onClick={() => setScannerOpen(true)} className="flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 font-black text-amber-900 hover:bg-amber-100"><QrCode className="mb-3 h-10 w-10" /> Scan Gatepass QR</button><form action={() => open(code)} className="flex min-h-40 flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><label className="text-xs font-black uppercase tracking-wider text-slate-600">Verification code or QR URL<input value={code} onChange={event => setCode(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /></label><button className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"><Search className="h-4 w-4" /> Open Gatepass</button></form></div>{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}<div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"><strong>Security rule:</strong> compare the physical vehicle with the registered vehicle. A mismatch requires a reason. Check-out is blocked until Warehouse confirms loading complete, a DO is linked, and any issued pallets are posted.</div><QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={open} /></div>
}

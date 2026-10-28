"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Search, ShieldCheck, Truck } from "lucide-react"
import { QRScannerModal } from "@/components/forms/QRScannerModal"
import { TactileButton } from "@/components/ui/TactileButton"

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
    if (!parsed) return setError("Invalid QR or verification code.")
    setScannerOpen(false)
    router.push(`/forms/warehouse/gatepass/security/${encodeURIComponent(parsed)}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-amber-950 to-orange-950 p-7 md:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-300/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-200">
          <ShieldCheck className="h-4 w-4 text-amber-300" /> BUBBLESO2 SECURITY CHECKPOINT
        </div>
        <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">Security Gate Control</h1>
        <p className="mt-2 max-w-xl text-sm text-amber-100/80 leading-relaxed">
          Scan Gatepass Verification QR or enter the code to inspect trucks and record Check-In or Check-Out.
        </p>
      </div>

      {/* Action Scanner Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Quick Camera Scan Card */}
        <div className="flex min-h-52 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-6 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md mb-3">
            <QrCode className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-amber-950">Scan Using Camera</h2>
          <p className="text-xs text-amber-800 mt-1 mb-4 max-w-xs">
            Point phone or tablet camera at the Security Gatepass Verification QR.
          </p>
          <TactileButton
            variant="amber"
            size="lg"
            icon={<QrCode className="h-5 w-5" />}
            onClick={() => setScannerOpen(true)}
          >
            Open Camera Scanner
          </TactileButton>
        </div>

        {/* Manual Code Input Card */}
        <form
          action={() => open(code)}
          className="flex min-h-52 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Search className="h-4 w-4 text-cyan-700" /> Enter Code / QR URL Manually
            </h2>
            <label className="mt-3 block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verification Code or Full Link
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                placeholder="e.g. gp_sec_abc123 or paste URL..."
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm font-semibold outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <div className="mt-4">
            <TactileButton
              type="submit"
              variant="dark"
              size="lg"
              fullWidth
              disabled={!code.trim()}
              icon={<Search className="h-4 w-4" />}
            >
              Find &amp; Open Gatepass
            </TactileButton>
          </div>
        </form>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Security Guidance Note */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-950 space-y-1.5 leading-relaxed">
        <div className="font-bold flex items-center gap-1.5 text-blue-900">
          <Truck className="h-4 w-4 text-blue-700 shrink-0" /> Security Guard Instructions:
        </div>
        <p>
          • Verify physical truck plate number and driver name against the registered Gatepass details.
        </p>
        <p>
          • If there is a discrepancy, enter the reason in the remarks field before confirming entry.
        </p>
      </div>

      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={open} />
    </div>
  )
}

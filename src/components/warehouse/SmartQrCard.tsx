"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { Check, Copy, ExternalLink, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

export function SmartQrCard({
  path,
  label,
  reference,
  compact = false,
}: {
  path: string
  label: string
  reference: string
  compact?: boolean
}) {
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => ""
  )
  const [copied, setCopied] = useState(false)
  const url = useMemo(() => origin ? `${origin}${path}` : path, [origin, path])

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-5"}`}>
      <div className="mb-3 flex items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{label}</p>
          <p className="mt-1 font-mono text-xs font-black text-slate-500">{reference}</p>
        </div>
        <QrCode className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mx-auto w-fit rounded-xl border-4 border-slate-950 bg-white p-2">
        <QRCodeSVG value={url} size={compact ? 112 : 180} level="H" includeMargin={false} />
      </div>
      {!compact && (
        <>
          <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Scan untuk rekod terkini</p>
          <div className="mt-3 grid grid-cols-2 gap-2 print:hidden">
            <button onClick={copy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Disalin" : "Salin Link"}
            </button>
            <a href={path} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
              Buka <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </>
      )}
    </div>
  )
}

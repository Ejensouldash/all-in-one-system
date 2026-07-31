"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  QrCode, Loader2, Send, AlertCircle, Trash2, PackageOpen, AlertTriangle, CheckCircle2, Search,
} from "lucide-react"
import { QRScannerModal } from "@/components/forms/QRScannerModal"
import { recordWithdrawal } from "@/app/actions/rawMaterialWithdrawal"
import type { LiveStockRow } from "@/lib/warehouse/withdrawalService"

type CartLine = { key: string; qty: string }

const PURPOSES = [
  { id: "PRODUCTION", label: "Guna untuk Production", note: "Masuk ke Transfer In borang harian" },
  { id: "DISPOSAL", label: "Buang / Rosak", note: "Tolak baki sahaja, tidak ke production" },
  { id: "RETURN", label: "Pulang ke Supplier", note: "Tolak baki sahaja, tidak ke production" },
  { id: "ADJUSTMENT", label: "Pelarasan Stok", note: "Tolak baki sahaja, tidak ke production" },
] as const

const n = (v: string) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export function WithdrawForm({
  stock,
  defaultTakenBy,
}: {
  stock: LiveStockRow[]
  defaultTakenBy: string
}) {
  const router = useRouter()
  const today = new Date()

  const [date] = useState(today.toISOString().split("T")[0])
  const [time, setTime] = useState(
    `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`
  )
  const [shift, setShift] = useState(today.getHours() >= 19 || today.getHours() < 7 ? "PM" : "AM")
  const [takenBy, setTakenBy] = useState(defaultTakenBy)
  const [purpose, setPurpose] = useState<string>("PRODUCTION")
  const [remarks, setRemarks] = useState("")

  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState("")
  const [scanOpen, setScanOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byKey = useMemo(() => new Map(stock.map(s => [s.key, s])), [stock])

  // Oldest batch per SKU, so picking a newer one while older stock remains can be flagged.
  const oldestPerSku = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of stock) if (!m.has(s.sku)) m.set(s.sku, s.key) // stock already arrives oldest-first
    return m
  }, [stock])

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q
      ? stock.filter(s => s.batchNo.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))
      : stock
    const map = new Map<string, LiveStockRow[]>()
    for (const s of rows) {
      if (!map.has(s.label)) map.set(s.label, [])
      map.get(s.label)!.push(s)
    }
    return [...map.entries()]
  }, [stock, search])

  const inCart = (key: string) => cart.some(c => c.key === key)
  const addToCart = (key: string) => {
    if (inCart(key)) return
    setCart(c => [...c, { key, qty: "" }])
  }
  const setQty = (key: string, qty: string) => setCart(c => c.map(l => (l.key === key ? { ...l, qty } : l)))
  const removeLine = (key: string) => setCart(c => c.filter(l => l.key !== key))

  const handleScan = (decoded: string) => {
    setScanOpen(false)
    let batch = ""
    try {
      const parsed = JSON.parse(decoded)
      batch = parsed.batch || parsed.batchNumber || ""
    } catch {
      try {
        batch = new URL(decoded).searchParams.get("batch") || ""
      } catch {
        batch = decoded
      }
    }
    if (!batch) return
    const hit = stock.find(s => s.batchNo.toUpperCase() === batch.trim().toUpperCase())
    if (hit) addToCart(hit.key)
    else setSearch(batch.trim())
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await recordWithdrawal({
        date,
        time,
        shift,
        takenBy,
        purpose: purpose as any,
        remarks: remarks || undefined,
        lines: cart.map(l => {
          const s = byKey.get(l.key)!
          return { sku: s.sku, batchNo: s.batchNo, qty: n(l.qty) }
        }),
      })
      if (!res.success) throw new Error(res.error || "Gagal rekod")
      router.push("/forms/warehouse/reports/raw-material/withdraw/history")
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Gagal rekod")
      setBusy(false)
    }
  }

  const cartValid = cart.length > 0 && cart.every(l => {
    const s = byKey.get(l.key)
    const q = n(l.qty)
    return s && q > 0 && Number.isInteger(q) && q <= s.available
  })

  const purposeInfo = PURPOSES.find(p => p.id === purpose)!

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* ---------------------------------------------------------- available stock */}
      <div className="xl:col-span-2 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-tight text-gray-800 flex-1">
              Stok Tersedia di Warehouse
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari batch atau SKU"
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:border-indigo-500 w-48"
                />
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-[11px] font-black uppercase rounded-lg transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" /> Scan
              </button>
            </div>
          </div>

          {stock.length === 0 ? (
            <div className="p-10 flex flex-col items-center text-center">
              <PackageOpen className="w-9 h-9 text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-500">Tiada stok tersedia.</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Stok hanya muncul di sini selepas warehouse merekod Quantity Stock In dalam borang
                Daily Raw Material.
              </p>
            </div>
          ) : grouped.length === 0 ? (
            <p className="p-8 text-center text-xs font-bold text-gray-400">Tiada padanan untuk &quot;{search}&quot;.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {grouped.map(([label, rows]) => (
                <div key={label} className="px-5 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    {label} <span className="text-gray-300">({rows[0].unit})</span>
                  </p>
                  <div className="space-y-1.5">
                    {rows.map(r => {
                      const oldest = oldestPerSku.get(r.sku) === r.key
                      const picked = inCart(r.key)
                      return (
                        <div
                          key={r.key}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                            picked ? "border-indigo-300 bg-indigo-50/60" : "border-gray-100 bg-gray-50/60"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-900 font-mono truncate">{r.batchNo}</p>
                            {oldest && rows.length > 1 && (
                              <span className="text-[9px] font-black uppercase text-emerald-700">Batch paling lama — guna dahulu</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-black text-gray-700">
                              {r.available.toLocaleString("en-MY")}{" "}
                              <span className="text-[10px] font-bold text-gray-400">{r.unit.toLowerCase()}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => addToCart(r.key)}
                              disabled={picked}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-[10px] font-black uppercase rounded transition-colors"
                            >
                              {picked ? "Dalam Senarai" : "Ambil"}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- cart */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-tight text-gray-800">Butiran Pengeluaran</h3>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tarikh">
              <input value={date} disabled className={`${inputCls} bg-gray-100 text-gray-500`} />
            </Field>
            <Field label="Masa">
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Shift">
              <select value={shift} onChange={e => setShift(e.target.value)} className={inputCls}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </Field>
            <Field label="Diambil Oleh">
              <input value={takenBy} onChange={e => setTakenBy(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Tujuan">
            <select value={purpose} onChange={e => setPurpose(e.target.value)} className={inputCls}>
              {PURPOSES.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <div
            className={`flex items-start gap-2 p-2.5 rounded-lg border ${
              purpose === "PRODUCTION" ? "bg-indigo-50 border-indigo-200" : "bg-gray-50 border-gray-200"
            }`}
          >
            {purpose === "PRODUCTION" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
            )}
            <p className={`text-[10px] font-bold leading-snug ${purpose === "PRODUCTION" ? "text-indigo-800" : "text-gray-600"}`}>
              {purposeInfo.note}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-black uppercase tracking-tight text-gray-800">
              Senarai Ambil <span className="text-gray-400">({cart.length})</span>
            </h3>
          </div>

          {cart.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs font-bold text-gray-400">
              Belum pilih apa-apa. Tekan &quot;Ambil&quot; pada batch di sebelah.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.map(line => {
                const s = byKey.get(line.key)
                if (!s) return null
                const q = n(line.qty)
                const over = q > s.available
                const fractional = q > 0 && !Number.isInteger(q)
                const after = s.available - q
                return (
                  <div key={line.key} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-gray-900">{s.label}</p>
                        <p className="text-[10px] font-mono font-bold text-gray-500">{s.batchNo}</p>
                      </div>
                      <button type="button" onClick={() => removeLine(line.key)} className="text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={line.qty}
                        onChange={e => setQty(line.key, e.target.value)}
                        placeholder="Qty"
                        autoFocus
                        className={`w-24 px-2 py-1.5 border rounded text-xs font-bold text-right outline-none ${
                          over || fractional ? "border-red-400 bg-red-50" : "border-gray-300 focus:border-indigo-500"
                        }`}
                      />
                      <span className="text-[10px] font-bold text-gray-400">{s.unit.toLowerCase()}</span>
                      <span className="text-[10px] font-bold text-gray-400 ml-auto">
                        baki selepas: <b className={after < 0 ? "text-red-600" : "text-gray-700"}>{after.toLocaleString("en-MY")}</b>
                      </span>
                    </div>
                    {over && (
                      <p className="text-[10px] font-bold text-red-600 mt-1">
                        Hanya {s.available.toLocaleString("en-MY")} tersedia.
                      </p>
                    )}
                    {fractional && <p className="text-[10px] font-bold text-red-600 mt-1">Mesti nombor bulat.</p>}
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-200 space-y-3">
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              placeholder="Remarks (pilihan)"
              className="w-full p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-indigo-500"
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-red-800 leading-snug">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy || !cartValid || !takenBy.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-black uppercase tracking-wide rounded-lg"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {busy ? "Merekod..." : "Rekod Pengeluaran"}
            </button>
          </div>
        </div>
      </div>

      <QRScannerModal isOpen={scanOpen} onClose={() => setScanOpen(false)} onScan={handleScan} />
    </div>
  )
}

const inputCls =
  "w-full p-2 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

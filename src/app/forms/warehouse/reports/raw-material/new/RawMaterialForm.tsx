"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Trash2, QrCode, Loader2, Save, AlertCircle, ArrowRight, Info,
} from "lucide-react"
import { QRScannerModal } from "@/components/forms/QRScannerModal"
import {
  RAW_MATERIAL_SKUS, RAW_MATERIAL_SECTIONS, findSku, sectionRank, skuRank,
} from "@/lib/warehouse/rawMaterialSkus"
import { normaliseBatchNo, batchInputMaxLength } from "@/lib/warehouse/batchFormat"
import { createRawMaterialReport, updateRawMaterialReport } from "@/app/actions/warehouseRawMaterial"

type Row = {
  uid: string
  sku: string
  batchNo: string
  balanceIn: string
  qtyIn: string
  qtyOut: string
  remarks: string
  /** Carried over from the previous report, so the opening balance is not free-typed. */
  locked: boolean
  /** Already recorded as a withdrawal since the last report. Locks Qty Out when above zero. */
  withdrawnQty: number
  /** Which Ambil Bahan records make up withdrawnQty, so the split can name itself on screen. */
  withdrawalNos: string[]
}

const uid = () => Math.random().toString(36).slice(2, 10)

const blankRow = (sku = RAW_MATERIAL_SKUS[0].key): Row => ({
  uid: uid(),
  sku,
  batchNo: "",
  balanceIn: "0",
  qtyIn: "0",
  qtyOut: "0",
  remarks: "",
  locked: false,
  withdrawnQty: 0,
  withdrawalNos: [],
})

const n = (v: string) => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export type RawMaterialInitialData = {
  id: string
  date: string
  time: string
  shift: string
  preparedBy: string
  verifiedBy: string
  referenceDoNumber: string
  remarks: string
  rows: {
    sku: string
    batchNo: string
    balanceIn: number
    qtyIn: number
    qtyOut: number
    remarks: string
    /** Portion of qtyOut that already left on an Ambil Bahan DO, and which withdrawals those were. */
    withdrawnQty: number
    withdrawalNos: string[]
  }[]
}

export function RawMaterialForm({
  prefillRows,
  prefillFrom,
  defaultPreparedBy,
  initialData,
}: {
  prefillRows: { sku: string; batchNo: string; balanceIn: number; withdrawnQty: number }[]
  prefillFrom: { date: string; sequence: number; shift: string } | null
  defaultPreparedBy: string
  /** Present in edit mode. The date is fixed once a report exists. */
  initialData?: RawMaterialInitialData
}) {
  const router = useRouter()
  const isEdit = !!initialData

  const today = new Date()
  const [date, setDate] = useState(initialData?.date ?? today.toISOString().split("T")[0])
  const [time, setTime] = useState(
    initialData?.time ??
      `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`
  )
  const [shift, setShift] = useState(
    initialData?.shift ?? (today.getHours() >= 19 || today.getHours() < 7 ? "PM" : "AM")
  )
  const [preparedBy, setPreparedBy] = useState(initialData?.preparedBy ?? defaultPreparedBy)
  const [verifiedBy, setVerifiedBy] = useState(initialData?.verifiedBy ?? "")
  const [referenceDoNumber, setReferenceDoNumber] = useState(initialData?.referenceDoNumber ?? "")
  const [remarks, setRemarks] = useState(initialData?.remarks ?? "")

  const [rows, setRows] = useState<Row[]>(() => {
    if (initialData) {
      // Every field stays editable when correcting a mistake, including the opening balance and
      // Qty Out — that is the whole point of the edit screen. But withdrawnQty must carry the real
      // figure, not 0: the server still subtracts it when regenerating the DO, so hiding it here
      // meant staff could not see why 2700 typed in became a 900-box DO.
      return initialData.rows.map(r => ({
        uid: uid(),
        sku: r.sku,
        batchNo: r.batchNo,
        balanceIn: String(r.balanceIn),
        qtyIn: String(r.qtyIn),
        qtyOut: String(r.qtyOut),
        remarks: r.remarks,
        locked: false,
        withdrawnQty: r.withdrawnQty || 0,
        withdrawalNos: r.withdrawalNos || [],
      }))
    }
    return prefillRows.length > 0
      ? prefillRows.map(p => ({
          uid: uid(),
          sku: p.sku,
          batchNo: p.batchNo,
          balanceIn: String(p.balanceIn),
          qtyIn: "0",
          qtyOut: String(p.withdrawnQty || 0),
          remarks: "",
          locked: true,
          withdrawnQty: p.withdrawnQty || 0,
          withdrawalNos: [],
        }))
      : [blankRow()]
  })

  const [scanTarget, setScanTarget] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (id: string, next: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.uid === id ? { ...r, ...next } : r)))

  const addRow = () => setRows(rs => [...rs, blankRow()])
  const removeRow = (id: string) => setRows(rs => (rs.length === 1 ? [blankRow()] : rs.filter(r => r.uid !== id)))

  const handleScan = (decoded: string) => {
    const target = scanTarget
    setScanTarget(null)
    if (!target) return

    let batch = ""
    let scannedSku = ""
    try {
      const parsed = JSON.parse(decoded)
      batch = parsed.batch || parsed.batchNumber || ""
      scannedSku = parsed.sku || ""
    } catch {
      try {
        const q = new URL(decoded).searchParams
        batch = q.get("batch") || ""
        scannedSku = q.get("sku") || ""
      } catch {
        batch = decoded
      }
    }
    if (!batch) return

    const row = rows.find(r => r.uid === target)
    const match = RAW_MATERIAL_SKUS.find(s => s.key === scannedSku || s.category === scannedSku)
    const sku = match?.key || row?.sku || RAW_MATERIAL_SKUS[0].key
    const cat = findSku(sku)?.category || ""
    patch(target, { sku, batchNo: normaliseBatchNo(batch, cat) })
  }

  // Grouped for display, but the underlying list stays flat so Add Row is one action.
  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const r of rows) {
      const section = findSku(r.sku)?.section || "LAIN-LAIN"
      if (!map.has(section)) map.set(section, [])
      map.get(section)!.push(r)
    }
    return [...map.entries()].sort((a, b) => sectionRank(a[0]) - sectionRank(b[0]))
  }, [rows])

  const totalOut = rows.reduce((s, r) => s + n(r.qtyOut), 0)
  const outRowCount = rows.filter(r => n(r.qtyOut) > 0).length

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        time,
        shift,
        preparedBy,
        verifiedBy: verifiedBy || undefined,
        referenceDoNumber: referenceDoNumber || undefined,
        remarks: remarks || undefined,
        rows: rows.map(r => ({
          sku: r.sku,
          batchNo: r.batchNo,
          balanceIn: n(r.balanceIn),
          qtyIn: n(r.qtyIn),
          qtyOut: n(r.qtyOut),
          remarks: r.remarks,
        })),
      }

      const res = initialData
        ? await updateRawMaterialReport(initialData.id, payload)
        : await createRawMaterialReport({ ...payload, date })

      if (!res.success) throw new Error(res.error || "Gagal simpan")
      const id = initialData?.id ?? (res as any).data.id
      router.push(`/forms/warehouse/reports/raw-material/${id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message || "Gagal simpan")
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="space-y-3">
            <Field label={isEdit ? "Date (dikunci)" : "Date"}>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={isEdit}
                title={isEdit ? "Tarikh tidak boleh diubah. Kalau salah, batalkan borang dan buat yang baharu." : undefined}
                className={`${inputCls} disabled:bg-gray-100 disabled:text-gray-500`}
              />
            </Field>
            <Field label="No. DO">
              <input
                value={referenceDoNumber}
                onChange={e => setReferenceDoNumber(e.target.value.toUpperCase())}
                maxLength={50}
                placeholder="No. DO"
                className={`${inputCls} font-mono uppercase`}
              />
            </Field>
          </div>
          <Field label="Time">
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Shift">
            <select value={shift} onChange={e => setShift(e.target.value)} className={inputCls}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </Field>
          <Field label="Prepared By">
            <input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Verified By (pilihan)">
            <input value={verifiedBy} onChange={e => setVerifiedBy(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {isEdit && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-900 leading-snug">
              Mod pembetulan. Menyimpan akan menjana semula DO dengan nombor yang sama.
              Tarikh dikunci — kalau tarikh salah, batalkan borang ini dan buat yang baharu.
            </p>
          </div>
        )}

        {!isEdit && prefillFrom && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-indigo-900 leading-snug">
              Balance In Warehouse diisi automatik daripada carry forward terkini setiap batch (kemas kini terakhir: borang {prefillFrom.date} #{prefillFrom.sequence} {prefillFrom.shift}).
              Batch yang sudah habis tidak dibawa ke sini.
            </p>
          </div>
        )}
      </div>

      {/* rows */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-black uppercase tracking-tight text-gray-800">Raw Material Logs</h3>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-wide rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2.5 text-left w-[190px]">SKU</th>
                <th className="px-3 py-2.5 text-left w-[170px]">Batch No</th>
                <th className="px-3 py-2.5 text-right w-[120px]">Bal. In Whse</th>
                <th className="px-3 py-2.5 text-right w-[110px] text-emerald-700">+ Qty In</th>
                <th className="px-3 py-2.5 text-right w-[110px] text-red-700">− Qty Out</th>
                <th className="px-3 py-2.5 text-right w-[130px] text-indigo-700">= Carry Forward</th>
                <th className="px-3 py-2.5 text-left">Remarks</th>
                <th className="px-3 py-2.5 w-[44px]" />
              </tr>
            </thead>

            {grouped.map(([section, sectionRows]) => (
              <tbody key={section}>
                <tr>
                  <td colSpan={8} className="bg-gray-100/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-600">
                    {section}
                    <span className="ml-2 text-gray-400">({findSku(sectionRows[0].sku)?.unit})</span>
                  </td>
                </tr>
                {sectionRows.map(r => {
                  const sku = findSku(r.sku)
                  const cf = n(r.balanceIn) + n(r.qtyIn) - n(r.qtyOut)
                  const negative = cf < 0
                  return (
                    <tr key={r.uid} className="border-t border-gray-100 hover:bg-gray-50/60">
                      <td className="px-3 py-2">
                        <select
                          value={r.sku}
                          onChange={e => patch(r.uid, { sku: e.target.value })}
                          disabled={r.locked}
                          className={`${cellCls} disabled:bg-gray-100 disabled:text-gray-500`}
                        >
                          {[...RAW_MATERIAL_SKUS].sort((a, b) => skuRank(a.key) - skuRank(b.key)).map(s => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            value={r.batchNo}
                            onChange={e => patch(r.uid, { batchNo: normaliseBatchNo(e.target.value, sku?.category || "") })}
                            maxLength={batchInputMaxLength(sku?.category || "")}
                            disabled={r.locked}
                            placeholder={sku?.category === "CAP" ? "013126-01" : "batch"}
                            className={`${cellCls} font-mono disabled:bg-gray-100 disabled:text-gray-500`}
                          />
                          {!r.locked && (
                            <button
                              type="button"
                              onClick={() => setScanTarget(r.uid)}
                              title="Scan QR"
                              className="p-1.5 text-gray-400 hover:text-indigo-600 shrink-0"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="any"
                          value={r.balanceIn}
                          onChange={e => patch(r.uid, { balanceIn: e.target.value })}
                          disabled={r.locked}
                          className={`${cellCls} text-right disabled:bg-gray-100 disabled:text-gray-600 disabled:font-bold`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min="0" step="any"
                          value={r.qtyIn}
                          onChange={e => patch(r.uid, { qtyIn: e.target.value })}
                          className={`${cellCls} text-right`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {/* Stock production already took is recorded by whoever took it, so on a new
                            form this figure is derived rather than typed. The edit screen must stay
                            typeable — it exists to correct mistakes — so there the field unlocks and
                            the split is spelled out underneath instead. */}
                        <input
                          type="number" min="0" step="1"
                          value={r.qtyOut}
                          onChange={e => patch(r.uid, { qtyOut: e.target.value })}
                          disabled={!isEdit && r.withdrawnQty > 0}
                          title={
                            r.withdrawnQty > 0
                              ? `${r.withdrawnQty} sudah direkod melalui Ambil Bahan. Untuk ubah, batalkan pengeluaran itu.`
                              : undefined
                          }
                          className={`${cellCls} text-right disabled:bg-indigo-50 disabled:text-indigo-800 disabled:font-black disabled:border-indigo-200 ${n(r.qtyOut) > 0 && r.withdrawnQty === 0 ? "border-red-300 bg-red-50 font-bold" : ""}`}
                        />
                        {r.withdrawnQty > 0 && (() => {
                          const manual = n(r.qtyOut) - r.withdrawnQty
                          return (
                            <div className="mt-1 leading-tight">
                              <p className="text-[9px] font-black uppercase text-indigo-600">
                                {r.withdrawnQty.toLocaleString("en-MY")} dari Ambil Bahan
                                {r.withdrawalNos.length > 0 && ` (${r.withdrawalNos.join(", ")})`}
                              </p>
                              <p className={`text-[9px] font-black uppercase ${manual < 0 ? "text-red-600" : "text-gray-500"}`}>
                                {manual < 0
                                  ? `Kurang ${Math.abs(manual).toLocaleString("en-MY")} dari rekod Ambil Bahan`
                                  : `${manual.toLocaleString("en-MY")} manual → DO baharu`}
                              </p>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-sm font-black ${negative ? "text-red-600" : cf === 0 ? "text-gray-300" : "text-indigo-700"}`}>
                          {cf.toLocaleString("en-MY")}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={r.remarks}
                          onChange={e => patch(r.uid, { remarks: e.target.value })}
                          className={cellCls}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => removeRow(r.uid)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>

      {/* what goes to production */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-gray-800">
                Quantity Stock Out → Transfer In (Daily Production Report)
              </p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                {outRowCount > 0
                  ? `${outRowCount} baris (${totalOut.toLocaleString("en-MY")} unit) akan dijana sebagai satu DO untuk shift ${shift} pada ${date}.`
                  : "Tiada stock out. Tiada DO akan dijana."}
              </p>
            </div>
          </div>

          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Remarks keseluruhan (pilihan)"
            rows={2}
            className="w-full lg:w-80 p-2 border border-gray-300 rounded-lg text-xs outline-none focus:border-indigo-500"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-red-800 leading-snug">{error}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-black uppercase tracking-wide rounded-lg shadow-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {busy ? "Menyimpan..." : isEdit ? "Simpan Pembetulan" : "Submit"}
          </button>
        </div>
      </div>

      <QRScannerModal isOpen={scanTarget !== null} onClose={() => setScanTarget(null)} onScan={handleScan} />
    </div>
  )
}

const inputCls =
  "w-full p-2 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white"
const cellCls =
  "w-full px-2 py-1.5 border border-gray-200 rounded text-xs outline-none focus:border-indigo-500 bg-white"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

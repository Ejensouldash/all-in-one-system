"use client"

import { useMemo, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Printer, Trash2, Save, AlertCircle, CheckCircle2, Sun, Moon } from "lucide-react"
import { createKbpBatch, deleteKbpBatch } from "@/app/actions/kbpBatch"
import {
  KBP_MACHINES,
  KBP_SHIFTS,
  buildKbpBatchNo,
  formatDateOnly,
  formatIsoWeekLabel,
  fromDateInputValue,
  getMachine,
  getShiftLabel,
  toDateInputValue,
  type KbpShiftId,
} from "@/lib/kbp/batchNumber"

type Batch = {
  id: string
  batchNo: string
  sku: string
  machine: string | null
  productCode: string | null
  shift: string | null
  productionDate: string | null
  qtyPerBag: number
  totalBags: number
  totalQty: number
  createdBy: string
  createdAt: string
}

export function KbpBatchClient({ initialBatches }: { initialBatches: Batch[] }) {
  const [batches, setBatches] = useState<Batch[]>(initialBatches)
  const [machineId, setMachineId] = useState(KBP_MACHINES[0].id)
  const [dateValue, setDateValue] = useState(() => toDateInputValue(new Date()))
  const [shift, setShift] = useState<KbpShiftId>("01")
  const [qtyPerBag, setQtyPerBag] = useState<number>(KBP_MACHINES[0].defaultQtyPerBag)
  const [totalBags, setTotalBags] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [printTagData, setPrintTagData] = useState<Batch | null>(null)

  const machine = getMachine(machineId)!

  // Batch No is fully derived — never typed by hand, so it cannot drift from the
  // machine/date/shift that were actually selected.
  const previewDate = useMemo(() => fromDateInputValue(dateValue), [dateValue])
  const previewBatchNo = useMemo(() => {
    try {
      return buildKbpBatchNo(machineId, previewDate, shift)
    } catch {
      return ""
    }
  }, [machineId, previewDate, shift])

  const handleMachineChange = (id: string) => {
    setMachineId(id)
    const found = getMachine(id)
    if (found) setQtyPerBag(found.defaultQtyPerBag)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setIsSubmitting(true)

    const res = await createKbpBatch({
      machine: machineId,
      productionDate: dateValue,
      shift,
      qtyPerBag: Number(qtyPerBag) || 0,
      totalBags: Number(totalBags) || 1,
    })

    setIsSubmitting(false)

    if (res.success && res.data) {
      const created = {
        ...(res.data as any),
        createdAt: new Date(res.data.createdAt).toISOString(),
        productionDate: res.data.productionDate ? new Date(res.data.productionDate).toISOString() : null,
      } as Batch
      setBatches([created, ...batches])
      setPrintTagData(created)
      setFeedback({ type: "ok", text: `Batch ${created.batchNo} berjaya didaftarkan. Sila cetak sticker.` })
    } else {
      setFeedback({ type: "err", text: res.error || "Gagal mendaftar batch." })
    }
  }

  const handlePrint = (batch: Batch) => {
    setPrintTagData(batch)
    setTimeout(() => window.print(), 150)
  }

  const handleDelete = async (id: string, batchNo: string) => {
    if (!confirm(`Padam Batch ${batchNo}?`)) return
    const res = await deleteKbpBatch(id)
    if (res.success) {
      setBatches(batches.filter(b => b.id !== id))
      if (printTagData?.id === id) setPrintTagData(null)
      setFeedback({ type: "ok", text: `Batch ${batchNo} dipadam.` })
    } else {
      setFeedback({ type: "err", text: res.error || "Gagal memadam." })
    }
  }

  // Kept identical to the previous Pedas sticker payload — TransferInForm and
  // CreateDOForm already parse batch/sku/qty/bags out of this shape.
  const qrPayload = (b: Batch) =>
    JSON.stringify({ batch: b.batchNo, sku: b.sku, qty: b.qtyPerBag, bags: b.totalBags, origin: "PEDAS" })

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
  const labelClass = "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2"

  return (
    <>
      <div className="space-y-8 print:hidden">
        {feedback && (
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              feedback.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {feedback.type === "ok" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            )}
            <p className="text-sm font-bold">{feedback.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Daftar Batch Baru</h2>
              <p className="text-xs text-gray-500 mt-0.5">Batch No dijana automatik dari pilihan di bawah</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className={labelClass}>Mesin</label>
                <select value={machineId} onChange={e => handleMachineChange(e.target.value)} className={inputClass}>
                  {KBP_MACHINES.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label} — {m.sku}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tarikh Produksi</label>
                  <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} className={inputClass} required />
                  <p className="text-[11px] text-gray-400 mt-1.5">{formatIsoWeekLabel(previewDate)}</p>
                </div>
                <div>
                  <label className={labelClass}>Shift</label>
                  <div className="grid grid-cols-2 gap-2">
                    {KBP_SHIFTS.map(s => {
                      const Icon = s.id === "01" ? Sun : Moon
                      const active = shift === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setShift(s.id)}
                          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition ${
                            active
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-gray-300 bg-white text-gray-500 hover:border-gray-400"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {s.id} {s.short}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Derived batch number */}
              <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1.5">Batch Number (auto)</p>
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-900 tabular-nums break-all">
                  {previewBatchNo || "—"}
                </p>
                <p className="text-[11px] text-indigo-500/80 mt-2">
                  {machine.id} (mesin) · {machine.productCode} (produk) · hari+minggu+tahun · {shift} ({getShiftLabel(shift)})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Qty per Bag</label>
                  <input
                    type="number"
                    min={1}
                    value={qtyPerBag}
                    onChange={e => setQtyPerBag(Number(e.target.value))}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Total Bags</label>
                  <input
                    type="number"
                    min={1}
                    value={totalBags}
                    onChange={e => setTotalBags(Number(e.target.value))}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Jumlah Kuantiti</span>
                <span className="text-lg font-black text-emerald-700 tabular-nums">
                  {((Number(qtyPerBag) || 0) * (Number(totalBags) || 1)).toLocaleString()} pcs
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !previewBatchNo}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-black uppercase tracking-wider text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Save className="h-5 w-5" />
                {isSubmitting ? "Menyimpan…" : "Simpan & Jana Sticker"}
              </button>
            </form>
          </div>

          {/* Sticker preview */}
          <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Preview Sticker</h2>
              <p className="text-xs text-gray-500 mt-0.5">Thermal 80mm × 50mm</p>
            </div>

            {printTagData ? (
              <div className="p-6 flex flex-col items-center gap-5">
                <div className="w-full rounded-lg border border-gray-300 bg-white p-4 flex flex-col items-center text-center gap-2">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-700 border-b border-gray-200 pb-2 w-full">
                    BubblesO2 — KBP Batch Tag
                  </p>
                  <div className="my-2 p-2 border border-gray-200 rounded">
                    <QRCodeSVG value={qrPayload(printTagData)} size={140} level="H" />
                  </div>
                  <p className="text-xl font-black tracking-tight text-gray-900 break-all">{printTagData.batchNo}</p>
                  <p className="w-full rounded bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-bold uppercase text-gray-600">
                    {printTagData.sku}
                  </p>
                  <div className="flex justify-between w-full pt-2 border-t border-gray-100 text-xs font-bold text-gray-500">
                    <span>QTY/BAG: {printTagData.qtyPerBag}</span>
                    <span>BAGS: {printTagData.totalBags}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePrint(printTagData)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-black uppercase tracking-wider text-white hover:bg-gray-800 transition"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Sticker
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-10 text-center">
                <p className="text-sm font-medium text-gray-400">
                  Tiada sticker aktif.
                  <br />
                  Simpan batch baru atau tekan &ldquo;Cetak&rdquo; pada senarai di bawah.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">
              Sejarah Batch ({batches.length})
            </h2>
            <span className="text-xs font-medium text-gray-400">Boleh cetak semula bila-bila masa</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Batch No", "Mesin", "SKU", "Shift", "Tarikh", "Qty", "Oleh", ""].map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm font-medium text-gray-400">
                      Belum ada batch.
                    </td>
                  </tr>
                ) : (
                  batches.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-black text-gray-900 whitespace-nowrap">{b.batchNo}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-700">{b.machine || "—"}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{b.sku}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {b.shift ? getShiftLabel(b.shift) : "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDateOnly(b.productionDate)}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap tabular-nums">
                        {b.totalQty.toLocaleString()}
                        <span className="text-gray-400"> ({b.totalBags} bag)</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">{b.createdBy}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handlePrint(b)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Cetak
                          </button>
                          <button
                            onClick={() => handleDelete(b.id, b.batchNo)}
                            className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition"
                            title="Padam batch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print-only thermal sticker */}
      {printTagData && (
        <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:w-full print:h-screen bg-white p-2">
          <div className="w-[80mm] h-[50mm] border-2 border-black p-2 flex flex-col items-center justify-between text-center bg-white font-sans">
            <div className="text-[10px] font-black uppercase tracking-wider border-b border-black w-full pb-0.5">
              BUBBLESO2 — KBP BATCH TAG
            </div>
            <div className="my-1">
              <QRCodeSVG value={qrPayload(printTagData)} size={95} level="H" />
            </div>
            <div className="text-sm font-black uppercase tracking-tight text-black">{printTagData.batchNo}</div>
            <div className="text-[9px] font-black uppercase border border-black px-2 py-0.5 w-full bg-gray-100">
              SKU: {printTagData.sku}
            </div>
            <div className="text-[8px] font-bold flex justify-between w-full pt-0.5">
              <span>QTY: {printTagData.qtyPerBag}</span>
              <span>BAGS: {printTagData.totalBags}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

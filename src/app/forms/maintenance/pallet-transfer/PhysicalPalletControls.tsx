"use client"

import { useState, useTransition } from "react"
import { createPhysicalPalletAction, movePhysicalPalletsAction } from "@/app/actions/warehouse-pallet"

type Option = { id: string; name: string; kind?: string; code?: string }

export function PhysicalPalletControls({ palletTypes, custodians, gatePasses }: { palletTypes: Option[]; custodians: Option[]; gatePasses: Array<{ id: string; gatePassNo: string; deliveryOrders: Array<{ distributionOrderId: string }> }> }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [code, setCode] = useState("")
  const [typeId, setTypeId] = useState(palletTypes[0]?.id || "")
  const [toCustodianId, setToCustodianId] = useState("")
  const [gatePassId, setGatePassId] = useState("")
  const selectedGatePass = gatePasses.find(item => item.id === gatePassId)
  function submit(task: () => Promise<{ success: boolean; error?: string }>, success: string) { setError(""); setMessage(""); startTransition(async () => { const result = await task(); if (!result.success) setError(result.error || "Tindakan gagal."); else { setMessage(success); setCode("") } }) }
  return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
    <h2 className="font-black text-stone-950">Scan / Daftar Pallet Fizikal</h2>
    <p className="mt-1 text-xs text-stone-600">Scan QR label menggunakan scanner (ia akan mengisi kotak ini), kemudian daftar atau rekod pergerakan.</p>
    {error && <p className="mt-3 rounded-lg bg-red-100 p-2 text-xs font-bold text-red-700">{error}</p>}{message && <p className="mt-3 rounded-lg bg-emerald-100 p-2 text-xs font-bold text-emerald-800">{message}</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2"><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Scan / masukkan PALLET-0001" className="rounded-xl border border-amber-300 bg-white px-3 py-2 font-mono font-bold" /><select value={typeId} onChange={e => setTypeId(e.target.value)} className="rounded-xl border border-amber-300 bg-white px-3 py-2">{palletTypes.map(type => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></div>
    <div className="mt-3 flex flex-wrap gap-2"><button disabled={!code || !typeId || pending} onClick={() => submit(() => createPhysicalPalletAction({ palletCode: code, palletTypeId: typeId }), "Pallet fizikal didaftarkan. Cetak QR trace untuk label.")} className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Daftar QR Baru</button></div>
    <div className="mt-5 grid gap-3 border-t border-amber-200 pt-4 md:grid-cols-2"><select value={toCustodianId} onChange={e => setToCustodianId(e.target.value)} className="rounded-xl border border-amber-300 bg-white px-3 py-2"><option value="">— Lokasi / customer penerima —</option>{custodians.map(c => <option key={c.id} value={c.id}>{c.kind?.replaceAll("_", " ")} — {c.name}</option>)}</select><select value={gatePassId} onChange={e => setGatePassId(e.target.value)} className="rounded-xl border border-amber-300 bg-white px-3 py-2"><option value="">Return ke warehouse / tanpa Gatepass</option>{gatePasses.map(g => <option key={g.id} value={g.id}>{g.gatePassNo}</option>)}</select></div>
    <button disabled={!code || !toCustodianId || pending || Boolean(gatePassId && !selectedGatePass?.deliveryOrders[0])} onClick={() => submit(() => movePhysicalPalletsAction({ palletCodes: [code], toCustodianId, gatePassId: gatePassId || null, distributionOrderId: selectedGatePass?.deliveryOrders[0]?.distributionOrderId || null }), "Lokasi pallet dikemas kini dan timeline direkodkan.")} className="mt-3 rounded-xl bg-amber-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">Scan & Rekod Pergerakan</button>
  </section>
}

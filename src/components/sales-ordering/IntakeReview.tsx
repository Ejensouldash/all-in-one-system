"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, Search, Trash2 } from "lucide-react"
import type { ExtractedSalesDocument, ExtractedSalesLine, SalesValidationIssue } from "@/lib/sales-ordering/types"

type CustomerOption = {
  id: string
  customerCode: string
  sageCustomerId: string | null
  legalName: string
  tradingName: string | null
  creditTermsRaw: string | null
  zone: string | null
}

const emptyLine = (): ExtractedSalesLine => ({ barcode: "", itemCode: "", sku: "", description: "", quantity: 0, uom: "CTN", unitPrice: 0, discount: 0, tax: 0, amount: 0 })

export function IntakeReview({
  intakeId,
  initialDocument,
  initialCustomer,
  issues,
}: {
  intakeId: string
  initialDocument: ExtractedSalesDocument
  initialCustomer: CustomerOption | null
  issues: SalesValidationIssue[]
}) {
  const router = useRouter()
  const [document, setDocument] = useState(initialDocument)
  const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer)
  const [query, setQuery] = useState(initialCustomer ? `${initialCustomer.customerCode} - ${initialCustomer.legalName}` : "")
  const [results, setResults] = useState<CustomerOption[]>([])
  const [searching, setSearching] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (customer && query === `${customer.customerCode} - ${customer.legalName}`) return
    if (query.trim().length < 2) return
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/sales-ordering/customers?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setResults(response.ok ? data.customers : [])
      } finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query, customer])

  function setField<K extends keyof ExtractedSalesDocument>(key: K, value: ExtractedSalesDocument[K]) {
    setDocument(previous => ({ ...previous, [key]: value }))
  }

  function updateLine(index: number, key: keyof ExtractedSalesLine, value: string | number | boolean) {
    setDocument(previous => ({ ...previous, lines: previous.lines.map((line, current) => current === index ? { ...line, [key]: value } : line) }))
  }

  function updateTotal(key: keyof ExtractedSalesDocument["totals"], value: number) {
    setDocument(previous => ({ ...previous, totals: { ...previous.totals, [key]: value } }))
  }

  async function createSalesOrder() {
    if (!customer) { setError("Pilih customer daripada Customer Master dahulu."); return }
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}/create-so`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, document }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Create SO gagal.")
      router.push(`/forms/sales-ordering/orders/${result.salesOrder.id}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Create SO gagal.")
    } finally { setBusy(false) }
  }

  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"

  return <div className="space-y-6">
    {issues.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-black text-amber-900"><AlertTriangle className="h-5 w-5" /> Perkara yang perlu disemak</div><ul className="mt-3 space-y-1 text-sm font-semibold text-amber-800">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>• {issue.message}</li>)}</ul></section>}

    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2 lg:p-7">
      <div className="relative lg:col-span-2"><label className="text-xs font-black uppercase tracking-wider text-slate-500">Customer Master</label><div className="relative"><Search className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><input value={query} onChange={event => { setQuery(event.target.value); setCustomer(null); setResults([]) }} className={`${inputClass} pl-9`} placeholder="Cari Customer ID, Sage ID atau nama..." /></div>{(searching || results.length > 0) && !customer && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{searching ? <p className="p-3 text-sm text-slate-500">Searching...</p> : results.map(option => <button key={option.id} type="button" onClick={() => { setCustomer(option); setQuery(`${option.customerCode} - ${option.legalName}`); setResults([]) }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-cyan-50"><p className="text-sm font-black text-slate-900">{option.customerCode} · {option.legalName}</p><p className="text-xs text-slate-500">{option.sageCustomerId || "No Sage ID"} · {option.creditTermsRaw || "No terms"} · {option.zone || "No zone"}</p></button>)}</div>}</div>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Document Type<select value={document.documentType} onChange={event => setField("documentType", event.target.value)} className={inputClass}><option>PURCHASE_ORDER</option><option>PROFORMA_INVOICE</option><option>INVOICE</option><option>OTHER</option></select></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Document Number<input value={document.documentNumber} onChange={event => setField("documentNumber", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">PO Number<input value={document.poNumber} onChange={event => setField("poNumber", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Document Date<input type="date" value={document.documentDate} onChange={event => setField("documentDate", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Payment Terms<input value={document.paymentTermsRaw} onChange={event => setField("paymentTermsRaw", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Requested Delivery Date<input type="date" value={document.requestedDeliveryDate} onChange={event => setField("requestedDeliveryDate", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500 lg:col-span-2">Delivery Address<textarea rows={3} value={document.deliveryAddress} onChange={event => setField("deliveryAddress", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Delivery Contact<input value={document.deliveryContact} onChange={event => setField("deliveryContact", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Delivery Phone<input value={document.deliveryPhone} onChange={event => setField("deliveryPhone", event.target.value)} className={inputClass} /></label>
    </section>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-black text-slate-950">Order Items</h3><p className="text-xs text-slate-500">Semak SKU, quantity dan harga daripada dokumen.</p></div><button type="button" onClick={() => setDocument(previous => ({ ...previous, lines: [...previous.lines, emptyLine()] }))} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700"><Plus className="h-4 w-4" /> Add item</button></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">SKU / Item</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">UOM</th><th className="px-3 py-3">Unit Price</th><th className="px-3 py-3">Discount</th><th className="px-3 py-3">Tax</th><th className="px-3 py-3">Amount</th><th></th></tr></thead><tbody className="divide-y divide-slate-100">{document.lines.map((line, index) => <tr key={index}><td className="p-2"><input value={line.sku} onChange={event => updateLine(index, "sku", event.target.value)} className={inputClass} /><input value={line.barcode} onChange={event => updateLine(index, "barcode", event.target.value)} className={`${inputClass} text-xs`} placeholder="Barcode" /></td><td className="p-2"><textarea rows={2} value={line.description} onChange={event => updateLine(index, "description", event.target.value)} className={inputClass} /></td>{(["quantity", "unitPrice", "discount", "tax", "amount"] as const).map(key => <td className="p-2" key={key}><input type="number" step="0.01" value={line[key]} onChange={event => updateLine(index, key, Number(event.target.value))} className={`${inputClass} min-w-24`} /></td>).reduce((cells, cell, cellIndex) => cellIndex === 1 ? [...cells, <td className="p-2" key="uom"><input value={line.uom} onChange={event => updateLine(index, "uom", event.target.value)} className={`${inputClass} min-w-20`} /></td>, cell] : [...cells, cell], [] as React.ReactNode[])}<td className="p-2"><button type="button" onClick={() => setDocument(previous => ({ ...previous, lines: previous.lines.filter((_, current) => current !== index) }))} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></section>

    <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">{(["subtotal", "discount", "freight", "tax", "grandTotal"] as const).map(key => <label key={key} className="text-xs font-black uppercase tracking-wider text-slate-500">{key}<input type="number" step="0.01" value={document.totals[key]} onChange={event => updateTotal(key, Number(event.target.value))} className={inputClass} /></label>)}<label className="text-xs font-black uppercase tracking-wider text-slate-500 sm:col-span-2 lg:col-span-5">Remarks<textarea rows={2} value={document.remarks} onChange={event => setField("remarks", event.target.value)} className={inputClass} /></label></section>

    <section className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-sm font-bold text-slate-600"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> AI data belum rasmi sehingga SOD approve.</div><button onClick={createSalesOrder} disabled={busy || !customer} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:bg-slate-300">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Create Draft SO</button></section>
    {error && <p className="rounded-xl bg-rose-50 p-4 text-sm font-black text-rose-700">{error}</p>}
  </div>
}

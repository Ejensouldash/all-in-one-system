"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Plus, RefreshCw, Save, Search, Sparkles, Trash2 } from "lucide-react"
import type { ExtractedSalesDocument, ExtractedSalesLine, SalesValidationIssue } from "@/lib/sales-ordering/types"
import { normalizeExtractedDocument } from "@/lib/sales-ordering/types"

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
  canManageDocuments,
  canCreateSalesOrder,
}: {
  intakeId: string
  initialDocument: ExtractedSalesDocument
  initialCustomer: CustomerOption | null
  issues: SalesValidationIssue[]
  canManageDocuments: boolean
  canCreateSalesOrder: boolean
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

  async function reprocessAi() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}/process`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "AI reprocessing failed.")
      if (result.intake?.extractedData) {
        const normalized = normalizeExtractedDocument(result.intake.extractedData)
        setDocument(normalized)
        if (result.intake.matchedCustomer) {
          setCustomer(result.intake.matchedCustomer)
          setQuery(`${result.intake.matchedCustomer.customerCode} - ${result.intake.matchedCustomer.legalName}`)
        }
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI reprocessing failed.")
    } finally {
      setBusy(false)
    }
  }

  function updateLine(index: number, key: keyof ExtractedSalesLine, value: string | number | boolean) {
    setDocument(previous => {
      const lines = previous.lines.map((line, current) => {
        if (current !== index) return line
        const updated = { ...line, [key]: value }

        if (["quantity", "unitPrice", "discount", "tax", "amount"].includes(key as string)) {
          const qty = Number(updated.quantity) || 0
          const price = Number(updated.unitPrice) || 0
          const disc = Number(updated.discount) || 0
          const tax = Number(updated.tax) || 0

          if (key !== "amount") {
            updated.amount = Math.max(0, Math.round(((qty * price) - disc + tax) * 100) / 100)
          }
        }
        return updated
      })

      const newSubtotal = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
      const freight = Number(previous.totals.freight) || 0
      const totalTax = Number(previous.totals.tax) || 0
      const totalDisc = Number(previous.totals.discount) || 0
      const newGrandTotal = Math.max(0, Math.round((newSubtotal + freight + totalTax - totalDisc) * 100) / 100)

      return {
        ...previous,
        lines,
        totals: {
          ...previous.totals,
          subtotal: Math.round(newSubtotal * 100) / 100,
          grandTotal: newGrandTotal
        }
      }
    })
  }

  function removeLine(index: number) {
    setDocument(previous => {
      const lines = previous.lines.filter((_, current) => current !== index)
      const newSubtotal = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0)
      const freight = Number(previous.totals.freight) || 0
      const totalTax = Number(previous.totals.tax) || 0
      const totalDisc = Number(previous.totals.discount) || 0
      const newGrandTotal = Math.max(0, Math.round((newSubtotal + freight + totalTax - totalDisc) * 100) / 100)

      return {
        ...previous,
        lines,
        totals: {
          ...previous.totals,
          subtotal: Math.round(newSubtotal * 100) / 100,
          grandTotal: newGrandTotal
        }
      }
    })
  }

  function updateTotal(key: keyof ExtractedSalesDocument["totals"], value: number) {
    setDocument(previous => {
      const totals = { ...previous.totals, [key]: value }
      const subtotal = Number(totals.subtotal) || 0
      const freight = Number(totals.freight) || 0
      const tax = Number(totals.tax) || 0
      const discount = Number(totals.discount) || 0
      totals.grandTotal = Math.max(0, Math.round((subtotal + freight + tax - discount) * 100) / 100)

      return {
        ...previous,
        totals
      }
    })
  }

  async function createSalesOrder() {
    if (!customer) { setError("Select a customer from Customer Master first."); return }
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}/create-so`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, document }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Create SO failed.")
      router.push(`/forms/sales-ordering/orders/${result.salesOrder.id}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Create SO failed.")
    } finally { setBusy(false) }
  }

  async function saveReview() {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customer?.id, document }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to save review.")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save review.")
    } finally { setBusy(false) }
  }

  async function deleteDocument() {
    if (!window.confirm("Delete this document? The R2 PDF and intake record will be deleted. Documents that already have a Sales Order cannot be deleted.")) return
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to delete document.")
      router.push("/forms/sales-ordering/intake")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to delete document.")
    } finally { setBusy(false) }
  }

  async function forwardToCreditCheck() {
    setBusy(true)
    setError("")
    try {
      const saveRes = await fetch(`/api/sales-ordering/intake/${intakeId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: customer?.id, document }) })
      if (!saveRes.ok) {
        const saveErr = await saveRes.json()
        throw new Error(saveErr.error || "Failed to save review before forwarding.")
      }
      const response = await fetch(`/api/sales-ordering/intake/${intakeId}/forward-credit-check`, { method: "POST" })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to send to PO-SOA Check.")
      router.push(`/forms/sales-ordering/credit-check?highlight=${result.creditCheckId}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to send to PO-SOA Check.")
    } finally { setBusy(false) }
  }

  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"

  return <div className="space-y-6">
    {issues.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-black text-amber-900"><AlertTriangle className="h-5 w-5" /> Items requiring review (Required to complete/correct)</div><ul className="mt-3 space-y-1 text-sm font-semibold text-amber-800">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>• {issue.message}</li>)}</ul></section>}

    {/* Empty State / Old Version Re-run Banner */}
    {document.lines.length === 0 && document.totals.grandTotal === 0 && (
      <section className="rounded-3xl border-2 border-amber-300 bg-amber-50/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5 text-amber-950">
          <Sparkles className="h-8 w-8 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-sm font-black text-amber-950">Document Not Fully Extracted / Using Older Version</h4>
            <p className="text-xs text-amber-800 font-semibold mt-0.5">
              This document contains a Multi-PO file. Click the button to reprocess the PDF file with the Multi-PO AI Engine.
            </p>
          </div>
        </div>
        {canManageDocuments && (
          <button
            type="button"
            disabled={busy}
            onClick={reprocessAi}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-xs font-black text-white hover:bg-amber-700 transition shadow-md disabled:opacity-50 shrink-0"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            ⚡ Reprocess with AI
          </button>
        )}
      </section>
    )}

    {!canManageDocuments && <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">Read-only review. Request admin for <span className="font-black">Edit / Delete Documents</span> permission to correct or approve document data.</section>}
    <fieldset disabled={!canManageDocuments} className="contents disabled:opacity-70">

    {/* E-Invoice Corporate / Direct Delivery Banner */}
    {Boolean(document.documentType === "E_INVOICE_CORPORATE" || (document as any).icNumber) && (
      <section className="rounded-3xl border-2 border-purple-300 bg-gradient-to-br from-purple-50/90 to-indigo-50/90 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
              E-Invoice Corporate / Direct Delivery
            </span>
            <h3 className="font-black text-slate-950 text-base">E-Invoice Customer Identification</h3>
          </div>
          <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-black">
            {(document as any).deliveryMode || "Direct Delivery"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-white p-3 border border-purple-100">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Full Name (as per IC)</p>
            <p className="font-black text-slate-900 text-sm mt-0.5">{(document as any).fullName || document.customerName || "-"}</p>
          </div>
          <div className="rounded-xl bg-white p-3 border border-purple-100">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">NRIC / IC Number</p>
            <p className="font-black text-purple-900 font-mono text-sm mt-0.5">{(document as any).icNumber || "-"}</p>
          </div>
          <div className="rounded-xl bg-white p-3 border border-purple-100">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Active Contact</p>
            <p className="font-bold text-slate-800 mt-0.5">{document.deliveryPhone || "-"} · {document.deliveryContact || "-"}</p>
          </div>
        </div>
      </section>
    )}

    <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2 lg:p-7">
      <div className="relative lg:col-span-2"><label className="text-xs font-black uppercase tracking-wider text-slate-500">Customer Master</label><div className="relative"><Search className="absolute left-3 top-4 h-4 w-4 text-slate-400" /><input value={query} onChange={event => { setQuery(event.target.value); setCustomer(null); setResults([]) }} className={`${inputClass} pl-9`} placeholder="Search Customer ID, Sage ID, or name..." /></div>{(searching || results.length > 0) && !customer && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{searching ? <p className="p-3 text-sm text-slate-500">Searching...</p> : results.map(option => <button key={option.id} type="button" onClick={() => { setCustomer(option); setQuery(`${option.customerCode} - ${option.legalName}`); setResults([]) }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-cyan-50"><p className="text-sm font-black text-slate-900">{option.customerCode} · {option.legalName}</p><p className="text-xs text-slate-500">{option.sageCustomerId || "No Sage ID"} · {option.creditTermsRaw || "No terms"} · {option.zone || "No zone"}</p></button>)}</div>}</div>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Document Type<select value={document.documentType} onChange={event => setField("documentType", event.target.value)} className={inputClass}><option>PURCHASE_ORDER</option><option>E_INVOICE_CORPORATE</option><option>PROFORMA_INVOICE</option><option>INVOICE</option><option>OTHER</option></select></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Document Number<input value={document.documentNumber} onChange={event => setField("documentNumber", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">PO Number<input value={document.poNumber} onChange={event => setField("poNumber", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Document Date<input type="date" value={document.documentDate} onChange={event => setField("documentDate", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Payment Terms<input value={document.paymentTermsRaw} onChange={event => setField("paymentTermsRaw", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Requested Delivery Date<input type="date" value={document.requestedDeliveryDate} onChange={event => setField("requestedDeliveryDate", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500 lg:col-span-2">Delivery Address<textarea rows={3} value={document.deliveryAddress} onChange={event => setField("deliveryAddress", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Delivery Contact<input value={document.deliveryContact} onChange={event => setField("deliveryContact", event.target.value)} className={inputClass} /></label>
      <label className="text-xs font-black uppercase tracking-wider text-slate-500">Delivery Phone<input value={document.deliveryPhone} onChange={event => setField("deliveryPhone", event.target.value)} className={inputClass} /></label>
    </section>

    {/* Multi-PO Batch Breakdown Card */}
    {Boolean(document.subPos && document.subPos.length > 1) && (
      <section className="rounded-3xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50/90 to-sky-50/90 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-black text-white">
                Multi-PO Batch ({document.subPos?.length} POs)
              </span>
              <h3 className="font-black text-slate-950 text-base">Purchase Order Breakdown in PDF File</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              AI detected {document.subPos?.length} separate Purchase Orders in this file. All items are merged into the table below for review.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-cyan-800 tracking-wider">Total Batch Amount</span>
            <p className="text-xl font-black text-cyan-950">
              {new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(document.totals.grandTotal)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {document.subPos?.map((sub, idx) => (
            <div key={`${sub.poNumber}-${idx}`} className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm text-slate-900">{sub.poNumber || `PO #${idx + 1}`}</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                    {sub.storeCode ? `Store: ${sub.storeCode}` : `Item: ${sub.lines.length}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Delivery: {sub.requestedDeliveryDate || sub.documentDate || "N/A"}
                </p>
                {sub.deliveryAddress && (
                  <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                    {sub.deliveryAddress}
                  </p>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">{sub.lines.reduce((s, l) => s + l.quantity, 0)} {sub.lines[0]?.uom || "CTN"}</span>
                <span className="text-sm font-black text-slate-950">
                  {new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(sub.grandTotal)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    )}

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-black text-slate-950">Order Items</h3>
          <p className="text-xs text-slate-500">Verify SKU, quantity, and price from document. Totals will be calculated automatically.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const newLine = emptyLine()
            newLine.quantity = 1
            setDocument(previous => ({ ...previous, lines: [...previous.lines, newLine] }))
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-700 hover:bg-cyan-100 transition"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3">SKU / Item</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">UOM</th>
              <th className="px-3 py-3">Unit Price (RM)</th>
              <th className="px-3 py-3">Discount (RM)</th>
              <th className="px-3 py-3">Tax (RM)</th>
              <th className="px-3 py-3">Amount (RM)</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {document.lines.map((line, index) => (
              <tr key={`${line.sku || "line"}-${index}`}>
                <td className="p-2">
                  <input
                    value={line.sku}
                    onChange={event => updateLine(index, "sku", event.target.value)}
                    className={inputClass}
                    placeholder="SKU Code"
                  />
                  <input
                    value={line.barcode}
                    onChange={event => updateLine(index, "barcode", event.target.value)}
                    className={`${inputClass} text-xs`}
                    placeholder="Barcode"
                  />
                </td>
                <td className="p-2">
                  <textarea
                    rows={2}
                    value={line.description}
                    onChange={event => updateLine(index, "description", event.target.value)}
                    className={inputClass}
                    placeholder="Product Description"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={line.quantity === 0 ? "" : line.quantity}
                    onFocus={e => e.target.select()}
                    onChange={event => updateLine(index, "quantity", event.target.value === "" ? 0 : Number(event.target.value))}
                    className={`${inputClass} min-w-20 text-center font-bold`}
                  />
                </td>
                <td className="p-2">
                  <input
                    value={line.uom}
                    onChange={event => updateLine(index, "uom", event.target.value)}
                    className={`${inputClass} min-w-16 text-center`}
                    placeholder="CTN"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.unitPrice === 0 ? "" : line.unitPrice}
                    onFocus={e => e.target.select()}
                    onChange={event => updateLine(index, "unitPrice", event.target.value === "" ? 0 : Number(event.target.value))}
                    className={`${inputClass} min-w-24 text-right`}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.discount === 0 ? "" : line.discount}
                    onFocus={e => e.target.select()}
                    onChange={event => updateLine(index, "discount", event.target.value === "" ? 0 : Number(event.target.value))}
                    className={`${inputClass} min-w-20 text-right`}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.tax === 0 ? "" : line.tax}
                    onFocus={e => e.target.select()}
                    onChange={event => updateLine(index, "tax", event.target.value === "" ? 0 : Number(event.target.value))}
                    className={`${inputClass} min-w-20 text-right`}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={line.amount === 0 ? "" : line.amount}
                    onFocus={e => e.target.select()}
                    onChange={event => updateLine(index, "amount", event.target.value === "" ? 0 : Number(event.target.value))}
                    className={`${inputClass} min-w-28 text-right font-black text-slate-900 bg-slate-50 border-slate-300`}
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    title="Delete this line item"
                    className="rounded-xl p-2.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      {(["subtotal", "discount", "freight", "tax", "grandTotal"] as const).map(key => (
        <label key={key} className="text-xs font-black uppercase tracking-wider text-slate-500">
          {key}
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={document.totals[key] === 0 ? "" : document.totals[key]}
            onFocus={e => e.target.select()}
            onChange={event => updateTotal(key, event.target.value === "" ? 0 : Number(event.target.value))}
            className={`${inputClass} ${key === "grandTotal" ? "bg-cyan-50 font-black text-cyan-900 border-cyan-300 text-base" : ""}`}
          />
        </label>
      ))}
      <label className="text-xs font-black uppercase tracking-wider text-slate-500 sm:col-span-2 lg:col-span-5">
        Remarks
        <textarea rows={2} value={document.remarks} onChange={event => setField("remarks", event.target.value)} className={inputClass} />
      </label>
    </section>

    </fieldset>
    <section className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" /> SOD Review & information verification.
      </div>
      {canManageDocuments && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={deleteDocument}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button
            type="button"
            onClick={reprocessAi}
            disabled={busy}
            title="Reprocess this PDF document using AI"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-600" />}
            Reprocess with AI
          </button>
          <button
            type="button"
            onClick={saveReview}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
          </button>
          <button
            type="button"
            onClick={forwardToCreditCheck}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-500 disabled:bg-slate-300 shadow-md"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Approve & Send to PO-SOA Check
          </button>
          {canCreateSalesOrder && (
            <button
              type="button"
              onClick={createSalesOrder}
              disabled={busy || !customer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:bg-slate-300"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Create SO
            </button>
          )}
        </div>
      )}
    </section>
    {error && <p className="rounded-xl bg-rose-50 p-4 text-sm font-black text-rose-700">{error}</p>}
  </div>
}

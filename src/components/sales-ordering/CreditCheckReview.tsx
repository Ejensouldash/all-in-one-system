"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock3, XCircle } from "lucide-react"

type Check = { code: string; label: string; severity: "PASS" | "REJECT" | "HOLD"; evidence: string; requiredAction: string }
type Result = {
  recommendation: "APPROVE" | "HOLD" | "REJECT"
  primaryReason?: string
  reasons: string[]
  checks?: Check[]
  ruleVersion?: string
  identityMatch: boolean
  amountMatchInvoice: string | null
  outstandingAtPoDate: number
  aging: Array<{ invoiceNumber: string; invoiceDate: string; amount: number; dueDate: string; statusAtPoDate: string }>
}

export function CreditCheckReview({ id, result, poDate, poNumber, poTotal, canDecide, finalDecision }: { id: string; result: Result; poDate: string; poNumber: string; poTotal: number; canDecide: boolean; finalDecision: string | null }) {
  const router = useRouter()
  const [justification, setJustification] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const status = result.recommendation === "APPROVE"
    ? { icon: CheckCircle2, text: "APPROVE", subtitle: "Ready for Sales Order", style: "border-emerald-200 bg-emerald-50 text-emerald-800" }
    : result.recommendation === "REJECT"
      ? { icon: XCircle, text: "REJECT", subtitle: "PO-SOA check failed", style: "border-rose-200 bg-rose-50 text-rose-800" }
      : { icon: Clock3, text: "HOLD", subtitle: "Finance justification required", style: "border-amber-200 bg-amber-50 text-amber-800" }
  const StatusIcon = status.icon
  const checks = result.checks || []
  const primaryReason = result.primaryReason || result.reasons?.[0] || "Semakan selesai."

  async function decide(decision: "APPROVE_EXCEPTION" | "REJECT") {
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/credit-check/${id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, justification }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan keputusan.")
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-6">
    <section className={`rounded-3xl border p-6 ${status.style}`}>
      <div className="flex items-start gap-4">
        <StatusIcon className="mt-1 h-8 w-8 shrink-0" />
        <div>
          <p className="text-xs font-black tracking-[0.18em]">SYSTEM DECISION</p>
          <h3 className="mt-1 text-3xl font-black">{status.text}</h3>
          <p className="mt-1 text-sm font-black">{status.subtitle}</p>
          <p className="mt-3 text-sm font-semibold">PO {poNumber || "-"} · RM {poTotal.toFixed(2)} · dikira pada tarikh PO {poDate || "-"}</p>
        </div>
      </div>
      <p className="mt-5 rounded-2xl bg-white/70 p-4 text-sm font-bold">{primaryReason}</p>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="font-black text-slate-950">Decision checks</h3><p className="mt-1 text-sm text-slate-500">Rules version {result.ruleVersion || "Legacy result"}</p></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{checks.length} checks</span>
      </div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="px-4 py-3">Check</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{checks.map(check => <tr key={check.code} className="border-t border-slate-100 align-top"><td className="px-4 py-3 font-black text-slate-950">{check.label}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${check.severity === "PASS" ? "bg-emerald-100 text-emerald-800" : check.severity === "REJECT" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{check.severity}</span></td><td className="px-4 py-3 text-slate-700">{check.evidence}</td><td className="px-4 py-3 text-slate-500">{check.requiredAction}</td></tr>)}</tbody></table></div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-black text-slate-950">Analisis Akaun & Aging</h3><p className="mt-1 text-sm text-slate-500">Status dikira pada tarikh PO, bukan hanya baki pada tarikh SOA.</p></div>
      <div className="grid gap-3 p-5 sm:grid-cols-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">IDENTITY</p><p className="mt-1 font-black text-slate-950">{result.identityMatch ? "Match" : "Needs review"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">AMOUNT INVOICE</p><p className="mt-1 font-black text-slate-950">{result.amountMatchInvoice || "Tiada"}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black text-slate-500">OUTSTANDING AT PO</p><p className="mt-1 font-black text-slate-950">RM {result.outstandingAtPoDate.toFixed(2)}</p></div></div>
      <div className="overflow-x-auto px-5 pb-5"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-900 text-white"><tr><th className="px-4 py-3">No. Invoice</th><th className="px-4 py-3">Tarikh</th><th className="px-4 py-3">Jumlah</th><th className="px-4 py-3">Matang</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{result.aging.map(row => <tr key={row.invoiceNumber} className="border-t border-slate-100"><td className="px-4 py-3 font-black text-slate-950">{row.invoiceNumber}</td><td className="px-4 py-3">{row.invoiceDate}</td><td className="px-4 py-3 font-semibold">RM {row.amount.toFixed(2)}</td><td className="px-4 py-3">{row.dueDate}</td><td className="px-4 py-3 font-bold">{row.statusAtPoDate}</td></tr>)}</tbody></table></div>
    </section>

    {result.recommendation === "APPROVE" && <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="font-black text-emerald-950">Ready for Sales Order</h3><p className="mt-1 text-sm text-emerald-800">PO-SOA check lulus. Kes ini boleh diteruskan ke proses Create Sales Order/Sage.</p></section>}
    {result.recommendation === "HOLD" && !finalDecision && canDecide && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-black text-amber-950">Finance decision diperlukan</h3><p className="mt-1 text-sm text-amber-800">Sila beri justification tepat sebelum meluluskan exception atau menolak kes ini.</p><textarea value={justification} onChange={event => setJustification(event.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm" placeholder="Contoh: Kelulusan retrospective PO oleh Finance Manager pada ..." /><div className="mt-3 flex flex-col gap-3 sm:flex-row"><button disabled={busy} onClick={() => decide("APPROVE_EXCEPTION")} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Approve with exception</button><button disabled={busy} onClick={() => decide("REJECT")} className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Reject</button></div>{error && <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>}</section>}
    {finalDecision && <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800">Final reviewer decision: {finalDecision}</section>}
  </div>
}

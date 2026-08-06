"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Clock3, XCircle, AlertTriangle, ShieldAlert, FileCheck2, Scale } from "lucide-react"
import type { CheckMode, AgingSummary } from "@/lib/sales-ordering/decision-engine"

type Check = { code: string; label: string; severity: "PASS" | "REJECT" | "HOLD"; evidence: string; requiredAction: string }
type Result = {
  checkMode?: CheckMode
  recommendation: "APPROVE" | "HOLD" | "REJECT"
  primaryReason?: string
  reasons: string[]
  checks?: Check[]
  ruleVersion?: string
  identityMatch: boolean
  amountMatchInvoice: string | null
  outstandingAtPoDate: number
  overdueTotal?: number
  agingSummary?: AgingSummary
  aging: Array<{ invoiceNumber: string; invoiceDate: string; amount: number; dueDate: string; statusAtPoDate: string }>
}

export function CreditCheckReview({ id, result, poDate, poNumber, poTotal, canDecide, finalDecision }: { id: string; result: Result; poDate: string; poNumber: string; poTotal: number; canDecide: boolean; finalDecision: string | null }) {
  const router = useRouter()
  const [justification, setJustification] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const checkMode = result.checkMode || "PO_CREDIT_CHECK"
  const isPoMode = checkMode === "PO_CREDIT_CHECK"

  const status = result.recommendation === "APPROVE"
    ? { icon: CheckCircle2, text: "APPROVE", subtitle: isPoMode ? "LULUS - Akaun Bebas Overdue & Ready for Sales Order" : "LULUS - Dokumen Invois Padan Tepat dengan SOA", style: "border-emerald-300 bg-emerald-50 text-emerald-900" }
    : result.recommendation === "REJECT"
      ? { icon: XCircle, text: "REJECTED TERUS", subtitle: isPoMode ? "REJECTED - Invois Overdue > 30 Hari (Sales Order Disekat Mutlak)" : "REJECTED - Invois Tidak Padan dalam Lejar SOA", style: "border-rose-300 bg-rose-50 text-rose-900" }
      : { icon: Clock3, text: "NEEDS REVIEW (HOLD)", subtitle: "Perlu Semakan Manual Finance (Justifikasi Alasan Wajib)", style: "border-amber-300 bg-amber-50 text-amber-900" }
  
  const StatusIcon = status.icon
  const checks = result.checks || []
  const primaryReason = result.primaryReason || result.reasons?.[0] || "Semakan selesai."

  async function decide(decision: "APPROVE_EXCEPTION" | "REJECT") {
    if (!justification.trim()) {
      setError("⚠️ Alasan / Justifikasi WAJIB diisi sebelum menyimpan keputusan kewangan.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/sales-ordering/credit-check/${id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, justification: justification.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan keputusan.")
    } finally {
      setBusy(false)
    }
  }

  const summary = result.agingSummary || {
    current: 0,
    month1: 0,
    month2: 0,
    month3Plus: 0,
    totalOutstanding: result.outstandingAtPoDate || 0,
    totalOverdue: result.overdueTotal || 0,
  }

  return <div className="space-y-6">
    {/* Mode Header Banner */}
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-slate-900 px-5 py-3.5 text-white shadow-sm">
      <div className="flex items-center gap-2">
        {isPoMode ? <FileCheck2 className="h-4 w-4 text-cyan-400" /> : <Scale className="h-4 w-4 text-purple-400" />}
        <span className="text-xs font-black uppercase tracking-widest text-slate-300">
          Mod Semakan Active: <span className={isPoMode ? "text-cyan-300" : "text-purple-300"}>{isPoMode ? "PO Credit Check (Sales Order Approval)" : "Invoice vs SOA Reconciliation"}</span>
        </span>
      </div>
      <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-black text-slate-300">Rule Engine {result.ruleVersion || "V3"}</span>
    </div>

    {/* Primary Decision Banner */}
    <section className={`rounded-3xl border-2 p-6 shadow-sm ${status.style}`}>
      <div className="flex items-start gap-4">
        <StatusIcon className="mt-1 h-9 w-9 shrink-0" />
        <div>
          <p className="text-xs font-black tracking-[0.2em] opacity-80">SYSTEM CREDIT DECISION</p>
          <h3 className="mt-1 text-3xl font-black">{status.text}</h3>
          <p className="mt-1 text-sm font-bold opacity-90">{status.subtitle}</p>
          <p className="mt-3 text-xs font-semibold opacity-80">Rujukan PO/Invois: <span className="font-bold">{poNumber || "-"}</span> · Nilai: <span className="font-bold">RM {poTotal.toFixed(2)}</span> · Tarikh PO: <span className="font-bold">{poDate || "-"}</span></p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-white/80 p-4 text-sm font-bold shadow-xs">
        <p className="text-xs font-black uppercase text-slate-500">Sebab / Alasan Utama System:</p>
        <p className="mt-1 text-slate-900">{primaryReason}</p>
      </div>
    </section>

    {/* Detailed Rules Check Table */}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">Semakan Syarat Kewangan (Decision Checks)</h3>
          <p className="mt-1 text-sm text-slate-500">Hasil verifikasi 5 kawalan utama mengikut amalan kewangan ACCA.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{checks.length} Semakan</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-4 py-3">Semakan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Bukti / Rujukan Data</th>
              <th className="px-4 py-3">Tindakan Diperlukan</th>
            </tr>
          </thead>
          <tbody>
            {checks.map(check => <tr key={check.code} className="border-t border-slate-100 align-top">
              <td className="px-4 py-3 font-black text-slate-950">{check.label}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${check.severity === "PASS" ? "bg-emerald-100 text-emerald-800" : check.severity === "REJECT" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                  {check.severity}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700">{check.evidence}</td>
              <td className="px-4 py-3 text-slate-500">{check.requiredAction}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {/* Aging Breakdown & Account Analysis */}
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="font-black text-slate-950">Analisis Umur Hutang (Aging Analysis) pada Tarikh PO</h3>
        <p className="mt-1 text-sm text-slate-500">Pecahan status invois mengikut tempoh matang kredit (Credit Term 30 Hari).</p>
      </div>

      {/* Aging Metric Cards */}
      <div className="grid gap-3 p-5 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-black text-slate-500">BELUM MATANG (CURRENT)</p>
          <p className="mt-1 text-lg font-black text-slate-900">RM {summary.current.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="text-xs font-black text-amber-700">1 - 30 HARI OVERDUE</p>
          <p className="mt-1 text-lg font-black text-amber-900">RM {summary.month1.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
          <p className="text-xs font-black text-orange-700">31 - 60 HARI OVERDUE</p>
          <p className="mt-1 text-lg font-black text-orange-900">RM {summary.month2.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-black text-rose-700">&gt; 60 HARI OVERDUE</p>
          <p className="mt-1 text-lg font-black text-rose-900">RM {summary.month3Plus.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs font-black text-slate-400">JUMLAH TERTUNGGAK (TOTAL OUTSTANDING)</p>
          <p className="mt-1 text-2xl font-black text-white">RM {summary.totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl bg-rose-950 p-4 text-white">
          <p className="text-xs font-black text-rose-300">JUMLAH OVERDUE (TERLEWAT BAYAR)</p>
          <p className="mt-1 text-2xl font-black text-rose-200">RM {summary.totalOverdue.toFixed(2)}</p>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-4 py-3">No. Invoice</th>
              <th className="px-4 py-3">Tarikh Invois</th>
              <th className="px-4 py-3">Jumlah (RM)</th>
              <th className="px-4 py-3">Tarikh Matang</th>
              <th className="px-4 py-3">Status pada Tarikh PO</th>
            </tr>
          </thead>
          <tbody>
            {result.aging.map(row => <tr key={row.invoiceNumber} className="border-t border-slate-100">
              <td className="px-4 py-3 font-black text-slate-950">{row.invoiceNumber}</td>
              <td className="px-4 py-3">{row.invoiceDate}</td>
              <td className="px-4 py-3 font-bold text-slate-900">RM {row.amount.toFixed(2)}</td>
              <td className="px-4 py-3">{row.dueDate}</td>
              <td className="px-4 py-3 font-bold">
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${row.statusAtPoDate === "Overdue" ? "bg-rose-100 text-rose-800" : row.statusAtPoDate === "Belum matang" ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-700"}`}>
                  {row.statusAtPoDate}
                </span>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {/* APPROVE Banner & Next Action */}
    {result.recommendation === "APPROVE" && <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-emerald-950">
        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        <h3 className="text-lg font-black">Ready for Sales Order</h3>
      </div>
      <p className="mt-2 text-sm font-semibold text-emerald-800">
        PO-SOA check lulus 100%. Tiada sebarang invois overdue dan identiti pelanggan disahkan. Kes ini sedia untuk diteruskan ke pembukaan Sales Order.
      </p>
    </section>}

    {/* REJECT Hard-Block Banner */}
    {result.recommendation === "REJECT" && <section className="rounded-3xl border border-rose-300 bg-rose-50 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-rose-950">
        <ShieldAlert className="h-6 w-6 text-rose-600" />
        <h3 className="text-lg font-black">Akses Pembukaan Sales Order Disekat (Hard Block)</h3>
      </div>
      <p className="mt-2 text-sm font-semibold text-rose-800">
        Keputusan kawalan kewangan adalah <span className="font-black text-rose-950">REJECTED TERUS</span>. Berdasarkan amalan kewangan dan polisi kredit, pelanggan mempunyai tunggakan overdue / isu padanan yang kritikal. Pembukaan Sales Order disekat secara mutlak sehingga bayaran diterima dan SOA baharu dikemas kini.
      </p>
    </section>}

    {/* HOLD Decision Form (Mandatory Justification) */}
    {result.recommendation === "HOLD" && !finalDecision && canDecide && <section className="rounded-3xl border-2 border-amber-300 bg-amber-50/70 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-amber-950">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
        <h3 className="text-lg font-black">Keputusan Reviewer Kewangan Diperlukan (HOLD)</h3>
      </div>
      <p className="mt-2 text-sm font-semibold text-amber-900">
        Sistem menandakan kes ini sebagai HOLD. Sila beri keputusan manual berserta <span className="font-black underline text-amber-950">Alasan / Justifikasi Wajib</span> sebelum permohonan disahkan.
      </p>

      <div className="mt-4">
        <label className="block text-xs font-black uppercase text-amber-950">
          Alasan / Justifikasi Audit Kewangan <span className="text-rose-600">* (WAJIB)</span>
        </label>
        <textarea
          value={justification}
          onChange={event => { setJustification(event.target.value); setError(""); }}
          className="mt-2 min-h-24 w-full rounded-2xl border border-amber-300 bg-white p-3.5 text-sm font-semibold shadow-xs focus:border-amber-600 focus:outline-none"
          placeholder="Contoh: Kelulusan khas pelepasan kredit oleh Pengurus Kewangan atas jaminan bayaran resit..."
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          disabled={busy || !justification.trim()}
          onClick={() => decide("APPROVE_EXCEPTION")}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve with Exception
        </button>
        <button
          disabled={busy || !justification.trim()}
          onClick={() => decide("REJECT")}
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject Kes
        </button>
      </div>

      {!justification.trim() && <p className="mt-3 text-xs font-bold text-amber-900">
        * Sila taipkan alasan/justifikasi audit di atas untuk mengaktifkan butang keputusan.
      </p>}

      {error && <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>}
    </section>}

    {/* Final Reviewer Decision Badge */}
    {finalDecision && <section className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm font-bold text-slate-800">
      Status Keputusan Reviewer Kewangan: <span className="font-black text-slate-950">{finalDecision}</span>
    </section>}
  </div>
}


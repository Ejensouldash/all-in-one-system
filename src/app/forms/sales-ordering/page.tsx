import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertOctagon, ArrowRight, CheckCircle2, FileClock, ShieldAlert, Sparkles, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { OrderProgressChart, type ProgressMetrics } from "@/components/sales-ordering/OrderProgressChart"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export default async function SalesOrderingDashboard() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "dashboard")) redirect(firstSalesOrderingPath(access))
  const canUseIntake = canAccessSalesOrderingTab(access, "intake")

  const [customers, reviewCount, totalIntakes, approvedIntakes, salesOrders, creditCases] = await Promise.all([
    prisma.customer.count(),
    prisma.salesDocumentIntake.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.salesDocumentIntake.count(),
    prisma.salesDocumentIntake.count({ where: { status: "APPROVED_INTAKE" } }),
    prisma.salesOrder.count(),
    prisma.creditCheckCase.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ])

  const rejectedCases = creditCases.filter(
    c => c.recommendation === "REJECT" || c.finalDecision === "REJECT"
  )

  const approvedCases = creditCases.filter(
    c => c.recommendation === "APPROVE" || c.finalDecision === "APPROVE_EXCEPTION"
  )

  const pendingSoaCases = creditCases.filter(
    c => c.status === "PENDING_SOA" || c.recommendation === null
  )

  const progressMetrics: ProgressMetrics = {
    totalIntakes,
    needsReviewCount: reviewCount,
    approvedIntakeCount: approvedIntakes,
    approvedSoaCount: approvedCases.length,
    pendingSoaCount: pendingSoaCases.length,
    rejectedCount: rejectedCases.length,
    soCreatedCount: salesOrders,
  }

  const cards = [
    { label: "Customer Master", value: customers, icon: Users, tone: "bg-violet-50 text-violet-700" },
    { label: "Needs Review", value: reviewCount, icon: FileClock, tone: "bg-amber-50 text-amber-700" },
    { label: "Approved SOA (Pass)", value: approvedCases.length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Rejected POs (Alert)", value: rejectedCases.length, icon: AlertOctagon, tone: "bg-rose-50 text-rose-700" },
  ]

  return (
    <div className="space-y-8">
      {/* Kemas Hero Banner */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-6 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-950/90 border border-cyan-800/50 px-3 py-1 text-xs font-black uppercase tracking-widest text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" /> Order Intake & Fulfilment Hub
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Customer Document Control & Credit Check
            </h2>
          </div>
          {canUseIntake && (
            <Link
              href="/forms/sales-ordering/intake"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 transition shadow-lg"
            >
              Open PO Upload Queue <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* REJECTION WARNING BANNER (MINIMIZED & COLLAPSIBLE) */}
      {rejectedCases.length > 0 && (
        <details className="group rounded-3xl border-2 border-rose-300 bg-rose-50 shadow-sm animate-in fade-in duration-300 open:pb-6">
          <summary className="flex cursor-pointer select-none items-center gap-4 p-5 md:p-6 outline-none transition-colors hover:bg-rose-100/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-rose-950 sm:text-base">
                Warning: There are {rejectedCases.length} PO records that were REJECTED
              </h3>
              <p className="mt-0.5 text-xs font-bold text-rose-800 hidden sm:block">
                Click to view full list and notify customer.
              </p>
            </div>
            <div className="text-rose-600 text-sm font-bold opacity-70 group-open:hidden shrink-0">View List &darr;</div>
          </summary>
          <div className="px-5 md:px-6 pt-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rejectedCases.map(item => {
                const resultData = (item.result as Record<string, any>) || {}
                const poData = (item.poData as Record<string, any>) || {}
                return (
                  <div key={item.id} className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-rose-900">{poData.poNumber || item.poFileName}</span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">REJECTED</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-800">{poData.customerName || "Customer Unknown"}</p>
                    <p className="mt-2 text-xs font-semibold text-rose-700 line-clamp-2">
                      Reason: {resultData.primaryReason || item.justification || "Outstanding balance exceeds credit terms."}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </details>
      )}

      {/* METRICS CARDS */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
            <div className={`inline-flex rounded-xl p-3 ${card.tone}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-3xl font-black text-slate-950">{card.value.toLocaleString()}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-500">{card.label}</p>
          </div>
        ))}
      </section>

      {/* WORKFLOW PROGRESS & PERFORMANCE CHART */}
      <OrderProgressChart metrics={progressMetrics} />
    </div>
  )
}

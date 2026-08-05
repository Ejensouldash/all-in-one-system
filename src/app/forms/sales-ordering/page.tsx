import Link from "next/link"
import { AlertTriangle, ArrowRight, FileCheck2, FileClock, Sparkles, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { IntakeUploader } from "@/components/sales-ordering/IntakeUploader"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { redirect } from "next/navigation"

const statusLabel: Record<string, string> = {
  UPLOADED: "Uploaded",
  AI_PROCESSING: "AI Processing",
  NEEDS_REVIEW: "Needs Review",
  AI_FAILED: "AI Failed",
  SO_CREATED: "SO Created",
}

export default async function SalesOrderingDashboard() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "dashboard")) redirect(firstSalesOrderingPath(access))
  const canUseIntake = canAccessSalesOrderingTab(access, "intake")
  const [customers, reviewCount, failedCount, salesOrders, recent] = await Promise.all([
    prisma.customer.count(),
    prisma.salesDocumentIntake.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.salesDocumentIntake.count({ where: { status: "AI_FAILED" } }),
    prisma.salesOrder.count(),
    prisma.salesDocumentIntake.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { matchedCustomer: true, uploadedBy: { select: { name: true } }, salesOrder: { select: { internalSoNo: true } } },
    }),
  ])

  const cards = [
    { label: "Customer Master", value: customers, icon: Users, tone: "bg-violet-50 text-violet-700" },
    { label: "Needs Review", value: reviewCount, icon: FileClock, tone: "bg-amber-50 text-amber-700" },
    { label: "Sales Orders", value: salesOrders, icon: FileCheck2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "AI Failed", value: failedCount, icon: AlertTriangle, tone: "bg-rose-50 text-rose-700" },
  ]

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-400">AI Assisted Intake</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Upload dokumen customer, semak draft, kemudian create SO.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">AI membantu key-in. SOD kekal sebagai reviewer dan Warehouse kekal mengawal DO, batch dan stock-out.</p>
          </div>
          {canUseIntake && <Link href="/forms/sales-ordering/intake" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">Open Intake Queue <ArrowRight className="h-4 w-4" /></Link>}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`inline-flex rounded-xl p-2.5 ${card.tone}`}><card.icon className="h-5 w-5" /></div><p className="mt-4 text-3xl font-black text-slate-950">{card.value.toLocaleString()}</p><p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-500">{card.label}</p></div>)}
      </section>

      {canUseIntake && <section>
        <div className="mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-600" /><h2 className="text-xl font-black text-slate-950">New AI Intake</h2></div>
        <IntakeUploader />
      </section>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-slate-950">Recent Documents</h2>{canUseIntake && <Link href="/forms/sales-ordering/intake" className="text-sm font-black text-cyan-700">View all</Link>}</div>
        {recent.length ? <div className="divide-y divide-slate-100">{recent.map(item => (
          <Link key={item.id} href={canUseIntake ? `/forms/sales-ordering/intake/${item.id}` : "/forms/sales-ordering"} className="flex flex-col gap-2 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-2">
            <div><p className="font-black text-slate-900">{item.fileName}</p><p className="mt-1 text-xs text-slate-500">{item.matchedCustomer?.legalName || "Customer belum matched"} · Uploaded by {item.uploadedBy.name}</p></div>
            <div className="flex items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{statusLabel[item.status] || item.status}</span><span className="text-xs font-bold text-slate-400">{item.createdAt.toLocaleString("en-MY")}</span></div>
          </Link>
        ))}</div> : <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">Belum ada dokumen. Upload PDF pertama di atas.</p>}
      </section>
    </div>
  )
}

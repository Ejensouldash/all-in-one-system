import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, FileCheck2, FileClock, ShieldAlert, Sparkles, Users } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PoCustomerSection, type CustomerPoItem } from "@/components/sales-ordering/PoCustomerSection"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

const statusLabel: Record<string, string> = {
  UPLOADED: "Uploaded",
  AI_PROCESSING: "AI Processing",
  NEEDS_REVIEW: "Needs Review",
  APPROVED_INTAKE: "Intake Lulus",
  AI_FAILED: "AI Failed",
  SO_CREATED: "SO Created",
}

export default async function SalesOrderingDashboard() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "dashboard")) redirect(firstSalesOrderingPath(access))
  const canUseIntake = canAccessSalesOrderingTab(access, "intake")

  const [customers, reviewCount, failedCount, salesOrders, recentIntakes, creditCases] = await Promise.all([
    prisma.customer.count(),
    prisma.salesDocumentIntake.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.salesDocumentIntake.count({ where: { status: "AI_FAILED" } }),
    prisma.salesOrder.count(),
    prisma.salesDocumentIntake.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        matchedCustomer: true,
        uploadedBy: { select: { name: true } },
        salesOrder: { select: { internalSoNo: true } },
      },
    }),
    prisma.creditCheckCase.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  // Process Credit Cases and Intakes for PO Customer section & Rejection banner
  const rejectedCases = creditCases.filter(
    c => c.recommendation === "REJECT" || c.finalDecision === "REJECT",
  )

  const approvedCases = creditCases.filter(
    c => c.recommendation === "APPROVE" || c.finalDecision === "APPROVE_EXCEPTION",
  )

  // Map data to CustomerPoItem format for PoCustomerSection
  const poCustomerItems: CustomerPoItem[] = [
    ...creditCases.map(c => {
      const poData = (c.poData as Record<string, any>) || {}
      const totals = poData.totals || {}
      const resultData = (c.result as Record<string, any>) || {}
      const isApproved = c.recommendation === "APPROVE" || c.finalDecision === "APPROVE_EXCEPTION"
      const isRejected = c.recommendation === "REJECT" || c.finalDecision === "REJECT"

      return {
        id: c.id,
        poNumber: poData.poNumber || poData.documentNumber || c.poFileName.replace(".pdf", ""),
        customerName: poData.customerName || "Customer SOA Check",
        documentDate: poData.documentDate || c.createdAt.toISOString().slice(0, 10),
        amount: Number(totals.grandTotal || 0),
        status: (isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING_SOA") as CustomerPoItem["status"],
        poR2ObjectKey: c.poR2ObjectKey,
        soaR2ObjectKey: c.soaR2ObjectKey,
        rejectionReason: resultData.primaryReason || c.justification || null,
        createdAt: c.createdAt.toLocaleString("en-MY"),
        uploadedBy: "SOD / BD Staff",
      }
    }),
    // Include Intakes that don't have creditCheckCase yet (Pending SOA)
    ...recentIntakes
      .filter(i => !creditCases.some(c => c.poR2ObjectKey === i.r2ObjectKey))
      .map(i => {
        const poData = (i.extractedData as Record<string, any>) || {}
        const totals = poData.totals || {}
        return {
          id: i.id,
          poNumber: poData.poNumber || poData.documentNumber || i.fileName.replace(".pdf", ""),
          customerName: i.matchedCustomer?.legalName || poData.customerName || "Pending Matching",
          documentDate: poData.documentDate || i.createdAt.toISOString().slice(0, 10),
          amount: Number(totals.grandTotal || 0),
          status: "PENDING_SOA" as const,
          poR2ObjectKey: i.r2ObjectKey,
          createdAt: i.createdAt.toLocaleString("en-MY"),
          uploadedBy: i.uploadedBy.name,
        }
      }),
  ]

  const cards = [
    { label: "Customer Master", value: customers, icon: Users, tone: "bg-violet-50 text-violet-700" },
    { label: "Needs Review", value: reviewCount, icon: FileClock, tone: "bg-amber-50 text-amber-700" },
    { label: "Approved SOA (Pass)", value: approvedCases.length, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Rejected POs (Alert)", value: rejectedCases.length, icon: AlertOctagon, tone: "bg-rose-50 text-rose-700" },
  ]

  return (
    <div className="space-y-8">
      {/* Banner Utama */}
      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-400">Order Intake & Fulfilment Hub</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              Kawalan Dokumen Customer & Pemeriksaan Kredit SOA.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Aliran bersepadu BD -&gt; SOD Review -&gt; PO-SOA Check. Dokumen asal disimpan selamat di Cloudflare R2 dengan pratinjau segera.
            </p>
          </div>
          {canUseIntake && (
            <Link
              href="/forms/sales-ordering/intake"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300 transition shadow-lg"
            >
              Buka Intake Queue <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* REJECTION WARNING BANNER UNTUK BD TEAM */}
      {rejectedCases.length > 0 && (
        <details className="group rounded-3xl border-2 border-rose-300 bg-rose-50 shadow-sm animate-in fade-in duration-300 open:pb-6">
          <summary className="flex cursor-pointer select-none items-center gap-4 p-5 md:p-6 outline-none transition-colors hover:bg-rose-100/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-rose-950 sm:text-base">
                Amaran: Terdapat {rejectedCases.length} rekod PO yang telah di-REJECT
              </h3>
              <p className="mt-0.5 text-xs font-bold text-rose-800 hidden sm:block">
                Sila klik untuk lihat senarai penuh dan maklumkan kepada pelanggan.
              </p>
            </div>
            <div className="text-rose-600 text-sm font-bold opacity-70 group-open:hidden shrink-0">Lihat Senarai &darr;</div>
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
                      Sebab: {resultData.primaryReason || item.justification || "Tunggakan hutang melepasi terma."}
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

      {/* SECTION: PO CUSTOMER (APPROVED SOA & PENDING SOA TABS) */}
      <PoCustomerSection items={poCustomerItems} />

      {/* SECTION: RECENT INTAKE DOCUMENTS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">Senarai Dokumen Intake Terkini</h2>
          {canUseIntake && (
            <Link href="/forms/sales-ordering/intake" className="text-xs font-black text-cyan-700 hover:underline">
              Lihat Semua Queue Intake &rarr;
            </Link>
          )}
        </div>
        {recentIntakes.length ? (
          <div className="divide-y divide-slate-100">
            {recentIntakes.map(item => (
              <Link
                key={item.id}
                href={canUseIntake ? `/forms/sales-ordering/intake/${item.id}` : "/forms/sales-ordering"}
                className="flex flex-col gap-2 py-3.5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between px-2 rounded-xl"
              >
                <div>
                  <p className="font-black text-slate-900 text-sm">{item.fileName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.matchedCustomer?.legalName || "Customer belum matched"} · Uploaded by {item.uploadedBy.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {statusLabel[item.status] || item.status}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {item.createdAt.toLocaleString("en-MY")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
            Belum ada dokumen. Upload PDF pertama di atas.
          </p>
        )}
      </section>
    </div>
  )
}

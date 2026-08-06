import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { DatabaseManagerClient } from "@/components/sales-ordering/DatabaseManagerClient"

export default async function SalesOrderingDatabasePage() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!access.isSuperAdmin) redirect("/forms/sales-ordering")

  const [pendingSoaCount, totalCreditCases, totalIntakes, totalOrders] = await Promise.all([
    prisma.creditCheckCase.count({
      where: {
        OR: [
          { status: "PENDING_SOA" },
          { recommendation: null },
          { soaFileName: "SOA Pending Upload" },
        ],
      },
    }),
    prisma.creditCheckCase.count(),
    prisma.salesDocumentIntake.count(),
    prisma.salesOrder.count(),
  ])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              ⚡ SuperAdmin Tool
            </div>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Database Manager & Purge Tool</h2>
            <p className="mt-1 text-sm text-slate-600">
              Alatan khas untuk SuperAdmin menguruskan rekod ujian, memadam data Pending SOA, dan melakukan Reset ke Zero State untuk ujian dari kosong.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-xs font-black uppercase text-amber-700">Pending SOA Cases</p>
            <p className="mt-2 text-3xl font-black text-amber-950">{pendingSoaCount}</p>
            <p className="mt-1 text-xs text-amber-800 font-semibold">Dokumen sedia untuk diuji semula</p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5">
            <p className="text-xs font-black uppercase text-cyan-700">Total PO-SOA Cases</p>
            <p className="mt-2 text-3xl font-black text-cyan-950">{totalCreditCases}</p>
            <p className="mt-1 text-xs text-cyan-800 font-semibold">Jumlah audit semakan kredit</p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
            <p className="text-xs font-black uppercase text-violet-700">Intake Documents</p>
            <p className="mt-2 text-3xl font-black text-violet-950">{totalIntakes}</p>
            <p className="mt-1 text-xs text-violet-800 font-semibold">Fail PDF yang di-upload oleh BD</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <p className="text-xs font-black uppercase text-emerald-700">Total Sales Orders</p>
            <p className="mt-2 text-3xl font-black text-emerald-950">{totalOrders}</p>
            <p className="mt-1 text-xs text-emerald-800 font-semibold">Pesanan yang telah dijana</p>
          </div>
        </div>
      </section>

      {/* Interactive Client Purge Operations */}
      <DatabaseManagerClient
        pendingSoaCount={pendingSoaCount}
        totalCreditCases={totalCreditCases}
        totalIntakes={totalIntakes}
      />
    </div>
  )
}

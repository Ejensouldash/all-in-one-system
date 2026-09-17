import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CreditCheckUploader } from "@/components/sales-ordering/CreditCheckUploader"
import { CreditCheckCasesList } from "@/components/sales-ordering/CreditCheckCasesList"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export default async function CreditCheckPage({ searchParams }: { searchParams: Promise<{ highlight?: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "creditCheck")) redirect(firstSalesOrderingPath(access))

  const highlight = (await searchParams).highlight
  let existingCase = null
  if (highlight) {
    const record = await prisma.creditCheckCase.findUnique({ where: { id: highlight } })
    if (record) {
      existingCase = { id: record.id, poFileName: record.poFileName }
    }
  }

  // Fetch recent CreditCheckCase records
  const recentCases = await prisma.creditCheckCase.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      poFileName: true,
      soaFileName: true,
      status: true,
      recommendation: true,
      finalDecision: true,
      financeRemarks: true,
      createdAt: true,
      poData: true,
    }
  })

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Finance & Credit Control</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">PO-SOA Credit Check & Finance Workflow</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          AI parses both PO and SOA PDFs. The system computes invoice status against the SOA statement date. SOD reviews SOA → ON_HOLD (Finance Review) → PROCEED / REJECT (BD Follow-up).
        </p>
      </section>

      <CreditCheckUploader existingCase={existingCase} />

      <CreditCheckCasesList items={recentCases} />
    </div>
  )
}

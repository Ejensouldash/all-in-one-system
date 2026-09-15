import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { IntakeUploader } from "@/components/sales-ordering/IntakeUploader"
import { SalesOrderingPagination } from "@/components/sales-ordering/Pagination"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

const PAGE_SIZE = 5

export default async function IntakeQueuePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "intake")) redirect(firstSalesOrderingPath(access))
  const { page: rawPage } = await searchParams
  const parsedPage = Number(rawPage)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1
  const visibleIntakeWhere = {
    status: { not: "DUPLICATE" },
    documentType: { not: "E_INVOICE_CORPORATE" },
  }
  const total = await prisma.salesDocumentIntake.count({ where: visibleIntakeWhere })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const activePage = Math.min(page, totalPages)
  const items = await prisma.salesDocumentIntake.findMany({ where: visibleIntakeWhere, orderBy: { createdAt: "desc" }, skip: (activePage - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { matchedCustomer: true, uploadedBy: { select: { name: true } }, salesOrder: { select: { internalSoNo: true } } } })

  return <div className="space-y-7"><section><h2 className="text-2xl font-black text-slate-950">AI Document Intake</h2><p className="mt-1 text-sm text-slate-500">Document queue from BD/SOD for extraction and review.</p></section><IntakeUploader /><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Uploaded</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-black text-slate-900">{item.fileName}</p><p className="text-xs text-slate-400">{item.documentType || "Unprocessed"}</p></td><td className="px-5 py-4 text-slate-600">{item.matchedCustomer?.legalName || "Not matched"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{item.status}</span></td><td className="px-5 py-4 text-xs text-slate-500">{item.uploadedBy.name}<br />{item.createdAt.toLocaleString("en-MY")}</td><td className="px-5 py-4 text-right"><Link href={`/forms/sales-ordering/intake/${item.id}`} className="font-black text-cyan-700">Review</Link></td></tr>)}</tbody></table></div>{!items.length && <p className="p-10 text-center text-sm text-slate-500">No intake records yet.</p>}<SalesOrderingPagination page={activePage} totalPages={totalPages} hrefForPage={nextPage => `/forms/sales-ordering/intake?page=${nextPage}`} /></section></div>
}

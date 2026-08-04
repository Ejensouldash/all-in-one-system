import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { IntakeUploader } from "@/components/sales-ordering/IntakeUploader"

export default async function IntakeQueuePage() {
  const items = await prisma.salesDocumentIntake.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { matchedCustomer: true, uploadedBy: { select: { name: true } }, salesOrder: { select: { internalSoNo: true } } },
  })

  return <div className="space-y-7">
    <section><h2 className="text-2xl font-black text-slate-950">AI Document Intake</h2><p className="mt-1 text-sm text-slate-500">Queue dokumen daripada BD/SOD untuk extraction dan semakan.</p></section>
    <IntakeUploader />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Document</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Uploaded</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-black text-slate-900">{item.fileName}</p><p className="text-xs text-slate-400">{item.documentType || "Unprocessed"}</p></td><td className="px-5 py-4 text-slate-600">{item.matchedCustomer?.legalName || "Not matched"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{item.status}</span></td><td className="px-5 py-4 text-xs text-slate-500">{item.uploadedBy.name}<br />{item.createdAt.toLocaleString("en-MY")}</td><td className="px-5 py-4 text-right"><Link href={`/forms/sales-ordering/intake/${item.id}`} className="font-black text-cyan-700">Review</Link></td></tr>)}</tbody></table></div>
      {!items.length && <p className="p-10 text-center text-sm text-slate-500">Belum ada intake.</p>}
    </section>
  </div>
}


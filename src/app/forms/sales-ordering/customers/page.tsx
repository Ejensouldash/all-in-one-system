import { prisma } from "@/lib/prisma"
import { CustomerMasterImport } from "@/components/sales-ordering/CustomerMasterImport"

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const [total, customers] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({
      where: q ? { OR: [{ customerCode: { contains: q, mode: "insensitive" } }, { legalName: { contains: q, mode: "insensitive" } }, { sageCustomerId: { contains: q, mode: "insensitive" } }] } : undefined,
      include: { addresses: { take: 1, orderBy: { isDefaultBilling: "desc" } } },
      orderBy: { legalName: "asc" },
      take: 100,
    }),
  ])

  return <div className="space-y-6"><div><h2 className="text-2xl font-black text-slate-950">Customer Master</h2><p className="mt-1 text-sm text-slate-500">{total.toLocaleString()} customer records. Search and import are separate from transaction history.</p></div><CustomerMasterImport /><form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search Customer ID, Sage ID or name..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-500" /><button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Search</button></form><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Classification</th><th className="px-5 py-3">Terms</th><th className="px-5 py-3">Address</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.map(customer => <tr key={customer.id} className="align-top hover:bg-slate-50"><td className="px-5 py-4"><p className="font-black text-slate-900">{customer.legalName}</p><p className="mt-1 text-xs text-slate-500">{customer.customerCode} · {customer.sageCustomerId || "No Sage ID"}</p></td><td className="px-5 py-4 text-slate-600">{customer.customerType || "-"}<br /><span className="text-xs text-slate-400">{customer.customerSubtype || ""} {customer.zone ? `· ${customer.zone}` : ""}</span></td><td className="px-5 py-4 font-semibold text-slate-700">{customer.creditTermsRaw || "-"}</td><td className="max-w-sm px-5 py-4 text-xs leading-5 text-slate-500">{customer.addresses[0]?.fullAddress || "No address"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${customer.importStatus === "READY" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{customer.importStatus}</span></td></tr>)}</tbody></table></div>{!customers.length && <p className="p-10 text-center text-sm text-slate-500">No customers found.</p>}</div></div>
}


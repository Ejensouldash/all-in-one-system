import { redirect } from "next/navigation"
import { CreditCheckUploader } from "@/components/sales-ordering/CreditCheckUploader"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export default async function CreditCheckPage() { const access = await getSalesOrderingAccess(); if (!access) redirect("/dashboard"); if (!canAccessSalesOrderingTab(access, "intake")) redirect(firstSalesOrderingPath(access)); return <div className="space-y-6"><section><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">Finance control</p><h2 className="mt-2 text-3xl font-black text-slate-950">PO-SOA Check</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">AI membaca kedua-dua PDF. Sistem pula mengira status invoice pada tarikh PO supaya keputusan kekal konsisten dan boleh diaudit.</p></section><CreditCheckUploader /></div> }

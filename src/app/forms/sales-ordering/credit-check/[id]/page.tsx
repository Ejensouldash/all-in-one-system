import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { CreditCheckReview } from "@/components/sales-ordering/CreditCheckReview"
import { canAccessSalesOrderingTab, canManageSalesOrderingDocuments, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import type { CreditResult } from "@/lib/sales-ordering/credit-check"
import type { ExtractedSalesDocument } from "@/lib/sales-ordering/types"

export default async function CreditCheckDetailPage({ params }: { params: Promise<{ id: string }> }) { const access = await getSalesOrderingAccess(); if (!access) redirect("/dashboard"); if (!canAccessSalesOrderingTab(access, "intake")) redirect(firstSalesOrderingPath(access)); const { id } = await params; const item = await prisma.creditCheckCase.findUnique({ where: { id } }); if (!item) notFound(); if (!item.result || !item.poData) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><Link href="/forms/sales-ordering/credit-check" className="text-sm font-black text-cyan-700">Back to PO-SOA Check</Link><p className="mt-3 font-black text-rose-900">Semakan belum siap.</p><p className="mt-1 text-sm text-rose-700">{item.errorMessage || "Sila proses semula kedua-dua dokumen."}</p></div>; const po = item.poData as unknown as ExtractedSalesDocument; return <div className="space-y-6"><Link href="/forms/sales-ordering/credit-check" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700"><ArrowLeft className="h-3.5 w-3.5" /> PO-SOA Check</Link><CreditCheckReview id={item.id} result={item.result as unknown as CreditResult} poDate={po.documentDate} poNumber={po.poNumber} poTotal={po.totals.grandTotal} canDecide={canManageSalesOrderingDocuments(access)} finalDecision={item.finalDecision} /></div> }

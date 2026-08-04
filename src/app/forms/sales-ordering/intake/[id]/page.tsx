import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileWarning } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { normalizeExtractedDocument, type SalesValidationIssue } from "@/lib/sales-ordering/types"
import { IntakeReview } from "@/components/sales-ordering/IntakeReview"
import { RetryIntakeButton } from "@/components/sales-ordering/RetryIntakeButton"

export default async function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const intake = await prisma.salesDocumentIntake.findUnique({
    where: { id },
    include: {
      matchedCustomer: { select: { id: true, customerCode: true, sageCustomerId: true, legalName: true, tradingName: true, creditTermsRaw: true, zone: true } },
      salesOrder: { select: { id: true, internalSoNo: true } },
    },
  })
  if (!intake) notFound()

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Link href="/forms/sales-ordering/intake" className="inline-flex items-center gap-1 text-xs font-black text-cyan-700"><ArrowLeft className="h-3.5 w-3.5" /> Intake queue</Link><h2 className="mt-2 text-2xl font-black text-slate-950">{intake.fileName}</h2><p className="mt-1 text-sm text-slate-500">Status: {intake.status} · R2 private object</p></div>{intake.salesOrder && <Link href={`/forms/sales-ordering/orders/${intake.salesOrder.id}`} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white">Open {intake.salesOrder.internalSoNo}</Link>}</div>
    {intake.salesOrder ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><p className="font-black text-emerald-900">Draft Sales Order sudah dicipta.</p><p className="mt-1 text-sm text-emerald-700">Dokumen intake ini telah dikunci sebagai source audit.</p></div>
      : intake.extractedData ? <IntakeReview intakeId={id} initialDocument={normalizeExtractedDocument(intake.extractedData)} initialCustomer={intake.matchedCustomer} issues={(Array.isArray(intake.validationIssues) ? intake.validationIssues : []) as SalesValidationIssue[]} />
      : <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6"><FileWarning className="h-8 w-8 text-rose-600" /><h3 className="mt-3 font-black text-rose-900">AI extraction belum berjaya</h3><p className="mt-1 mb-4 text-sm text-rose-700">{intake.errorMessage || "PDF belum diproses."}</p><RetryIntakeButton intakeId={id} /></div>}
  </div>
}


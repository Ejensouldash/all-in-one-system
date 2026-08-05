import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, canManageSalesOrderingDocuments, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { deleteR2Object } from "@/lib/sales-ordering/r2"
import { normalizeExtractedDocument } from "@/lib/sales-ordering/types"
import { validateExtractedSalesDocument } from "@/lib/sales-ordering/validation"

async function requireDocumentManager() {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake") || !canManageSalesOrderingDocuments(access)) return null
  return access
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireDocumentManager()
  if (!access) return NextResponse.json({ error: "Akses Edit / Delete Documents diperlukan." }, { status: 403 })
  const { id } = await context.params
  try {
    const body = await request.json() as { customerId?: string; document?: unknown }
    const document = normalizeExtractedDocument(body.document)
    const customerId = body.customerId?.trim() || null
    const intake = await prisma.salesDocumentIntake.findUnique({ where: { id }, include: { salesOrder: true } })
    if (!intake) return NextResponse.json({ error: "Document intake tidak ditemui." }, { status: 404 })
    if (intake.salesOrder) return NextResponse.json({ error: "Dokumen telah dikunci kerana Sales Order sudah dicipta." }, { status: 409 })
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } })
      if (!customer) return NextResponse.json({ error: "Customer tidak ditemui." }, { status: 400 })
      document.customerReference = customer.customerCode
    }
    const validation = await validateExtractedSalesDocument(document)
    const updated = await prisma.$transaction(async tx => {
      const record = await tx.salesDocumentIntake.update({ where: { id }, data: { status: "NEEDS_REVIEW", extractedData: document, validationIssues: validation.issues, matchedCustomerId: customerId, reviewedById: access.userId, reviewedAt: new Date() } })
      await tx.auditLog.create({ data: { userId: access.userId, userName: access.name || "Sales Ordering User", action: "SALES_DOCUMENT_REVIEW_SAVED", details: JSON.stringify({ intakeId: id, fileName: intake.fileName, customerId }) } })
      return record
    })
    return NextResponse.json({ success: true, intake: updated })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan semakan dokumen." }, { status: 500 })
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireDocumentManager()
  if (!access) return NextResponse.json({ error: "Akses Edit / Delete Documents diperlukan." }, { status: 403 })
  const { id } = await context.params
  const intake = await prisma.salesDocumentIntake.findUnique({ where: { id }, include: { salesOrder: true } })
  if (!intake) return NextResponse.json({ error: "Document intake tidak ditemui." }, { status: 404 })
  if (intake.salesOrder) return NextResponse.json({ error: "Dokumen yang sudah mempunyai Sales Order tidak boleh dipadam." }, { status: 409 })
  try {
    await deleteR2Object(intake.r2ObjectKey)
    await prisma.$transaction([
      prisma.salesDocumentIntake.delete({ where: { id } }),
      prisma.auditLog.create({ data: { userId: access.userId, userName: access.name || "Sales Ordering User", action: "SALES_DOCUMENT_DELETED", details: JSON.stringify({ intakeId: id, fileName: intake.fileName, r2ObjectKey: intake.r2ObjectKey }) } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memadam dokumen." }, { status: 500 })
  }
}

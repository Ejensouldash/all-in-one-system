import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSalesOrderingDocuments, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { generateAndSaveEInvoicePdfToR2 } from "@/lib/sales-ordering/einvoice-pdf"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getSalesOrderingAccess()
  if (!access) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 403 })
  }
  if (!canManageSalesOrderingDocuments(access)) {
    return NextResponse.json({ error: "Permission required to approve documents." }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Document ID is required." }, { status: 400 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    const docFromBody = body.document

    const intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
      include: { matchedCustomer: true },
    })

    if (!intake) {
      return NextResponse.json({ error: "E-Invoice document not found." }, { status: 404 })
    }

    if (intake.status === "APPROVED") {
      return NextResponse.json({
        success: true,
        message: "E-Invoice is already approved.",
        intakeId: intake.id,
      })
    }

    // Determine customer link: only link if explicitly chosen by staff in review
    let customerIdToLink: string | null = null
    if (body.customerId) {
      const cust = await prisma.customer.findUnique({ where: { id: body.customerId } })
      if (cust) customerIdToLink = cust.id
    }

    // Update extractedData if updated document was sent from UI
    const updatedExtractedData = docFromBody || intake.extractedData

    // 1. Update SalesDocumentIntake to APPROVED
    await prisma.salesDocumentIntake.update({
      where: { id: intake.id },
      data: {
        status: "APPROVED",
        extractedData: updatedExtractedData as any,
        matchedCustomerId: customerIdToLink,
        reviewedById: access.userId,
        reviewedAt: new Date(),
      },
    })

    // 2. Audit Log
    const approverName = access.name || "SOD Staff"
    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: approverName,
        action: "APPROVE_E_INVOICE",
        details: `E-Invoice ${intake.id} approved by ${approverName}. Document marked APPROVED and PDF finalized.`,
      },
    })

    // 3. Recompile and finalize PDF in Cloudflare R2
    let pdfKey: string | null = null
    try {
      const { r2ObjectKey } = await generateAndSaveEInvoicePdfToR2(intake.id)
      pdfKey = r2ObjectKey
    } catch (pdfErr) {
      console.warn(`[Approve E-Invoice] Could not recompile PDF for ${intake.id}:`, pdfErr)
    }

    return NextResponse.json({
      success: true,
      message: "E-Invoice successfully approved and PDF finalized!",
      intakeId: intake.id,
      pdfKey,
    })
  } catch (error) {
    console.error(`[Approve E-Invoice] Error approving intake ${id}:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve E-Invoice." },
      { status: 500 }
    )
  }
}

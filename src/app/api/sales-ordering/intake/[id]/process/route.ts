import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, canManageSalesOrderingDocuments, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { extractSalesDocument, SALES_AI_MODEL } from "@/lib/sales-ordering/extract"
import { assertR2Object, readR2Object } from "@/lib/sales-ordering/r2"
import { validateExtractedSalesDocument } from "@/lib/sales-ordering/validation"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "AI Intake access required." }, { status: 403 })
  const { id } = await context.params

  const intake = await prisma.salesDocumentIntake.findUnique({ where: { id }, include: { salesOrder: { select: { id: true } } } })
  if (!intake) return NextResponse.json({ error: "Document intake not found." }, { status: 404 })
  if (intake.salesOrder) return NextResponse.json({ error: "Sales Order has already been created." }, { status: 409 })
  if (intake.status !== "UPLOADED" && !canManageSalesOrderingDocuments(access)) {
    return NextResponse.json({ error: "Edit / Delete Documents permission required to reprocess AI." }, { status: 403 })
  }

  try {
    await prisma.salesDocumentIntake.update({ where: { id }, data: { status: "AI_PROCESSING", errorMessage: null } })
    const head = await assertR2Object(intake.r2ObjectKey)
    if (!head.ContentLength) throw new Error("PDF has not completed uploading to R2")
    if (head.ContentLength > 20 * 1024 * 1024) throw new Error("PDF exceeds 20 MB limit")

    const pdf = await readR2Object(intake.r2ObjectKey)
    const fileHash = createHash("sha256").update(pdf).digest("hex")
    const duplicate = await prisma.salesDocumentIntake.findFirst({
      where: { fileHash, id: { not: id } },
      select: { id: true, fileName: true, createdAt: true },
    })

    const extracted = await extractSalesDocument(pdf)
    const validation = await validateExtractedSalesDocument(extracted)
    if (duplicate) {
      validation.issues.unshift({
        code: "DUPLICATE_FILE",
        severity: "ERROR",
        message: `An identical PDF was previously uploaded as ${duplicate.fileName}.`,
      })
    }

    const updated = await prisma.salesDocumentIntake.update({
      where: { id },
      data: {
        fileHash,
        status: "NEEDS_REVIEW",
        documentType: extracted.documentType,
        extractedData: extracted,
        validationIssues: validation.issues,
        aiModel: SALES_AI_MODEL,
        aiProcessedAt: new Date(),
        matchedCustomerId: validation.customer?.id || null,
      },
      include: { matchedCustomer: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Sales Ordering User",
        action: "SALES_DOCUMENT_AI_EXTRACTED",
        details: JSON.stringify({ intakeId: id, fileName: intake.fileName, issueCount: validation.issues.length, matchedCustomerId: validation.customer?.id || null }),
      },
    })

    return NextResponse.json({ success: true, intake: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI processing failed"
    console.error("Sales intake processing error", error)
    await prisma.salesDocumentIntake.update({ where: { id }, data: { status: "AI_FAILED", errorMessage: message } }).catch(() => undefined)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

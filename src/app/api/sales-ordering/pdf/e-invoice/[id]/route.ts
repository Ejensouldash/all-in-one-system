import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { readR2Object } from "@/lib/sales-ordering/r2"
import { generateAndSaveEInvoicePdfToR2 } from "@/lib/sales-ordering/einvoice-pdf"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getSalesOrderingAccess()
  if (!access) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Intake ID is required." }, { status: 400 })
  }

  try {
    let intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
    })

    if (!intake) {
      const salesOrder = await prisma.salesOrder.findUnique({
        where: { id },
        select: { sourceDocumentId: true },
      })
      if (salesOrder?.sourceDocumentId) {
        intake = await prisma.salesDocumentIntake.findUnique({
          where: { id: salesOrder.sourceDocumentId },
        })
      }
    }

    if (!intake) {
      return NextResponse.json({ error: "Intake document not found." }, { status: 404 })
    }

    const raw = (intake.extractedData as any) || {}
    const docNumber = String(raw.documentNumber || raw.poNumber || intake.id.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_")
    const fileName = `E_Invoice_${docNumber}.pdf`

    let pdfBuffer: Buffer | null = null

    // 1. Try reading existing PDF from R2 if already uploaded
    if (intake.r2ObjectKey && intake.r2ObjectKey.endsWith(".pdf")) {
      try {
        pdfBuffer = await readR2Object(intake.r2ObjectKey)
      } catch (readErr) {
        console.warn(`[PDF Stream] Could not read existing R2 key ${intake.r2ObjectKey}, regenerating:`, readErr)
      }
    }

    // 2. If not found or not yet generated, compile vector PDF and upload to R2
    if (!pdfBuffer) {
      const generated = await generateAndSaveEInvoicePdfToR2(intake.id)
      pdfBuffer = generated.buffer
    }

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error(`[PDF Stream] Error generating/streaming E-Invoice PDF for ${id}:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load E-Invoice PDF." },
      { status: 500 }
    )
  }
}

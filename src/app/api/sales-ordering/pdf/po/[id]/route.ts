import { renderToStream } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  ManualPurchaseOrderDocument,
  type ManualPurchaseOrderData,
  type ManualPoVariant,
} from "@/lib/pdf/ManualPurchaseOrderDocument"
import { getManualPoNumber, isManualPoObjectKey } from "@/lib/sales-ordering/manual-po"

export const runtime = "nodejs"

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "DRAFT"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const variantParam = request.nextUrl.searchParams.get("variant")?.toLowerCase()
    const variant: ManualPoVariant = variantParam === "external" ? "external" : "internal"

    const intakeInclude = {
      uploadedBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      matchedCustomer: {
        select: {
          customerCode: true,
          legalName: true,
          pic: true,
          phonePrimary: true,
          creditTermsRaw: true,
          addresses: {
            select: {
              fullAddress: true,
              attentionTo: true,
              phone: true,
              isDefaultDelivery: true,
              isDefaultBilling: true,
            },
          },
        },
      },
    }

    let intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
      include: intakeInclude,
    })

    if (!intake) {
      const salesOrder = await prisma.salesOrder.findUnique({
        where: { id },
        select: { sourceDocumentId: true },
      })
      if (salesOrder?.sourceDocumentId) {
        intake = await prisma.salesDocumentIntake.findUnique({
          where: { id: salesOrder.sourceDocumentId },
          include: intakeInclude,
        })
      }
    }

    if (!intake || !isManualPoObjectKey(intake.r2ObjectKey)) {
      return new NextResponse("Manual PO intake not found", { status: 404 })
    }

    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    const logoSource = `data:image/png;base64,${logoBuffer.toString("base64")}`
    const pdfStream = await renderToStream(
      ManualPurchaseOrderDocument({
        data: intake as ManualPurchaseOrderData,
        logoSource,
        variant,
      })
    )

    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on("data", chunk => controller.enqueue(chunk))
        pdfStream.on("end", () => controller.close())
        pdfStream.on("error", error => controller.error(error))
      },
    })

    const basePoNumber = safeFilename(getManualPoNumber(intake.extractedData))
    const variantSuffix = variant === "external" ? "External" : "Internal"
    const filename = `Manual_PO_${basePoNumber}_${variantSuffix}.pdf`

    return new NextResponse(readableStream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Manual PO PDF generation error", error)
    return new NextResponse("Failed to generate Manual PO PDF", { status: 500 })
  }
}

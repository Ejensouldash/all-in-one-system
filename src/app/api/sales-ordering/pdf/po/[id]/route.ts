import { renderToStream } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  ManualPurchaseOrderDocument,
  type ManualPurchaseOrderData,
} from "@/lib/pdf/ManualPurchaseOrderDocument"
import { getManualPoNumber, isManualPoObjectKey } from "@/lib/sales-ordering/manual-po"

export const runtime = "nodejs"

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "DRAFT"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { name: true } },
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
      },
    })

    if (!intake || !isManualPoObjectKey(intake.r2ObjectKey)) {
      return new NextResponse("Manual PO intake not found", { status: 404 })
    }

    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    const logoSource = `data:image/png;base64,${logoBuffer.toString("base64")}`
    const pdfStream = await renderToStream(ManualPurchaseOrderDocument({
      data: intake as ManualPurchaseOrderData,
      logoSource,
    }))

    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on("data", chunk => controller.enqueue(chunk))
        pdfStream.on("end", () => controller.close())
        pdfStream.on("error", error => controller.error(error))
      },
    })

    const filename = `Manual_PO_${safeFilename(getManualPoNumber(intake.extractedData))}.pdf`
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

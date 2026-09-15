import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { createPdfUploadUrl, safePdfName } from "@/lib/sales-ordering/r2"

export const runtime = "nodejs"

const MAX_PDF_SIZE = 20 * 1024 * 1024

export async function POST(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "AI Intake access required." }, { status: 403 })

  try {
    const body = await request.json() as { fileName?: string; fileSize?: number; mimeType?: string }
    const fileName = body.fileName?.trim() || ""
    const fileSize = Number(body.fileSize || 0)
    const mimeType = body.mimeType?.toLowerCase() || ""

    if (!fileName.toLowerCase().endsWith(".pdf") || mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 })
    }
    if (!fileSize || fileSize > MAX_PDF_SIZE) {
      return NextResponse.json({ error: "PDF size must be between 1 byte and 20 MB." }, { status: 400 })
    }

    const intakeId = crypto.randomUUID()
    const now = new Date()
    const objectKey = `sales-order-intake/pending/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${intakeId}-${safePdfName(fileName)}`

    await prisma.salesDocumentIntake.create({
      data: {
        id: intakeId,
        fileName,
        fileSize,
        mimeType,
        r2ObjectKey: objectKey,
        uploadedById: access.userId,
      },
    })

    const uploadUrl = await createPdfUploadUrl(objectKey, mimeType)
    return NextResponse.json({ intakeId, uploadUrl, objectKey, expiresIn: 300 })
  } catch (error) {
    console.error("Sales intake upload URL error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to prepare upload." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { putR2Object } from "@/lib/sales-ordering/r2"

export const runtime = "nodejs"

const MAX_PDF_SIZE = 20 * 1024 * 1024

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) {
    return NextResponse.json({ error: "AI Intake access required." }, { status: 403 })
  }

  const { id } = await context.params
  const intake = await prisma.salesDocumentIntake.findUnique({ where: { id } })
  if (!intake) {
    return NextResponse.json({ error: "Document intake record not found." }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 })
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: "PDF exceeds 20 MB limit." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await putR2Object(intake.r2ObjectKey, buffer, intake.mimeType || "application/pdf")

    return NextResponse.json({ success: true, intakeId: id })
  } catch (error) {
    console.error("Sales intake server upload fallback error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file to storage." },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { putR2Object } from "@/lib/sales-ordering/r2"

export const runtime = "nodejs"

const MAX_PDF_SIZE = 20 * 1024 * 1024

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access || (!canAccessSalesOrderingTab(access, "creditCheck") && !canAccessSalesOrderingTab(access, "intake"))) {
    return NextResponse.json({ error: "PO-SOA Check access required." }, { status: 403 })
  }

  const { id } = await context.params
  const creditCase = await prisma.creditCheckCase.findUnique({ where: { id } })
  if (!creditCase) {
    return NextResponse.json({ error: "Credit check record not found." }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const poFile = formData.get("po") as File | null
    const soaFile = formData.get("soa") as File | null

    if (!poFile && !soaFile) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    if (poFile && creditCase.poR2ObjectKey) {
      if (poFile.size > MAX_PDF_SIZE) return NextResponse.json({ error: "PO PDF exceeds 20 MB limit." }, { status: 400 })
      const buffer = Buffer.from(await poFile.arrayBuffer())
      await putR2Object(creditCase.poR2ObjectKey, buffer, "application/pdf")
    }

    if (soaFile && creditCase.soaR2ObjectKey) {
      if (soaFile.size > MAX_PDF_SIZE) return NextResponse.json({ error: "SOA PDF exceeds 20 MB limit." }, { status: 400 })
      const buffer = Buffer.from(await soaFile.arrayBuffer())
      await putR2Object(creditCase.soaR2ObjectKey, buffer, "application/pdf")
    }

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Credit check server upload fallback error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file to storage." },
      { status: 500 }
    )
  }
}

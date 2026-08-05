import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { createPdfUploadUrl, safePdfName } from "@/lib/sales-ordering/r2"

export const runtime = "nodejs"
const MAX_SIZE = 20 * 1024 * 1024

export async function POST(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "Akses AI Intake diperlukan." }, { status: 403 })
  try {
    const body = await request.json() as { poName?: string; poSize?: number; soaName?: string; soaSize?: number }
    const valid = (name?: string, size?: number) => Boolean(name?.toLowerCase().endsWith(".pdf") && size && size <= MAX_SIZE)
    if (!valid(body.poName, body.poSize) || !valid(body.soaName, body.soaSize)) return NextResponse.json({ error: "Muat naik satu PO PDF dan satu SOA PDF, maksimum 20 MB setiap satu." }, { status: 400 })
    const id = crypto.randomUUID()
    const prefix = `sales-order-credit-check/${new Date().getUTCFullYear()}/${id}`
    const poR2ObjectKey = `${prefix}/po-${safePdfName(body.poName!)}`
    const soaR2ObjectKey = `${prefix}/soa-${safePdfName(body.soaName!)}`
    await prisma.creditCheckCase.create({ data: { id, poFileName: body.poName!, poR2ObjectKey, soaFileName: body.soaName!, soaR2ObjectKey, uploadedById: access.userId } })
    const [poUploadUrl, soaUploadUrl] = await Promise.all([createPdfUploadUrl(poR2ObjectKey, "application/pdf"), createPdfUploadUrl(soaR2ObjectKey, "application/pdf")])
    return NextResponse.json({ id, poUploadUrl, soaUploadUrl })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyediakan upload." }, { status: 500 }) }
}

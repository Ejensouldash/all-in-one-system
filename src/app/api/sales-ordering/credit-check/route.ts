import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { createPdfUploadUrl, safePdfName } from "@/lib/sales-ordering/r2"
import type { CheckMode } from "@/lib/sales-ordering/decision-engine"

export const runtime = "nodejs"
const MAX_SIZE = 20 * 1024 * 1024

export async function POST(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "Akses AI Intake diperlukan." }, { status: 403 })
  try {
    const body = await request.json() as { poName?: string; poSize?: number; soaName?: string; soaSize?: number; checkMode?: CheckMode; existingCaseId?: string }
    const valid = (name?: string, size?: number) => Boolean(name?.toLowerCase().endsWith(".pdf") && size && size <= MAX_SIZE)
    const checkMode: CheckMode = body.checkMode === "INVOICE_SOA_RECONCILIATION" ? "INVOICE_SOA_RECONCILIATION" : "PO_CREDIT_CHECK"

    if (body.existingCaseId) {
      if (!valid(body.soaName, body.soaSize)) return NextResponse.json({ error: "Muat naik satu SOA PDF, maksimum 20 MB." }, { status: 400 })
      
      const existing = await prisma.creditCheckCase.findUnique({ where: { id: body.existingCaseId } })
      if (!existing) return NextResponse.json({ error: "Rekod PO-SOA Check tidak ditemui." }, { status: 404 })

      const prefix = `sales-order-credit-check/${new Date().getUTCFullYear()}/${existing.id}`
      const soaR2ObjectKey = `${prefix}/soa-${safePdfName(body.soaName!)}`

      await prisma.creditCheckCase.update({
        where: { id: existing.id },
        data: {
          soaFileName: body.soaName!,
          soaR2ObjectKey,
          result: { ...(existing.result as any || {}), checkMode }
        }
      })
      const soaUploadUrl = await createPdfUploadUrl(soaR2ObjectKey, "application/pdf")
      return NextResponse.json({ id: existing.id, soaUploadUrl })
    }

    if (!valid(body.poName, body.poSize) || !valid(body.soaName, body.soaSize)) return NextResponse.json({ error: "Muat naik satu PO/Invois PDF dan satu SOA PDF, maksimum 20 MB setiap satu." }, { status: 400 })
    const id = crypto.randomUUID()
    const prefix = `sales-order-credit-check/${new Date().getUTCFullYear()}/${id}`
    const poR2ObjectKey = `${prefix}/po-${safePdfName(body.poName!)}`
    const soaR2ObjectKey = `${prefix}/soa-${safePdfName(body.soaName!)}`
    await prisma.creditCheckCase.create({
      data: {
        id,
        poFileName: body.poName!,
        poR2ObjectKey,
        soaFileName: body.soaName!,
        soaR2ObjectKey,
        uploadedById: access.userId,
        result: { checkMode }
      }
    })
    const [poUploadUrl, soaUploadUrl] = await Promise.all([createPdfUploadUrl(poR2ObjectKey, "application/pdf"), createPdfUploadUrl(soaR2ObjectKey, "application/pdf")])
    return NextResponse.json({ id, poUploadUrl, soaUploadUrl })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyediakan upload." }, { status: 500 }) }
}


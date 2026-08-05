import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { analyseCreditCheck } from "@/lib/sales-ordering/credit-check"
import { readR2Object } from "@/lib/sales-ordering/r2"
import { SALES_AI_MODEL } from "@/lib/sales-ordering/extract"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "Akses AI Intake diperlukan." }, { status: 403 })
  const { id } = await context.params
  const item = await prisma.creditCheckCase.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: "Semakan tidak ditemui." }, { status: 404 })
  try {
    await prisma.creditCheckCase.update({ where: { id }, data: { status: "READING_FILES", errorMessage: null } })
    const [poPdf, soaPdf] = await Promise.all([readR2Object(item.poR2ObjectKey), readR2Object(item.soaR2ObjectKey)])
    const { po, soa, result } = await analyseCreditCheck(poPdf, soaPdf, async stage => {
      await prisma.creditCheckCase.update({ where: { id }, data: { status: stage } })
    })
    const updated = await prisma.creditCheckCase.update({ where: { id }, data: { status: "NEEDS_REVIEW", recommendation: result.recommendation, poData: po, soaData: soa, result, aiModel: SALES_AI_MODEL } })
    await prisma.auditLog.create({ data: { userId: access.userId, userName: access.name || "Sales Ordering User", action: "PO_SOA_CREDIT_CHECKED", details: JSON.stringify({ creditCheckId: id, recommendation: result.recommendation }) } })
    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semakan AI gagal"
    console.error("PO-SOA credit check processing failed", { id, message })
    await prisma.creditCheckCase.update({ where: { id }, data: { status: "AI_FAILED", errorMessage: message } }).catch(() => undefined)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

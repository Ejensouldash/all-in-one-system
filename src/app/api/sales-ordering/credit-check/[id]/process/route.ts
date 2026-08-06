import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { analyseCreditCheck } from "@/lib/sales-ordering/credit-check"
import type { CheckMode } from "@/lib/sales-ordering/decision-engine"
import { readR2Object } from "@/lib/sales-ordering/r2"

import { SALES_AI_MODEL } from "@/lib/sales-ordering/extract"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let id = ""
  try {
    const access = await getSalesOrderingAccess()
    if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "Akses AI Intake diperlukan." }, { status: 403 })
    id = (await context.params).id
    const item = await prisma.creditCheckCase.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: "Semakan tidak ditemui." }, { status: 404 })
    await prisma.creditCheckCase.update({ where: { id }, data: { status: "READING_FILES", errorMessage: null } })
    const [poPdf, soaPdf] = await Promise.all([readR2Object(item.poR2ObjectKey), readR2Object(item.soaR2ObjectKey)])
    const existingResult = item.result as { checkMode?: CheckMode } | null
    const checkMode: CheckMode = existingResult?.checkMode === "INVOICE_SOA_RECONCILIATION" ? "INVOICE_SOA_RECONCILIATION" : "PO_CREDIT_CHECK"
    const { po, soa, result } = await analyseCreditCheck(poPdf, soaPdf, checkMode, async stage => {
      await prisma.creditCheckCase.update({ where: { id }, data: { status: stage } })
    })
    const finalStatus = result.recommendation === "APPROVE" ? "READY_FOR_SO" : result.recommendation === "REJECT" ? "REJECTED" : "NEEDS_REVIEW"
    const updated = await prisma.creditCheckCase.update({ where: { id }, data: { status: finalStatus, recommendation: result.recommendation, poData: po, soaData: soa, result: result as unknown as object, aiModel: SALES_AI_MODEL, finalDecision: null, justification: null, decidedById: null, decidedAt: null } })

    await prisma.auditLog.create({ data: { userId: access.userId, userName: access.name || "Sales Ordering User", action: "PO_SOA_CREDIT_CHECKED", details: JSON.stringify({ creditCheckId: id, recommendation: result.recommendation }) } })
    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Semakan AI gagal"
    console.error("PO-SOA credit check processing failed", { id, message })
    if (id) await prisma.creditCheckCase.update({ where: { id }, data: { status: "AI_FAILED", errorMessage: message } }).catch(() => undefined)
    const userMessage = message.includes("GEMINI_API_KEY")
      ? "Gemini PDF extraction belum dikonfigurasi di server. Sila semak GEMINI_API_KEY di Vercel."
      : message.includes("timeout") || message.includes("timed out")
        ? "Pemprosesan PDF mengambil masa terlalu lama. Sila cuba semula; dokumen tidak perlu di-upload semula."
        : message.includes("AI") || message.includes("Gemini")
          ? "AI gagal membaca PDF ini. Sila cuba semula sebentar lagi."
          : "Server gagal memproses semakan ini. Sila cuba semula; jika masih gagal, rujuk error ID pada rekod semakan."
    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
}

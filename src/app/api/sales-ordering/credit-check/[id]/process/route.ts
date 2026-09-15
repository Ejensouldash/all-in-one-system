import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { analyseCreditCheck } from "@/lib/sales-ordering/credit-check"
import type { CheckMode } from "@/lib/sales-ordering/decision-engine"
import { readR2Object } from "@/lib/sales-ordering/r2"
import { normalizeExtractedDocument, type ExtractedSalesDocument } from "@/lib/sales-ordering/types"
import { SALES_AI_MODEL } from "@/lib/sales-ordering/extract"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  let id = ""
  try {
    const access = await getSalesOrderingAccess()
    if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "AI Intake access required." }, { status: 403 })
    id = (await context.params).id
    const item = await prisma.creditCheckCase.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: "Evaluation not found." }, { status: 404 })
    await prisma.creditCheckCase.update({ where: { id }, data: { status: "READING_FILES", errorMessage: null } })

    // Read SOA PDF from Cloudflare R2
    const soaPdf = await readR2Object(item.soaR2ObjectKey)

    // Check if PO data is already available (e.g. from Google Form or approved Intake)
    let poInput: Buffer | ExtractedSalesDocument
    let rawPoData: unknown = item.poData
    if (typeof rawPoData === "string") {
      try {
        rawPoData = JSON.parse(rawPoData)
      } catch {
        rawPoData = null
      }
    }

    if (rawPoData && typeof rawPoData === "object" && Object.keys(rawPoData).length > 0) {
      poInput = normalizeExtractedDocument(rawPoData)
    } else {
      poInput = await readR2Object(item.poR2ObjectKey)
    }

    const existingResult = item.result as { checkMode?: CheckMode } | null
    const checkMode: CheckMode = existingResult?.checkMode === "INVOICE_SOA_RECONCILIATION" ? "INVOICE_SOA_RECONCILIATION" : "PO_CREDIT_CHECK"
    const { po, soa, result } = await analyseCreditCheck(poInput, soaPdf, checkMode, async stage => {
      await prisma.creditCheckCase.update({ where: { id }, data: { status: stage } })
    })
    const finalStatus = result.recommendation === "APPROVE" ? "READY_FOR_SO" : result.recommendation === "REJECT" ? "REJECTED" : "NEEDS_REVIEW"
    const updated = await prisma.creditCheckCase.update({ where: { id }, data: { status: finalStatus, recommendation: result.recommendation, poData: po, soaData: soa, result: result as unknown as object, aiModel: SALES_AI_MODEL, finalDecision: null, justification: null, decidedById: null, decidedAt: null } })

    await prisma.auditLog.create({ data: { userId: access.userId, userName: access.name || "Sales Ordering User", action: "PO_SOA_CREDIT_CHECKED", details: JSON.stringify({ creditCheckId: id, recommendation: result.recommendation }) } })
    return NextResponse.json({ success: true, item: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI evaluation failed"
    console.error("PO-SOA credit check processing failed", { id, message })
    if (id) await prisma.creditCheckCase.update({ where: { id }, data: { status: "AI_FAILED", errorMessage: message } }).catch(() => undefined)
    const userMessage = message.includes("GEMINI_API_KEY")
      ? "Gemini PDF extraction is not configured on the server. Please check GEMINI_API_KEY in Vercel."
      : message.includes("timeout") || message.includes("timed out")
        ? "PDF processing took too long. Please try again; documents do not need to be re-uploaded."
        : message.includes("AI") || message.includes("Gemini")
          ? "AI failed to read this PDF. Please try again shortly."
          : "Server failed to process this evaluation. Please try again; if it still fails, refer to the error ID on the evaluation record."
    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
}

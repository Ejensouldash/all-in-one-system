import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSalesOrderingDocuments, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { sendEmailNotification, generateCreditCheckRejectedEmail } from "@/lib/email"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await getSalesOrderingAccess()
    if (!access || !canManageSalesOrderingDocuments(access)) {
      return NextResponse.json({ error: "Akses kewangan / reviewer diperlukan." }, { status: 403 })
    }

    const { id } = await context.params
    const current = await prisma.creditCheckCase.findUnique({ where: { id } })
    if (!current) {
      return NextResponse.json({ error: "Semakan kredit tidak ditemui." }, { status: 404 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      decision?: string
      justification?: string
      financeRemarks?: string
      financeEvidenceUrl?: string
      financeEvidenceName?: string
    }

    const decision = body.decision
    const remarks = (body.financeRemarks || body.justification || "").trim()

    if (!decision || !["PROCEED", "REJECT", "APPROVE_EXCEPTION"].includes(decision)) {
      return NextResponse.json({ error: "Keputusan tidak sah. Pilihan: PROCEED, REJECT, atau APPROVE_EXCEPTION." }, { status: 400 })
    }

    if (!remarks) {
      return NextResponse.json({ error: "Ulasan / Justifikasi Kewangan (Finance Remarks) WAJIB diisi." }, { status: 400 })
    }

    const newStatus = decision === "PROCEED" ? "PROCEED" : decision === "REJECT" ? "REJECTED" : "DECIDED"

    const updated = await prisma.creditCheckCase.update({
      where: { id },
      data: {
        status: newStatus,
        finalDecision: decision,
        justification: remarks,
        financeRemarks: remarks,
        financeEvidenceUrl: body.financeEvidenceUrl || null,
        financeEvidenceName: body.financeEvidenceName || null,
        decidedById: access.userId,
        decidedAt: new Date(),
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "Finance User",
        action: "FINANCE_CREDIT_DECISION",
        details: `Finance Credit Decision for Case ${id}: ${decision}. Remarks: ${remarks}`
      }
    })

    // Output 1: Email notification to BD when REJECTED
    if (decision === "REJECT") {
      try {
        const poData = (current.poData as any) || {}
        const poNumber = poData.poNumber || current.poFileName || id
        const customerName = poData.customerName || "Customer"

        // Find BD team users
        const bdUsers = await prisma.user.findMany({
          where: {
            OR: [
              { role: "SUPERADMIN" },
              { role: "SUPERVISOR" },
              { modules: { has: "SALES_ORDERING" } }
            ]
          },
          select: { email: true, name: true }
        })

        const recipientEmails = bdUsers.map(u => u.email).filter(Boolean)
        if (recipientEmails.length > 0) {
          const emailHtml = generateCreditCheckRejectedEmail(
            "Team BD",
            poNumber,
            customerName,
            remarks
          )
          await sendEmailNotification({
            to: recipientEmails[0],
            subject: `[CREDIT REJECTED] PO ${poNumber} - Semakan Kredit Ditolak`,
            html: emailHtml
          })
        }
      } catch (emailErr) {
        console.warn("Failed to dispatch BD notification email:", emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Keputusan Kewangan (${decision}) berjaya disimpan.`,
      item: updated
    })
  } catch (error) {
    console.error("Credit Check Decision Error:", error)
    return NextResponse.json({ error: "Gagal menyimpan keputusan kewangan." }, { status: 500 })
  }
}

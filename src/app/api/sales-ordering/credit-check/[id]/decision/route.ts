import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSalesOrderingDocuments, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access || !canManageSalesOrderingDocuments(access)) return NextResponse.json({ error: "Akses reviewer diperlukan." }, { status: 403 })
  const { id } = await context.params
  const body = await request.json() as { decision?: string; justification?: string }
  if (body.decision !== "APPROVE_EXCEPTION" && body.decision !== "REJECT") return NextResponse.json({ error: "Keputusan tidak sah." }, { status: 400 })
  if (!body.justification?.trim()) return NextResponse.json({ error: "Justification wajib diisi untuk Hold." }, { status: 400 })
  const updated = await prisma.creditCheckCase.update({ where: { id }, data: { status: "DECIDED", finalDecision: body.decision, justification: body.justification.trim(), decidedById: access.userId, decidedAt: new Date() } })
  return NextResponse.json({ success: true, item: updated })
}

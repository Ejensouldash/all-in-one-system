import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) return NextResponse.json({ error: "Akses AI Intake diperlukan." }, { status: 403 })
  const { id } = await context.params
  const item = await prisma.creditCheckCase.findUnique({ where: { id }, select: { status: true, errorMessage: true, recommendation: true } })
  if (!item) return NextResponse.json({ error: "Semakan tidak ditemui." }, { status: 404 })
  return NextResponse.json(item)
}

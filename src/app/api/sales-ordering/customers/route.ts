import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export async function GET(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || (!canAccessSalesOrderingTab(access, "intake") && !canAccessSalesOrderingTab(access, "customers"))) return NextResponse.json({ error: "Akses AI Intake atau Customers diperlukan." }, { status: 403 })

  const query = new URL(request.url).searchParams.get("q")?.trim() || ""
  const customers = await prisma.customer.findMany({
    where: query ? {
      OR: [
        { customerCode: { contains: query, mode: "insensitive" } },
        { sageCustomerId: { contains: query, mode: "insensitive" } },
        { legalName: { contains: query, mode: "insensitive" } },
        { tradingName: { contains: query, mode: "insensitive" } },
      ],
    } : undefined,
    select: { id: true, customerCode: true, sageCustomerId: true, legalName: true, tradingName: true, creditTermsRaw: true, zone: true },
    orderBy: { legalName: "asc" },
    take: 20,
  })
  return NextResponse.json({ customers })
}

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || !access.isSuperAdmin) {
    return NextResponse.json(
      { error: "SuperAdmin access only is permitted for database management." },
      { status: 403 }
    )
  }

  try {
    const body = (await request.json()) as { action?: string }
    const action = body.action || "clear-pending-soa"

    let deletedCount = 0
    let message = ""

    if (action === "clear-pending-soa") {
      const result = await prisma.creditCheckCase.deleteMany({
        where: {
          OR: [
            { status: "PENDING_SOA" },
            { recommendation: null },
            { soaFileName: "SOA Pending Upload" },
          ],
        },
      })
      deletedCount = result.count
      message = `Successfully deleted ${deletedCount} Pending SOA records.`
    } else if (action === "clear-credit-checks") {
      const result = await prisma.creditCheckCase.deleteMany({})
      deletedCount = result.count
      message = `Successfully deleted all ${deletedCount} PO-SOA Check records.`
    } else if (action === "clear-intakes") {
      const result = await prisma.salesDocumentIntake.deleteMany({})
      deletedCount = result.count
      message = `Successfully deleted all ${deletedCount} Document Intake records.`
    } else if (action === "reset-all") {
      const [casesResult, intakesResult] = await Promise.all([
        prisma.creditCheckCase.deleteMany({}),
        prisma.salesDocumentIntake.deleteMany({}),
      ])
      deletedCount = casesResult.count + intakesResult.count
      message = `Successfully performed Reset Zero State! Deleted ${casesResult.count} PO-SOA Check records and ${intakesResult.count} Intake records.`
    } else {
      return NextResponse.json({ error: "Invalid purge action." }, { status: 400 })
    }

    return NextResponse.json({ success: true, message, deletedCount })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete data from database." },
      { status: 500 }
    )
  }
}

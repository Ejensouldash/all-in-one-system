import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access || !access.isSuperAdmin) {
    return NextResponse.json(
      { error: "Akses SuperAdmin sahaja dibenarkan untuk pengurusan pangkalan data." },
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
      message = `Berjaya memadam ${deletedCount} rekod Pending SOA.`
    } else if (action === "clear-credit-checks") {
      const result = await prisma.creditCheckCase.deleteMany({})
      deletedCount = result.count
      message = `Berjaya memadam semua ${deletedCount} rekod PO-SOA Check.`
    } else if (action === "clear-intakes") {
      const result = await prisma.salesDocumentIntake.deleteMany({})
      deletedCount = result.count
      message = `Berjaya memadam semua ${deletedCount} rekod Dokumen Intake.`
    } else if (action === "reset-all") {
      const [casesResult, intakesResult] = await Promise.all([
        prisma.creditCheckCase.deleteMany({}),
        prisma.salesDocumentIntake.deleteMany({}),
      ])
      deletedCount = casesResult.count + intakesResult.count
      message = `Berjaya melakukan Reset Zero State! Memadam ${casesResult.count} rekod PO-SOA Check dan ${intakesResult.count} rekod Intake.`
    } else {
      return NextResponse.json({ error: "Tindakan padam tidak sah." }, { status: 400 })
    }

    return NextResponse.json({ success: true, message, deletedCount })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memadam data dari database." },
      { status: 500 }
    )
  }
}

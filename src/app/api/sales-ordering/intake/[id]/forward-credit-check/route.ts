import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAccessSalesOrderingTab, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getSalesOrderingAccess()
  if (!access || !canAccessSalesOrderingTab(access, "intake")) {
    return NextResponse.json({ error: "AI Intake access required." }, { status: 403 })
  }

  try {
    const { id } = await params
    const intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
      include: { matchedCustomer: true },
    })

    if (!intake) {
      return NextResponse.json({ error: "Intake document not found." }, { status: 404 })
    }

    const poData = (intake.extractedData as any) || {}
    const dummySoaKey = `pending-soa/${intake.id}-${Date.now()}.pdf`

    // Find or create CreditCheckCase
    let creditCase = await prisma.creditCheckCase.findFirst({
      where: { poR2ObjectKey: intake.r2ObjectKey },
    })

    if (!creditCase) {
      creditCase = await prisma.creditCheckCase.create({
        data: {
          poFileName: intake.fileName,
          poR2ObjectKey: intake.r2ObjectKey,
          soaFileName: "SOA Pending Upload",
          soaR2ObjectKey: dummySoaKey,
          status: "PENDING_SOA",
          poData,
          uploadedById: access.userId,
        },
      })
    } else {
      creditCase = await prisma.creditCheckCase.update({
        where: { id: creditCase.id },
        data: {
          status: "PENDING_SOA",
          poData,
        },
      })
    }

    // Update Intake Status
    await prisma.salesDocumentIntake.update({
      where: { id },
      data: {
        status: "APPROVED_INTAKE",
        reviewedById: access.userId,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      creditCheckId: creditCase.id,
      message: "PO successfully forwarded to PO-SOA Check.",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process PO-SOA forwarding." },
      { status: 500 },
    )
  }
}

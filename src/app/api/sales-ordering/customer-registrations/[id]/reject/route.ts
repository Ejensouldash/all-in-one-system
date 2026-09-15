import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSalesOrderingCustomers, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getSalesOrderingAccess()
    if (!access || !canManageSalesOrderingCustomers(access)) {
      return NextResponse.json({ error: "Unauthorized. Customer management permission required." }, { status: 403 })
    }

    const { id } = await params
    const registration = await prisma.customerRegistration.findUnique({
      where: { id }
    })

    if (!registration) {
      return NextResponse.json({ error: "Registration application not found." }, { status: 404 })
    }

    if (registration.status === "APPROVED") {
      return NextResponse.json({ error: "This application has already been approved and cannot be rejected." }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = body.reason ? String(body.reason).trim() : ""

    if (!reason) {
      return NextResponse.json({ error: "Rejection reason is REQUIRED." }, { status: 400 })
    }

    const updated = await prisma.customerRegistration.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedById: access.userId,
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "BD User",
        action: "REJECT_CUSTOMER_REGISTRATION",
        details: `Rejected Customer Registration ${registration.registrationNo}. Reason: ${reason}`
      }
    })

    return NextResponse.json({
      success: true,
      message: "Registration application has been rejected.",
      registration: updated,
    })
  } catch (error) {
    console.error("Reject Customer Registration Error:", error)
    return NextResponse.json({ error: "Failed to reject application." }, { status: 500 })
  }
}

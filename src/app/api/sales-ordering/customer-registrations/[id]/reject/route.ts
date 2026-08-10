import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSalesOrderingCustomers, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getSalesOrderingAccess()
    if (!access || !canManageSalesOrderingCustomers(access)) {
      return NextResponse.json({ error: "Akses tidak dibenarkan. Kebenaran pengurusan pelanggan diperlukan." }, { status: 403 })
    }

    const { id } = await params
    const registration = await prisma.customerRegistration.findUnique({
      where: { id }
    })

    if (!registration) {
      return NextResponse.json({ error: "Permohonan pendaftaran tidak ditemui." }, { status: 404 })
    }

    if (registration.status === "APPROVED") {
      return NextResponse.json({ error: "Permohonan ini telah diluluskan sebelum ini dan tidak boleh ditolak." }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = body.reason ? String(body.reason).trim() : ""

    if (!reason) {
      return NextResponse.json({ error: "Sebab penolakan (Rejection Reason) WAJIB diisi." }, { status: 400 })
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
      message: "Permohonan pendaftaran telah ditolak.",
      registration: updated,
    })
  } catch (error) {
    console.error("Reject Customer Registration Error:", error)
    return NextResponse.json({ error: "Gagal menolak permohonan." }, { status: 500 })
  }
}

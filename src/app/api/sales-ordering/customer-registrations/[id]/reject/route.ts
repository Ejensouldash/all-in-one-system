import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const reason = body.reason || "Permohonan ditolak oleh Team BD."

    const updated = await prisma.customerRegistration.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: new Date(),
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

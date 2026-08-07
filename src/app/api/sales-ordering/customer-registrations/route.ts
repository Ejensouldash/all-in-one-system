import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const registrations = await prisma.customerRegistration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdCustomer: {
          select: { id: true, customerCode: true, legalName: true }
        }
      }
    })

    return NextResponse.json({ registrations })
  } catch (error) {
    console.error("Fetch Customer Registrations Error:", error)
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 })
  }
}

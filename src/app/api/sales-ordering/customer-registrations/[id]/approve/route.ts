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

    if (registration.status === "APPROVED" || registration.createdCustomerId) {
      return NextResponse.json({ error: "Permohonan ini telah diluluskan sebelumnya. Rekod Customer Master sudah ada." }, { status: 400 })
    }

    if (registration.status === "REJECTED") {
      return NextResponse.json({ error: "Permohonan ini telah ditolak dan tidak boleh diluluskan semula." }, { status: 400 })
    }

    // Generate Customer Code: CUST-YYYY-XXX
    const year = new Date().getFullYear()
    const prefix = `CUST-${year}-`

    const existingCount = await prisma.customer.count({
      where: { customerCode: { startsWith: prefix } }
    })
    const customerCode = `${prefix}${String(existingCount + 1).padStart(3, "0")}`

    // Parse contacts if any
    const contacts = Array.isArray(registration.contacts) ? (registration.contacts as any[]) : []
    const primaryContact = contacts[0] || {}

    // Create Customer in Customer Master ONCE
    const customer = await prisma.customer.create({
      data: {
        customerCode,
        legalName: registration.companyName,
        companyRegistrationNo: registration.companyRegNoNew || registration.companyRegNoOld || null,
        tinNo: registration.tinNo || null,
        sstNo: registration.sstNo || null,
        email: registration.emailInvoice || primaryContact.email || null,
        phonePrimary: registration.contactOffice || primaryContact.phone || null,
        customerType: registration.businessType || "CORPORATE",
        importStatus: "READY",
        sourceData: registration as any,
        addresses: registration.businessAddress ? {
          create: {
            addressType: "BILLING",
            label: "Alamat Premis / Syarikat",
            fullAddress: registration.businessAddress,
            isDefaultBilling: true,
            isDefaultDelivery: true,
          }
        } : undefined
      }
    })

    // Update CustomerRegistration record
    const updated = await prisma.customerRegistration.update({
      where: { id },
      data: {
        status: "APPROVED",
        createdCustomerId: customer.id,
        reviewedAt: new Date(),
        reviewedById: access.userId,
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: access.name || "BD User",
        action: "APPROVE_CUSTOMER_REGISTRATION",
        details: `Approved Customer Registration ${registration.registrationNo} -> Created Customer ${customer.customerCode} (${customer.legalName})`
      }
    })

    return NextResponse.json({
      success: true,
      message: `Permohonan diluluskan. Customer baharu ${customer.customerCode} (${customer.legalName}) telah dicipta di Customer Master.`,
      customer,
      registration: updated,
    })
  } catch (error) {
    console.error("Approve Customer Registration Error:", error)
    return NextResponse.json(
      { error: "Gagal meluluskan permohonan: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

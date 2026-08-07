import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/**
 * Webhook Endpoint to receive Google Form submissions for Customer Registration
 * Endpoint: POST /api/webhooks/customer-registration
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret") || request.headers.get("x-google-form-secret")
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized. Invalid secret token." }, { status: 401 })
    }

    const body = await request.json()
    console.log("Received Customer Registration Payload:", JSON.stringify(body, null, 2))

    const companyName = body.companyName ? String(body.companyName).trim() : "Unknown Company"
    if (!companyName) {
      return NextResponse.json({ error: "Company Name is required." }, { status: 400 })
    }

    // Generate unique Registration No (REG-YYYYMM-XXX)
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const prefix = `REG-${yearMonth}-`
    
    const countThisMonth = await prisma.customerRegistration.count({
      where: {
        registrationNo: { startsWith: prefix }
      }
    })
    const registrationNo = `${prefix}${String(countThisMonth + 1).padStart(3, "0")}`

    // Structure contacts
    const contacts = [
      {
        department: "Account Department",
        name: body.contactAccountName || "",
        email: body.contactAccountEmail || body.emailInvoice || "",
        phone: body.contactAccountPhone || "",
      },
      {
        department: "Purchasing Department",
        name: body.contactPurchaseName || "",
        email: body.contactPurchaseEmail || "",
        phone: body.contactPurchasePhone || "",
      }
    ].filter(c => c.name || c.email || c.phone)

    // Financial
    const financial = {
      bankName: body.bankName || "",
      accountNo: body.bankAccountNo || "",
      bankAddress: body.bankAddress || "",
      bankType: body.bankType || "",
      swiftCode: body.swiftCode || "",
    }

    // Documents from Google Drive
    const supportingDocuments = Array.isArray(body.supportingDocuments) 
      ? body.supportingDocuments 
      : body.driveFiles || []

    // Save record to DB
    const registration = await prisma.customerRegistration.create({
      data: {
        registrationNo,
        companyName,
        companyRegNoNew: body.companyRegNoNew || body.companyRegistrationNo || "",
        companyRegNoOld: body.companyRegNoOld || "",
        tinNo: body.tinNo || "",
        sstNo: body.sstNo || "",
        businessType: body.businessType || "",
        natureOfBusiness: body.natureOfBusiness || "",
        businessAddress: body.businessAddress || body.address || "",
        registeredAddress: body.registeredAddress || "",
        businessCommencementDate: body.businessCommencementDate || "",
        annualTurnover: body.annualTurnover || "",
        paidUpCapital: body.paidUpCapital || "",
        contactOffice: body.contactOffice || body.phone || "",
        contactFax: body.contactFax || "",
        emailInvoice: body.emailInvoice || body.email || "",
        msicCode: body.msicCode || "",
        contacts: contacts as any,
        financial: financial as any,
        tradeReferences: (body.tradeReferences || []) as any,
        directors: (body.directors || []) as any,
        supportingDocuments: supportingDocuments as any,
        guarantors: (body.guarantors || []) as any,
        status: "PENDING",
      }
    })

    return NextResponse.json({
      success: true,
      message: "Customer Registration successfully received.",
      registrationId: registration.id,
      registrationNo: registration.registrationNo,
    })
  } catch (error) {
    console.error("Customer Registration Webhook Error:", error)
    return NextResponse.json(
      { error: "Failed to process customer registration: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

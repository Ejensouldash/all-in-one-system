import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

export const runtime = "nodejs"

/**
 * Webhook Endpoint to receive Google Form submissions for Customer Registration
 * Endpoint: POST /api/webhooks/customer-registration
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Webhook Secret Verification
    const secretFromQuery = request.nextUrl.searchParams.get("secret")
    const secretFromHeader = request.headers.get("x-google-form-secret")
    const receivedSecret = secretFromHeader || secretFromQuery
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET

    if (expectedSecret && receivedSecret !== expectedSecret) {
      console.warn("[Webhook Customer Registration] 401 Unauthorized attempt from IP:", request.headers.get("x-forwarded-for") || "unknown")
      return NextResponse.json({ error: "Unauthorized. Invalid or missing secret token." }, { status: 401 })
    }

    // 2. Parse JSON Payload safely
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    // 3. Validate Minimum Data: companyName required
    const companyName = body.companyName ? String(body.companyName).trim() : ""
    if (!companyName) {
      return NextResponse.json({ error: "Validation failed: companyName is required and cannot be empty." }, { status: 400 })
    }

    // 4. Idempotency Key computation for retry prevention
    const rawResponseId = body.formResponseId || body.responseId || body.idempotencyKey
    const respondentEmail = body.respondentEmail ? String(body.respondentEmail).trim().toLowerCase() : ""
    const submittedAt = body.submittedAt ? String(body.submittedAt).slice(0, 10) : new Date().toISOString().slice(0, 10)

    const idempotencyKey = rawResponseId 
      ? String(rawResponseId).trim() 
      : crypto.createHash("sha256").update(`${companyName}|${respondentEmail}|${submittedAt}`).digest("hex")

    // Check duplicate submission
    const existingRegistration = await prisma.customerRegistration.findUnique({
      where: { idempotencyKey }
    })

    if (existingRegistration) {
      console.log(`[Webhook Customer Registration] Duplicate submission ignored for idempotencyKey: ${idempotencyKey.slice(0, 12)}... (Company: ${companyName})`)
      return NextResponse.json({
        success: true,
        message: "Submission already processed previously.",
        registrationId: existingRegistration.id,
        registrationNo: existingRegistration.registrationNo,
        isDuplicate: true,
      })
    }

    // 5. Generate Collision-Free Registration Number (REG-YYYYMM-XXX)
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const prefix = `REG-${yearMonth}-`

    let registrationNo = ""
    let attempts = 0
    while (attempts < 10) {
      attempts++
      const countThisMonth = await prisma.customerRegistration.count({
        where: { registrationNo: { startsWith: prefix } }
      })
      const nextSeq = String(countThisMonth + attempts).padStart(3, "0")
      const candidateNo = `${prefix}${nextSeq}`

      const collisionCheck = await prisma.customerRegistration.findUnique({
        where: { registrationNo: candidateNo }
      })
      if (!collisionCheck) {
        registrationNo = candidateNo
        break
      }
    }

    if (!registrationNo) {
      registrationNo = `${prefix}${Date.now().toString().slice(-4)}`
    }

    // 6. Structure contacts
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

    // Financial metadata & Operational details
    const financial = {
      paymentTermsRequested: body.paymentTermsRequested || body.paymentTerms || "",
      officeOperatingHours: body.officeOperatingHours || "",
      preferredDeliveryTime: body.preferredDeliveryTime || "",
      bankName: body.bankName || "",
      accountNo: body.bankAccountNo || "",
      bankAddress: body.bankAddress || "",
      bankType: body.bankType || "",
      swiftCode: body.swiftCode || "",
    }

    // Supporting Documents Metadata
    const supportingDocuments = Array.isArray(body.supportingDocuments) 
      ? body.supportingDocuments 
      : Array.isArray(body.driveFiles) ? body.driveFiles : []

    // Safe redacted log summary
    console.log(`[Webhook Customer Registration] Processing submission: No=${registrationNo}, Company="${companyName}", Docs=${supportingDocuments.length}`)

    // 7. Save CustomerRegistration record in PENDING status
    const registration = await prisma.customerRegistration.create({
      data: {
        registrationNo,
        idempotencyKey,
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
      message: "Customer Registration successfully recorded.",
      registrationId: registration.id,
      registrationNo: registration.registrationNo,
    })

  } catch (error) {
    console.error("[Webhook Customer Registration] Error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to process customer registration webhook." },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 })
}

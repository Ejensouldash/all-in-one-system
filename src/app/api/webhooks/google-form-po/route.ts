import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/**
 * Webhook Endpoint to receive Google Form submissions for Manual PO / Sales Orders
 * Endpoint: POST /api/webhooks/google-form-po
 */
export async function POST(request: Request) {
  try {
    // Optional secret verification
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret") || request.headers.get("x-google-form-secret")
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized. Invalid secret token." }, { status: 401 })
    }

    const body = await request.json()
    console.log("Received Google Form Payload:", JSON.stringify(body, null, 2))

    const {
      poNumber,
      orderDate,
      customerCode,
      companyName,
      stationOutlet,
      address,
      picName,
      phone,
      email,
      salesPerson,
      item425ml24Qty = 0,
      item425ml = 0,
      qty425 = 0,
      item800ml20Qty = 0,
      item800ml20 = 0,
      qty800_20 = 0,
      item800ml12Qty = 0,
      item800ml12 = 0,
      qty800_12 = 0,
      remarks,
    } = body

    // 1. Attempt to find customer, but don't fail if we can't. BD team can match it later.
    let customer = null
    if (customerCode) {
      customer = await prisma.customer.findUnique({
        where: { customerCode: String(customerCode).trim() },
        include: { addresses: true },
      })
    }

    if (!customer && companyName) {
      // Find exact match first to prevent assigning to random customers
      customer = await prisma.customer.findFirst({
        where: {
          legalName: {
            equals: String(companyName).trim(),
            mode: "insensitive",
          },
        },
        include: { addresses: true },
      })
    }

    // Find a system user to associate as creator (e.g. SUPERADMIN or first user)
    const systemUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    }) || await prisma.user.findFirst()

    if (!systemUser) {
      return NextResponse.json({ error: "Tiada User sistem ditemui." }, { status: 500 })
    }

    // 2. Generate PO Number if empty
    let finalPoNumber = poNumber ? String(poNumber).trim() : ""
    const parsedOrderDate = orderDate ? new Date(orderDate) : new Date()

    if (!finalPoNumber) {
      const year = parsedOrderDate.getFullYear()
      const month = String(parsedOrderDate.getMonth() + 1).padStart(2, "0")
      const monthPrefix = `${year}/${month}/`
      const countThisMonth = await prisma.salesDocumentIntake.count({
        where: {
          r2ObjectKey: {
            startsWith: `google-form-submissions/${monthPrefix}`,
          },
        },
      })
      const nextSeq = String(countThisMonth + 1).padStart(3, "0")
      finalPoNumber = `${monthPrefix}${nextSeq}`
    }

    // Default prices per CTN (used when unit price is not passed from form)
    const DEFAULT_PRICES: Record<string, number> = {
      "B2O2-425-24": 36.00,
      "B2O2-800-20": 45.00,
      "B2O2-800-12": 32.00,
    }

    // 3. Build line items with computed pricing
    const lineItemsData = []

    const q1 = Number(item425ml24Qty || item425ml || qty425) || 0
    if (q1 > 0) {
      const unitPrice = DEFAULT_PRICES["B2O2-425-24"]
      const amount = Number((q1 * unitPrice).toFixed(2))
      lineItemsData.push({
        barcode: "9555978700267",
        itemCode: "B2O2-425-24",
        sku: "B2O2-425-24",
        description: "BUBBLES O2 425ML (24 BOTTLE / CARTON)",
        uom: "CTN",
        quantity: q1,
        unitPrice,
        discount: 0,
        tax: 0,
        amount,
        isServiceCharge: false
      })
    }

    const q2 = Number(item800ml20Qty || item800ml20 || qty800_20) || 0
    if (q2 > 0) {
      const unitPrice = DEFAULT_PRICES["B2O2-800-20"]
      const amount = Number((q2 * unitPrice).toFixed(2))
      lineItemsData.push({
        barcode: "9555978700274",
        itemCode: "B2O2-800-20",
        sku: "B2O2-800-20",
        description: "BUBBLES O2 800ML (20 BOTTLE / CARTON)",
        uom: "CTN",
        quantity: q2,
        unitPrice,
        discount: 0,
        tax: 0,
        amount,
        isServiceCharge: false
      })
    }

    const q3 = Number(item800ml12Qty || item800ml12 || qty800_12) || 0
    if (q3 > 0) {
      const unitPrice = DEFAULT_PRICES["B2O2-800-12"]
      const amount = Number((q3 * unitPrice).toFixed(2))
      lineItemsData.push({
        barcode: "9555978700359",
        itemCode: "B2O2-800-12",
        sku: "B2O2-800-12",
        description: "BUBBLES O2 800ML (12 BOTTLE / CARTON)",
        uom: "CTN",
        quantity: q3,
        unitPrice,
        discount: 0,
        tax: 0,
        amount,
        isServiceCharge: false
      })
    }

    const subtotal = lineItemsData.reduce((acc, item) => acc + item.amount, 0)
    const grandTotal = Number(subtotal.toFixed(2))

    // 4. Construct ExtractedSalesDocument
    const extractedData = {
      documentType: "PURCHASE_ORDER",
      documentNumber: finalPoNumber,
      poNumber: finalPoNumber,
      documentDate: parsedOrderDate.toISOString().slice(0, 10),
      requestedDeliveryDate: "",
      customerReference: customerCode || "",
      customerName: companyName || customer?.legalName || "",
      paymentTermsRaw: "",
      billingAddress: address || "",
      deliveryAddress: address || "",
      deliveryContact: picName || "",
      deliveryPhone: phone || "",
      currency: "MYR",
      lines: lineItemsData,
      charges: [],
      totals: {
        subtotal: grandTotal,
        discount: 0,
        freight: 0,
        tax: 0,
        grandTotal: grandTotal
      },
      remarks: remarks ? `[Google Form Submission] ${remarks}` : "[Google Form Submission]",
      confidence: 1,
      warnings: []
    }

    // 5. Create SalesDocumentIntake
    const internalId = `GF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    const intake = await prisma.salesDocumentIntake.create({
      data: {
        fileName: `Google Form - ${finalPoNumber || companyName || "Unknown"}.json`,
        r2ObjectKey: `google-form-submissions/${finalPoNumber.replace(/\//g, "-") || internalId}.json`,
        mimeType: "application/json",
        fileSize: JSON.stringify(extractedData).length,
        status: "REVIEW",
        documentType: "PURCHASE_ORDER",
        extractedData: extractedData as any,
        matchedCustomerId: customer?.id || null,
        uploadedById: systemUser.id,
      }
    })

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: systemUser.id,
        userName: "Google Form Webhook",
        action: "CREATE_INTAKE_FROM_GOOGLE_FORM",
        details: `Intake Document ${intake.id} created via Google Form submission. PO Number: ${finalPoNumber}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Order Form berjaya masuk ke dalam Pending SOA (Intake Queue).",
      intakeId: intake.id,
      poNumber: finalPoNumber,
      itemCount: lineItemsData.length,
    })
  } catch (error) {
    console.error("Google Form Webhook Error:", error)
    return NextResponse.json(
      { error: "Gagal memproses Google Form Webhook: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

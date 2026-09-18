import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateAndSaveEInvoicePdfToR2 } from "@/lib/sales-ordering/einvoice-pdf"

export const runtime = "nodejs"

const DEFAULT_PRICES: Record<string, { price: number; barcode: string; description: string }> = {
  "B2O2-425-24": {
    price: 36.00,
    barcode: "9555978700267",
    description: "BUBBLES O2 425ML (24 BOTTLE / CARTON)",
  },
  "B2O2-800-20": {
    price: 45.00,
    barcode: "9555978700274",
    description: "BUBBLES O2 800ML (20 BOTTLE / CARTON)",
  },
  "B2O2-800-12": {
    price: 32.00,
    barcode: "9555978700359",
    description: "BUBBLES O2 800ML (12 BOTTLE / CARTON)",
  },
}

/**
 * Webhook Endpoint to receive Google Form submissions for E-Invoice Corporate / Direct Delivery
 * Endpoint: POST /api/webhooks/e-invoice-form
 */
export async function POST(request: Request) {
  try {
    // 1. Secret verification
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret") || request.headers.get("x-google-form-secret")
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized. Invalid secret token." }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    console.log("[Webhook E-Invoice Form] Payload received:", JSON.stringify(body, null, 2))

    // 2. Extract fields from payload (handling multiple possible naming variations)
    const fullName = String(body.fullName || body.namaPenuh || body["Nama penuh (seperti dalam IC)"] || "").trim()
    const phone = String(body.phone || body.noTelefon || body["No. Telefon (Active)"] || "").trim()
    const address = String(body.address || body.alamatPenuh || body["Alamat Penuh (berserta poskod, bandar & negeri)"] || "").trim()
    const email = String(body.email || body["Email (Active)"] || "").trim()
    const rawIc = String(body.icNumber || body.noIc || body["No. IC (wajib isi)"] || "").trim()
    const icNumber = rawIc.replace(/[^0-9A-Za-z-]/g, "")
    const deliveryMode = String(body.deliveryMode || "Direct Delivery").trim()
    const remarks = String(body.remarks || "").trim()

    // Optional Corporate details
    const companyName = String(body.companyName || body.namaCompany || body["Nama Company (Jika Ada)"] || body["Nama Company"] || "").trim()
    const ssmCert = String(body.ssmCert || body.sijilSsm || body.ssmNumber || body["Sijil SSM (Jika Ada)"] || body["Sijil SSM"] || "").trim()
    const picPhone = String(body.picPhone || body.noTelefonPic || body["No Telefon PIC (Jika Ada)"] || body["No Telefon PIC"] || "").trim()

    const submissionId = String(body.submissionId || body.responseId || body.formResponseId || "").trim()

    if (!fullName && !icNumber) {
      return NextResponse.json(
        { error: "Validation failed: 'fullName' or 'icNumber' is required." },
        { status: 400 }
      )
    }

    // 3. Build line items
    const lineItems = []

    // A) Explicit SKU quantities
    const q425 = Number(body.item425ml24Qty || body.qty425 || body.item425) || 0
    const q800_20 = Number(body.item800ml20Qty || body.qty800_20 || body.item800_20) || 0
    const q800_12 = Number(body.item800ml12Qty || body.qty800_12 || body.item800_12) || 0

    if (q425 > 0) {
      const def = DEFAULT_PRICES["B2O2-425-24"]
      lineItems.push({
        sku: "B2O2-425-24",
        itemCode: "B2O2-425-24",
        barcode: def.barcode,
        description: def.description,
        uom: "CTN",
        quantity: q425,
        unitPrice: def.price,
        discount: 0,
        tax: 0,
        amount: Number((q425 * def.price).toFixed(2)),
        isServiceCharge: false,
      })
    }

    if (q800_20 > 0) {
      const def = DEFAULT_PRICES["B2O2-800-20"]
      lineItems.push({
        sku: "B2O2-800-20",
        itemCode: "B2O2-800-20",
        barcode: def.barcode,
        description: def.description,
        uom: "CTN",
        quantity: q800_20,
        unitPrice: def.price,
        discount: 0,
        tax: 0,
        amount: Number((q800_20 * def.price).toFixed(2)),
        isServiceCharge: false,
      })
    }

    if (q800_12 > 0) {
      const def = DEFAULT_PRICES["B2O2-800-12"]
      lineItems.push({
        sku: "B2O2-800-12",
        itemCode: "B2O2-800-12",
        barcode: def.barcode,
        description: def.description,
        uom: "CTN",
        quantity: q800_12,
        unitPrice: def.price,
        discount: 0,
        tax: 0,
        amount: Number((q800_12 * def.price).toFixed(2)),
        isServiceCharge: false,
      })
    }

    // B) Single SKU Selection & Quantity (e.g. from a dropdown / radio question)
    const singleSku = String(body.orderItem || body.productSku || body["Order Item (Product SKU)"] || "").trim()
    const singleQty = Number(body.quantity || body.qty || body["Quantity"]) || 0

    if (lineItems.length === 0 && singleQty > 0) {
      let matchedSku = "B2O2-425-24"
      if (singleSku.includes("425")) {
        matchedSku = "B2O2-425-24"
      } else if (singleSku.includes("800") && singleSku.includes("12")) {
        matchedSku = "B2O2-800-12"
      } else if (singleSku.includes("800")) {
        matchedSku = "B2O2-800-20"
      }

      const def = DEFAULT_PRICES[matchedSku] || DEFAULT_PRICES["B2O2-425-24"]
      lineItems.push({
        sku: matchedSku,
        itemCode: matchedSku,
        barcode: def.barcode,
        description: def.description,
        uom: "CTN",
        quantity: singleQty,
        unitPrice: def.price,
        discount: 0,
        tax: 0,
        amount: Number((singleQty * def.price).toFixed(2)),
        isServiceCharge: false,
      })
    }

    // Note: If no items were selected or questions were deleted from Google Form,
    // lineItems remains empty [] and grandTotal is 0.00. Items can be added manually in AIO system review.
    const grandTotal = Number(lineItems.reduce((acc, item) => acc + item.amount, 0).toFixed(2))

    // 4. Pre-match customer from Customer Master
    let matchedCustomer = null
    if (companyName) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { legalName: { contains: companyName, mode: "insensitive" } },
            { tradingName: { contains: companyName, mode: "insensitive" } },
            ...(ssmCert ? [{ companyRegistrationNo: ssmCert }] : []),
          ],
        },
      })
    }

    if (!matchedCustomer && icNumber) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            { companyRegistrationNo: icNumber },
            { tinNo: icNumber },
            { phonePrimary: phone ? { contains: phone.slice(-8) } : undefined },
          ],
        },
      })
    }

    if (!matchedCustomer && fullName) {
      matchedCustomer = await prisma.customer.findFirst({
        where: {
          legalName: { equals: fullName, mode: "insensitive" },
        },
      })
    }

    // 5. Generate reference codes & dates
    const today = new Date().toISOString().slice(0, 10)
    const todayCompact = today.replaceAll("-", "")
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const autoDocNumber = `E-INV-${todayCompact}-${randomSuffix}`

    const systemUser =
      (await prisma.user.findFirst({ where: { role: "SUPERADMIN" } })) ||
      (await prisma.user.findFirst())

    if (!systemUser) {
      return NextResponse.json({ error: "System user not found." }, { status: 500 })
    }

    // 6. Build extracted document payload
    const extractedData = {
      documentType: "E_INVOICE_CORPORATE",
      documentNumber: autoDocNumber,
      poNumber: autoDocNumber,
      documentDate: today,
      requestedDeliveryDate: "",
      customerReference: matchedCustomer?.customerCode || "",
      customerName: companyName || fullName || matchedCustomer?.legalName || "E-Invoice Customer",
      fullName,
      icNumber,
      companyName: companyName || undefined,
      ssmCert: ssmCert || undefined,
      ssmNumber: ssmCert || undefined,
      picPhone: picPhone || undefined,
      deliveryMode,
      paymentTermsRaw: "CASH",
      billingAddress: address,
      deliveryAddress: address,
      deliveryContact: fullName,
      deliveryPhone: phone,
      deliveryEmail: email,
      currency: "MYR",
      lines: lineItems,
      charges: [],
      totals: {
        subtotal: grandTotal,
        discount: 0,
        freight: 0,
        tax: 0,
        grandTotal,
      },
      remarks: remarks
        ? `[E-Invoice Corporate Form] ${remarks} | IC: ${icNumber}${companyName ? ` | Company: ${companyName}` : ""}`
        : `[E-Invoice Corporate Form] Delivery: ${deliveryMode} | IC: ${icNumber}${companyName ? ` | Company: ${companyName}` : ""}`,
      confidence: 1,
      warnings: [],
      sourceSubmissionId: submissionId || undefined,
    }

    // 7. Check idempotency (prevent duplicates if same submission is received)
    const uniqueKey = submissionId
      ? `google-form-e-invoice/sub-${submissionId}.json`
      : `google-form-e-invoice/${autoDocNumber}.json`

    const existing = await prisma.salesDocumentIntake.findFirst({
      where: {
        OR: [
          { r2ObjectKey: uniqueKey },
          ...(submissionId ? [{ fileHash: submissionId }] : []),
        ],
      },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        message: "Duplicate submission ignored; existing intake record used.",
        intakeId: existing.id,
        documentNumber: autoDocNumber,
      })
    }

    // 8. Create SalesDocumentIntake record
    const intake = await prisma.salesDocumentIntake.create({
      data: {
        fileName: `E-Invoice - ${icNumber || fullName || autoDocNumber}.json`,
        r2ObjectKey: uniqueKey,
        mimeType: "application/json",
        fileSize: JSON.stringify(extractedData).length,
        fileHash: submissionId || uniqueKey,
        status: "REVIEW",
        documentType: "E_INVOICE_CORPORATE",
        extractedData,
        matchedCustomerId: matchedCustomer?.id || null,
        uploadedById: systemUser.id,
      },
    })

    // 9. Audit Log
    await prisma.auditLog.create({
      data: {
        userId: systemUser.id,
        userName: "E-Invoice Google Form Webhook",
        action: "CREATE_INTAKE_FROM_E_INVOICE_FORM",
        details: `E-Invoice Corporate intake created: ${intake.id} (${autoDocNumber}) for IC: ${icNumber}, Name: ${fullName}`,
      },
    })

    // 10. Generate Vector PDF & Save to Cloudflare R2
    let pdfR2Key: string | null = null
    try {
      const { r2ObjectKey } = await generateAndSaveEInvoicePdfToR2(intake.id)
      pdfR2Key = r2ObjectKey
      console.log(`[Webhook E-Invoice Form] Successfully generated and uploaded PDF to R2: ${r2ObjectKey}`)
    } catch (pdfErr) {
      console.error("[Webhook E-Invoice Form] PDF generation/R2 upload error (will fallback to on-demand):", pdfErr)
    }

    return NextResponse.json({
      success: true,
      message: "E-Invoice Corporate form successfully submitted into Documents intake queue and PDF compiled.",
      intakeId: intake.id,
      documentNumber: autoDocNumber,
      customerName: fullName,
      matchedCustomerId: matchedCustomer?.id || null,
      totalAmount: grandTotal,
      pdfKey: pdfR2Key,
    })
  } catch (error) {
    console.error("[Webhook E-Invoice Form] Error:", error)
    return NextResponse.json(
      { error: "Failed to process E-Invoice webhook: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

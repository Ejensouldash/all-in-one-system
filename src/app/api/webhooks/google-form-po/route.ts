import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  isManualPoObjectKey,
  getManualPoNumber,
  manualPoContentHash,
  manualPoObjectKey,
  manualPoSubmissionHash,
  nextManualPoNumber,
  withManualPoNumber,
} from "@/lib/sales-ordering/manual-po"

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
      address,
      picName,
      phone,
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
      submissionId,
      responseId,
      formResponseId,
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

    // 2. Normalize the requested PO number and order date. Auto numbering is
    // performed later inside a database lock to avoid concurrent duplicates.
    const requestedPoNumber = poNumber ? String(poNumber).trim() : ""
    const parsedOrderDate = orderDate ? new Date(orderDate) : new Date()

    if (Number.isNaN(parsedOrderDate.getTime())) {
      return NextResponse.json({ error: "Tarikh pesanan tidak sah." }, { status: 400 })
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

    // 4. Construct the stored document first without an auto-generated number.
    // The content fingerprint deliberately excludes generated PO numbers.
    const extractedDataWithoutNumber = {
      documentType: "PURCHASE_ORDER",
      documentNumber: requestedPoNumber,
      poNumber: requestedPoNumber,
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

    const sourceSubmissionId = [submissionId, responseId, formResponseId]
      .map(value => typeof value === "string" ? value.trim() : "")
      .find(Boolean)
    const contentHash = manualPoContentHash(extractedDataWithoutNumber)
    const submissionHash = manualPoSubmissionHash(extractedDataWithoutNumber, sourceSubmissionId)
    const uniqueR2Key = manualPoObjectKey(submissionHash)

    // 5. Serialize manual PO intake creation. The re-check inside this transaction
    // makes retries and two near-simultaneous webhook requests idempotent.
    const result = await prisma.$transaction(async tx => {
      const [lock] = await tx.$queryRaw<Array<{ lockAcquired: number }>>`
        SELECT 1::int AS "lockAcquired"
        FROM pg_advisory_xact_lock(hashtext(${"google-form-manual-po-intake"}))
      `
      if (lock?.lockAcquired !== 1) throw new Error("Gagal mendapatkan database lock untuk Manual PO.")

      const manualIntakes = await tx.salesDocumentIntake.findMany({
        where: {
          r2ObjectKey: { startsWith: "google-form-submissions/" },
          status: { not: "DUPLICATE" },
        },
        select: { id: true, r2ObjectKey: true, fileHash: true, extractedData: true },
        orderBy: { createdAt: "asc" },
      })

      const existing = manualIntakes.find(intake =>
        intake.r2ObjectKey === uniqueR2Key
        || intake.fileHash === submissionHash
        || (!sourceSubmissionId
          && isManualPoObjectKey(intake.r2ObjectKey)
          && manualPoContentHash(intake.extractedData) === contentHash),
      )

      if (existing) {
        return {
          intakeId: existing.id,
          poNumber: getManualPoNumber(existing.extractedData) || requestedPoNumber,
          duplicate: true,
        }
      }

      const finalPoNumber = requestedPoNumber || nextManualPoNumber(
        manualIntakes.map(intake => intake.extractedData),
        parsedOrderDate,
      )

      const poNumberAlreadyUsed = manualIntakes.find(intake => {
        const existingDocument = intake.extractedData && typeof intake.extractedData === "object"
          ? intake.extractedData as Record<string, unknown>
          : {}
        return String(existingDocument.poNumber || "").trim() === finalPoNumber
      })

      if (requestedPoNumber && poNumberAlreadyUsed) {
        return {
          conflict: true as const,
          intakeId: poNumberAlreadyUsed.id,
          poNumber: finalPoNumber,
        }
      }

      const extractedData = withManualPoNumber(extractedDataWithoutNumber, finalPoNumber)
      const intake = await tx.salesDocumentIntake.create({
        data: {
          fileName: `Google Form - ${finalPoNumber || companyName || "Unknown"}.json`,
          r2ObjectKey: uniqueR2Key,
          mimeType: "application/json",
          fileSize: JSON.stringify(extractedData).length,
          fileHash: submissionHash,
          status: "REVIEW",
          documentType: "PURCHASE_ORDER",
          extractedData,
          matchedCustomerId: customer?.id || null,
          uploadedById: systemUser.id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: systemUser.id,
          userName: "Google Form Webhook",
          action: "CREATE_INTAKE_FROM_GOOGLE_FORM",
          details: `Intake Document ${intake.id} created via Google Form submission. PO Number: ${finalPoNumber}`,
        },
      })

      return { intakeId: intake.id, poNumber: finalPoNumber, duplicate: false }
    })

    if ("conflict" in result) {
      return NextResponse.json({
        error: `Nombor PO ${result.poNumber} sudah digunakan oleh rekod lain.`,
        intakeId: result.intakeId,
        poNumber: result.poNumber,
      }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      message: result.duplicate
        ? "Submission ini telah diterima sebelum ini. Rekod sedia ada digunakan."
        : "Order Form berjaya masuk ke dalam Pending SOA (Intake Queue).",
      intakeId: result.intakeId,
      poNumber: result.poNumber,
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

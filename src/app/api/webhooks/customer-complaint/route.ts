import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { lookupProductionBatches } from "@/lib/customer-care/batch-lookup"
import { ComplaintCategory, ComplaintStatus, BatchMatchStatus } from "@prisma/client"

export const runtime = "nodejs"

/**
 * Webhook Endpoint to receive Customer Complaint submissions from Microsoft Forms / Power Automate / Zapier
 * Endpoint: POST /api/webhooks/customer-complaint
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Webhook Secret Verification
    const secretFromQuery = request.nextUrl.searchParams.get("secret")
    const secretFromHeader = request.headers.get("x-webhook-secret")
    const receivedSecret = secretFromHeader || secretFromQuery
    const expectedSecret = process.env.CUSTOMER_COMPLAINT_WEBHOOK_SECRET

    if (expectedSecret && receivedSecret !== expectedSecret) {
      console.warn("[Webhook Customer Complaint] Unauthorized attempt from IP:", request.headers.get("x-forwarded-for") || "unknown")
      return NextResponse.json({ error: "Unauthorized. Invalid or missing secret token." }, { status: 401 })
    }

    // 2. Parse JSON Payload
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const companyName = body.companyName ? String(body.companyName).trim() : ""
    const contactName = body.contactName ? String(body.contactName).trim() : ""
    const contactPhone = body.contactPhone || body.phone ? String(body.contactPhone || body.phone).trim() : ""

    if (!companyName || !contactPhone) {
      return NextResponse.json(
        { error: "Validation failed: companyName and contactPhone are required." },
        { status: 400 }
      )
    }

    // 3. Idempotency Key calculation
    const rawResponseId = body.formResponseId || body.responseId || body.submissionId || body.idempotencyKey
    const submittedAt = body.submittedAt ? String(body.submittedAt).slice(0, 10) : new Date().toISOString().slice(0, 10)
    const idempotencyKey = rawResponseId
      ? String(rawResponseId).trim()
      : crypto.createHash("sha256").update(`${companyName}|${contactPhone}|${submittedAt}`).digest("hex")

    const existingComplaint = await prisma.customerComplaint.findUnique({
      where: { idempotencyKey },
    })

    if (existingComplaint) {
      return NextResponse.json({
        success: true,
        message: "Submission already processed previously.",
        caseNumber: existingComplaint.caseNumber,
        complaintId: existingComplaint.id,
        isDuplicate: true,
      })
    }

    // 4. Generate Case Number: CC-YYYYMM-XXXX
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const prefix = `CC-${yearMonth}-`

    let caseNumber = ""
    let attempts = 0
    while (attempts < 10) {
      attempts++
      const countThisMonth = await prisma.customerComplaint.count({
        where: { caseNumber: { startsWith: prefix } },
      })
      const nextSeq = String(countThisMonth + attempts).padStart(4, "0")
      const candidateNo = `${prefix}${nextSeq}`

      const collisionCheck = await prisma.customerComplaint.findUnique({
        where: { caseNumber: candidateNo },
      })
      if (!collisionCheck) {
        caseNumber = candidateNo
        break
      }
    }

    if (!caseNumber) {
      caseNumber = `${prefix}${Date.now().toString().slice(-4)}`
    }

    // 5. Parse Categories
    const rawCategories: string[] = Array.isArray(body.categories)
      ? body.categories
      : typeof body.categories === "string"
      ? body.categories.split(",").map((s: string) => s.trim())
      : []

    const mappedCategories: ComplaintCategory[] = []
    const normText = rawCategories.join(" ").toUpperCase()

    if (normText.includes("BOTTLE CAP") || normText.includes("CAP") || normText.includes("PENUTUP")) {
      mappedCategories.push(ComplaintCategory.BOTTLE_CAP)
    }
    if (normText.includes("WATER") || normText.includes("AIR") || normText.includes("SEDIMENT")) {
      mappedCategories.push(ComplaintCategory.WATER)
    }
    if (normText.includes("BOTTLE") && !normText.includes("BOTTLE CAP")) {
      mappedCategories.push(ComplaintCategory.BOTTLE)
    }
    if (normText.includes("OTHER") || normText.includes("LAIN") || mappedCategories.length === 0) {
      mappedCategories.push(ComplaintCategory.OTHER)
    }

    // 6. Production Batch Lookups
    const batch425 = body.batchNo425ml || body.batch425 || body.batchNo425
    const batch800 = body.batchNo800ml || body.batch800 || body.batchNo800
    const qty425 = Number(body.affectedQty425ml || body.qty425) || 0
    const qty800 = Number(body.affectedQty800ml || body.qty800) || 0

    const lookup425 = await lookupProductionBatches(batch425, "425ml")
    const lookup800 = await lookupProductionBatches(batch800, "800ml")

    const itemsToCreate = []

    if (qty425 > 0 || (batch425 && String(batch425).trim().length > 0)) {
      itemsToCreate.push({
        productSize: "425ml",
        reportedQtyBottles: qty425,
        reportedBatchNo: batch425 ? String(batch425).trim() : null,
        cleanBatchNo: lookup425.cleanBatchNo,
        matchStatus: lookup425.matchStatus as BatchMatchStatus,
        matchedProductionId: lookup425.matches.length === 1 ? lookup425.matches[0].batchId : null,
        matchRemarks: lookup425.remarks,
      })
    }

    if (qty800 > 0 || (batch800 && String(batch800).trim().length > 0)) {
      itemsToCreate.push({
        productSize: "800ml",
        reportedQtyBottles: qty800,
        reportedBatchNo: batch800 ? String(batch800).trim() : null,
        cleanBatchNo: lookup800.cleanBatchNo,
        matchStatus: lookup800.matchStatus as BatchMatchStatus,
        matchedProductionId: lookup800.matches.length === 1 ? lookup800.matches[0].batchId : null,
        matchRemarks: lookup800.remarks,
      })
    }

    const complaint = await prisma.customerComplaint.create({
      data: {
        caseNumber,
        companyName,
        outletName: body.outletName ? String(body.outletName).trim() : null,
        contactName: contactName || "N/A",
        contactPhone,
        state: body.state ? String(body.state).trim() : "",
        goodsLocationAddress: body.goodsLocationAddress || body.address ? String(body.goodsLocationAddress || body.address).trim() : "",
        categories: mappedCategories,
        otherIssueDescription: body.otherIssueDescription || body.remarks ? String(body.otherIssueDescription || body.remarks).trim() : null,
        picDepartment: body.picDepartment ? String(body.picDepartment).trim() : "Customer Care",
        status: ComplaintStatus.NEW,
        idempotencyKey,
        externalFormId: rawResponseId ? String(rawResponseId).trim() : null,
        rawPayload: body,
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    })

    return NextResponse.json({
      success: true,
      caseNumber: complaint.caseNumber,
      complaintId: complaint.id,
      itemsCount: complaint.items.length,
    })
  } catch (error: any) {
    console.error("[Webhook Customer Complaint] Error processing payload:", error)
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 })
  }
}

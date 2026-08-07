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

    /*
      Expected Payload Structure from Google Apps Script:
      {
        "poNumber": "2025/12/001",
        "orderDate": "2026-08-07",
        "customerCode": "CUST-001",
        "companyName": "Kedai ABC",
        "stationOutlet": "Branch A",
        "address": "No 123 Jalan Test",
        "picName": "John Doe",
        "phone": "0123456789",
        "email": "john@example.com",
        "salesPerson": "Sarah",
        "item425ml24Qty": 10,
        "item800ml20Qty": 5,
        "item800ml12Qty": 2,
        "remarks": "Delivery urgent"
      }
    */

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
      item800ml20Qty = 0,
      item800ml12Qty = 0,
      remarks,
    } = body

    // Find customer by code or company name
    let customer = null
    if (customerCode) {
      customer = await prisma.customer.findUnique({
        where: { customerCode: String(customerCode).trim() },
        include: { addresses: true },
      })
    }

    if (!customer && companyName) {
      customer = await prisma.customer.findFirst({
        where: {
          legalName: {
            contains: String(companyName).trim(),
            mode: "insensitive",
          },
        },
        include: { addresses: true },
      })
    }

    // Fallback: If no customer found, find any system default or first customer
    if (!customer) {
      customer = await prisma.customer.findFirst({
        include: { addresses: true },
      })
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Tiada rekod Customer dalam sistem AIO. Sila tambah customer dahulu." },
        { status: 400 }
      )
    }

    // Find a system user to associate as creator (e.g. SUPERADMIN or first user)
    const systemUser = await prisma.user.findFirst({
      where: { role: "SUPERADMIN" },
    }) || await prisma.user.findFirst()

    if (!systemUser) {
      return NextResponse.json({ error: "Tiada User sistem ditemui." }, { status: 500 })
    }

    const todayStr = new Date().toISOString().slice(0, 10).replaceAll("-", "")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const internalSoNo = `SO-GF-${todayStr}-${randomSuffix}`

    const parsedOrderDate = orderDate ? new Date(orderDate) : new Date()
    const year = parsedOrderDate.getFullYear()
    const month = String(parsedOrderDate.getMonth() + 1).padStart(2, "0")
    const monthPrefix = `${year}/${month}/`

    let finalPoNumber = poNumber ? String(poNumber).trim() : ""

    if (!finalPoNumber) {
      const countThisMonth = await prisma.salesOrder.count({
        where: {
          poNumber: {
            startsWith: monthPrefix,
          },
        },
      })
      const nextSeq = String(countThisMonth + 1).padStart(3, "0")
      finalPoNumber = `${monthPrefix}${nextSeq}`
    }

    // Build line items based on quantities
    const lineItemsData = []

    const q1 = Number(item425ml24Qty) || 0
    if (q1 > 0) {
      lineItemsData.push({
        sku: "B2O2-425-24",
        barcodeSnapshot: "9555978700267",
        descriptionSnapshot: "BUBBLES O2 425ML (24 BOTTLE / CARTON)",
        uom: "CTN/BTL",
        qtyOrdered: q1,
        unitPrice: 0,
        lineTotal: 0,
      })
    }

    const q2 = Number(item800ml20Qty) || 0
    if (q2 > 0) {
      lineItemsData.push({
        sku: "B2O2-800-20",
        barcodeSnapshot: "9555978700274",
        descriptionSnapshot: "BUBBLES O2 800ML (20 BOTTLE / CARTON)",
        uom: "CTN/BTL",
        qtyOrdered: q2,
        unitPrice: 0,
        lineTotal: 0,
      })
    }

    const q3 = Number(item800ml12Qty) || 0
    if (q3 > 0) {
      lineItemsData.push({
        sku: "B2O2-800-12",
        barcodeSnapshot: "9555978700359",
        descriptionSnapshot: "BUBBLES O2 800ML (12 BOTTLE / CARTON)",
        uom: "CTN/BTL",
        qtyOrdered: q3,
        unitPrice: 0,
        lineTotal: 0,
      })
    }

    const salesOrder = await prisma.salesOrder.create({
      data: {
        internalSoNo,
        customerId: customer.id,
        status: "DRAFT",
        documentType: "GOOGLE_FORM_PO",
        poNumber: finalPoNumber,
        orderDate: parsedOrderDate,
        deliveryContactSnapshot: picName ? String(picName) : customer.pic,
        deliveryPhoneSnapshot: phone ? String(phone) : customer.phonePrimary,
        deliveryAddressSnapshot: {
          stationOutlet: stationOutlet || "",
          companyName: companyName || customer.legalName,
          address: address || "",
          salesPerson: salesPerson || "",
          email: email || "",
        },
        billingAddressSnapshot: {
          companyName: companyName || customer.legalName,
          address: address || "",
        },
        orderRemarks: remarks ? `[Google Form Submission] ${remarks}` : "[Google Form Submission]",
        createdById: systemUser.id,
        items: {
          create: lineItemsData,
        },
      },
      include: {
        items: true,
        customer: true,
      },
    })

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: systemUser.id,
        userName: "Google Form Webhook",
        action: "CREATE_SALES_ORDER_FROM_GOOGLE_FORM",
        details: `Sales Order ${salesOrder.internalSoNo} created via Google Form submission for Customer ${customer.customerCode} (${customer.legalName}). PO Number: ${salesOrder.poNumber}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Sales Order berjaya dicipta dari Google Form submission.",
      internalSoNo: salesOrder.internalSoNo,
      salesOrderId: salesOrder.id,
      poNumber: salesOrder.poNumber,
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

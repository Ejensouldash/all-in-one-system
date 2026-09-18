import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canManageSalesOrderingDocuments, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { generateAndSaveEInvoicePdfToR2 } from "@/lib/sales-ordering/einvoice-pdf"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await getSalesOrderingAccess()
  if (!access) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 403 })
  }
  if (!canManageSalesOrderingDocuments(access)) {
    return NextResponse.json({ error: "Permission required to approve documents." }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Document ID is required." }, { status: 400 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>
    const docFromBody = body.document

    const intake = await prisma.salesDocumentIntake.findUnique({
      where: { id },
      include: { salesOrder: true, matchedCustomer: true },
    })

    if (!intake) {
      return NextResponse.json({ error: "E-Invoice document not found." }, { status: 404 })
    }

    if (intake.salesOrder) {
      return NextResponse.json({
        success: true,
        message: "E-Invoice already approved.",
        salesOrderId: intake.salesOrder.id,
        internalSoNo: intake.salesOrder.internalSoNo,
      })
    }

    // If client submitted updated document state, persist it to intake first
    if (docFromBody) {
      await prisma.salesDocumentIntake.update({
        where: { id: intake.id },
        data: {
          extractedData: docFromBody,
          ...(body.customerId ? { matchedCustomerId: body.customerId } : {}),
        },
      })
    }

    const raw = docFromBody || (intake.extractedData as any) || {}
    const fullName = String(raw.fullName || raw.customerName || "E-Invoice Customer").trim()
    const icNumber = String(raw.icNumber || "").trim()
    const phone = String(raw.deliveryPhone || raw.phone || "").trim()
    const email = String(raw.deliveryEmail || raw.email || "").trim()
    const address = String(raw.deliveryAddress || raw.billingAddress || "").trim()
    const deliveryMode = String(raw.deliveryMode || "Direct Delivery").trim()
    const companyName = String(raw.companyName || "").trim()
    const ssmNumber = String(raw.ssmCert || raw.ssmNumber || "").trim()
    const picPhone = String(raw.picPhone || "").trim()

    // 1. Ensure a valid Customer record
    let customer = intake.matchedCustomer

    if (!customer && companyName) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { legalName: { contains: companyName, mode: "insensitive" } },
            { tradingName: { contains: companyName, mode: "insensitive" } },
            ...(ssmNumber ? [{ companyRegistrationNo: ssmNumber }] : []),
          ],
        },
      })
    }

    if (!customer && icNumber) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { companyRegistrationNo: icNumber },
            { tinNo: icNumber },
            ...(phone ? [{ phonePrimary: { contains: phone.slice(-8) } }] : []),
          ],
        },
      })
    }

    if (!customer) {
      // Auto-create a Direct Delivery customer record
      const todayCompact = new Date().toISOString().slice(0, 10).replaceAll("-", "")
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase()
      const customerCode = `CUST-INV-${(ssmNumber || icNumber || todayCompact).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)}-${randomCode}`

      customer = await prisma.customer.create({
        data: {
          customerCode,
          legalName: companyName || fullName,
          tradingName: fullName,
          pic: fullName,
          phonePrimary: phone || picPhone || null,
          phoneSecondary: picPhone && phone !== picPhone ? picPhone : null,
          email: email || null,
          companyRegistrationNo: ssmNumber || icNumber || null,
          customerType: "DIRECT_DELIVERY",
          paymentPolicy: "CASH",
          creditTermsRaw: "CASH",
          creditTermDays: 0,
          importStatus: "ACTIVE",
          addresses: address
            ? {
                create: {
                  addressType: "DELIVERY",
                  label: "Direct Delivery Address",
                  fullAddress: address,
                  isDefaultBilling: true,
                  isDefaultDelivery: true,
                },
              }
            : undefined,
        },
      })
    }

    // 2. Generate Approved Sales Order
    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "")
    const internalSoNo = `SO-EINV-${today}-${intake.id.slice(0, 6).toUpperCase()}`

    const lines = Array.isArray(raw.lines) && raw.lines.length > 0 ? raw.lines : []
    const subtotal = Number(raw.totals?.subtotal || 0)
    const grandTotal = Number(raw.totals?.grandTotal || subtotal)

    const salesOrder = await prisma.salesOrder.create({
      data: {
        internalSoNo,
        sourceDocumentId: intake.id,
        customerId: customer.id,
        status: "APPROVED", // Directly approved, bypassing SOA check
        documentType: "E_INVOICE_CORPORATE",
        customerDocumentNo: raw.documentNumber || null,
        poNumber: raw.poNumber || null,
        orderDate: new Date(),
        paymentTermsSnapshot: "CASH",
        billingAddressSnapshot: { text: raw.billingAddress || address || "" },
        deliveryAddressSnapshot: { text: address || "", deliveryMode },
        deliveryContactSnapshot: raw.deliveryContact || fullName,
        deliveryPhoneSnapshot: raw.deliveryPhone || phone,
        currency: "MYR",
        subtotal,
        discountTotal: Number(raw.totals?.discount || 0),
        freightTotal: Number(raw.totals?.freight || 0),
        taxTotal: Number(raw.totals?.tax || 0),
        grandTotal,
        orderRemarks: raw.remarks || `[E-Invoice Corporate Approved] IC: ${icNumber}`,
        createdById: access.userId,
        items: {
          create: lines.map((line: any) => ({
            sku: line.sku || null,
            itemCodeSnapshot: line.itemCode || line.sku || null,
            barcodeSnapshot: line.barcode || null,
            descriptionSnapshot: line.description || "BubblesO2 Water",
            uom: line.uom || "CTN",
            qtyOrdered: Number(line.quantity || 1),
            unitPrice: Number(line.unitPrice || 0),
            discountAmount: Number(line.discount || 0),
            taxAmount: Number(line.tax || 0),
            lineTotal: Number(line.amount || 0),
            isServiceCharge: false,
          })),
        },
      },
    })

    // 3. Update SalesDocumentIntake to APPROVED
    await prisma.salesDocumentIntake.update({
      where: { id: intake.id },
      data: {
        status: "APPROVED",
        matchedCustomerId: customer.id,
        reviewedById: access.userId,
        reviewedAt: new Date(),
      },
    })

    // 4. Audit Log
    const approverName = access.name || "SOD Staff"
    await prisma.auditLog.create({
      data: {
        userId: access.userId,
        userName: approverName,
        action: "APPROVE_E_INVOICE",
        details: `E-Invoice ${intake.id} approved by ${approverName}. Approved Sales Order ${internalSoNo} created.`,
      },
    })

    // 5. Recompile updated PDF in R2 to reflect final approved state
    try {
      await generateAndSaveEInvoicePdfToR2(intake.id)
    } catch (pdfErr) {
      console.warn(`[Approve E-Invoice] Could not recompile PDF for ${intake.id}:`, pdfErr)
    }

    return NextResponse.json({
      success: true,
      message: `E-Invoice successfully approved! Sales Order ${internalSoNo} created.`,
      salesOrderId: salesOrder.id,
      internalSoNo,
    })
  } catch (error) {
    console.error(`[Approve E-Invoice] Error approving intake ${id}:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve E-Invoice." },
      { status: 500 }
    )
  }
}

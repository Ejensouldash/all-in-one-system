import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { normalizeExtractedDocument } from "@/lib/sales-ordering/types"
import { validateExtractedSalesDocument } from "@/lib/sales-ordering/validation"

export const runtime = "nodejs"

function optionalDate(value: string) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getSalesOrderingAccess()
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params

  try {
    const body = await request.json() as { customerId?: string; document?: unknown }
    const document = normalizeExtractedDocument(body.document)
    const customerId = body.customerId?.trim()
    if (!customerId) return NextResponse.json({ error: "Customer mesti dipilih." }, { status: 400 })

    const [intake, customer] = await Promise.all([
      prisma.salesDocumentIntake.findUnique({ where: { id }, include: { salesOrder: true } }),
      prisma.customer.findUnique({ where: { id: customerId }, include: { addresses: true } }),
    ])
    if (!intake) return NextResponse.json({ error: "Document intake tidak ditemui." }, { status: 404 })
    if (intake.salesOrder) return NextResponse.json({ error: "Sales Order sudah wujud untuk dokumen ini." }, { status: 409 })
    if (!customer) return NextResponse.json({ error: "Customer tidak ditemui." }, { status: 400 })

    const validation = await validateExtractedSalesDocument({ ...document, customerReference: customer.customerCode })
    const blockingIssues = validation.issues.filter(issue => issue.severity === "ERROR" && issue.code !== "CUSTOMER_NOT_MATCHED")
    if (blockingIssues.length) {
      return NextResponse.json({ error: blockingIssues[0].message, issues: blockingIssues }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10).replaceAll("-", "")
    const internalSoNo = `SO-DRAFT-${today}-${id.slice(0, 6).toUpperCase()}`
    const billing = customer.addresses.find(address => address.isDefaultBilling) || customer.addresses[0]

    const salesOrder = await prisma.$transaction(async tx => {
      const created = await tx.salesOrder.create({
        data: {
          internalSoNo,
          sourceDocumentId: id,
          customerId,
          status: "DRAFT",
          documentType: document.documentType,
          customerDocumentNo: document.documentNumber || null,
          poNumber: document.poNumber || null,
          orderDate: optionalDate(document.documentDate),
          requestedDeliveryDate: optionalDate(document.requestedDeliveryDate),
          paymentTermsSnapshot: document.paymentTermsRaw || customer.creditTermsRaw || null,
          billingAddressSnapshot: { text: document.billingAddress || billing?.fullAddress || "" },
          deliveryAddressSnapshot: { text: document.deliveryAddress },
          deliveryContactSnapshot: document.deliveryContact || customer.pic || null,
          deliveryPhoneSnapshot: document.deliveryPhone || customer.phonePrimary || null,
          currency: document.currency || "MYR",
          subtotal: document.totals.subtotal,
          discountTotal: document.totals.discount,
          freightTotal: document.totals.freight,
          taxTotal: document.totals.tax,
          grandTotal: document.totals.grandTotal,
          orderRemarks: document.remarks || null,
          createdById: access.userId,
          items: {
            create: [...document.lines, ...document.charges].map(item => ({
              sku: item.sku || null,
              itemCodeSnapshot: item.itemCode || null,
              barcodeSnapshot: item.barcode || null,
              descriptionSnapshot: item.description || "Unlabelled item",
              uom: item.uom || "CTN",
              qtyOrdered: item.quantity,
              unitPrice: item.unitPrice,
              discountAmount: item.discount,
              taxAmount: item.tax,
              lineTotal: item.amount,
              isServiceCharge: Boolean(item.isServiceCharge),
            })),
          },
        },
        include: { customer: true, items: true },
      })

      await tx.salesDocumentIntake.update({
        where: { id },
        data: {
          status: "SO_CREATED",
          matchedCustomerId: customerId,
          extractedData: document,
          validationIssues: validation.issues,
          reviewedById: access.userId,
          reviewedAt: new Date(),
        },
      })
      await tx.auditLog.create({
        data: {
          userId: access.userId,
          userName: access.name || "Sales Ordering User",
          action: "SALES_ORDER_CREATED_FROM_AI_INTAKE",
          details: JSON.stringify({ intakeId: id, salesOrderId: created.id, internalSoNo, customerCode: customer.customerCode }),
        },
      })
      return created
    })

    return NextResponse.json({ success: true, salesOrder })
  } catch (error) {
    console.error("Create Sales Order error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal mencipta Sales Order." }, { status: 500 })
  }
}


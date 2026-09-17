import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PoCustomerSection, type CustomerPoItem } from "@/components/sales-ordering/PoCustomerSection"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { normalizeExtractedDocument } from "@/lib/sales-ordering/types"

type CreditResultSummary = {
  primaryReason?: string
}

export default async function PoCustomerPage() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "documents") && !canAccessSalesOrderingTab(access, "dashboard")) {
    redirect(firstSalesOrderingPath(access))
  }

  const [creditCases, recentIntakes, salesOrders] = await Promise.all([
    prisma.creditCheckCase.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.salesDocumentIntake.findMany({
      where: { status: { not: "DUPLICATE" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        matchedCustomer: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    prisma.salesOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: true,
        sourceDocument: {
          select: {
            id: true,
            r2ObjectKey: true,
          },
        },
      },
    }),
  ])

  const poCustomerItems: CustomerPoItem[] = [
    ...salesOrders.map(so => ({
      id: so.sourceDocument?.id || so.id,
      type: "SALES_ORDER" as const,
      sourceType: "SALES_ORDER" as const,
      documentType: so.documentType || "SALES_ORDER",
      poNumber: so.poNumber || so.internalSoNo,
      customerName: so.customer?.legalName || "Customer PO",
      documentDate: so.orderDate ? so.orderDate.toISOString().slice(0, 10) : so.createdAt.toISOString().slice(0, 10),
      amount: Number(so.grandTotal || 0),
      status: (so.status === "APPROVED" ? "APPROVED" : "PENDING_SOA") as CustomerPoItem["status"],
      poR2ObjectKey: so.sourceDocument?.r2ObjectKey || null,
      createdAt: so.createdAt.toLocaleString("en-MY"),
      uploadedBy: so.documentType === "GOOGLE_FORM_PO"
        ? "Google Form Webhook"
        : so.documentType === "E_INVOICE_CORPORATE"
          ? "E-Invoice Form Webhook"
          : "Sales Order System",
      deliveryMode: (so.deliveryAddressSnapshot as any)?.deliveryMode || null,
    })),
    ...creditCases.map(c => {
      const poData = normalizeExtractedDocument(c.poData)
      const resultData = (c.result as CreditResultSummary | null) || {}
      const isApproved = c.recommendation === "APPROVE" || c.finalDecision === "APPROVE_EXCEPTION"
      const isRejected = c.recommendation === "REJECT" || c.finalDecision === "REJECT"
      const subPoCount = poData.subPos?.length || 0

      return {
        id: c.id,
        type: "CREDIT_CASE" as const,
        sourceType: "PO" as const,
        documentType: "PURCHASE_ORDER",
        poNumber: poData.poNumber || c.poFileName.replace(".pdf", ""),
        customerName: poData.customerName || "Customer SOA Check",
        documentDate: poData.documentDate || c.createdAt.toISOString().slice(0, 10),
        amount: Number(poData.totals.grandTotal || 0),
        status: (isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING_SOA") as CustomerPoItem["status"],
        isMultiPo: poData.isMultiPo || subPoCount > 1,
        subPoCount: subPoCount > 1 ? subPoCount : undefined,
        poR2ObjectKey: c.poR2ObjectKey,
        soaR2ObjectKey: c.soaR2ObjectKey,
        rejectionReason: resultData.primaryReason || c.justification || null,
        createdAt: c.createdAt.toLocaleString("en-MY"),
        uploadedBy: "SOD / BD Staff",
      }
    }),
    ...recentIntakes
      .filter(i => !creditCases.some(c => c.poR2ObjectKey === i.r2ObjectKey))
      .map(i => {
        const poData = normalizeExtractedDocument(i.extractedData)
        const subPoCount = poData.subPos?.length || 0
        const isEInvoice = i.documentType === "E_INVOICE_CORPORATE"
        const rawData = i.extractedData && typeof i.extractedData === "object" ? (i.extractedData as any) : {}
        const icNumber = rawData.icNumber || rawData.customerIc || null
        const deliveryMode = rawData.deliveryMode || (isEInvoice ? "Direct Delivery" : null)

        return {
          id: i.id,
          type: "INTAKE" as const,
          sourceType: isEInvoice ? ("E_INVOICE" as const) : ("PO" as const),
          documentType: i.documentType || "PURCHASE_ORDER",
          poNumber: poData.poNumber || (isEInvoice ? `E-INV-${i.id.slice(0, 6).toUpperCase()}` : i.fileName.replace(".pdf", "")),
          customerName: i.matchedCustomer?.legalName || poData.customerName || rawData.fullName || "Pending Matching",
          documentDate: poData.documentDate || i.createdAt.toISOString().slice(0, 10),
          amount: Number(poData.totals.grandTotal || 0),
          status: (i.status === "APPROVED" || i.status === "SO_CREATED" ? "APPROVED" : "PENDING_SOA") as CustomerPoItem["status"],
          isMultiPo: poData.isMultiPo || subPoCount > 1,
          subPoCount: subPoCount > 1 ? subPoCount : undefined,
          poR2ObjectKey: i.r2ObjectKey,
          createdAt: i.createdAt.toLocaleString("en-MY"),
          uploadedBy: isEInvoice ? "E-Invoice Form Webhook" : i.uploadedBy.name,
          icNumber,
          deliveryMode,
        }
      }),
  ]

  return (
    <div className="space-y-6">
      <PoCustomerSection items={poCustomerItems} />
    </div>
  )
}

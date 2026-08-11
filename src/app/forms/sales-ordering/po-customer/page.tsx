import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PoCustomerSection, type CustomerPoItem } from "@/components/sales-ordering/PoCustomerSection"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

type PoSummaryData = {
  poNumber?: string
  documentNumber?: string
  customerName?: string
  documentDate?: string
  totals?: { grandTotal?: number | string }
}

type CreditResultSummary = {
  primaryReason?: string
}

export default async function PoCustomerPage() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "dashboard") && !canAccessSalesOrderingTab(access, "intake")) {
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
      },
    }),
  ])

  const poCustomerItems: CustomerPoItem[] = [
    ...salesOrders.map(so => ({
      id: so.id,
      type: "SALES_ORDER" as const,
      poNumber: so.poNumber || so.internalSoNo,
      customerName: so.customer?.legalName || "Customer PO",
      documentDate: so.orderDate ? so.orderDate.toISOString().slice(0, 10) : so.createdAt.toISOString().slice(0, 10),
      amount: Number(so.grandTotal || 0),
      status: (so.status === "APPROVED" ? "APPROVED" : "PENDING_SOA") as CustomerPoItem["status"],
      createdAt: so.createdAt.toLocaleString("en-MY"),
      uploadedBy: so.documentType === "GOOGLE_FORM_PO" ? "Google Form Webhook" : "Sales Order System",
    })),
    ...creditCases.map(c => {
      const poData = (c.poData as PoSummaryData | null) || {}
      const totals = poData.totals || {}
      const resultData = (c.result as CreditResultSummary | null) || {}
      const isApproved = c.recommendation === "APPROVE" || c.finalDecision === "APPROVE_EXCEPTION"
      const isRejected = c.recommendation === "REJECT" || c.finalDecision === "REJECT"

      return {
        id: c.id,
        type: "CREDIT_CASE" as const,
        poNumber: poData.poNumber || poData.documentNumber || c.poFileName.replace(".pdf", ""),
        customerName: poData.customerName || "Customer SOA Check",
        documentDate: poData.documentDate || c.createdAt.toISOString().slice(0, 10),
        amount: Number(totals.grandTotal || 0),
        status: (isApproved ? "APPROVED" : isRejected ? "REJECTED" : "PENDING_SOA") as CustomerPoItem["status"],
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
        const poData = (i.extractedData as PoSummaryData | null) || {}
        const totals = poData.totals || {}
        return {
          id: i.id,
          type: "INTAKE" as const,
          poNumber: poData.poNumber || poData.documentNumber || i.fileName.replace(".pdf", ""),
          customerName: i.matchedCustomer?.legalName || poData.customerName || "Pending Matching",
          documentDate: poData.documentDate || i.createdAt.toISOString().slice(0, 10),
          amount: Number(totals.grandTotal || 0),
          status: "PENDING_SOA" as const,
          poR2ObjectKey: i.r2ObjectKey,
          createdAt: i.createdAt.toLocaleString("en-MY"),
          uploadedBy: i.uploadedBy.name,
        }
      }),
  ]

  return (
    <div className="space-y-6">
      <PoCustomerSection items={poCustomerItems} />
    </div>
  )
}

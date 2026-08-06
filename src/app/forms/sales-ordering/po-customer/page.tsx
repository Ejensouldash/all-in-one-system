import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PoCustomerSection, type CustomerPoItem } from "@/components/sales-ordering/PoCustomerSection"
import { canAccessSalesOrderingTab, firstSalesOrderingPath, getSalesOrderingAccess } from "@/lib/sales-ordering/access"

export default async function PoCustomerPage() {
  const access = await getSalesOrderingAccess()
  if (!access) redirect("/dashboard")
  if (!canAccessSalesOrderingTab(access, "dashboard") && !canAccessSalesOrderingTab(access, "intake")) {
    redirect(firstSalesOrderingPath(access))
  }

  const [creditCases, recentIntakes] = await Promise.all([
    prisma.creditCheckCase.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.salesDocumentIntake.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        matchedCustomer: true,
        uploadedBy: { select: { name: true } },
      },
    }),
  ])

  const poCustomerItems: CustomerPoItem[] = [
    ...creditCases.map(c => {
      const poData = (c.poData as Record<string, any>) || {}
      const totals = poData.totals || {}
      const resultData = (c.result as Record<string, any>) || {}
      const isApproved = c.recommendation === "APPROVE" || c.finalDecision === "APPROVE_EXCEPTION"
      const isRejected = c.recommendation === "REJECT" || c.finalDecision === "REJECT"

      return {
        id: c.id,
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
        const poData = (i.extractedData as Record<string, any>) || {}
        const totals = poData.totals || {}
        return {
          id: i.id,
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

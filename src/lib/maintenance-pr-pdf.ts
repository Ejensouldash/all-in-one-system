import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { 
  MaintenancePurchaseRequestDocument, 
  type MaintenancePurchaseRequestPdfData 
} from "@/lib/pdf/MaintenancePurchaseRequestDocument"
import { prisma } from "@/lib/prisma"

/**
 * Compiles a Purchase Requisition into a PDF Buffer in memory
 */
export async function generateMaintenancePurchaseRequestPdfBuffer(
  data: MaintenancePurchaseRequestPdfData
): Promise<Buffer> {
  let logoUrl: string | undefined

  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    logoUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`
  } catch (err) {
    console.warn("[generateMaintenancePurchaseRequestPdfBuffer] Logo file not found, proceeding without logo:", err)
  }

  const doc = React.createElement(MaintenancePurchaseRequestDocument, {
    data: {
      ...data,
      logoUrl: logoUrl || data.logoUrl,
    },
  })

  return await renderToBuffer(doc as any)
}

/**
 * Builds PDF data from database PR record and renders PDF Buffer.
 */
export async function generatePrPdfBufferById(idOrNumber: string): Promise<{ buffer: Buffer; prNumber: string }> {
  const pr = await prisma.maintenancePurchaseRequest.findFirst({
    where: {
      OR: [{ id: idOrNumber }, { prNumber: idOrNumber }]
    },
    include: {
      items: {
        orderBy: { id: "asc" }
      }
    }
  })

  if (!pr) throw new Error(`Purchase Requisition ${idOrNumber} not found`)

  const formatDate = (d?: Date | null) => {
    if (!d) return ""
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const pdfData: MaintenancePurchaseRequestPdfData = {
    prNumber: pr.prNumber,
    company: pr.company,
    department: pr.department,
    date: formatDate(pr.createdAt),
    dateRequired: formatDate(pr.dateRequired),
    requesterName: pr.requesterName,
    requesterDepartment: pr.requesterDepartment,
    requesterSignature: pr.requesterSignature,
    approvedByName: pr.approvedByName,
    approverDepartment: pr.approverDepartment,
    approverSignature: pr.approverSignature,
    approvedDate: formatDate(pr.approvedAt),
    receivedByName: pr.receivedByName,
    receiverDepartment: pr.receiverDepartment,
    receiverSignature: pr.receiverSignature,
    receivedDate: formatDate(pr.receivedAt),
    items: pr.items.map((item, index) => ({
      no: index + 1,
      itemRequested: item.itemRequested,
      brand: item.brand,
      stockBalance: item.stockBalance,
      quantityRequest: item.quantityRequest,
      projectMachine: item.projectMachine,
    }))
  }

  const buffer = await generateMaintenancePurchaseRequestPdfBuffer(pdfData)
  return { buffer, prNumber: pr.prNumber }
}

import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { 
  MaintenancePurchaseRequestDocument, 
  type MaintenancePurchaseRequestPdfData 
} from "@/lib/pdf/MaintenancePurchaseRequestDocument"
import { prisma } from "@/lib/prisma"
import { getSignatureBufferFromR2 } from "@/lib/signature-storage"

/**
 * Resolves a signature string (base64 Data URI, R2 API proxy path, or HTTP URL)
 * into a base64 Data URI string that @react-pdf/renderer can render in Node.js.
 */
async function resolveSignatureToDataUrl(sig?: string | null): Promise<string | null> {
  if (!sig || !sig.trim()) return null
  const trimmed = sig.trim()

  // 1. Already a base64 data URI
  if (trimmed.startsWith("data:image/")) {
    return trimmed
  }

  // 2. Relative API route: /api/users/[userId]/signature
  const userMatch = trimmed.match(/\/api\/users\/([a-zA-Z0-9-]+)\/signature/)
  if (userMatch && userMatch[1]) {
    const userId = userMatch[1]
    try {
      const buffer = await getSignatureBufferFromR2(userId)
      if (buffer) {
        return `data:image/png;base64,${buffer.toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveSignatureToDataUrl] R2 error for user ${userId}:`, err)
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { signatureUrl: true },
      })
      if (user?.signatureUrl && user.signatureUrl !== sig) {
        return await resolveSignatureToDataUrl(user.signatureUrl)
      }
    } catch (err) {
      console.warn(`[resolveSignatureToDataUrl] DB user lookup error for ${userId}:`, err)
    }
  }

  // 3. Absolute HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const res = await fetch(trimmed)
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || "image/png"
        return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveSignatureToDataUrl] Failed fetching URL ${trimmed}:`, err)
    }
  }

  // 4. Relative path starting with /
  if (trimmed.startsWith("/")) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"
      const fullUrl = `${baseUrl.replace(/\/$/, "")}${trimmed}`
      const res = await fetch(fullUrl)
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        const contentType = res.headers.get("content-type") || "image/png"
        return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveSignatureToDataUrl] Failed fetching relative path ${trimmed}:`, err)
    }
  }

  return null
}

/**
 * Fallback to resolve signature by user's full name from DB / R2
 */
async function resolveUserSignatureByName(userName?: string | null): Promise<string | null> {
  if (!userName || !userName.trim()) return null
  try {
    const user = await prisma.user.findFirst({
      where: {
        name: { equals: userName.trim(), mode: "insensitive" },
      },
      select: { id: true, signatureUrl: true },
    })
    if (user?.signatureUrl) {
      return await resolveSignatureToDataUrl(user.signatureUrl)
    }
    if (user?.id) {
      const buffer = await getSignatureBufferFromR2(user.id)
      if (buffer) {
        return `data:image/png;base64,${buffer.toString("base64")}`
      }
    }
  } catch (err) {
    console.warn(`[resolveUserSignatureByName] Error finding signature for ${userName}:`, err)
  }
  return null
}

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

  const requesterSignature = 
    (await resolveSignatureToDataUrl(pr.requesterSignature)) ||
    (await resolveUserSignatureByName(pr.requesterName))

  const approverSignature = 
    (await resolveSignatureToDataUrl(pr.approverSignature)) ||
    (pr.approvedByName ? await resolveUserSignatureByName(pr.approvedByName) : null)

  const receiverSignature = 
    (await resolveSignatureToDataUrl(pr.receiverSignature)) ||
    (pr.receivedByName ? await resolveUserSignatureByName(pr.receivedByName) : null)

  const pdfData: MaintenancePurchaseRequestPdfData = {
    prNumber: pr.prNumber,
    company: pr.company,
    department: pr.department,
    date: formatDate(pr.createdAt),
    dateRequired: formatDate(pr.dateRequired),
    requesterName: pr.requesterName,
    requesterDepartment: pr.requesterDepartment,
    requesterSignature,
    approvedByName: pr.approvedByName,
    approverDepartment: pr.approverDepartment,
    approverSignature,
    approvedDate: formatDate(pr.approvedAt),
    receivedByName: pr.receivedByName,
    receiverDepartment: pr.receiverDepartment,
    receiverSignature,
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

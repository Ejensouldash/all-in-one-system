import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { MaintenanceJobSheetDocument, type MaintenanceJobSheetPdfData } from "@/lib/pdf/MaintenanceJobSheetDocument"
import { 
  uploadMaintenanceJobSheetPdfToR2,
  getMaintenanceFileByExactKeyFromR2
} from "@/lib/maintenance-r2"
import { prisma } from "@/lib/prisma"

/**
 * Resolves a ticket photo record into a Base64 Data URI string
 * so @react-pdf/renderer in Node.js can render it without relative URL network errors.
 */
async function resolveMaintenancePhotoToBase64(photo?: { objectKey?: string | null; fileUrl?: string | null; mimeType?: string | null } | null): Promise<string | null> {
  if (!photo) return null

  // 1. If fileUrl is already a base64 data URI
  if (photo.fileUrl?.startsWith("data:image/")) {
    return photo.fileUrl
  }

  // 2. Fetch directly from Cloudflare R2 using objectKey
  if (photo.objectKey) {
    try {
      const res = await getMaintenanceFileByExactKeyFromR2(photo.objectKey)
      if (res?.buffer) {
        const mime = photo.mimeType || res.contentType || "image/jpeg"
        return `data:${mime};base64,${res.buffer.toString("base64")}`
      }
    } catch (r2Err) {
      console.warn(`[resolveMaintenancePhotoToBase64] R2 error for key ${photo.objectKey}:`, r2Err)
    }
  }

  // 3. Fallback: if fileUrl is an absolute HTTP/HTTPS URL
  if (photo.fileUrl?.startsWith("http://") || photo.fileUrl?.startsWith("https://")) {
    try {
      const resp = await fetch(photo.fileUrl)
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer()
        const mime = resp.headers.get("content-type") || photo.mimeType || "image/jpeg"
        return `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`
      }
    } catch (fetchErr) {
      console.warn(`[resolveMaintenancePhotoToBase64] Fetch error for ${photo.fileUrl}:`, fetchErr)
    }
  }

  // 4. Fallback: if fileUrl is a relative path (/api/public/...)
  if (photo.fileUrl?.startsWith("/")) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"
      const fullUrl = `${baseUrl.replace(/\/$/, "")}${photo.fileUrl}`
      const resp = await fetch(fullUrl)
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer()
        const mime = resp.headers.get("content-type") || photo.mimeType || "image/jpeg"
        return `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`
      }
    } catch (relErr) {
      console.warn(`[resolveMaintenancePhotoToBase64] Relative fetch error for ${photo.fileUrl}:`, relErr)
    }
  }

  return photo.fileUrl || null
}

/**
 * Compiles a Maintenance Job Sheet & Billing Memo into a PDF Buffer in memory
 */
export async function generateMaintenanceJobSheetPdfBuffer(data: MaintenanceJobSheetPdfData): Promise<Buffer> {
  let logoUrl: string | undefined

  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    logoUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`
  } catch (err) {
    console.warn("[generateMaintenanceJobSheetPdfBuffer] Logo file not found or unreadable, proceeding without logo:", err)
  }

  const doc = React.createElement(MaintenanceJobSheetDocument, {
    data: {
      ...data,
      logoUrl: logoUrl || data.logoUrl,
    },
  })

  return await renderToBuffer(doc as any)
}

/**
 * Builds Job Sheet data from a closed ticket, renders PDF, uploads to Cloudflare R2,
 * and updates ticket with jobSheetNumber and jobSheetPdfUrl.
 */
export async function generateAndSaveMaintenanceJobSheet(ticketId: string): Promise<{ jobSheetNumber: string; url: string }> {
  const ticket = await prisma.maintenanceTicket.findUnique({
    where: { id: ticketId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
      costs: true,
      photos: true,
    },
  })

  if (!ticket) throw new Error(`MaintenanceTicket with id ${ticketId} not found`)

  const formattedLog = `BO2-MT-${ticket.ticketNumber.toString().padStart(4, "0")}`
  const jobSheetNumber = ticket.jobSheetNumber || `BO2-MJS-${ticket.ticketNumber.toString().padStart(4, "0")}`

  const beforePhoto = ticket.photos.find((p) => p.category === "BEFORE")
  const progressPhoto = ticket.photos.find((p) => p.category === "PROGRESS")
  const afterPhoto = ticket.photos.find((p) => p.category === "AFTER")

  const [beforePhotoUrl, progressPhotoUrl, afterPhotoUrl] = await Promise.all([
    resolveMaintenancePhotoToBase64(beforePhoto),
    resolveMaintenancePhotoToBase64(progressPhoto),
    resolveMaintenancePhotoToBase64(afterPhoto),
  ])

  const totalCost = ticket.costs.reduce((sum, c) => sum + (c.amount || 0), 0)

  const pdfData: MaintenanceJobSheetPdfData = {
    jobSheetNumber,
    ticketNumber: formattedLog,
    title: ticket.title,
    reasonOfWork: ticket.reasonOfWork,
    ticketType: ticket.ticketType,
    priority: ticket.priority,
    location: ticket.location,
    specificArea: ticket.specificArea,
    requesterName: ticket.requesterName,
    requesterPhone: ticket.requesterPhone,
    requesterEmail: ticket.requesterEmail,
    picName: ticket.closedBy?.name || ticket.acknowledgedBy?.name || "Maintenance Lead",
    technicianName: ticket.assignee?.name || ticket.assigneeName || "In-house Technician",
    startedAt: ticket.startedAt ? new Date(ticket.startedAt).toLocaleString("en-GB") : null,
    completedAt: ticket.workCompletedAt ? new Date(ticket.workCompletedAt).toLocaleString("en-GB") : null,
    closedAt: new Date(ticket.closedAt || new Date()).toLocaleString("en-GB"),
    kpiStatus: ticket.kpiStatus,
    kpiRepairHours: ticket.kpiRepairHours,
    rootCause: ticket.rootCause,
    resolution: ticket.resolution,
    noPhotoReason: ticket.noPhotoReason,
    beforePhotoUrl,
    progressPhotoUrl,
    afterPhotoUrl,
    costs: ticket.costs.map((c) => ({
      category: c.category,
      itemName: c.itemName,
      quantity: c.quantity,
      unit: c.unit,
      unitPrice: c.unitPrice,
      amount: c.amount,
    })),
    totalCost,
  }

  const pdfBuffer = await generateMaintenanceJobSheetPdfBuffer(pdfData)
  const { url } = await uploadMaintenanceJobSheetPdfToR2(pdfBuffer, jobSheetNumber)

  await prisma.maintenanceTicket.update({
    where: { id: ticketId },
    data: {
      jobSheetNumber,
      jobSheetPdfUrl: url,
    },
  })

  return { jobSheetNumber, url }
}

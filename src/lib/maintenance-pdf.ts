import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { MaintenanceJobSheetDocument, type MaintenanceJobSheetPdfData } from "@/lib/pdf/MaintenanceJobSheetDocument"
import { uploadMaintenanceJobSheetPdfToR2 } from "@/lib/maintenance-r2"
import { prisma } from "@/lib/prisma"

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
  const afterPhoto = ticket.photos.find((p) => p.category === "AFTER")

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
    beforePhotoUrl: beforePhoto?.fileUrl || null,
    afterPhotoUrl: afterPhoto?.fileUrl || null,
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

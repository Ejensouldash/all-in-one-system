import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { getMarketingPhotoFromR2, type MarketingCategory } from "@/lib/marketing-r2"
import {
  EventSatisfactionReportDocument,
  type EventReportData,
  type EventReportAttachment,
  type EventReportFeedbackItem,
} from "./pdf/EventSatisfactionReportDocument"

/**
 * Resolves an image path or URL into a base64 data URI for reliable @react-pdf/renderer rendering.
 * Supports:
 *  1. Base64 data URIs directly
 *  2. Cloudflare R2 images from /api/public/marketing/image/[category]/[filename]
 *  3. Direct R2 object keys (e.g. marketing/events/...)
 *  4. Local files in /uploads/...
 *  5. Remote HTTP/HTTPS URLs (fetched with timeout)
 */
async function resolveImageToDataUri(urlOrPath: string): Promise<string | null> {
  if (!urlOrPath) return null
  const trimmed = urlOrPath.trim()

  if (trimmed.startsWith("data:image/")) {
    return trimmed
  }

  // 1. Marketing public image API endpoint from Cloudflare R2
  // Format: /api/public/marketing/image/[category]/[filename] or full URL containing it
  if (trimmed.includes("/api/public/marketing/image/")) {
    try {
      const sub = trimmed.split("/api/public/marketing/image/")[1]
      const parts = sub.split("/")
      const category = (parts.length > 1 ? parts[0] : "events") as MarketingCategory
      const filename = parts.length > 1 ? parts.slice(1).join("/") : parts[0]

      const photo = await getMarketingPhotoFromR2(category, filename)
      if (photo) {
        return `data:${photo.contentType};base64,${photo.buffer.toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed fetching R2 photo for ${trimmed}:`, err)
    }
  }

  // 2. Direct R2 key: marketing/events/...
  if (trimmed.startsWith("marketing/")) {
    try {
      const parts = trimmed.split("/")
      const category = (parts[1] || "events") as MarketingCategory
      const filename = parts.slice(2).join("/")
      const photo = await getMarketingPhotoFromR2(category, filename)
      if (photo) {
        return `data:${photo.contentType};base64,${photo.buffer.toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed fetching R2 key ${trimmed}:`, err)
    }
  }

  // 3. Local uploads path: /uploads/...
  if (trimmed.startsWith("/uploads/")) {
    try {
      const localDiskPath = path.join(process.cwd(), "public", trimmed.replace(/^\//, ""))
      const fileBuf = await readFile(localDiskPath)
      const ext = path.extname(localDiskPath).toLowerCase().replace(".", "") || "jpeg"
      const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
      return `data:${mime};base64,${fileBuf.toString("base64")}`
    } catch (err) {
      // If local disk read fails (e.g. serverless read-only disk on Vercel), try R2 fallback with filename
      try {
        const fallbackFilename = path.basename(trimmed)
        const photo = await getMarketingPhotoFromR2("events", fallbackFilename)
        if (photo) {
          return `data:${photo.contentType};base64,${photo.buffer.toString("base64")}`
        }
      } catch {
        // ignore fallback error
      }
      console.warn(`[resolveImageToDataUri] Failed reading local file ${trimmed}:`, err)
    }
  }

  // 4. Remote HTTP or HTTPS URL (R2 CDN or external)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(trimmed, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        const mime = res.headers.get("content-type") || "image/jpeg"
        return `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`
      }
    } catch (err) {
      console.warn(`[resolveImageToDataUri] Failed fetching remote image ${trimmed}:`, err)
    }
  }

  return null
}

function formatDateDisplay(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const dateObj = typeof d === "string" ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return null
  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/**
 * Fetches event data and compiles the 10-page executive PDF report into a Buffer.
 */
export async function generateEventSatisfactionPdfBuffer(
  requisitionId: string
): Promise<{ buffer: Buffer; fileName: string }> {
  const event = await prisma.marketingEventRequisition.findUnique({
    where: { id: requisitionId },
    include: {
      feedbacks: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!event) {
    throw new Error(`Event requisition not found for ID: ${requisitionId}`)
  }

  // Resolve logo
  let logoDataUri: string | undefined
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png")
    const logoBuffer = await readFile(logoPath)
    logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`
  } catch (err) {
    console.warn("Bubbles O2 logo not found, generating PDF without logo:", err)
  }

  // Parse attachments
  let parsedAttachments: EventReportAttachment[] = []
  try {
    if (event.attachments) {
      const parsed = JSON.parse(event.attachments)
      if (Array.isArray(parsed)) {
        parsedAttachments = parsed
      }
    }
  } catch {
    parsedAttachments = []
  }

  // Parse gallery images
  let parsedGallery: EventReportAttachment[] = []
  try {
    if (event.galleryAttachments) {
      const parsed = JSON.parse(event.galleryAttachments)
      if (Array.isArray(parsed)) {
        parsedGallery = parsed
      }
    }
  } catch {
    parsedGallery = []
  }

  // Resolve gallery and attachment image data URIs in parallel
  const resolvedAttachments: EventReportAttachment[] = []
  for (const att of parsedAttachments) {
    const dataUri = await resolveImageToDataUri(att.url)
    resolvedAttachments.push({
      name: att.name,
      url: dataUri || att.url,
      type: att.type,
    })
  }

  const resolvedGallery: EventReportAttachment[] = []
  for (const gal of parsedGallery) {
    const dataUri = await resolveImageToDataUri(gal.url)
    resolvedGallery.push({
      name: gal.name,
      url: dataUri || gal.url,
      type: gal.type,
    })
  }

  const dateFromStr = formatDateDisplay(event.eventDateFrom)
  const dateToStr = formatDateDisplay(event.eventDateTo)

  const feedbacks: EventReportFeedbackItem[] = event.feedbacks.map((f) => ({
    id: f.id,
    respondentName: f.respondentName,
    likedMost: f.likedMost,
    likedLeast: f.likedLeast,
    satisfaction: f.satisfaction,
    wellOrganized: f.wellOrganized,
    comments: f.comments,
    createdAt: f.createdAt.toISOString(),
  }))

  const reportData: EventReportData = {
    requestNumber: event.requestNumber,
    eventName: event.eventName,
    eventType: event.eventType,
    organizer: event.organizer,
    department: event.department,
    requesterName: event.name,
    staffId: event.staffId,
    email: event.email,
    phone: event.phone || null,
    picContactName: event.picContactName,
    picContactNumber: event.picContactNumber,
    eventDateFrom: dateFromStr,
    eventDateTo: dateToStr,
    tentative: event.tentative,
    requirements: event.requirements,
    status: event.status,
    logoPath: logoDataUri,
    attachments: resolvedAttachments,
    gallery: resolvedGallery,
    feedbacks,
    generatedAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }

  const doc = React.createElement(EventSatisfactionReportDocument, { data: reportData })
  const buffer = await renderToBuffer(doc as any)

  const sanitizedEventName = event.eventName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
  const fileName = `BubblesO2_Report_${event.requestNumber}_${sanitizedEventName}.pdf`

  return {
    buffer,
    fileName,
  }
}

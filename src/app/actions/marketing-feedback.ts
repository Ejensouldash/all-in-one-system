"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import fs from "fs"
import path from "path"

export interface FeedbackSubmissionInput {
  requisitionId: string
  respondentName: string
  likedMost: string
  likedLeast: string
  satisfaction: string
  wellOrganized: boolean
  comments: string
  hp_website?: string
}

export interface FeedbackItem {
  id: string
  respondentName: string
  likedMost: string
  likedLeast: string
  satisfaction: string
  wellOrganized: boolean
  comments: string
  createdAt: Date | string
}

export interface FeedbackSummaryStats {
  totalCount: number
  satisfactionCounts: {
    EXTREMELY_SATISFIED: number
    VERY_SATISFIED: number
    SOMEWHAT_SATISFIED: number
    NOT_SO_SATISFIED: number
    NOT_AT_ALL_SATISFIED: number
  }
  satisfactionScore: number // Score 0-100
  positiveSatisfactionPercent: number
  organizationYes: number
  organizationNo: number
  organizationApprovalPercent: number
  recentFeedbacks: FeedbackItem[]
}

export interface GalleryImageItem {
  name: string
  url: string
  size: number
  type: string
  uploadedAt?: string
}

const SATISFACTION_WEIGHTS: Record<string, number> = {
  EXTREMELY_SATISFIED: 100,
  VERY_SATISFIED: 80,
  SOMEWHAT_SATISFIED: 60,
  NOT_SO_SATISFIED: 40,
  NOT_AT_ALL_SATISFIED: 20,
}

/**
 * Public action: Submit event satisfaction feedback form.
 * No login required.
 */
export async function submitMarketingEventFeedback(input: FeedbackSubmissionInput) {
  try {
    const { requisitionId, respondentName, likedMost, likedLeast, satisfaction, wellOrganized, comments, hp_website } = input

    if (hp_website) {
      return { success: true, data: { id: "feedback-received" } }
    }

    if (!requisitionId || !respondentName.trim()) {
      return { success: false, error: "Please enter your name." }
    }
    if (!likedMost.trim()) {
      return { success: false, error: "Please state what you liked most about the event." }
    }
    if (!likedLeast.trim()) {
      return { success: false, error: "Please state what you liked least about the event." }
    }
    if (!satisfaction) {
      return { success: false, error: "Please select how satisfied you were with the event." }
    }
    if (!comments.trim()) {
      return { success: false, error: "Please provide comments or suggestions for improvement." }
    }

    if (
      respondentName.length > 100 ||
      likedMost.length > 2000 ||
      likedLeast.length > 2000 ||
      comments.length > 5000
    ) {
      return { success: false, error: "One or more input fields exceed the maximum allowable limit." }
    }

    // Verify event exists and is approved
    const event = await prisma.marketingEventRequisition.findUnique({
      where: { id: requisitionId },
      select: { id: true, status: true, eventName: true },
    })

    if (!event) {
      return { success: false, error: "The requested event could not be found." }
    }

    if (event.status !== "APPROVED") {
      return {
        success: false,
        error: "This event is currently not open for feedback submissions.",
      }
    }

    const created = await prisma.marketingEventFeedback.create({
      data: {
        requisitionId,
        respondentName: respondentName.trim(),
        likedMost: likedMost.trim(),
        likedLeast: likedLeast.trim(),
        satisfaction,
        wellOrganized: Boolean(wellOrganized),
        comments: comments.trim(),
      },
    })

    revalidatePath("/marketing/events")
    revalidatePath(`/public/marketing/events/${requisitionId}/feedback`)

    return {
      success: true,
      id: created.id,
      eventName: event.eventName,
    }
  } catch (error: any) {
    console.error("Error submitting event feedback:", error)
    return {
      success: false,
      error: error.message || "Failed to submit feedback. Please try again.",
    }
  }
}

/**
 * Get comprehensive summary stats and feedback items for an event.
 */
export async function getMarketingEventFeedbackSummary(requisitionId: string): Promise<{
  success: boolean
  stats?: FeedbackSummaryStats
  error?: string
}> {
  try {
    const feedbacks = await prisma.marketingEventFeedback.findMany({
      where: { requisitionId },
      orderBy: { createdAt: "desc" },
    })

    const totalCount = feedbacks.length
    const satisfactionCounts = {
      EXTREMELY_SATISFIED: 0,
      VERY_SATISFIED: 0,
      SOMEWHAT_SATISFIED: 0,
      NOT_SO_SATISFIED: 0,
      NOT_AT_ALL_SATISFIED: 0,
    }

    let organizationYes = 0
    let organizationNo = 0
    let totalScoreSum = 0

    feedbacks.forEach((f) => {
      if (f.satisfaction in satisfactionCounts) {
        satisfactionCounts[f.satisfaction as keyof typeof satisfactionCounts]++
      }
      totalScoreSum += SATISFACTION_WEIGHTS[f.satisfaction] || 60

      if (f.wellOrganized) {
        organizationYes++
      } else {
        organizationNo++
      }
    })

    const positiveCount = satisfactionCounts.EXTREMELY_SATISFIED + satisfactionCounts.VERY_SATISFIED
    const positiveSatisfactionPercent = totalCount > 0 ? Math.round((positiveCount / totalCount) * 100) : 0
    const organizationApprovalPercent = totalCount > 0 ? Math.round((organizationYes / totalCount) * 100) : 0
    const satisfactionScore = totalCount > 0 ? Math.round(totalScoreSum / totalCount) : 0

    return {
      success: true,
      stats: {
        totalCount,
        satisfactionCounts,
        satisfactionScore,
        positiveSatisfactionPercent,
        organizationYes,
        organizationNo,
        organizationApprovalPercent,
        recentFeedbacks: feedbacks.map((f) => ({
          id: f.id,
          respondentName: f.respondentName,
          likedMost: f.likedMost,
          likedLeast: f.likedLeast,
          satisfaction: f.satisfaction,
          wellOrganized: f.wellOrganized,
          comments: f.comments,
          createdAt: f.createdAt,
        })),
      },
    }
  } catch (error: any) {
    console.error("Error retrieving feedback summary:", error)
    return { success: false, error: error.message || "Failed to load feedback summary" }
  }
}

/**
 * Upload additional event gallery photos for the illustrated PDF report.
 */
export async function uploadMarketingEventGalleryImages(requisitionId: string, formData: FormData) {
  try {
    const files = formData.getAll("images") as File[]
    if (!files || files.length === 0) {
      return { success: false, error: "No images provided" }
    }

    const event = await prisma.marketingEventRequisition.findUnique({
      where: { id: requisitionId },
      select: { galleryAttachments: true },
    })

    if (!event) {
      return { success: false, error: "Event requisition not found" }
    }

    let currentGallery: GalleryImageItem[] = []
    try {
      if (event.galleryAttachments) {
        currentGallery = JSON.parse(event.galleryAttachments)
      }
    } catch {
      currentGallery = []
    }

    const uploadedItems: GalleryImageItem[] = []

    for (const file of files) {
      if (!file || file.size === 0) continue
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      try {
        const { url } = await uploadMarketingPhotoToR2(
          buffer,
          file.name,
          file.type || "image/jpeg",
          "events"
        )
        uploadedItems.push({
          name: file.name,
          url,
          size: file.size,
          type: file.type || "image/jpeg",
          uploadedAt: new Date().toISOString(),
        })
      } catch (r2Err) {
        console.warn("Failed to upload gallery image to R2, trying local storage or base64 fallback:", r2Err)
        try {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "marketing", "events", "gallery")
          await fs.promises.mkdir(uploadDir, { recursive: true })

          const ext = path.extname(file.name) || ".jpg"
          const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
          const uniqueName = `gal-${Date.now()}-${Math.floor(Math.random() * 1000)}-${cleanBase}${ext}`
          const filePath = path.join(uploadDir, uniqueName)

          await fs.promises.writeFile(filePath, buffer)

          uploadedItems.push({
            name: file.name,
            url: `/uploads/marketing/events/gallery/${uniqueName}`,
            size: file.size,
            type: file.type || "image/jpeg",
            uploadedAt: new Date().toISOString(),
          })
        } catch (localErr) {
          console.warn("Local storage write failed, falling back to base64 data URI:", localErr)
          const base64 = buffer.toString("base64")
          const mime = file.type || "image/jpeg"
          uploadedItems.push({
            name: file.name,
            url: `data:${mime};base64,${base64}`,
            size: file.size,
            type: mime,
            uploadedAt: new Date().toISOString(),
          })
        }
      }
    }

    const updatedGallery = [...currentGallery, ...uploadedItems]

    await prisma.marketingEventRequisition.update({
      where: { id: requisitionId },
      data: {
        galleryAttachments: JSON.stringify(updatedGallery),
      },
    })

    revalidatePath("/marketing/events")

    return {
      success: true,
      gallery: updatedGallery,
      addedCount: uploadedItems.length,
    }
  } catch (error: any) {
    console.error("Error uploading event gallery images:", error)
    return { success: false, error: error.message || "Failed to upload gallery images" }
  }
}

/**
 * Remove an image from the event gallery.
 */
export async function deleteMarketingEventGalleryImage(requisitionId: string, imageUrl: string) {
  try {
    const event = await prisma.marketingEventRequisition.findUnique({
      where: { id: requisitionId },
      select: { galleryAttachments: true },
    })

    if (!event) return { success: false, error: "Event requisition not found" }

    let currentGallery: GalleryImageItem[] = []
    try {
      if (event.galleryAttachments) {
        currentGallery = JSON.parse(event.galleryAttachments)
      }
    } catch {
      currentGallery = []
    }

    const updatedGallery = currentGallery.filter((item) => item.url !== imageUrl)

    await prisma.marketingEventRequisition.update({
      where: { id: requisitionId },
      data: {
        galleryAttachments: JSON.stringify(updatedGallery),
      },
    })

    revalidatePath("/marketing/events")
    return { success: true, gallery: updatedGallery }
  } catch (error: any) {
    console.error("Error deleting gallery image:", error)
    return { success: false, error: error.message || "Failed to delete gallery image" }
  }
}

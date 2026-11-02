import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadMarketingPhotoToR2 } from "@/lib/marketing-r2"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

interface GalleryImageItem {
  name: string
  url: string
  size: number
  type: string
  uploadedAt: string
}

/**
 * POST /api/marketing/events/[id]/gallery
 * Upload one or multiple gallery photos for an event requisition.
 * Handles Cloudflare R2 upload with resilient local/base64 fallback.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await req.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No images provided" }, { status: 400 })
    }

    const event = await prisma.marketingEventRequisition.findUnique({
      where: { id },
      select: { galleryAttachments: true },
    })

    if (!event) {
      return NextResponse.json({ success: false, error: "Event requisition not found" }, { status: 404 })
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
      const mime = file.type || "image/jpeg"

      try {
        const { url } = await uploadMarketingPhotoToR2(
          buffer,
          file.name,
          mime,
          "events"
        )
        uploadedItems.push({
          name: file.name,
          url,
          size: file.size,
          type: mime,
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
            type: mime,
            uploadedAt: new Date().toISOString(),
          })
        } catch (localErr) {
          console.warn("Local storage write failed, falling back to base64 data URI:", localErr)
          const base64 = buffer.toString("base64")
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
      where: { id },
      data: {
        galleryAttachments: JSON.stringify(updatedGallery),
      },
    })

    return NextResponse.json({
      success: true,
      gallery: updatedGallery,
      addedCount: uploadedItems.length,
    })
  } catch (err: any) {
    console.error("Gallery API error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload gallery images" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/marketing/events/[id]/gallery
 * Remove a specific image URL from the event gallery.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "Image URL required" }, { status: 400 })
    }

    const event = await prisma.marketingEventRequisition.findUnique({
      where: { id },
      select: { galleryAttachments: true },
    })

    if (!event) {
      return NextResponse.json({ success: false, error: "Event requisition not found" }, { status: 404 })
    }

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
      where: { id },
      data: {
        galleryAttachments: JSON.stringify(updatedGallery),
      },
    })

    return NextResponse.json({ success: true, gallery: updatedGallery })
  } catch (err: any) {
    console.error("Gallery delete error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete gallery image" },
      { status: 500 }
    )
  }
}

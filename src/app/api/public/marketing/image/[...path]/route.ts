import { NextRequest, NextResponse } from "next/server"
import { getMarketingPhotoFromR2, MarketingCategory } from "@/lib/marketing-r2"
import { getMaintenancePhotoFromR2 } from "@/lib/maintenance-r2"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await props.params
    if (!path || path.length === 0) {
      return new NextResponse("Filename is required", { status: 400 })
    }

    let category: MarketingCategory = "items"
    let filename = ""

    if (path.length === 1) {
      filename = path[0]
      // Try items first, then fallback to assets / events
      let photo = await getMarketingPhotoFromR2("items", filename)
      if (!photo) photo = await getMarketingPhotoFromR2("assets", filename)
      if (!photo) photo = await getMarketingPhotoFromR2("events", filename)
      if (!photo) {
        // Fallback check in maintenance-tickets just in case older legacy files are requested
        photo = await getMaintenancePhotoFromR2(filename)
      }

      if (!photo) {
        return new NextResponse("Photo not found", { status: 404 })
      }

      const headers = new Headers()
      headers.set("Content-Type", photo.contentType)
      headers.set("Cache-Control", "public, max-age=31536000, immutable")

      return new NextResponse(photo.buffer as any, {
        status: 200,
        headers,
      })
    } else {
      category = (path[0] as MarketingCategory) || "items"
      filename = path.slice(1).join("/")

      let photo = await getMarketingPhotoFromR2(category, filename)
      if (!photo) {
        // Fallback to legacy maintenance folder if needed
        photo = await getMaintenancePhotoFromR2(filename)
      }

      if (!photo) {
        return new NextResponse("Photo not found", { status: 404 })
      }

      const headers = new Headers()
      headers.set("Content-Type", photo.contentType)
      headers.set("Cache-Control", "public, max-age=31536000, immutable")

      return new NextResponse(photo.buffer as any, {
        status: 200,
        headers,
      })
    }
  } catch (error) {
    console.error("Error serving marketing photo:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

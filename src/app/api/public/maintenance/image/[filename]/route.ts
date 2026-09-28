import { NextRequest, NextResponse } from "next/server"
import { getMaintenancePhotoFromR2 } from "@/lib/maintenance-r2"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await props.params
    if (!filename) {
      return new NextResponse("Filename is required", { status: 400 })
    }

    const photo = await getMaintenancePhotoFromR2(filename)
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
  } catch (error) {
    console.error("Error serving maintenance photo:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

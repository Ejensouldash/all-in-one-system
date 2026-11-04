import { NextRequest, NextResponse } from "next/server"
import { getMaintenancePresignedUrl, checkMaintenancePhotoExists } from "@/lib/maintenance-r2"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await props.params
    if (!filename) {
      return new NextResponse("Filename is required", { status: 400 })
    }

    const exists = await checkMaintenancePhotoExists(filename)
    if (!exists) {
      return new NextResponse("Photo not found", { status: 404 })
    }

    const redirectUrl = await getMaintenancePresignedUrl(filename)
    if (!redirectUrl) {
      return new NextResponse("Failed to generate file access URL", { status: 500 })
    }

    // Zero-egress HTTP 302 Redirect directly to Cloudflare R2 presigned / CDN URL
    const response = NextResponse.redirect(redirectUrl, { status: 302 })
    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400")
    return response
  } catch (error) {
    console.error("Error serving maintenance photo redirect:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

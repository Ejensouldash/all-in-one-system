import { NextRequest, NextResponse } from "next/server"
import { getMarketingPresignedUrl, checkMarketingObjectExists, MarketingCategory } from "@/lib/marketing-r2"
import { getMaintenancePresignedUrl, checkMaintenancePhotoExists } from "@/lib/maintenance-r2"

export const dynamic = "force-dynamic"

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
    let redirectUrl: string | null = null

    if (path.length === 1) {
      filename = path[0]
      const categories: MarketingCategory[] = ["items", "assets", "events", "creative"]
      
      for (const cat of categories) {
        if (await checkMarketingObjectExists(cat, filename)) {
          redirectUrl = await getMarketingPresignedUrl(cat, filename)
          break
        }
      }

      if (!redirectUrl && (await checkMaintenancePhotoExists(filename))) {
        redirectUrl = await getMaintenancePresignedUrl(filename)
      }
    } else {
      category = (path[0] as MarketingCategory) || "items"
      filename = path.slice(1).join("/")

      if (await checkMarketingObjectExists(category, filename)) {
        redirectUrl = await getMarketingPresignedUrl(category, filename)
      } else if (await checkMaintenancePhotoExists(filename)) {
        redirectUrl = await getMaintenancePresignedUrl(filename)
      }
    }

    if (!redirectUrl) {
      return new NextResponse("Photo not found", { status: 404 })
    }

    // Zero-egress HTTP 302 Redirect directly to Cloudflare R2 presigned / CDN URL
    const response = NextResponse.redirect(redirectUrl, { status: 302 })
    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400")
    return response
  } catch (error) {
    console.error("Error serving marketing photo redirect:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

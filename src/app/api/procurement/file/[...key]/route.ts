import { NextRequest, NextResponse } from "next/server"
import { getProcurementFileStream } from "@/lib/procurement-storage"
import { getAccessInfo } from "@/lib/access"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const access = await getAccessInfo()
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { key } = await params
    const objectKey = key.join("/")

    if (!objectKey.startsWith("procurement/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const response = await getProcurementFileStream(objectKey)
    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const stream = response.Body as any
    const contentType = response.ContentType || "application/octet-stream"

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    })
  } catch (error: any) {
    console.error("Error serving procurement file:", error)
    return NextResponse.json({ error: "Error reading file" }, { status: 500 })
  }
}

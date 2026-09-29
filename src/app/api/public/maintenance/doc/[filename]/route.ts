import { NextRequest, NextResponse } from "next/server"
import { getMaintenanceFileByExactKeyFromR2, getMaintenanceDocKey } from "@/lib/maintenance-r2"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await props.params
    if (!filename) {
      return new NextResponse("Filename is required", { status: 400 })
    }

    const key = getMaintenanceDocKey(filename)
    const file = await getMaintenanceFileByExactKeyFromR2(key)
    if (!file) {
      return new NextResponse("Document not found", { status: 404 })
    }

    const headers = new Headers()
    headers.set("Content-Type", file.contentType)
    headers.set("Content-Disposition", `inline; filename="${filename}"`)
    headers.set("Cache-Control", "public, max-age=3600")

    return new NextResponse(file.buffer as any, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error serving maintenance doc:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

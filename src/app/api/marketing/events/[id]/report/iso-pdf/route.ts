import { NextRequest, NextResponse } from "next/server"
import { generatePostEventIsoPdfBuffer } from "@/lib/marketing-post-event-pdf"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    if (!id) {
      return new NextResponse("Event ID is required", { status: 400 })
    }

    const { buffer, fileName } = await generatePostEventIsoPdfBuffer(id)

    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `inline; filename="${fileName}"`)
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate")

    return new NextResponse(buffer as any, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("Error generating Post-Event ISO Report PDF:", error)
    return new NextResponse(error.message || "Failed to generate Post-Event Report PDF", { status: 500 })
  }
}

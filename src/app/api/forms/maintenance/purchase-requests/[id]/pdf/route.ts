import { NextRequest, NextResponse } from "next/server"
import { generatePrPdfBufferById } from "@/lib/maintenance-pr-pdf"

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    if (!id) {
      return new NextResponse("Purchase Requisition ID is required", { status: 400 })
    }

    const { buffer, prNumber } = await generatePrPdfBufferById(id)

    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set("Content-Disposition", `inline; filename="${prNumber}.pdf"`)
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate")

    return new NextResponse(buffer as any, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    console.error("Error generating Purchase Requisition PDF:", error)
    return new NextResponse(error.message || "Failed to generate PR PDF", { status: 500 })
  }
}

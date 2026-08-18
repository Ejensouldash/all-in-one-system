import { NextRequest, NextResponse } from "next/server"
import { submitExternalGatePass } from "@/lib/warehouse/gatepass-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > 32_000) return NextResponse.json({ success: false, error: "Request terlalu besar." }, { status: 413 })
  try {
    const { token } = await params
    const body = await request.json()
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")
    const result = await submitExternalGatePass(token, body, {
      ipAddress,
      userAgent: request.headers.get("user-agent"),
    })
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission gagal."
    return NextResponse.json({ success: false, error: message }, { status: 400, headers: { "Cache-Control": "no-store" } })
  }
}

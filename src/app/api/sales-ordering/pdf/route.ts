import { NextResponse } from "next/server"
import { getSalesOrderingAccess } from "@/lib/sales-ordering/access"
import { createPdfViewUrl, readR2Object } from "@/lib/sales-ordering/r2"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const access = await getSalesOrderingAccess()
  if (!access) return NextResponse.json({ error: "Unauthorized access." }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")
  const direct = searchParams.get("direct") === "true"

  if (!key) {
    return NextResponse.json({ error: "Object key is required." }, { status: 400 })
  }

  try {
    if (direct) {
      const buffer = await readR2Object(key)
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline",
          "Cache-Control": "public, max-age=3600",
        },
      })
    }

    const viewUrl = await createPdfViewUrl(key)
    return NextResponse.json({ viewUrl })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve PDF." },
      { status: 500 },
    )
  }
}

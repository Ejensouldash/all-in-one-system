import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getStoreroomReport } from "@/lib/analytics/storeroom"
import { buildStoreroomWorkbook } from "@/lib/excel/StoreroomWorkbook"

export const runtime = "nodejs"
export const maxDuration = 60

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const asOf = typeof body.asOf === "string" && ISO_DATE.test(body.asOf) ? body.asOf : null
    if (!asOf) return NextResponse.json({ error: "Tarikh tidak sah" }, { status: 400 })

    const user = session.user as any
    const preparedBy = user?.name || user?.email || "BubblesO2 AIO System"

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    const report = await getStoreroomReport(asOf)
    const buffer = await buildStoreroomWorkbook(report, preparedBy, generatedAt)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Baki-Storeroom-${asOf}.xlsx"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Failed to generate storeroom workbook:", error)
    return NextResponse.json({ error: error?.message || "Gagal menjana fail Excel" }, { status: 500 })
  }
}

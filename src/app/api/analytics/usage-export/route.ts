import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUsageReport } from "@/lib/analytics/usage"
import { buildUsageWorkbook } from "@/lib/excel/UsageWorkbook"

export const runtime = "nodejs"
export const maxDuration = 60

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    let from = typeof body.from === "string" && ISO_DATE.test(body.from) ? body.from : null
    let to = typeof body.to === "string" && ISO_DATE.test(body.to) ? body.to : null

    if (!from || !to) {
      return NextResponse.json({ error: "Julat tarikh (from dan to) diperlukan dan mesti sah" }, { status: 400 })
    }

    if (from > to) {
      const temp = from
      from = to
      to = temp
    }

    const user = session.user as any
    const preparedBy = user?.name || user?.email || "BubblesO2 AIO System"

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    const report = await getUsageReport(from, to)
    const buffer = await buildUsageWorkbook(report, preparedBy, generatedAt)

    const fileName = `BubblesO2_Usage_Report_${from}_to_${to}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Failed to generate usage workbook:", error)
    return NextResponse.json({ error: error?.message || "Gagal menjana fail Excel Usage" }, { status: 500 })
  }
}

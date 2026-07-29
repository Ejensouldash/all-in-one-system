import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { auth } from "@/auth"
import { computeProductionAnalytics } from "@/lib/analytics/compute"
import { generateExecutiveSummary } from "@/lib/analytics/ai"
import { AnalyticsReportDocument } from "@/lib/pdf/AnalyticsReportDocument"

export const runtime = "nodejs"
export const maxDuration = 60

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

let logoCache: string | null = null

async function loadLogo(): Promise<string> {
  if (logoCache) return logoCache
  const file = await fs.readFile(path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png"))
  logoCache = `data:image/png;base64,${file.toString("base64")}`
  return logoCache
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const from = typeof body.from === "string" && ISO_DATE.test(body.from) ? body.from : null
    const to = typeof body.to === "string" && ISO_DATE.test(body.to) ? body.to : null
    const useAi = body.useAi !== false

    if (!from || !to) {
      return NextResponse.json({ error: "Julat tarikh tidak sah" }, { status: 400 })
    }
    const [start, end] = from <= to ? [from, to] : [to, from]

    const user = session.user as any
    const preparedBy = user?.name || user?.email || "BubblesO2 AIO System"

    const data = await computeProductionAnalytics(start, end)
    const [summary, logo] = await Promise.all([generateExecutiveSummary(data, useAi), loadLogo()])

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    // Sections can overflow onto a second page, so the table of contents cannot be numbered by
    // counting sections. First pass collects the real page each section landed on, second pass
    // prints those numbers.
    const pageMap: Record<string, number> = {}
    await renderToBuffer(
      AnalyticsReportDocument({
        data, summary, logo, preparedBy, generatedAt,
        onResolvePage: (id, page) => {
          if (pageMap[id] === undefined) pageMap[id] = page
        },
      })
    )

    const buffer = await renderToBuffer(
      AnalyticsReportDocument({ data, summary, logo, preparedBy, generatedAt, pageMap })
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Laporan-Analitik-Pengeluaran-${start}-ke-${end}.pdf"`,
        "Content-Length": String(buffer.length),
        "X-Summary-Source": summary.source,
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Failed to generate analytics report:", error)
    return NextResponse.json({ error: error?.message || "Gagal menjana laporan" }, { status: 500 })
  }
}

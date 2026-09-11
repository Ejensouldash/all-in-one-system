import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getPMSummaryData, type PMSummaryFilter } from "@/app/actions/reminder-pm"
import { PMVerificationReportDocument } from "@/lib/pdf/PMVerificationReportDocument"

export const runtime = "nodejs"
export const maxDuration = 60

let logoCache: string | null = null

async function loadLogo(): Promise<string> {
  if (logoCache) return logoCache
  try {
    const file = await fs.readFile(path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png"))
    logoCache = `data:image/png;base64,${file.toString("base64")}`
    return logoCache
  } catch {
    return ""
  }
}

export async function GET(request: Request) {
  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["REMINDERS"]))) {
    return NextResponse.json({ error: "Access denied. REMINDERS module required." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") || undefined
  const to = searchParams.get("to") || undefined
  const rawStatus = (searchParams.get("status") || "ALL") as PMSummaryFilter

  try {
    const data = await getPMSummaryData(from, to, rawStatus)
    const logo = await loadLogo()

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    const buffer = await renderToBuffer(
      PMVerificationReportDocument({
        logo: logo || undefined,
        from: data.queryFrom,
        to: data.queryTo,
        today: data.today,
        generatedAt,
        preparedBy: data.userName || "Quality Operations",
        kpis: data.kpis,
        occurrences: data.occurrences,
      })
    )

    const safeFilename = `SGMP03_PM_Summary_Report_${data.queryFrom}_to_${data.queryTo}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    console.error("PM Summary PDF Export Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to generate PM summary PDF." }, { status: 500 })
  }
}

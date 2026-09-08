import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { fetchPMAuditData } from "@/lib/reminders/pm-audit-data"
import { PMAuditReportDocument } from "@/lib/pdf/PMAuditReportDocument"

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
    return NextResponse.json({ error: "Tiada akses ke modul Reminders." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const equipment = searchParams.get("equipment") || ""
  const status = searchParams.get("status") || ""

  try {
    const data = await fetchPMAuditData(
      { userId: access.userId, isSuperAdmin: access.isSuperAdmin, name: access.name || undefined },
      { from, to, equipment, status }
    )

    const logo = await loadLogo()

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    const buffer = await renderToBuffer(
      PMAuditReportDocument({
        logo: logo || undefined,
        docRef: "SGMP-03 / PMIR",
        from: data.from,
        to: data.to,
        preparedBy: data.preparedBy,
        generatedAt,
        summary: data.summary,
        calendarMatrix: data.calendarMatrix,
        records: data.records,
      })
    )

    const safeFilename = `Laporan_Audit_PM_SGMP03_${data.from}_ke_${data.to}.pdf`

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
    console.error("PDF Export Error:", err)
    return NextResponse.json({ error: err?.message || "Gagal menjana PDF." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { RetentionSampleDocument, type RetentionSamplePdfRow } from "@/lib/pdf/RetentionSampleDocument"

export const runtime = "nodejs"
export const maxDuration = 60

const MONTH_NAMES_MS = [
  "JANUARI", "FEBRUARI", "MAC", "APRIL", "MEI", "JUN",
  "JULAI", "OGOS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DISEMBER"
]

let logoCache: string | null = null

async function loadLogo(): Promise<string> {
  if (logoCache) return logoCache
  try {
    const file = await fs.readFile(path.join(process.cwd(), "public", "assets", "BubblesO2_Logo.png"))
    logoCache = `data:image/png;base64,${file.toString("base64")}`
    return logoCache
  } catch (e) {
    console.error("Could not load logo for retention sample PDF:", e)
    return ""
  }
}

export async function GET(request: Request) {
  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["MAINTENANCE_FORMS", "FORMS"]))) {
    return NextResponse.json({ error: "Tiada kebenaran untuk mengeksport rekod ini." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10)
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)
  const sku = searchParams.get("sku") || ""
  const search = searchParams.get("search") || ""

  try {
    // Month boundaries in Asia/Kuala_Lumpur (UTC+8)
    const startOfMonthMyt = new Date(Date.UTC(year, month - 1, 1, -8, 0, 0, 0))
    const lastDay = new Date(year, month, 0).getDate()
    const endOfMonthMyt = new Date(Date.UTC(year, month - 1, lastDay, 15, 59, 59, 999))

    const whereClause: Prisma.RetentionSampleRecordWhereInput = {
      sampleDateTime: {
        gte: startOfMonthMyt,
        lte: endOfMonthMyt,
      },
    }

    if (sku && sku !== "ALL") {
      whereClause.sku = sku
    }

    if (search && search.trim()) {
      const q = search.trim()
      whereClause.OR = [
        { batchNo: { contains: q, mode: "insensitive" } },
        { preparedByName: { contains: q, mode: "insensitive" } },
      ]
    }

    const records = await prisma.retentionSampleRecord.findMany({
      where: whereClause,
      orderBy: {
        sampleDateTime: "asc",
      },
    })

    const rows: RetentionSamplePdfRow[] = records.map(r => {
      const formattedDate = new Date(r.sampleDateTime).toLocaleString("en-GB", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

      return {
        id: r.id,
        dateTimeStr: formattedDate,
        sku: r.sku,
        amountSample: r.amountSample,
        batchNo: r.batchNo,
        preparedByName: r.preparedByName,
        status: r.status,
      }
    })

    const logoUrl = await loadLogo()
    const monthName = MONTH_NAMES_MS[month - 1] || "OGOS"

    const buffer = await renderToBuffer(
      RetentionSampleDocument({
        payload: {
          monthName,
          year,
          logoUrl,
          rows,
        },
      })
    )

    const filename = `Retention_Sample_Record_${monthName}_${year}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    })
  } catch (error: unknown) {
    console.error("Failed to generate retention sample PDF:", error)
    const message = error instanceof Error ? error.message : "Failed to generate PDF."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

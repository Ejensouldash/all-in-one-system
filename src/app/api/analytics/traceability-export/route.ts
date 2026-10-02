import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getBottleToBoxTraceReport } from "@/lib/analytics/batchTraceability"
import { buildBottleBoxTraceWorkbook } from "@/lib/excel/BottleBoxTraceWorkbook"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const currentYear = new Date().getFullYear()
    const year = Number(body.year) || currentYear
    const week = Number(body.week) || 1
    const line = typeof body.line === "string" ? body.line : "ALL"
    const batchNo = typeof body.batchNo === "string" ? body.batchNo.trim() : ""

    if (year < 2020 || year > 2050 || week < 1 || week > 53) {
      return NextResponse.json({ error: "Invalid Year or ISO Week number." }, { status: 400 })
    }

    const user = session.user as any
    const preparedBy = user?.name || user?.email || "BubblesO2 AIO System"

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    const report = await getBottleToBoxTraceReport({ year, week, line, batchNo })
    const buffer = await buildBottleBoxTraceWorkbook(report, preparedBy, generatedAt)

    const lineSlug = line !== "ALL" ? `_${line.replace(/\s+/g, "_")}` : ""
    const batchSlug = batchNo ? `_Batch_${batchNo.replace(/[^a-zA-Z0-9_-]/g, "")}` : ""
    const fileName = `BubblesO2_Batch_Traceability_${year}_W${String(week).padStart(2, "0")}${lineSlug}${batchSlug}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    console.error("Failed to generate batch traceability workbook:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate Excel Traceability file" }, { status: 500 })
  }
}

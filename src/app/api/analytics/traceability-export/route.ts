import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getBottleToBoxTraceReport } from "@/lib/analytics/batchTraceability"
import { buildBottleBoxTraceWorkbook } from "@/lib/excel/BottleBoxTraceWorkbook"

export const runtime = "nodejs"
export const maxDuration = 60

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const isBatchList = body.dateMode === "BATCH_LIST" || (Array.isArray(body.batchFilters) && body.batchFilters.length > 0)
    const dateMode = isBatchList
      ? "BATCH_LIST"
      : body.dateMode === "CUSTOM" || (body.from && body.to)
      ? "CUSTOM"
      : "ISO_WEEK"

    const currentYear = new Date().getFullYear()
    const year = Number(body.year) || currentYear
    const week = Number(body.week) || 1
    const from = typeof body.from === "string" && ISO_DATE.test(body.from) ? body.from : ""
    const to = typeof body.to === "string" && ISO_DATE.test(body.to) ? body.to : ""
    const line = typeof body.line === "string" ? body.line : "ALL"
    const batchNo = typeof body.batchNo === "string" ? body.batchNo.trim() : ""
    const batchFilters = Array.isArray(body.batchFilters) ? body.batchFilters : []

    if (dateMode === "BATCH_LIST") {
      if (batchFilters.length === 0 && !batchNo) {
        return NextResponse.json(
          { error: "Please provide at least one batch number to trace." },
          { status: 400 }
        )
      }
    } else if (dateMode === "CUSTOM") {
      if (!from || !to) {
        return NextResponse.json(
          { error: "Both From and To dates are required and must be in YYYY-MM-DD format." },
          { status: 400 }
        )
      }
    } else {
      if (year < 2020 || year > 2050 || week < 1 || week > 53) {
        return NextResponse.json({ error: "Invalid Year or ISO Week number." }, { status: 400 })
      }
    }

    const user = session.user as any
    const preparedBy = user?.name || user?.email || "BubblesO2 AIO System"

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    const report = await getBottleToBoxTraceReport({
      dateMode,
      year,
      week,
      from,
      to,
      line,
      batchNo,
      batchFilters,
    })
    const buffer = await buildBottleBoxTraceWorkbook(report, preparedBy, generatedAt)

    const lineSlug = line !== "ALL" ? `_${line.replace(/\s+/g, "_")}` : ""
    const batchSlug = batchNo ? `_Batch_${batchNo.replace(/[^a-zA-Z0-9_-]/g, "")}` : ""

    const fileName =
      dateMode === "BATCH_LIST"
        ? `BubblesO2_Multi_Batch_Traceability_${batchFilters.length || 1}_items${lineSlug}.xlsx`
        : dateMode === "CUSTOM"
        ? `BubblesO2_Batch_Traceability_${from}_to_${to}${lineSlug}${batchSlug}.xlsx`
        : `BubblesO2_Batch_Traceability_${year}_W${String(week).padStart(2, "0")}${lineSlug}${batchSlug}.xlsx`

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

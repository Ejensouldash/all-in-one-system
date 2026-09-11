import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getPMData } from "@/app/actions/reminder-pm"
import { pmStatus, ruleLabel } from "@/lib/reminders/pm-core"
import {
  PMCalendarWallPdfDocument,
  type PMCalendarWallDay,
  type PMCalendarWallTask,
} from "@/lib/pdf/PMCalendarWallPdfDocument"

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

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
]

export async function GET(request: Request) {
  const access = await getAccessInfo()
  if (!access || (!access.isSuperAdmin && !hasAnyModule(access, ["REMINDERS"]))) {
    return NextResponse.json({ error: "Access denied. REMINDERS module required." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10)
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10) // 1-indexed

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month parameter." }, { status: 400 })
  }

  const monthIdx = month - 1
  const monthName = MONTH_NAMES[monthIdx]

  // Date range for the requested month
  const totalDays = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`

  try {
    const data = await getPMData(fromDate, toDate)
    const logo = await loadLogo()

    // Map occurrences by dueDate
    const occByDate = new Map<string, typeof data.occurrences>()
    for (const occ of data.occurrences) {
      const list = occByDate.get(occ.dueDate) || []
      list.push(occ)
      occByDate.set(occ.dueDate, list)
    }

    // Compute calendar grid (Sunday to Saturday)
    const firstDay = new Date(Date.UTC(year, monthIdx, 1))
    const startOffset = firstDay.getUTCDay() // 0 = Sunday
    const prevMonthDays = new Date(Date.UTC(year, monthIdx, 0)).getUTCDate()

    const days: PMCalendarWallDay[] = []

    // 1. Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const prevDate = new Date(Date.UTC(year, monthIdx - 1, d)).toISOString().slice(0, 10)
      const occs = occByDate.get(prevDate) || []
      days.push({
        dayNumber: d,
        dateStr: prevDate,
        isCurrentMonth: false,
        isToday: prevDate === data.today,
        tasks: occs.map((o) => ({
          id: o.id,
          equipment: o.equipment,
          srs: o.srs,
          frequency: o.schedule ? ruleLabel(o.schedule) : "-",
          status: pmStatus(o, data.today),
          result: o.result,
        })),
      })
    }

    // 2. Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const occs = occByDate.get(dateStr) || []
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === data.today,
        tasks: occs.map((o) => ({
          id: o.id,
          equipment: o.equipment,
          srs: o.srs,
          frequency: o.schedule ? ruleLabel(o.schedule) : "-",
          status: pmStatus(o, data.today),
          result: o.result,
        })),
      })
    }

    // 3. Next month padding to reach full weeks (35 or 42 cells)
    const targetCellCount = days.length <= 35 ? 35 : 42
    let nextDayNum = 1
    while (days.length < targetCellCount) {
      const nextDate = new Date(Date.UTC(year, monthIdx + 1, nextDayNum)).toISOString().slice(0, 10)
      const occs = occByDate.get(nextDate) || []
      days.push({
        dayNumber: nextDayNum,
        dateStr: nextDate,
        isCurrentMonth: false,
        isToday: nextDate === data.today,
        tasks: occs.map((o) => ({
          id: o.id,
          equipment: o.equipment,
          srs: o.srs,
          frequency: o.schedule ? ruleLabel(o.schedule) : "-",
          status: pmStatus(o, data.today),
          result: o.result,
        })),
      })
      nextDayNum++
    }

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date())

    let totalCompleted = 0
    let totalOverdue = 0
    for (const occ of data.occurrences) {
      const st = pmStatus(occ, data.today)
      if (st === "DONE") totalCompleted++
      else if (st === "OVERDUE") totalOverdue++
    }

    const buffer = await renderToBuffer(
      PMCalendarWallPdfDocument({
        logo: logo || undefined,
        year,
        month,
        monthName,
        days,
        generatedAt,
        totalScheduled: data.occurrences.length,
        totalCompleted,
        totalOverdue,
      })
    )

    const safeFilename = `PM_Wall_Calendar_${monthName}_${year}.pdf`

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
    console.error("Wall Calendar PDF Export Error:", err)
    return NextResponse.json({ error: err?.message || "Failed to generate wall calendar PDF." }, { status: 500 })
  }
}

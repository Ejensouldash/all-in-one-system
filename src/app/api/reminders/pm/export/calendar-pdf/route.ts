import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { renderToBuffer } from "@react-pdf/renderer"
import { getAccessInfo, hasAnyModule } from "@/lib/access"
import { getPMData } from "@/app/actions/reminder-pm"
import { addDays, pmStatus, ruleLabel } from "@/lib/reminders/pm-core"
import {
  PMCalendarWallPdfDocument,
  type PMCalendarWallDay,
  type PMCalendarWallTask,
} from "@/lib/pdf/PMCalendarWallPdfDocument"
import {
  PMWeeklyWallPdfDocument,
  type PMWeeklyDay,
  type PMWeeklyTask,
} from "@/lib/pdf/PMWeeklyWallPdfDocument"

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
  const view = (searchParams.get("view") || "month").toLowerCase()

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month parameter." }, { status: 400 })
  }

  const monthIdx = month - 1
  const monthName = MONTH_NAMES[monthIdx]

  // Date range for the requested month
  const totalDays = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(totalDays).padStart(2, "0")}`

  // Fetch with 7 days boundary padding so that Monday-to-Sunday week boundary days have tasks
  const fetchFromDate = addDays(fromDate, -7)
  const fetchToDate = addDays(toDate, 7)

  try {
    const data = await getPMData(fetchFromDate, fetchToDate)
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

    const userMap = new Map(data.users.map((u) => [u.id, u.name]))

    // Handle 1-Page Weekly Detailed Work Schedule (Monday to Sunday)
    if (view === "week") {
      const weekParam = parseInt(searchParams.get("week") || "1", 10)

      // Calculate Monday-to-Sunday weeks for the month
      const firstDay = new Date(Date.UTC(year, monthIdx, 1))
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Monday offset: how many days before Day 1 to reach preceding Monday
      const mondayOffset = (firstDay.getUTCDay() + 6) % 7
      const totalMonthDays = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate()
      const maxWeeks = Math.ceil((mondayOffset + totalMonthDays) / 7)
      const weekIdx = Math.max(0, Math.min(maxWeeks - 1, weekParam - 1))

      // The Monday that starts Week 1
      const firstMonday = addDays(fromDate, -mondayOffset)
      const weekStartMonday = addDays(firstMonday, weekIdx * 7)

      // Monday to Sunday column labels
      const DAY_LABELS = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ]

      const weeklyDays: PMWeeklyDay[] = []
      for (let i = 0; i < 7; i++) {
        const curDateStr = addDays(weekStartMonday, i)
        const [curY, curM, curD] = curDateStr.split("-").map(Number)
        const isCurrentMonth = curM === month && curY === year
        const occs = occByDate.get(curDateStr) || []

        weeklyDays.push({
          dayName: DAY_LABELS[i],
          dayNumber: curD,
          dateStr: curDateStr,
          isCurrentMonth,
          isToday: curDateStr === data.today,
          tasks: occs.map((o) => ({
            id: o.id,
            equipment: o.equipment,
            srs: o.srs,
            frequency: o.schedule ? ruleLabel(o.schedule) : "-",
            checklist: o.checklist || [],
            picNames: (o.picIds || []).map((id) => userMap.get(id) || id).filter(Boolean),
            status: pmStatus(o, data.today),
            result: o.result,
          })),
        })
      }

      const weekLabel = `WEEK ${weekIdx + 1} (${monthName} ${year})`
      const dateRangeLabel = `${weeklyDays[0].dateStr} to ${weeklyDays[6].dateStr}`

      const totalScheduled = weeklyDays.reduce((acc, d) => acc + d.tasks.length, 0)
      const totalCompleted = weeklyDays.reduce((acc, d) => acc + d.tasks.filter((t) => t.status === "DONE").length, 0)
      const totalOverdue = weeklyDays.reduce((acc, d) => acc + d.tasks.filter((t) => t.status === "OVERDUE").length, 0)

      const buffer = await renderToBuffer(
        PMWeeklyWallPdfDocument({
          logo: logo || undefined,
          weekLabel,
          dateRangeLabel,
          days: weeklyDays,
          generatedAt,
          totalScheduled,
          totalCompleted,
          totalOverdue,
        })
      )

      const safeFilename = `PM_Weekly_Schedule_${monthName}_Week${weekIdx + 1}_${year}.pdf`

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Length": String(buffer.length),
          "Cache-Control": "no-store",
        },
      })
    }

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

import React from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getISOWeekDateRange } from "@/lib/analytics/isoWeek"
import { DailyReportPrintView } from "@/components/forms/DailyReportPrintView"
import { BatchPrintToolbar } from "@/components/forms/BatchPrintToolbar"
import { FileX } from "lucide-react"
import Link from "next/link"

export const runtime = "nodejs"

function formatDateDMY(isoDate: string): string {
  if (!isoDate) return "-"
  const parts = isoDate.split("T")[0].split("-")
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return isoDate
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const dateMode = typeof params.dateMode === "string" ? params.dateMode : ""
  if (dateMode === "BATCH_LIST" || params.batchFilters) {
    return {
      title: "Batch Print DPR — Multi-Batch Search",
    }
  }
  const from = typeof params.from === "string" ? params.from : ""
  const to = typeof params.to === "string" ? params.to : ""
  if (from && to) {
    return {
      title: `Batch Print DPR — ${formatDateDMY(from)} to ${formatDateDMY(to)}`,
    }
  }
  const year = Number(params.year) || new Date().getFullYear()
  const week = Number(params.week) || 1
  return {
    title: `Batch Print DPR — ISO Week ${String(week).padStart(2, "0")}, ${year}`,
  }
}

export default async function BatchPrintDailyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  const from = typeof params.from === "string" ? params.from.trim() : ""
  const to = typeof params.to === "string" ? params.to.trim() : ""
  const isCustom = Boolean(from && to)

  const dateMode = typeof params.dateMode === "string" ? params.dateMode : ""
  let batchFilters: Array<{ category: string; batchNo: string }> = []
  if (typeof params.batchFilters === "string") {
    try {
      batchFilters = JSON.parse(params.batchFilters)
    } catch {
      batchFilters = []
    }
  }
  const isBatchMode = dateMode === "BATCH_LIST" || batchFilters.length > 0

  const currentYear = new Date().getFullYear()
  const year = Number(params.year) || currentYear
  const week = Number(params.week) || 1
  const line = typeof params.line === "string" ? params.line : "ALL"
  const batchNo = typeof params.batchNo === "string" ? params.batchNo.trim() : ""

  let startDate: string
  let endDate: string
  let dateRangeStr: string
  let toolbarTitle: string

  if (isBatchMode) {
    if (from && to) {
      let cleanFrom = from
      let cleanTo = to
      if (cleanFrom > cleanTo) {
        const temp = cleanFrom
        cleanFrom = cleanTo
        cleanTo = temp
      }
      startDate = cleanFrom
      endDate = cleanTo
      dateRangeStr = `${formatDateDMY(startDate)} - ${formatDateDMY(endDate)}`
    } else {
      startDate = "2020-01-01"
      endDate = new Date().toISOString().split("T")[0]
      dateRangeStr = "All Time"
    }
    const count = batchFilters.length || (batchNo ? batchNo.split(",").length : 1)
    toolbarTitle = `Batch Print DPR — Multi-Batch Search (${count} Batches)`
  } else if (isCustom) {
    let cleanFrom = from
    let cleanTo = to
    if (cleanFrom > cleanTo) {
      const temp = cleanFrom
      cleanFrom = cleanTo
      cleanTo = temp
    }
    startDate = cleanFrom
    endDate = cleanTo
    dateRangeStr = `${formatDateDMY(startDate)} - ${formatDateDMY(endDate)}`
    toolbarTitle = `Batch Print DPR — ${dateRangeStr}`
  } else {
    const range = getISOWeekDateRange(year, week)
    startDate = range.startDate
    endDate = range.endDate
    dateRangeStr = range.shortRange
    toolbarTitle = `Batch Print DPR — Week ${String(week).padStart(2, "0")}, ${year}`
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  const whereClause: any = {
    status: { in: ["APPROVED", "PENDING"] },
  }

  if (!isBatchMode || (from && to)) {
    whereClause.date = { gte: start, lte: end }
  }

  if (line && line !== "ALL") {
    whereClause.line = { contains: line, mode: "insensitive" }
  }

  // Fetch reports for the selected range
  let reports = await prisma.dailyReport.findMany({
    where: whereClause,
    include: {
      productions: {
        include: { batches: true },
      },
      inventory: true,
      rejects: true,
      breakdowns: true,
      holds: true,
    },
    orderBy: [{ date: "asc" }, { shift: "asc" }, { line: "asc" }],
  })

  // Filter reports if batch filters are specified
  if (batchFilters.length > 0) {
    reports = reports.filter(r => {
      return batchFilters.some(f => {
        const term = (f.batchNo || "").trim().toLowerCase()
        if (!term) return false
        const cat = f.category || "ALL"
        if (cat === "OUTPUT") {
          return (r.productions || []).some((p: any) =>
            (p.batches || []).some((b: any) => (b.batchNo || "").toLowerCase().includes(term))
          )
        } else if (cat === "BOTTLE") {
          return (r.inventory || []).some((i: any) =>
            (i.sectionKey || "").toUpperCase().includes("BOTTLE") &&
            (i.batchNo || "").toLowerCase().includes(term)
          )
        } else if (cat === "CAP") {
          return (r.inventory || []).some((i: any) =>
            (i.sectionKey || "").toUpperCase().includes("CAP") &&
            !(i.sectionKey || "").toUpperCase().includes("CARTON") &&
            (i.batchNo || "").toLowerCase().includes(term)
          )
        } else if (cat === "CARTON") {
          return (r.inventory || []).some((i: any) =>
            ((i.sectionKey || "").toUpperCase().includes("CARTON") ||
              (i.sectionKey || "").toUpperCase().includes("BOX")) &&
            (i.batchNo || "").toLowerCase().includes(term)
          )
        } else if (cat === "LABEL") {
          return (r.inventory || []).some((i: any) =>
            (i.sectionKey || "").toUpperCase().includes("LABEL") &&
            (i.batchNo || "").toLowerCase().includes(term)
          )
        } else {
          // ALL categories
          const matchInv = (r.inventory || []).some((i: any) =>
            (i.batchNo || "").toLowerCase().includes(term)
          )
          const matchProd = (r.productions || []).some((p: any) =>
            (p.batches || []).some((b: any) => (b.batchNo || "").toLowerCase().includes(term))
          )
          return matchInv || matchProd
        }
      })
    })
  } else if (batchNo) {
    const batchTokens = batchNo.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    reports = reports.filter(r => {
      return batchTokens.some(cleanB => {
        const matchInv = (r.inventory || []).some((i: any) =>
          (i.batchNo || "").toLowerCase().includes(cleanB)
        )
        const matchProd = (r.productions || []).some((p: any) =>
          (p.batches || []).some((b: any) => (b.batchNo || "").toLowerCase().includes(cleanB))
        )
        return matchInv || matchProd
      })
    })
  }

  // Fetch TransferIns within a 48h padding around the range of matched reports
  const reportDates = reports.map(r => new Date(r.date).getTime())
  const minTime = reportDates.length > 0 ? Math.min(...reportDates) : start.getTime()
  const maxTime = reportDates.length > 0 ? Math.max(...reportDates) : end.getTime()
  const startPadding = new Date(minTime - 24 * 60 * 60 * 1000)
  const endPadding = new Date(maxTime + 24 * 60 * 60 * 1000)

  const allTransferIns = await prisma.transferIn.findMany({
    where: {
      receiveDate: { gte: startPadding, lte: endPadding },
    },
    include: { items: true },
  })

  const toMalaysiaDateStr = (d: Date) => {
    const offsetDate = new Date(new Date(d).getTime() + 8 * 60 * 60 * 1000)
    return offsetDate.toISOString().split("T")[0]
  }

  return (
    <div className="min-h-screen bg-slate-300 print:bg-white text-slate-900 font-sans pb-24 print:pb-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          :root {
            color-scheme: light !important;
          }
          body, html {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-page-break {
            break-after: page !important;
            page-break-after: always !important;
          }
        }
      `}</style>

      {/* Interactive Toolbar (hidden on print) */}
      <BatchPrintToolbar
        title={toolbarTitle}
        dateRangeStr={dateRangeStr}
        line={line}
        batchNo={batchNo}
        totalReports={reports.length}
      />

      {/* Main Content */}
      <main className="max-w-[210mm] mx-auto pt-6 print:pt-0 px-2 sm:px-4 print:px-0">
        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-300 p-12 text-center shadow-lg my-12 print:hidden">
            <FileX className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              No Production Reports Found
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              No Daily Production Reports matched {dateRangeStr}
              {line !== "ALL" ? ` for ${line}` : ""}.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/forms/dashboard"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-lg hover:bg-slate-800"
              >
                Back to Forms Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8 print:space-y-0">
            {reports.map((report, idx) => {
              const reportDateStr = toMalaysiaDateStr(report.date)
              let transferInsForReport = allTransferIns.filter(
                doItem => toMalaysiaDateStr(doItem.receiveDate) === reportDateStr
              )

              if (report.shift) {
                transferInsForReport = transferInsForReport.filter((ti: any) => {
                  if (!ti.receiveTime) return true
                  const hour = parseInt(ti.receiveTime.split(":")[0], 10)
                  if (isNaN(hour)) return true
                  const isPM = hour >= 19
                  if (report.shift.toUpperCase() === "AM" && isPM) return false
                  if (report.shift.toUpperCase() === "PM" && !isPM) return false
                  return true
                })
              }

              return (
                <DailyReportPrintView
                  key={report.id}
                  report={report}
                  transferIns={transferInsForReport}
                  isBatchPrint={idx < reports.length - 1}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

import React from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getISOWeekDateRange } from "@/lib/analytics/isoWeek"
import { DailyReportPrintView } from "@/components/forms/DailyReportPrintView"
import { BatchPrintToolbar } from "@/components/forms/BatchPrintToolbar"
import { AlertCircle, FileX } from "lucide-react"
import Link from "next/link"

export const runtime = "nodejs"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
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
  const currentYear = new Date().getFullYear()
  const year = Number(params.year) || currentYear
  const week = Number(params.week) || 1
  const line = typeof params.line === "string" ? params.line : "ALL"
  const batchNo = typeof params.batchNo === "string" ? params.batchNo.trim() : ""

  const range = getISOWeekDateRange(year, week)
  const start = new Date(`${range.startDate}T00:00:00.000Z`)
  const end = new Date(`${range.endDate}T23:59:59.999Z`)

  const whereClause: any = {
    date: { gte: start, lte: end },
    status: { in: ["APPROVED", "PENDING"] },
  }

  if (line && line !== "ALL") {
    whereClause.line = { contains: line, mode: "insensitive" }
  }

  // Fetch reports for the week
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

  // If filtered by batch number:
  if (batchNo) {
    const cleanB = batchNo.toLowerCase()
    reports = reports.filter(r => {
      const matchInv = (r.inventory || []).some((i: any) =>
        (i.batchNo || "").toLowerCase().includes(cleanB)
      )
      const matchProd = (r.productions || []).some((p: any) =>
        (p.batches || []).some((b: any) => (b.batchNo || "").toLowerCase().includes(cleanB))
      )
      return matchInv || matchProd
    })
  }

  // Fetch TransferIns within a 48h padding around the week to ensure accurate mapping
  const startPadding = new Date(start.getTime() - 24 * 60 * 60 * 1000)
  const endPadding = new Date(end.getTime() + 24 * 60 * 60 * 1000)

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
        year={year}
        week={week}
        dateRangeStr={range.shortRange}
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
              No Daily Production Reports matched Week {String(week).padStart(2, "0")}, {year} ({range.shortRange})
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

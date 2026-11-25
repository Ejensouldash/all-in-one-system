import React from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getBottleToBoxTraceReport } from "@/lib/analytics/batchTraceability"
import type { BatchCategory } from "@/lib/analytics/batchMatching"
import { BatchPrintToolbar } from "@/components/forms/BatchPrintToolbar"
import { BatchTracePrintView } from "@/components/forms/BatchTracePrintView"
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
      title: "Material-to-FG Trace Summary (Usage Only)",
    }
  }
  const from = typeof params.from === "string" ? params.from : ""
  const to = typeof params.to === "string" ? params.to : ""
  if (from && to) {
    return {
      title: `Material-to-FG Trace Summary — ${formatDateDMY(from)} to ${formatDateDMY(to)}`,
    }
  }
  const year = Number(params.year) || new Date().getFullYear()
  const week = Number(params.week) || 1
  return {
    title: `Material-to-FG Trace Summary — ISO Week ${String(week).padStart(2, "0")}, ${year}`,
  }
}

export default async function TracePrintPage({
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

  const dateModeParam = typeof params.dateMode === "string" ? params.dateMode : ""
  let batchFilters: Array<{ category: BatchCategory; batchNo: string }> = []
  if (typeof params.batchFilters === "string") {
    try {
      const parsed = JSON.parse(params.batchFilters)
      if (Array.isArray(parsed)) {
        batchFilters = parsed.map(item => ({
          category: (item?.category || "ALL") as BatchCategory,
          batchNo: String(item?.batchNo || "").trim(),
        }))
      }
    } catch {
      batchFilters = []
    }
  }

  const isBatchMode = dateModeParam === "BATCH_LIST" || batchFilters.length > 0
  const dateMode = isBatchMode ? "BATCH_LIST" : isCustom ? "CUSTOM" : "ISO_WEEK"

  const currentYear = new Date().getFullYear()
  const year = Number(params.year) || currentYear
  const week = Number(params.week) || 1
  const line = typeof params.line === "string" ? params.line : "ALL"
  const batchNo = typeof params.batchNo === "string" ? params.batchNo.trim() : ""

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

  const rows = report.materialToFgRows || []
  const uniqueShiftCount = new Set(rows.map(r => r.shiftKey)).size

  const user = session.user as { name?: string | null; email?: string | null } | undefined
  const preparedBy = user?.name || user?.email || "BubblesO2 AIO System"
  const generatedAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date())

  const toolbarTitle = isBatchMode
    ? `Material-to-FG Trace Summary (${batchFilters.length || 1} Batches)`
    : `Material-to-FG Trace Summary — ${report.isoWeekString}`

  return (
    <div className="min-h-screen bg-slate-300 print:bg-white text-slate-900 font-sans pb-16 print:pb-0">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
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
        }
      `}</style>

      <BatchPrintToolbar
        title={toolbarTitle}
        dateRangeStr={report.dateRange.shortRange}
        line={line}
        batchNo={report.filterBatchNo || undefined}
        totalReports={uniqueShiftCount}
        unitSingular="Shift"
        unitPlural="Shifts"
      />

      <main className="max-w-[297mm] mx-auto pt-6 print:pt-0 px-2 sm:px-4 print:px-0">
        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-300 p-12 text-center shadow-lg my-12 print:hidden">
            <FileX className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              No Usage Records Found
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              No production Usage logs matched your selected batch filter(s) for {report.dateRange.shortRange}
              {line !== "ALL" ? ` on ${line}` : ""}. (Storeroom Balance, Transfer In, and Hold items without Usage are excluded.)
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
          <BatchTracePrintView
            report={report}
            generatedAt={generatedAt}
            preparedBy={preparedBy}
          />
        )}
      </main>
    </div>
  )
}

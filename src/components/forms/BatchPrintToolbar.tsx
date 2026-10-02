"use client"

import { Printer, ArrowLeft, Calendar, FileText, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface BatchPrintToolbarProps {
  year: number
  week: number
  dateRangeStr: string
  line: string
  batchNo?: string
  totalReports: number
}

export function BatchPrintToolbar({
  year,
  week,
  dateRangeStr,
  line,
  batchNo,
  totalReports,
}: BatchPrintToolbarProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="sticky top-0 z-50 bg-slate-900 text-white border-b border-slate-700 shadow-xl px-4 py-3 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/forms/dashboard"
            className="inline-flex items-center text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase text-emerald-400">
                Batch Print DPR — Week {String(week).padStart(2, "0")}, {year}
              </span>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                {totalReports} {totalReports === 1 ? "Report" : "Reports"} Found
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{dateRangeStr}</span>
              <span>•</span>
              <span>Line: {line}</span>
              {batchNo && (
                <>
                  <span>•</span>
                  <span className="text-amber-300">Filter: &quot;{batchNo}&quot;</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={totalReports === 0}
            className="inline-flex items-center text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2.5 rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-2" /> Print All / Save to PDF
          </button>
        </div>
      </div>
    </div>
  )
}

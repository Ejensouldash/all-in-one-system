"use client"

import { FileSpreadsheet } from "lucide-react"
import { exportDailyReportDetailed } from "@/lib/exportUtils"

export function ExportDailyReportButton({ report }: { report: any }) {
  return (
    <button
      onClick={() => exportDailyReportDetailed(report)}
      className="flex items-center text-sm font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-4 py-2 rounded-xl transition-colors shadow-sm"
    >
      <FileSpreadsheet className="w-4 h-4 mr-2" />
      Export to Excel
    </button>
  )
}

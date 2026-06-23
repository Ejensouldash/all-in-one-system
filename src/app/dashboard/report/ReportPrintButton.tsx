"use client"

import { Printer } from "lucide-react"

export function ReportPrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="print:hidden flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print / Export PDF
    </button>
  )
}

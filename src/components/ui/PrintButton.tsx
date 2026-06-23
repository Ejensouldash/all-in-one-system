"use client"

import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="inline-flex items-center text-sm font-black uppercase tracking-wider border-2 border-indigo-600 text-indigo-700 px-4 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(79,70,229,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] print:hidden"
    >
      <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
    </button>
  )
}

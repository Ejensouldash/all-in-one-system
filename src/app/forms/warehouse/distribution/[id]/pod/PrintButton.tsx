"use client"

import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all text-sm uppercase tracking-wider"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print Document
    </button>
  )
}

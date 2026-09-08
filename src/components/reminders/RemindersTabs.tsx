"use client"

import { useEffect, useState, type ReactNode } from "react"
import { PMWorkspace } from "./pm/PMWorkspace"
import { FUVReminderWorkspace } from "./fuv/FUVReminderWorkspace"

export function RemindersTabs({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState("general")
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab")
    if (t === "pm" || t === "fuv") setTab(t)
  }, [])
  function select(value: string) {
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", value)
    if (value !== "pm") url.searchParams.delete("occurrence")
    window.history.replaceState(null, "", url)
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm" role="tablist" aria-label="Jenis peringatan">
      <button role="tab" aria-selected={tab === "general"} onClick={() => select("general")} className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${tab === "general" ? "bg-violet-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>Peringatan Umum</button>
      <button role="tab" aria-selected={tab === "pm"} onClick={() => select("pm")} className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${tab === "pm" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>Preventive Maintenance</button>
      <button role="tab" aria-selected={tab === "fuv"} onClick={() => select("fuv")} className={`rounded-xl px-4 py-3 text-sm font-bold transition-all flex items-center gap-2 ${tab === "fuv" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
        <span>💧 GMP FUV (2-Jam)</span>
      </button>
    </div>
    {tab === "general" ? children : tab === "pm" ? <PMWorkspace /> : <FUVReminderWorkspace />}
  </div>
}

"use client"

import { useEffect, useState, type ReactNode } from "react"
import { PMWorkspace } from "./pm/PMWorkspace"

export function RemindersTabs({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState("general")
  useEffect(() => { if (new URLSearchParams(window.location.search).get("tab") === "pm") setTab("pm") }, [])
  function select(value: string) {
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", value)
    if (value !== "pm") url.searchParams.delete("occurrence")
    window.history.replaceState(null, "", url)
  }
  return <div className="space-y-5">
    <div className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm" role="tablist" aria-label="Jenis peringatan">
      <button role="tab" aria-selected={tab === "general"} onClick={() => select("general")} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === "general" ? "bg-violet-600 text-white" : "text-gray-600"}`}>Peringatan Umum</button>
      <button role="tab" aria-selected={tab === "pm"} onClick={() => select("pm")} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === "pm" ? "bg-amber-500 text-slate-950" : "text-gray-600"}`}>Preventive Maintenance</button>
    </div>
    {tab === "general" ? children : <PMWorkspace />}
  </div>
}

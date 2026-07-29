"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useTransition } from "react"
import { CalendarRange, Loader2 } from "lucide-react"

const PRESETS = [
  { label: "7 Hari", days: 7 },
  { label: "30 Hari", days: 30 },
  { label: "90 Hari", days: 90 },
]

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().split("T")[0]
}

function todayIso() {
  return new Date().toISOString().split("T")[0]
}

export function AnalyticsRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [draftFrom, setDraftFrom] = useState(from)
  const [draftTo, setDraftTo] = useState(to)

  const apply = (nextFrom: string, nextTo: string) => {
    if (nextFrom > nextTo) return
    setDraftFrom(nextFrom)
    setDraftTo(nextTo)
    startTransition(() => {
      router.replace(`${pathname}?from=${nextFrom}&to=${nextTo}`, { scroll: false })
    })
  }

  const activePreset = PRESETS.find(p => from === isoDaysAgo(p.days) && to === todayIso())

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
        {PRESETS.map(p => (
          <button
            key={p.days}
            type="button"
            onClick={() => apply(isoDaysAgo(p.days), todayIso())}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-colors ${
              activePreset?.days === p.days
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
        <CalendarRange className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="date"
          value={draftFrom}
          max={draftTo}
          onChange={e => apply(e.target.value, draftTo)}
          className="text-xs font-bold text-gray-700 outline-none bg-transparent"
        />
        <span className="text-gray-300 text-xs">—</span>
        <input
          type="date"
          value={draftTo}
          min={draftFrom}
          onChange={e => apply(draftFrom, e.target.value)}
          className="text-xs font-bold text-gray-700 outline-none bg-transparent"
        />
        {pending && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />}
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Boxes, Search, Truck } from "lucide-react"
import type { WarehouseDashboardData } from "@/lib/warehouse/dashboard-data"
import { formatSKU } from "@/lib/warehouse/format"
import { batchTraceHref, doTraceHref } from "./shared"

type Suggestion = { key: string; kind: "batch" | "do"; title: string; detail: string; href: string }

export function CommandBar({ data }: { data: WarehouseDashboardData }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const suggestions = useMemo<Suggestion[]>(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return []
    const batches = data.batches
      .filter(batch => batch.batchNumber.toLowerCase().includes(needle))
      .slice(0, 5)
      .map(batch => ({
        key: `b-${batch.sku}-${batch.batchNumber}`,
        kind: "batch" as const,
        title: batch.batchNumber,
        detail: `${formatSKU(batch.sku)} · ${batch.available.toLocaleString("en-MY")} units`,
        href: batchTraceHref(batch),
      }))
    const orders = data.doIndex
      .filter(order => order.doNumber.toLowerCase().includes(needle) || order.destination.toLowerCase().includes(needle))
      .slice(0, 5)
      .map(order => ({
        key: `d-${order.id}`,
        kind: "do" as const,
        title: order.doNumber,
        detail: `${order.destination} · ${order.status}`,
        href: doTraceHref(order.id),
      }))
    return [...batches, ...orders]
  }, [query, data.batches, data.doIndex])

  const go = (suggestion: Suggestion | undefined) => {
    if (!suggestion) return
    setOpen(false)
    router.push(suggestion.href)
  }

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#0F172A] px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-md">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            Command Centre
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-slate-200 sm:text-base">
            Live overview of stock, handovers & shipments
          </h2>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto">
          <div className="relative w-full sm:min-w-0 sm:flex-1 lg:w-72 xl:w-80 lg:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={event => {
                setQuery(event.target.value)
                setActive(0)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={event => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setActive(index => Math.min(index + 1, suggestions.length - 1))
                } else if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setActive(index => Math.max(index - 1, 0))
                } else if (event.key === "Enter") {
                  event.preventDefault()
                  go(suggestions[active])
                } else if (event.key === "Escape") {
                  setOpen(false)
                }
              }}
              placeholder="Search Batch ID / DO Number..."
              aria-label="Search batch ID or DO number"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pl-9 pr-3 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
            {open && query.trim() && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
                {suggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">No batch or DO matches &ldquo;{query.trim()}&rdquo;</p>
                ) : (
                  <ul role="listbox">
                    {suggestions.map((suggestion, index) => (
                      <li key={suggestion.key}>
                        <button
                          type="button"
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => go(suggestion)}
                          onMouseEnter={() => setActive(index)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${index === active ? "bg-slate-50" : ""}`}
                        >
                          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${suggestion.kind === "batch" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>
                            {suggestion.kind === "batch" ? <Boxes className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-sm font-semibold">{suggestion.title}</span>
                            <span className="block truncate text-xs text-slate-500">{suggestion.detail}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Link
              href="/forms/warehouse/distribution/new"
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-500 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-950 shadow-[0_0_15px_-4px_#10b981] transition hover:bg-emerald-400 sm:flex-none"
            >
              <Truck className="h-3.5 w-3.5" /> Create DO
            </Link>
            <Link
              href="/forms/warehouse/distribution"
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white sm:flex-none"
            >
              View Shipments <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

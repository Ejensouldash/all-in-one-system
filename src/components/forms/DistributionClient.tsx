"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  MapPinned,
  Package,
  Printer,
  Search,
  Truck,
} from "lucide-react"

type DistributionOrderRow = {
  id: string
  doNumber: string
  distributionDate: Date | string
  createdAt: Date | string
  destination: string
  distributionMethod: string
  status: string
  trackingEvents?: Array<{ eventType: string }>
}

export function DistributionClient({ distributionOrders }: { distributionOrders: DistributionOrderRow[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortField, setSortField] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [copied, setCopied] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Summary counts for KPI cards and filter pills
  const counts = useMemo(() => {
    let inTransit = 0
    let delivered = 0
    let returned = 0
    let preparing = 0

    for (const order of distributionOrders) {
      const activeStatus = order.trackingEvents?.[0]?.eventType || order.status
      if (activeStatus === "DELIVERED") delivered++
      else if (activeStatus === "SHIPPED" || activeStatus === "DISPATCHED" || activeStatus === "ARRIVED") inTransit++
      else if (activeStatus === "RETURNED") returned++
      else preparing++
    }

    return {
      all: distributionOrders.length,
      inTransit,
      delivered,
      returned,
      preparing,
    }
  }, [distributionOrders])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const copyDONumber = async (doNumber: string) => {
    try {
      await navigator.clipboard.writeText(doNumber)
      setCopied(doNumber)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore
    }
  }

  const filteredAndSortedDOs = useMemo(() => {
    let result = [...distributionOrders]

    // Filter by status pill
    if (statusFilter !== "ALL") {
      result = result.filter(doOrder => {
        const traceStatus = doOrder.trackingEvents?.[0]?.eventType || doOrder.status
        if (statusFilter === "IN_TRANSIT") {
          return traceStatus === "SHIPPED" || traceStatus === "DISPATCHED" || traceStatus === "ARRIVED"
        }
        return traceStatus === statusFilter || doOrder.status === statusFilter
      })
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(doOrder =>
        (doOrder.doNumber && doOrder.doNumber.toLowerCase().includes(lowerSearch)) ||
        (doOrder.destination && doOrder.destination.toLowerCase().includes(lowerSearch)) ||
        (doOrder.distributionMethod && doOrder.distributionMethod.toLowerCase().includes(lowerSearch))
      )
    }

    // Sort
    result.sort((a, b) => {
      const sortable = (row: DistributionOrderRow) => {
        if (sortField === "distributionDate" || sortField === "createdAt") return new Date(row[sortField]).getTime()
        if (sortField === "doNumber") return row.doNumber
        if (sortField === "destination") return row.destination
        return row.createdAt.toString()
      }
      const aVal = sortable(a)
      const bVal = sortable(b)

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [distributionOrders, searchTerm, statusFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDOs.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedDOs = filteredAndSortedDOs.slice(startIndex, startIndex + itemsPerPage)

  const filterTabs = [
    { id: "ALL", label: "All Orders", count: counts.all },
    { id: "IN_TRANSIT", label: "In Transit", count: counts.inTransit },
    { id: "DELIVERED", label: "Delivered", count: counts.delivered },
    { id: "PREPARING", label: "Preparing", count: counts.preparing },
    { id: "RETURNED", label: "Returned", count: counts.returned },
  ]

  const kpiCards = [
    {
      label: "Total Orders",
      value: counts.all,
      hint: "All recorded dispatches",
      icon: Package,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "In Transit",
      value: counts.inTransit,
      hint: "En route on delivery trucks",
      icon: Truck,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Delivered",
      value: counts.delivered,
      hint: "Successfully received",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Returns / Issues",
      value: counts.returned,
      hint: "Logged damages or returns",
      icon: AlertTriangle,
      tone: "bg-rose-50 text-rose-700",
    },
  ]

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards */}
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpiCards.map(card => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
          >
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-black text-slate-950 sm:text-3xl tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-600">{card.label}</p>
            <p className="mt-1 hidden text-xs text-slate-400 sm:block">{card.hint}</p>
          </div>
        ))}
      </section>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {/* Integrated Filter Bar: Search + Status Filter Pills */}
        <div className="flex flex-col gap-3.5 border-b border-slate-200/80 bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {filterTabs.map(tab => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id)
                    setCurrentPage(1)
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-black ${
                      active ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72 xl:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Search DO number or destination..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("doNumber")}
                >
                  <div className="flex items-center gap-1">
                    DO Number
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("distributionDate")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => handleSort("destination")}
                >
                  <div className="flex items-center gap-1">
                    Destination
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th scope="col" className="px-5 py-3.5">Method</th>
                <th scope="col" className="px-5 py-3.5 text-center">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedDOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <Package className="mx-auto mb-2.5 h-9 w-9 text-slate-300" />
                    <p className="font-bold text-slate-700">No Distribution Orders found.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try clearing your search query or switching the status filter tab.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDOs.map(doOrder => {
                  const traceStatus = doOrder.trackingEvents?.[0]?.eventType || doOrder.status
                  const isCopied = copied === doOrder.doNumber

                  return (
                    <tr key={doOrder.id} className="group transition hover:bg-slate-50/70">
                      {/* DO Number with Copy */}
                      <td className="px-5 py-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyDONumber(doOrder.doNumber)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700 transition hover:text-blue-900"
                            title="Click to copy DO Number"
                          >
                            {doOrder.doNumber}
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                            )}
                          </button>
                          {isCopied && (
                            <span className="rounded-sm bg-emerald-50 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                              Copied!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Distribution Date */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium tabular-nums">
                        {new Date(doOrder.distributionDate).toLocaleDateString("en-GB")}
                      </td>

                      {/* Destination */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {doOrder.destination}
                      </td>

                      {/* Method */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {doOrder.distributionMethod}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            traceStatus === "DELIVERED"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : traceStatus === "SHIPPED" || traceStatus === "DISPATCHED"
                              ? "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20"
                              : traceStatus === "ARRIVED"
                              ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20"
                              : doOrder.status === "RETURNED"
                              ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
                              : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20"
                          }`}
                        >
                          {traceStatus === "DELIVERED" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : traceStatus === "SHIPPED" || traceStatus === "DISPATCHED" ? (
                            <Truck className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {traceStatus}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/forms/warehouse/trace/do/${doOrder.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            <MapPinned className="h-3.5 w-3.5" /> Trace
                          </Link>

                          <Link
                            href={`/forms/warehouse/distribution/${doOrder.id}/pod`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-800 hover:bg-slate-800 hover:text-white"
                          >
                            <Printer className="h-3.5 w-3.5" /> POD
                          </Link>

                          <Link
                            href={`/forms/warehouse/quarantine/new?doId=${doOrder.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 shadow-2xs transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                            title="Log Return / Damage"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="grid gap-3 p-4 md:hidden">
          {paginatedDOs.map(doOrder => {
            const traceStatus = doOrder.trackingEvents?.[0]?.eventType || doOrder.status
            const isCopied = copied === doOrder.doNumber

            return (
              <article key={doOrder.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        traceStatus === "DELIVERED"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                          : traceStatus === "SHIPPED" || traceStatus === "DISPATCHED"
                          ? "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20"
                          : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20"
                      }`}
                    >
                      {traceStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyDONumber(doOrder.doNumber)}
                      className="mt-1.5 flex items-center gap-1 font-mono text-sm font-bold text-blue-700"
                    >
                      {doOrder.doNumber}
                      <Copy className="h-3 w-3 text-slate-400" />
                    </button>
                    {isCopied && <span className="text-[10px] font-bold text-emerald-700">Copied!</span>}
                  </div>
                  <div className="text-right text-xs text-slate-500 font-medium tabular-nums">
                    {new Date(doOrder.distributionDate).toLocaleDateString("en-GB")}
                  </div>
                </div>

                <div className="mt-2.5 border-t border-slate-100 pt-2 text-xs">
                  <p className="font-bold text-slate-900">{doOrder.destination}</p>
                  <p className="text-slate-500">{doOrder.distributionMethod}</p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <Link
                    href={`/forms/warehouse/trace/do/${doOrder.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-700 shadow-2xs"
                  >
                    <MapPinned className="h-3.5 w-3.5" /> Trace
                  </Link>
                  <Link
                    href={`/forms/warehouse/distribution/${doOrder.id}/pod`}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-slate-700 shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5" /> POD
                  </Link>
                  <Link
                    href={`/forms/warehouse/quarantine/new?doId=${doOrder.id}`}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-rose-600 shadow-2xs"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Return
                  </Link>
                </div>
              </article>
            )
          })}

          {paginatedDOs.length === 0 && (
            <div className="py-8 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="font-bold text-slate-700 text-xs">No Distribution Orders found.</p>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredAndSortedDOs.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:px-6">
            <p className="text-xs font-medium text-slate-500">
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(startIndex + itemsPerPage, filteredAndSortedDOs.length)}
              </span>{" "}
              of <span className="font-bold text-slate-900">{filteredAndSortedDOs.length}</span> distribution orders
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-1 text-xs font-bold text-slate-700">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

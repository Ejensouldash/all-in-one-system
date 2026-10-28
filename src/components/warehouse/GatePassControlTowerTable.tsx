"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Filter } from "lucide-react"

export type GatePassItemRow = {
  plannedQty: number
  actualQty?: number | null
  id?: string
  sku?: string | null
  description?: string
}

export type GatePassDeliveryOrderRow = {
  distributionOrder: {
    doNumber: string
    id?: string
    destination?: string
    distributionDate?: Date | string
    status?: string
  }
}

export type GatePassRow = {
  id: string
  gatePassNo: string
  requestedPickupAt: Date | string
  customerName: string
  destination: string
  vehicleNo: string | null
  plannedPalletQty: number
  status: string
  items: GatePassItemRow[]
  deliveryOrders: GatePassDeliveryOrderRow[]
}

const statusClass: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-300",
  AWAITING_CUSTOMER: "bg-blue-100 text-blue-800 border-blue-200",
  CUSTOMER_SUBMITTED: "bg-cyan-100 text-cyan-800 border-cyan-300",
  WAREHOUSE_ACKNOWLEDGED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  PREPARING: "bg-amber-100 text-amber-800 border-amber-300",
  READY_FOR_PICKUP: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CHECKED_IN: "bg-violet-100 text-violet-800 border-violet-200",
  LOADING: "bg-orange-100 text-orange-800 border-orange-300",
  CHECKED_OUT: "bg-teal-100 text-teal-800 border-teal-300",
  COMPLETED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  EXPIRED: "bg-gray-200 text-gray-700 border-gray-300",
  NO_SHOW: "bg-rose-100 text-rose-800 border-rose-300",
}

export function GatePassControlTowerTable({ gatePasses }: { gatePasses: GatePassRow[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortField, setSortField] = useState<"gatePassNo" | "requestedPickupAt" | "customerName">("requestedPickupAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const handleSort = (field: "gatePassNo" | "requestedPickupAt" | "customerName") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
    setCurrentPage(1)
  }

  const filteredAndSorted = useMemo(() => {
    let result = [...gatePasses]

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter(row => row.status === statusFilter)
    }

    // Search filter (GatePass No, DO No, Customer, Destination, Vehicle No)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      result = result.filter(row => {
        const gpNo = row.gatePassNo.toLowerCase()
        const cust = (row.customerName || "").toLowerCase()
        const dest = (row.destination || "").toLowerCase()
        const veh = (row.vehicleNo || "").toLowerCase()
        const dos = row.deliveryOrders.map(d => d.distributionOrder.doNumber.toLowerCase()).join(" ")
        return gpNo.includes(q) || cust.includes(q) || dest.includes(q) || veh.includes(q) || dos.includes(q)
      })
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === "requestedPickupAt") {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else {
        aVal = String(aVal || "").toLowerCase()
        bVal = String(bVal || "").toLowerCase()
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [gatePasses, statusFilter, searchTerm, sortField, sortOrder])

  // Pagination calculation
  const totalItems = filteredAndSorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const paginatedRows = filteredAndSorted.slice(startIndex, startIndex + itemsPerPage)

  const onPageChange = (newPage: number) => {
    setCurrentPage(Math.min(Math.max(1, newPage), totalPages))
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50/70 p-4 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-cyan-600 font-semibold text-slate-800 placeholder-slate-400 shadow-sm"
            placeholder="Search Gatepass No., DO, Destination, Truck..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="text-xs md:text-sm border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-cyan-600 shadow-sm"
            >
              <option value="ALL">All Statuses ({gatePasses.length})</option>
              <option value="COMPLETED">Completed</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="LOADING">Loading</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="PREPARING">Preparing</option>
              <option value="WAREHOUSE_ACKNOWLEDGED">Acknowledged</option>
              <option value="CUSTOMER_SUBMITTED">Customer Submitted</option>
              <option value="AWAITING_CUSTOMER">Awaiting Customer</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <span>Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-slate-300 rounded-xl px-2 py-1.5 font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-cyan-600"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th 
                className="px-6 py-3.5 font-black cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                onClick={() => handleSort("gatePassNo")}
              >
                <div className="flex items-center gap-1.5">
                  Gatepass
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th 
                className="px-6 py-3.5 font-black cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                onClick={() => handleSort("requestedPickupAt")}
              >
                <div className="flex items-center gap-1.5">
                  Pickup Time
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th 
                className="px-6 py-3.5 font-black cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                onClick={() => handleSort("customerName")}
              >
                <div className="flex items-center gap-1.5">
                  Customer / Destination
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-6 py-3.5 font-black">Vehicle No.</th>
              <th className="px-6 py-3.5 font-black">Planned Load</th>
              <th className="px-6 py-3.5 font-black">Status</th>
              <th className="px-6 py-3.5 text-right font-black">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.map((row) => {
              const planned = row.items.reduce((sum, item) => sum + item.plannedQty, 0)
              const pickupDate = new Date(row.requestedPickupAt)
              return (
                <tr key={row.id} className="hover:bg-cyan-50/40 transition-colors group">
                  <td className="px-6 py-4">
                    <Link
                      href={`/forms/warehouse/gatepass/${row.id}`}
                      className="font-black text-cyan-800 group-hover:text-cyan-900 group-hover:underline text-base"
                    >
                      {row.gatePassNo}
                    </Link>
                    <div className="text-xs text-slate-500 font-medium">
                      {row.deliveryOrders.map((link) => link.distributionOrder.doNumber).join(", ") || "No linked DO"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-700 text-xs">
                    {pickupDate.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{row.customerName}</div>
                    <div className="max-w-xs truncate text-xs text-slate-500">{row.destination}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800">
                    {row.vehicleNo || "Awaiting driver"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{planned} units/boxes</div>
                    <div className="text-xs text-cyan-800 font-semibold">{row.plannedPalletQty} wooden pallets</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black border ${
                        statusClass[row.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {row.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/forms/warehouse/gatepass/${row.id}`}
                      className="inline-flex items-center gap-1 text-xs font-black text-cyan-700 hover:text-cyan-900 group-hover:translate-x-0.5 transition-transform"
                    >
                      Open ➔
                    </Link>
                  </td>
                </tr>
              )
            })}
            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                  {searchTerm || statusFilter !== "ALL"
                    ? "No Gatepass records match your search / filter criteria."
                    : "No Gatepass records yet. Start by clicking the New Gatepass Request button."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs md:text-sm font-semibold text-slate-600">
            Showing <span className="font-black text-slate-900">{startIndex + 1}</span> to{" "}
            <span className="font-black text-slate-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{" "}
            <span className="font-black text-slate-900">{totalItems}</span> Gatepass records
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="px-3 py-1 text-xs md:text-sm font-black text-slate-800 bg-white border border-slate-300 rounded-lg">
              {safePage} / {totalPages}
            </div>

            <button
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

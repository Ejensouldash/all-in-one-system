"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  FileSpreadsheet,
  Building,
  Calendar,
  Phone,
  Tag,
  Clock,
  ArrowRight,
} from "lucide-react"

export interface ComplaintRow {
  id: string
  caseNumber: string
  createdAt: string | Date
  companyName: string
  outletName?: string | null
  contactName: string
  contactPhone: string
  state: string
  picDepartment: string
  status: string
  items: Array<{
    id: string
    productSize: string
    reportedQtyBottles: number
    reportedBatchNo: string | null
    cleanBatchNo: string | null
    matchStatus: string
  }>
}

interface CustomerCareQueueTableProps {
  initialCases: ComplaintRow[]
  canManage: boolean
}

export function CustomerCareQueueTable({
  initialCases,
  canManage,
}: CustomerCareQueueTableProps) {
  const [search, setSearch] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [selectedDepartment, setSelectedDepartment] = useState("ALL")
  const [selectedMatch, setSelectedMatch] = useState("ALL")

  const filteredCases = useMemo(() => {
    return initialCases.filter((c) => {
      // Status filter
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) {
        return false
      }
      // Department filter
      if (selectedDepartment !== "ALL" && c.picDepartment !== selectedDepartment) {
        return false
      }
      // Match status filter
      if (selectedMatch !== "ALL") {
        const hasMatch = c.items.some((i) => i.matchStatus === selectedMatch)
        if (!hasMatch) return false
      }
      // Search text
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCaseNo = c.caseNumber.toLowerCase().includes(q)
        const matchCompany = c.companyName.toLowerCase().includes(q)
        const matchOutlet = c.outletName?.toLowerCase().includes(q)
        const matchContact = c.contactName.toLowerCase().includes(q)
        const matchPhone = c.contactPhone.toLowerCase().includes(q)
        const matchBatch = c.items.some(
          (i) =>
            i.reportedBatchNo?.toLowerCase().includes(q) ||
            i.cleanBatchNo?.toLowerCase().includes(q)
        )
        if (!matchCaseNo && !matchCompany && !matchOutlet && !matchContact && !matchPhone && !matchBatch) {
          return false
        }
      }
      return true
    })
  }, [initialCases, search, selectedStatus, selectedDepartment, selectedMatch])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">NEW</span>
      case "UNDER_INVESTIGATION":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">INVESTIGATING</span>
      case "PENDING_QC":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">PENDING QC</span>
      case "RECALL_INITIATED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">RECALL ACTIVE</span>
      case "RESOLVED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>
      case "CLOSED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">CLOSED</span>
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-50 text-slate-600 border border-slate-200">{status}</span>
    }
  }

  const getMatchBadge = (matchStatus: string) => {
    switch (matchStatus) {
      case "MATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            MATCHED
          </span>
        )
      case "MULTI_MATCH":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            MULTI MATCH
          </span>
        )
      case "UNMATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <HelpCircle className="w-3 h-3 text-rose-600" />
            UNMATCHED
          </span>
        )
      case "NOT_REPORTED":
        return <span className="text-[11px] font-medium text-slate-400">N/A</span>
      default:
        return <span className="text-[11px] font-medium text-slate-500">{matchStatus}</span>
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search case, company, batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="PENDING_QC">Pending QC</option>
            <option value="RECALL_INITIATED">Recall Initiated</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* PIC Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Departments</option>
            <option value="Customer Care">Customer Care</option>
            <option value="BD Department">BD Department</option>
            <option value="Marketing Department / Social Media">Marketing / Social Media</option>
            <option value="Ordering Department">Ordering Department</option>
            <option value="Online Sales Department">Online Sales</option>
            <option value="Corporate Department">Corporate</option>
          </select>

          {/* Match Status Filter */}
          <select
            value={selectedMatch}
            onChange={(e) => setSelectedMatch(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Batch Matches</option>
            <option value="MATCHED">Matched</option>
            <option value="MULTI_MATCH">Multi Match</option>
            <option value="UNMATCHED">Unmatched</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4">Case Number</th>
                <th className="py-3.5 px-4">Date Received</th>
                <th className="py-3.5 px-4">Customer / Outlet</th>
                <th className="py-3.5 px-4">Reported Batches</th>
                <th className="py-3.5 px-4">Match Status</th>
                <th className="py-3.5 px-4">PIC Dept</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customer complaints found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-black text-indigo-700 whitespace-nowrap">
                      {c.caseNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.companyName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.outletName ? `${c.outletName} • ` : ""}{c.contactName} ({c.contactPhone})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {c.items
                          .filter((i) => i.matchStatus !== "NOT_REPORTED")
                          .map((i, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700">
                              <span className="font-bold">{i.productSize}:</span>{" "}
                              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">
                                {i.reportedBatchNo || "N/A"}
                              </code>{" "}
                              <span className="text-slate-500">({i.reportedQtyBottles} bottles)</span>
                            </div>
                          ))}
                        {c.items.every((i) => i.matchStatus === "NOT_REPORTED") && (
                          <span className="text-slate-400 text-[11px]">No batches reported</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {c.items
                          .filter((i) => i.matchStatus !== "NOT_REPORTED")
                          .map((i, idx) => (
                            <div key={idx}>{getMatchBadge(i.matchStatus)}</div>
                          ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {c.picDepartment}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/business-development/customer-care/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Workspace
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

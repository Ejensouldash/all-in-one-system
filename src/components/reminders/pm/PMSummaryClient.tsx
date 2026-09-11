"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  Check,
  X,
  Eye,
  Loader2,
  Calendar,
  User,
  Wrench,
  FileCheck2,
  FileText,
} from "lucide-react"
import { getPMSummaryData, verifyPMOccurrence, type PMSummaryFilter } from "@/app/actions/reminder-pm"
import { ModalShell } from "../ModalShell"
import { SignaturePadClient } from "@/components/ui/SignaturePadClient"
import { buttonClass } from "./PMFields"

type SummaryData = Awaited<ReturnType<typeof getPMSummaryData>>
type SummaryOccurrence = SummaryData["occurrences"][number]

type Banner = { kind: "ok" | "err"; text: string } | null

export function PMSummaryClient() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState<Banner>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<PMSummaryFilter>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Modals
  const [detailOccurrence, setDetailOccurrence] = useState<SummaryOccurrence | null>(null)
  const [verifyingOccurrence, setVerifyingOccurrence] = useState<SummaryOccurrence | null>(null)
  const [verifySignature, setVerifySignature] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState("")
  const [isVerifying, startVerifying] = useTransition()

  const flash = (b: Banner) => {
    setBanner(b)
    if (b?.kind === "ok") setTimeout(() => setBanner(null), 4000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPMSummaryData(
        dateFrom || undefined,
        dateTo || undefined,
        statusFilter === "ALL" ? undefined : statusFilter
      )
      setData(res)
      if (!dateFrom) setDateFrom(res.queryFrom)
      if (!dateTo) setDateTo(res.queryTo)
    } catch (err: unknown) {
      flash({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to load maintenance summary.",
      })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered occurrences by search query
  const filteredOccurrences = useMemo(() => {
    if (!data?.occurrences) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return data.occurrences
    return data.occurrences.filter((item) => {
      const eq = item.equipment.toLowerCase()
      const srs = item.srs?.toLowerCase() || ""
      const tech = item.completedByName.toLowerCase()
      const sup = item.verifiedByName.toLowerCase()
      const pics = item.picNames?.join(" ").toLowerCase() || ""
      const notes = item.notes?.toLowerCase() || ""
      return eq.includes(q) || srs.includes(q) || tech.includes(q) || sup.includes(q) || pics.includes(q) || notes.includes(q)
    })
  }, [data?.occurrences, searchQuery])

  // Handle Supervisor Verify Submit
  const handleVerify = () => {
    if (!verifyingOccurrence) return
    setVerifyError("")

    if (!verifySignature || !verifySignature.trim()) {
      setVerifyError("Please provide supervisor verification signature (Verified By) before proceeding.")
      return
    }

    startVerifying(async () => {
      try {
        await verifyPMOccurrence(verifyingOccurrence.id, verifySignature)
        flash({ kind: "ok", text: "Inspection verified and signed by supervisor successfully!" })
        setVerifyingOccurrence(null)
        setVerifySignature(null)
        await loadData()
      } catch (err: unknown) {
        setVerifyError(err instanceof Error ? err.message : "Failed to verify inspection record.")
      }
    })
  }

  // Handle Export PM Summary PDF
  const handleExportSummaryPdf = async () => {
    try {
      setExportingPdf(true)
      const params = new URLSearchParams()
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)
      if (statusFilter !== "ALL") params.set("status", statusFilter)

      const res = await fetch(`/api/reminders/pm/export/verification-pdf?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Failed to export PM Summary PDF.")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition")
      let filename = `SGMP03_PM_Summary_Report_${dateFrom}_to_${dateTo}.pdf`
      if (disposition && disposition.includes("filename=")) {
        const match = /filename="?([^"]+)"?/.exec(disposition)
        if (match?.[1]) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      flash({ kind: "ok", text: "Summary PDF downloaded successfully." })
    } catch (err: unknown) {
      flash({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to export PM Summary PDF.",
      })
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {banner && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-2xl border p-4 text-xs font-semibold shadow-sm transition-all ${
            banner.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-lg p-1 hover:bg-white/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/reminders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Calendar / PM Schedules
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
                Preventive Maintenance Summary & Verification
              </h1>
              <p className="text-xs text-gray-500">
                Review all scheduled tasks, completed inspections, checklist compliance, supervisor verifications, and export official GMP reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportSummaryPdf}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-50"
            title="Export official PM Summary & Verification Report (SGMP-03) to PDF"
          >
            {exportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-rose-600" />
            )}
            Export Summary PDF
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Loader2 className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Scheduled</span>
            <Calendar className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-1.5 text-xl font-black text-gray-900">{data?.kpis.totalScheduled ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">Total in range</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Completed</span>
            <FileCheck2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-xl font-black text-blue-800">{data?.kpis.totalCompleted ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-blue-600">Inspections done</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Verified</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-xl font-black text-emerald-700">{data?.kpis.totalVerified ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-emerald-600">Supervisor verified</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Verify</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-xl font-black text-amber-800">{data?.kpis.totalPending ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-amber-700">Awaiting supervisor</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Not Completed</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-1.5 text-xl font-black text-purple-700">{data?.kpis.totalNotCompleted ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-purple-600">Pending or overdue</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Issues</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1.5 text-xl font-black text-rose-700">{data?.kpis.totalIssues ?? 0}</p>
          <p className="mt-0.5 text-[10px] text-rose-600">Faults / issues flagged</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "ALL"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All ({data?.kpis.totalScheduled ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "COMPLETED"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Completed ({data?.kpis.totalCompleted ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PENDING_VERIFICATION")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "PENDING_VERIFICATION"
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Pending Verify ({data?.kpis.totalPending ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("VERIFIED")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "VERIFIED"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Verified ({data?.kpis.totalVerified ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("NOT_COMPLETED")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                statusFilter === "NOT_COMPLETED"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Not Completed ({data?.kpis.totalNotCompleted ?? 0})
            </button>
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-xs outline-none transition focus:border-indigo-500"
            />
            <span className="text-gray-400 font-medium">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-xs outline-none transition focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Search row */}
        <div className="relative pt-2 border-t border-gray-100">
          <Search className="pointer-events-none absolute left-3 top-4.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search equipment, SRS, technician name, supervisor, or issue remarks..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-4.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-bold text-gray-500">Loading PM summary records…</p>
          </div>
        ) : filteredOccurrences.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileCheck2 className="h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm font-bold text-gray-700">No inspection records found</p>
            <p className="mt-1 text-xs text-gray-400">
              Try adjusting the date range or search filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date & Equipment</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Checklist Completed</th>
                  <th className="px-4 py-3">Inspector (Checked By)</th>
                  <th className="px-4 py-3">Supervisor Verification (Verified By)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredOccurrences.map((occ) => {
                  const isCompleted = Boolean(occ.completedAt)
                  const isVerified = Boolean(occ.verifiedAt)
                  const totalChecklist = occ.checklist.length
                  const completedChecklistCount = occ.completedChecklist?.length || 0
                  const isOverdue = !isCompleted && occ.dueDate < (data?.today || "")
                  const isToday = !isCompleted && occ.dueDate === (data?.today || "")

                  return (
                    <tr key={occ.id} className="transition hover:bg-gray-50/60">
                      {/* Equipment & Dates */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{occ.equipment}</div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                          {occ.srs && <span className="font-semibold text-indigo-600">SRS: {occ.srs}</span>}
                          <span>Due: <strong>{occ.dueDate}</strong></span>
                          {isCompleted ? (
                            <span className="text-emerald-700 font-semibold">
                              (Inspected: {occ.inspectedDate || "-"})
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              (Not yet inspected)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Result / Status */}
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                                occ.result === "ISSUE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {occ.result === "ISSUE" ? (
                                <>
                                  <AlertTriangle className="h-3 w-3" /> Issue Reported
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> OK
                                </>
                              )}
                            </span>
                            {occ.notes && (
                              <p className="mt-1 line-clamp-1 max-w-[200px] text-[10px] text-gray-500" title={occ.notes}>
                                {occ.notes}
                              </p>
                            )}
                          </>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                              isOverdue
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isToday
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {isOverdue ? "Overdue" : isToday ? "Due Today" : "Pending"}
                          </span>
                        )}
                      </td>

                      {/* Checklist */}
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              completedChecklistCount === totalChecklist
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {completedChecklistCount} / {totalChecklist} items verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                            {totalChecklist} checklist items
                          </span>
                        )}
                      </td>

                      {/* Inspector (Checked By) / PIC */}
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <>
                            <div className="font-bold text-gray-800">{occ.completedByName}</div>
                            <div className="text-[10px] text-gray-400">
                              {occ.completedAt ? new Date(occ.completedAt).toLocaleString("en-MY") : "-"}
                            </div>
                            {occ.performedSignature && (
                              <div className="mt-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={occ.performedSignature}
                                  alt="Inspector Signature"
                                  className="h-7 max-w-[90px] object-contain border border-gray-200 rounded bg-white p-0.5"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <div className="text-xs font-semibold text-gray-800">
                              {occ.picNames && occ.picNames.length > 0
                                ? occ.picNames.join(", ")
                                : "Unassigned"}
                            </div>
                            <div className="text-[10px] text-gray-400">Assigned PIC</div>
                          </div>
                        )}
                      </td>

                      {/* Verified By (Supervisor) */}
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          isVerified ? (
                            <div>
                              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                                <Check className="h-3 w-3" /> {occ.verifiedByName}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {occ.verifiedAt ? new Date(occ.verifiedAt).toLocaleString("en-MY") : "-"}
                              </div>
                              {occ.verifiedSignature && (
                                <div className="mt-1">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={occ.verifiedSignature}
                                    alt="Supervisor Signature"
                                    className="h-7 max-w-[90px] object-contain border border-emerald-200 rounded bg-white p-0.5"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <Clock className="h-3 w-3" /> Pending Verification
                              </span>
                              {data?.canVerify && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerifyingOccurrence(occ)
                                    setVerifySignature(null)
                                    setVerifyError("")
                                  }}
                                  className="w-fit rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-indigo-700 flex items-center gap-1"
                                >
                                  <ShieldCheck className="h-3 w-3" /> Verify Now
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Not completed yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailOccurrence(occ)}
                          className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 shadow-xs transition hover:bg-gray-50"
                        >
                          <Eye className="h-3.5 w-3.5 text-gray-500" /> View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supervisor Verification Modal */}
      {verifyingOccurrence && (
        <ModalShell
          open={Boolean(verifyingOccurrence)}
          onClose={() => {
            setVerifyingOccurrence(null)
            setVerifySignature(null)
            setVerifyError("")
          }}
          maxWidth="max-w-lg"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Supervisor Inspection Verification (Verified By)
                </h3>
                <p className="text-xs text-gray-500">
                  Verify that the following maintenance task was performed properly and in compliance with SOP procedures.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingOccurrence(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {verifyError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
              >
                {verifyError}
              </p>
            )}

            {/* Task summary */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">{verifyingOccurrence.equipment}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    verifyingOccurrence.result === "ISSUE"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {verifyingOccurrence.result === "ISSUE" ? "Issue Reported" : "OK"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-gray-600">
                <div>Inspection Date: <strong>{verifyingOccurrence.inspectedDate || "-"}</strong></div>
                <div>Inspector: <strong>{verifyingOccurrence.completedByName}</strong></div>
              </div>
              {verifyingOccurrence.notes && (
                <div className="pt-2 border-t border-gray-200 text-gray-700">
                  <span className="font-semibold text-gray-500">Inspector Remarks:</span>
                  <p className="mt-0.5 font-medium">{verifyingOccurrence.notes}</p>
                </div>
              )}
            </div>

            {/* Signature Pad */}
            <div className="pt-2">
              <SignaturePadClient
                label="Supervisor Signature (Verified By) *"
                autoLoadSaved={true}
                onSave={(sig) => setVerifySignature(sig)}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setVerifyingOccurrence(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerify}
                className={buttonClass}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Verify & Sign Report"
                )}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Detail Modal */}
      {detailOccurrence && (
        <ModalShell
          open={Boolean(detailOccurrence)}
          onClose={() => setDetailOccurrence(null)}
          maxWidth="max-w-xl"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {detailOccurrence.equipment}
                </h3>
                <p className="text-xs text-gray-500">
                  Scheduled Due Date: <strong>{detailOccurrence.dueDate}</strong>
                  {detailOccurrence.completedAt ? (
                    <span className="text-emerald-700 font-semibold"> &bull; Inspected Date: {detailOccurrence.inspectedDate || "-"}</span>
                  ) : (
                    <span className="text-amber-700 font-semibold"> &bull; Status: Pending Execution</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOccurrence(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Checklist breakdown */}
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Work Checklist Verification
              </h4>
              <ul className="space-y-1.5 rounded-2xl border border-gray-200 bg-white p-3 text-xs text-gray-700 max-h-60 overflow-y-auto">
                {detailOccurrence.checklist.map((item, idx) => {
                  const isDone =
                    detailOccurrence.completedAt &&
                    (!detailOccurrence.completedChecklist ||
                      detailOccurrence.completedChecklist.length === 0 ||
                      detailOccurrence.completedChecklist.includes(item))
                  return (
                    <li
                      key={idx}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border ${
                        detailOccurrence.completedAt
                          ? isDone
                            ? "border-emerald-100 bg-emerald-50/40 text-gray-900"
                            : "border-amber-100 bg-amber-50/40 text-gray-500 line-through"
                          : "border-gray-100 bg-gray-50/50 text-gray-700"
                      }`}
                    >
                      {detailOccurrence.completedAt ? (
                        isDone ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : (
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                        )
                      ) : (
                        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      )}
                      <span>{item}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Performer info (Technician / Assigned PIC) & Signature */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">
                  {detailOccurrence.completedAt ? "Inspector (Checked By):" : "Assigned PIC:"}
                </span>
                <span className="font-bold text-gray-900">
                  {detailOccurrence.completedAt
                    ? detailOccurrence.completedByName
                    : (detailOccurrence.picNames && detailOccurrence.picNames.length > 0
                        ? detailOccurrence.picNames.join(", ")
                        : "Unassigned")}
                </span>
              </div>
              {detailOccurrence.completedAt && (
                <div className="text-[10px] text-gray-500">
                  Completed At: <strong>{new Date(detailOccurrence.completedAt).toLocaleString("en-MY")}</strong>
                </div>
              )}
              {detailOccurrence.notes && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-500 font-medium">Remarks:</span>
                  <p className="mt-0.5 text-gray-800 font-medium">{detailOccurrence.notes}</p>
                </div>
              )}
              {detailOccurrence.performedSignature && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[11px] font-bold text-gray-500 block mb-1">Inspector Signature:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailOccurrence.performedSignature}
                    alt="Inspector Signature"
                    className="h-16 max-w-full object-contain rounded border border-gray-200 bg-white p-1"
                  />
                </div>
              )}
            </div>

            {/* Supervisor info & Signature */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">Verification (Verified By):</span>
                {detailOccurrence.completedAt ? (
                  detailOccurrence.verifiedAt ? (
                    <span className="font-bold text-emerald-700">{detailOccurrence.verifiedByName}</span>
                  ) : (
                    <span className="text-amber-700 font-bold">Pending Verification</span>
                  )
                ) : (
                  <span className="text-gray-400 italic">Not applicable (Task not completed)</span>
                )}
              </div>
              {detailOccurrence.verifiedAt && (
                <div>
                  <span className="text-gray-500">Verification Date:</span>{" "}
                  <strong>{new Date(detailOccurrence.verifiedAt).toLocaleString("en-MY")}</strong>
                </div>
              )}
              {detailOccurrence.verifiedSignature && (
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-[11px] font-bold text-gray-500 block mb-1">Supervisor Signature:</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailOccurrence.verifiedSignature}
                    alt="Supervisor Signature"
                    className="h-16 max-w-full object-contain rounded border border-gray-200 bg-white p-1"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDetailOccurrence(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

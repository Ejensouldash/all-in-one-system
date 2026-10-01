"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateComplaintStatus, manuallyRelinkBatch } from "@/app/actions/customer-care"
import { formatProductPackaging } from "@/lib/customer-care/sku-mapper"
import { decodeBottleBatchNumber } from "@/lib/customer-care/batch-decoder"
import { ComplaintStatus, BatchMatchStatus } from "@prisma/client"
import {
  ArrowLeft,
  Building,
  User,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Printer,
  FileDown,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  FileText,
  Info,
  Calendar,
} from "lucide-react"

interface CaseWorkspaceClientProps {
  caseData: any
  canManage: boolean
}

export function CaseWorkspaceClient({ caseData, canManage }: CaseWorkspaceClientProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<ComplaintStatus>(caseData.status)
  const [notes, setNotes] = useState(caseData.internalNotes || "")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleUpdateStatus = async () => {
    if (!canManage) return
    setIsUpdatingStatus(true)
    setStatusMessage(null)

    const res = await updateComplaintStatus(caseData.id, currentStatus, notes)
    setIsUpdatingStatus(false)

    if (res.success) {
      setStatusMessage("Case status and notes updated successfully.")
      router.refresh()
    } else {
      setStatusMessage(res.error || "Failed to update case.")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">NEW</span>
      case "UNDER_INVESTIGATION":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">UNDER INVESTIGATION</span>
      case "PENDING_QC":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">PENDING QC</span>
      case "RECALL_INITIATED":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">RECALL ACTIVE</span>
      case "RESOLVED":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>
      case "CLOSED":
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">CLOSED</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-50 text-slate-600 border border-slate-200">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{caseData.picDepartment}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500">
              Logged on {new Date(caseData.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {caseData.caseNumber}
            </h1>
            <div>{getStatusBadge(caseData.status)}</div>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Customer: <span className="font-bold text-slate-800">{caseData.companyName}</span>
            {caseData.outletName ? ` (${caseData.outletName})` : ""}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href={`/api/business-development/customer-care/reports/${caseData.id}/export`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all hover:shadow"
          >
            <FileDown className="w-4 h-4" />
            Download Investigation PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Incident (1 col) */}
        <div className="space-y-6">
          {/* Customer & Location */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building className="w-4 h-4 text-indigo-600" />
              Customer Information
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Company / Outlet</span>
                <span className="font-bold text-slate-900 text-sm">{caseData.companyName}</span>
                {caseData.outletName && <div className="text-slate-600 text-xs">{caseData.outletName}</div>}
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Contact Person</span>
                <span className="font-bold text-slate-800">{caseData.contactName}</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Phone Number</span>
                <a href={`tel:${caseData.contactPhone}`} className="font-bold text-indigo-600 hover:underline">
                  {caseData.contactPhone}
                </a>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">State</span>
                <span className="font-bold text-slate-800">{caseData.state || "N/A"}</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Goods Location Address</span>
                <span className="text-slate-700 leading-relaxed block mt-0.5">{caseData.goodsLocationAddress || "N/A"}</span>
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-2 font-medium">
                  * Customer-reported location; does not prove original DO route.
                </div>
              </div>
            </div>
          </div>

          {/* Defect Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Defect Details
            </h2>

            <div>
              <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1.5">Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {caseData.categories.map((c: string) => (
                  <span key={c} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                    {c.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>

            {caseData.otherIssueDescription && (
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1">Issue Statement / Description</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {caseData.otherIssueDescription}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Matched Production Output (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Production Output Matching Cards */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Reported Batches & Production Output Lookup
              </h2>
              <span className="text-[11px] text-slate-400">Source: Daily Production Reports</span>
            </div>

            <div className="space-y-6">
              {caseData.items.map((item: any, idx: number) => (
                <div key={item.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4">
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div>
                      <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                        {item.productSize} Bottle
                      </span>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Reported Affected Qty:{" "}
                        <span className="font-black text-rose-600 text-sm">{item.reportedQtyBottles} Bottles (pcs)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">Reported Batch:</span>
                      <code className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 text-xs">
                        {item.reportedBatchNo || "NONE"}
                      </code>
                      {(() => {
                        const decoded = decodeBottleBatchNumber(item.reportedBatchNo)
                        return decoded?.isValid ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title={`ISO Week ${decoded.isoWeek}, Day ${decoded.dayNum} (${decoded.dayName}), Year ${decoded.year}${decoded.shiftName ? ` · ${decoded.shiftName}` : ""}`}
                          >
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            {decoded.detail}
                          </span>
                        ) : null
                      })()}
                      {item.matchStatus === "MATCHED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          MATCHED
                        </span>
                      )}
                      {item.matchStatus === "MULTI_MATCH" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          MULTI MATCH
                        </span>
                      )}
                      {item.matchStatus === "UNMATCHED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
                          UNMATCHED
                        </span>
                      )}
                      {item.matchStatus === "NOT_REPORTED" && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500">
                          NOT REPORTED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Production Output Details */}
                  {item.productionMatches && item.productionMatches.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700">
                        {item.productionMatches.length === 1
                          ? "Found 1 Matching Production Output Record:"
                          : `Found ${item.productionMatches.length} Matching Production Records across shifts/lines:`}
                      </div>

                      <div className="space-y-2.5">
                        {item.productionMatches.map((m: any, mIdx: number) => {
                          const bottleDecoded = decodeBottleBatchNumber(m.bottleBatchNo || item.reportedBatchNo)
                          return (
                          <div
                            key={mIdx}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-emerald-700 font-black block text-[10px] uppercase">1. Batch No Bottle</span>
                                <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                                  {m.bottleBatchNo || item.reportedBatchNo}
                                </span>
                                <span className="text-slate-500 text-[10px] block mt-0.5">Customer Bottle Input</span>
                                {bottleDecoded?.isValid && (
                                  <span className="text-emerald-800 font-bold text-[10px] block mt-1 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200/80">
                                    🗓️ {bottleDecoded.summary}
                                  </span>
                                )}
                              </div>

                              <div>
                                <span className="text-indigo-700 font-black block text-[10px] uppercase">2. Batch Production Output</span>
                                <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                                  {m.productionOutputBatchNo}
                                </span>
                                <span className="text-slate-500 text-[10px] block mt-0.5">{m.productionType || "Standard"}</span>
                              </div>

                              <div>
                                <span className="text-slate-400 font-bold block text-[10px] uppercase">Packaging / Line</span>
                                <span className="font-bold text-slate-800">{formatProductPackaging(m.productPacking)}</span>
                                <span className="text-slate-500 text-[11px] block">{m.line}</span>
                              </div>

                              <div>
                                <span className="text-slate-400 font-bold block text-[10px] uppercase">Production Output</span>
                                <span className="font-black text-indigo-700 text-sm">
                                  {m.productionQuantityBoxes} BOXES
                                </span>
                                <span className="text-slate-400 text-[10px] block">{new Date(m.productionDate).toLocaleDateString("en-GB")} (Shift {m.shift})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0">
                              <Link
                                href={`/forms/production/daily-report/${m.dailyReportId}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                              >
                                View Report
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  ) : item.matchStatus === "UNMATCHED" ? (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        No Daily Production Report Found with Bottle Batch &quot;{item.reportedBatchNo}&quot;
                      </div>
                      <p className="text-[11px] text-rose-700">
                        This bottle batch number does not exist in any Daily Production Report (Storeroom or Usage) for {item.productSize}. Please inspect customer bottle photos or verify the batch printed on the bottle.
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Lifecycle & Status Update Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-indigo-600" />
              Investigation Status & Lifecycle Management
            </h2>

            {statusMessage && (
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Lifecycle Status</label>
                <select
                  disabled={!canManage}
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                >
                  <option value="NEW">NEW — Newly Received</option>
                  <option value="UNDER_INVESTIGATION">UNDER INVESTIGATION — Handed to Warehouse</option>
                  <option value="PENDING_QC">PENDING QC — Waiting on QC / Lab Testing</option>
                  <option value="RECALL_INITIATED">RECALL INITIATED — Product Recall Active</option>
                  <option value="RESOLVED">RESOLVED — Customer Resolution Delivered</option>
                  <option value="CLOSED">CLOSED — Operational File Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIC Assigned</label>
                <input
                  type="text"
                  disabled
                  value={caseData.picDepartment}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Case & Investigation Notes
                </label>
                <textarea
                  disabled={!canManage}
                  rows={3}
                  placeholder="Record warehouse Excel findings, lorry numbers communicated, or QC disposition..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 text-xs"
                />
              </div>
            </div>

            {canManage && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all hover:shadow cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Update Status & Save Notes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

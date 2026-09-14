"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  X,
  AlertTriangle,
  FileClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Filter,
  User,
  MapPin,
  Calendar,
} from "lucide-react"
import { ComplianceDaySummary, GMPObligation, GMPCategory } from "@/lib/compliance/types"

interface Props {
  day: ComplianceDaySummary | null
  isOpen: boolean
  onClose: () => void
  userPermissions?: {
    canForms: boolean
    canSummary: boolean
    canReports: boolean
    canDashboard: boolean
    isSuperAdmin: boolean
  }
}

const CATEGORY_COLORS: Record<GMPCategory, string> = {
  QC: "bg-purple-100 text-purple-800 border-purple-200",
  PRODUCTION: "bg-blue-100 text-blue-800 border-blue-200",
  MAINTENANCE: "bg-amber-100 text-amber-800 border-amber-200",
  SECURITY: "bg-zinc-100 text-zinc-800 border-zinc-200",
  LOGISTICS: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

export function DateDetailsPanel({ day, isOpen, onClose, userPermissions }: Props) {
  const [showAttentionOnly, setShowAttentionOnly] = useState(true)

  if (!isOpen || !day) return null

  // Filter items: attention required vs all
  const filteredObligations = day.obligations.filter(ob => {
    if (!showAttentionOnly) return true
    return (
      ob.attentionPriority <= 4 ||
      ob.submissionStatus === "DRAFT" ||
      ob.submissionStatus === "MISSING_OVERDUE" ||
      ob.verificationStatus === "PENDING"
    )
  })

  // Format date display
  const dateFormatted = new Date(day.date + "T00:00:00Z").toLocaleDateString("ms-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white border-b border-slate-800 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                  Perincian Pematuhan Harian
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-1 text-white capitalize">
                {dateFormatted}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {day.totalSubmitted}/{day.totalExpected} Borang Dihantar
                </span>
                {day.totalMissing > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-950 text-red-300 border border-red-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {day.totalMissing} Terlepas Tarikh Akhir
                  </span>
                )}
                {day.totalPendingVerification > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {day.totalPendingVerification} Menunggu Pengesahan
                  </span>
                )}
                {day.totalDraft > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                    <FileClock className="w-3.5 h-3.5" />
                    {day.totalDraft} Draf
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="Tutup panel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Subheader / Filter toggle */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">
              Menunjukkan {filteredObligations.length} daripada {day.obligations.length} keperluan borang
            </span>
            <button
              onClick={() => setShowAttentionOnly(!showAttentionOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                showAttentionOnly
                  ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {showAttentionOnly ? "Perlu Perhatian Sahaja" : "Papar Semua Borang"}
            </button>
          </div>

          {/* Obligations List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredObligations.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">
                  {showAttentionOnly ? "Tiada Isu Perhatian" : "Tiada Borang Dijadualkan"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {showAttentionOnly
                    ? "Semua borang yang wajib dihantar telah diselesaikan atau tiada tarikh akhir yang terlepas bagi tarikh ini."
                    : "Tiada rekod atau jadual pematuhan aktif untuk tarikh ini."}
                </p>
                {showAttentionOnly && (
                  <button
                    onClick={() => setShowAttentionOnly(false)}
                    className="mt-4 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Papar Semua Borang ({day.obligations.length})
                  </button>
                )}
              </div>
            ) : (
              filteredObligations.map(ob => {
                const categoryColor = CATEGORY_COLORS[ob.category] || "bg-slate-100 text-slate-800"

                return (
                  <div
                    key={ob.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      ob.submissionStatus === "MISSING_OVERDUE"
                        ? "bg-red-50/70 border-red-200 hover:border-red-300"
                        : ob.submissionStatus === "DRAFT"
                        ? "bg-amber-50/70 border-amber-200 hover:border-amber-300"
                        : ob.verificationStatus === "PENDING"
                        ? "bg-yellow-50/70 border-yellow-200 hover:border-yellow-300"
                        : ob.submissionStatus === "SUBMITTED_LATE"
                        ? "bg-orange-50/50 border-orange-200 hover:border-orange-300"
                        : ob.submissionStatus === "UNCONFIGURED"
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wider uppercase border ${categoryColor}`}
                          >
                            {ob.formCode}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {ob.category}
                          </span>
                          <StatusBadge ob={ob} />
                        </div>

                        <h4 className="text-sm font-black text-slate-900 leading-tight">
                          {ob.formTitle}
                        </h4>

                        {/* Obligation context metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-2">
                          {ob.reportingPeriodLabel && (
                            <span className="font-semibold text-slate-700">
                              Bahagian/Slot: {ob.reportingPeriodLabel}
                            </span>
                          )}
                          {ob.shift && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              Syif: <strong className="text-slate-800">{ob.shift}</strong>
                            </span>
                          )}
                          {ob.equipment && (
                            <span className="inline-flex items-center gap-1 font-medium">
                              Peralatan: <strong className="text-slate-800">{ob.equipment}</strong>
                            </span>
                          )}
                          {ob.deadline && (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              Tarikh Akhir:{" "}
                              {new Date(ob.deadline).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Kuala_Lumpur",
                              })}
                            </span>
                          )}
                        </div>

                        {/* Submission and verification details */}
                        <div className="mt-3 pt-2 border-t border-slate-200/70 text-xs flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            {ob.submittedBy && (
                              <p className="text-slate-600 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                Diserah oleh: <strong className="text-slate-800">{ob.submittedBy}</strong>
                                {ob.submittedAt && (
                                  <span className="text-slate-400 text-[11px]">
                                    ({new Date(ob.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })})
                                  </span>
                                )}
                              </p>
                            )}
                            {ob.verifiedBy ? (
                              <p className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Disahkan oleh: <strong className="uppercase">{ob.verifiedBy}</strong>
                              </p>
                            ) : ob.verificationStatus === "PENDING" ? (
                              <p className="text-amber-700 font-semibold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Menunggu Pengesahan Penyelia
                              </p>
                            ) : null}
                          </div>

                          {/* Action Button */}
                          <Link
                            href={ob.actionUrl}
                            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs ${
                              ob.actionLabel === "Semak / Sahkan"
                                ? "bg-amber-600 hover:bg-amber-700 text-white"
                                : ob.actionLabel === "Sambung draft"
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                : ob.actionLabel === "Lihat rekod"
                                ? "bg-slate-800 hover:bg-slate-900 text-white"
                                : ob.actionLabel === "Jadual belum ditetapkan"
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                                : "bg-blue-700 hover:bg-blue-800 text-white"
                            }`}
                          >
                            {ob.actionLabel}
                            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>BubblesO2 GMP Compliance Engine</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ ob }: { ob: GMPObligation }) {
  if (ob.submissionStatus === "MISSING_OVERDUE") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Terlepas Tarikh Akhir
      </span>
    )
  }

  if (ob.submissionStatus === "DRAFT") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
        <FileClock className="w-3 h-3" /> Draf
      </span>
    )
  }

  if (ob.submissionStatus === "SUBMITTED_LATE") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Dihantar Lewat
      </span>
    )
  }

  if (ob.submissionStatus === "SUBMITTED_ON_TIME") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Dihantar Tepat Masa
      </span>
    )
  }

  if (ob.submissionStatus === "NOT_SUBMITTED") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide bg-blue-100 text-blue-800 border border-blue-200">
        Belum Dihantar (Aktif)
      </span>
    )
  }

  if (ob.submissionStatus === "UNCONFIGURED") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
        Jadual belum ditetapkan
      </span>
    )
  }

  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-slate-100 text-slate-600">
      Akan Datang
    </span>
  )
}

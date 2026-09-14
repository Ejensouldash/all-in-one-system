"use client"

import React from "react"
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  FileClock,
  ChevronRight,
  Info,
} from "lucide-react"
import { ComplianceDaySummary } from "@/lib/compliance/types"

interface Props {
  days: ComplianceDaySummary[]
  onSelectDate: (day: ComplianceDaySummary) => void
  selectedDateStr: string | null
}

const WEEKDAYS = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"]

export function ComplianceCalendarView({ days, onSelectDate, selectedDateStr }: Props) {
  if (!days || days.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
        Tiada data kalendar untuk dipaparkan bagi bulan yang dipilih.
      </div>
    )
  }

  // Calculate leading blanks: dayOfWeek 1 (Mon) -> 0 blanks, dayOfWeek 0 (Sun) -> 6 blanks
  const firstDay = days[0]
  const firstDayOfWeek = firstDay.dayOfWeek // 0 is Sun, 1 is Mon...
  const leadingBlanks = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-xs font-black uppercase tracking-wider text-slate-600 text-center py-3">
          {WEEKDAYS.map((wd, i) => (
            <div key={wd} className={i >= 5 ? "text-slate-400" : ""}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/40">
          {/* Empty cells before day 1 */}
          {Array.from({ length: leadingBlanks }).map((_, idx) => (
            <div key={`blank-${idx}`} className="min-h-[110px] bg-slate-50/40" />
          ))}

          {/* Actual days */}
          {days.map(day => {
            const isSelected = selectedDateStr === day.date
            const hasOverdue = day.totalMissing > 0
            const hasPending = day.totalPendingVerification > 0
            const hasDraft = day.totalDraft > 0
            const allComplete =
              day.totalExpected > 0 &&
              day.totalSubmitted === day.totalExpected &&
              !hasPending &&
              !hasOverdue

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(day)}
                className={`min-h-[115px] p-2 sm:p-2.5 text-left transition-all relative flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-blue-600 focus:z-10 ${
                  day.isCurrentMonth ? "bg-white" : "bg-slate-50/70"
                } ${
                  isSelected
                    ? "ring-2 ring-blue-600 bg-blue-50/40 shadow-md z-10"
                    : "hover:bg-slate-50/90"
                } ${hasOverdue ? "border-l-4 border-l-red-500" : ""}`}
              >
                {/* Cell Header: Date Number & Badges */}
                <div className="flex items-center justify-between gap-1 w-full">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all ${
                      day.isToday
                        ? "bg-blue-700 text-white shadow-xs"
                        : isSelected
                        ? "bg-slate-900 text-white"
                        : "text-slate-800 group-hover:text-blue-700"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>

                  <div className="flex items-center gap-1">
                    {hasOverdue && (
                      <span
                        title={`${day.totalMissing} borang terlepas tarikh akhir`}
                        className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"
                      />
                    )}
                    {hasPending && (
                      <span
                        title={`${day.totalPendingVerification} borang menunggu pengesahan`}
                        className="w-2.5 h-2.5 rounded-full bg-amber-500"
                      />
                    )}
                    {hasDraft && (
                      <span
                        title={`${day.totalDraft} draf belum selesai`}
                        className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                      />
                    )}
                    {allComplete && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </div>
                </div>

                {/* Cell Body: Submission Ratio */}
                <div className="my-1.5 space-y-1 w-full">
                  {day.totalExpected > 0 ? (
                    <div>
                      <div className="text-[11px] font-black text-slate-800 leading-tight">
                        {day.totalSubmitted}/{day.totalExpected} dihantar
                      </div>

                      {/* Subtitle breakdown */}
                      <div className="text-[10px] font-semibold text-slate-500 leading-tight truncate">
                        {day.totalMissing > 0 ? (
                          <span className="text-red-700 font-bold">
                            {day.totalMissing} belum dihantar
                          </span>
                        ) : day.isFuture ? (
                          <span className="text-slate-400">Akan datang</span>
                        ) : (
                          <span className="text-emerald-700">Lengkap</span>
                        )}
                        {day.totalPendingVerification > 0 && (
                          <span className="text-amber-700">
                            {" "}
                            · {day.totalPendingVerification} semakan
                          </span>
                        )}
                      </div>
                    </div>
                  ) : day.totalSubmitted > 0 ? (
                    <div>
                      <div className="text-[11px] font-black text-slate-700">
                        {day.totalSubmitted} rekod
                      </div>
                      <div className="text-[10px] text-slate-400">Berasaskan kejadian</div>
                    </div>
                  ) : day.totalUnconfigured > 0 ? (
                    <div className="text-[10px] text-slate-400 italic">
                      Jadual belum ditetapkan
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-300">Tiada obligasi</div>
                  )}
                </div>

                {/* Cell Footer: Small Status indicator pill */}
                <div className="w-full pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{day.obligations.length} butiran</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accessible Status Legend */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600" />
          Panduan Status Pematuhan
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-700">Tepat Masa (On-time)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
            <span className="text-slate-700">Dihantar Lewat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <span className="text-slate-700">Terlepas Tarikh Akhir</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <span className="text-slate-700">Menunggu Pengesahan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-slate-700">Draf Disimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
            <span className="text-slate-500">Jadual Belum Ditetapkan</span>
          </div>
        </div>
      </div>
    </div>
  )
}

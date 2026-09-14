"use client"

import React, { useMemo } from "react"
import {
  Check,
  Clock,
  AlertCircle,
  FileClock,
  Minus,
  HelpCircle,
} from "lucide-react"
import {
  ComplianceDaySummary,
  GMPObligation,
  GMPScheduleRule,
  GMPCategory,
} from "@/lib/compliance/types"

interface Props {
  days: ComplianceDaySummary[]
  formsRegistry: GMPScheduleRule[]
  onSelectDate: (day: ComplianceDaySummary) => void
  selectedCategory: string
  selectedFormType: string
}

interface MatrixRowItem {
  id: string
  formType: string
  formCode: string
  formTitle: string
  category: GMPCategory
  frequency: string
  section?: string
  sectionName?: string
  shift?: string
}

export function ComplianceMatrixView({
  days,
  formsRegistry,
  onSelectDate,
  selectedCategory,
  selectedFormType,
}: Props) {
  // Build flattened matrix rows (e.g. FUV DAY, FUV NIGHT, Cleaning per section)
  const matrixRows = useMemo(() => {
    const rows: MatrixRowItem[] = []

    for (const form of formsRegistry) {
      // Category & Form filter
      if (selectedCategory !== "ALL" && form.category !== selectedCategory) continue
      if (selectedFormType !== "ALL" && form.formType !== selectedFormType) continue

      if (form.formType === "fuv") {
        rows.push({
          id: "fuv:DAY",
          formType: "fuv",
          formCode: "SGMP/19/FUV",
          formTitle: "Hazard & Process Control",
          category: form.category,
          frequency: form.frequency,
          shift: "DAY",
        })
        rows.push({
          id: "fuv:NIGHT",
          formType: "fuv",
          formCode: "SGMP/19/FUV",
          formTitle: "Hazard & Process Control",
          category: form.category,
          frequency: form.frequency,
          shift: "NIGHT",
        })
      } else if (form.formType === "cleaning") {
        // Group cleaning by section
        for (const sec of form.sections || []) {
          rows.push({
            id: `cleaning:${sec}`,
            formType: "cleaning",
            formCode: "SGMP/05",
            formTitle: `Cleaning (${sec})`,
            category: form.category,
            frequency: form.frequency,
            section: sec,
            sectionName: sec,
          })
        }
      } else {
        rows.push({
          id: form.formType,
          formType: form.formType,
          formCode: form.formCode,
          formTitle: form.formTitle,
          category: form.category,
          frequency: form.frequency,
        })
      }
    }

    return rows
  }, [formsRegistry, selectedCategory, selectedFormType])

  // Pre-index obligations by day and row key for O(1) cell lookup
  const obligationIndex = useMemo(() => {
    const map = new Map<string, GMPObligation>()
    for (const day of days) {
      for (const ob of day.obligations) {
        let rowKey = ob.formType
        if (ob.formType === "fuv" && ob.shift) {
          rowKey = `fuv:${ob.shift}`
        } else if (ob.formType === "cleaning" && ob.section) {
          rowKey = `cleaning:${ob.section}`
        }
        map.set(`${day.date}:${rowKey}`, ob)
      }
    }
    return map
  }, [days])

  if (!days || days.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
        Tiada data matriks tersedia.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Horizontal scroll container with sticky column */}
        <div className="overflow-x-auto max-h-[700px]">
          <table className="w-full border-collapse text-xs">
            {/* Sticky Table Header */}
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 p-3 text-left font-black uppercase tracking-wider text-slate-700 min-w-[240px] max-w-[280px] shadow-xs">
                  Borang GMP &amp; Parameter
                </th>
                <th className="p-2 font-black uppercase tracking-wider text-slate-500 text-center min-w-[70px]">
                  Kekerapan
                </th>
                {days.map(d => (
                  <th
                    key={d.date}
                    onClick={() => onSelectDate(d)}
                    className={`p-2 text-center min-w-[38px] cursor-pointer hover:bg-blue-100 transition-colors ${
                      d.isToday ? "bg-blue-50 text-blue-700 font-black" : "text-slate-600 font-bold"
                    }`}
                    title={`Klik untuk lihat tarikh ${d.dayOfMonth}`}
                  >
                    <div className="text-[11px]">{d.dayOfMonth}</div>
                    <div className="text-[9px] font-semibold text-slate-400">
                      {["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"][d.dayOfWeek]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Matrix Body */}
            <tbody className="divide-y divide-slate-100 font-medium">
              {matrixRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={days.length + 2}
                    className="p-8 text-center text-slate-400 bg-slate-50/50"
                  >
                    Tiada borang sepadan dengan penapis yang dipilih.
                  </td>
                </tr>
              ) : (
                matrixRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Sticky row label */}
                    <td className="sticky left-0 z-10 bg-white p-2.5 font-semibold text-slate-900 border-r border-slate-200 shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wide bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {row.formCode}
                        </span>
                        <span className="truncate text-slate-800 font-bold text-[11px]" title={row.formTitle}>
                          {row.formTitle}
                        </span>
                      </div>
                      {row.shift && (
                        <div className="text-[10px] text-blue-700 font-bold ml-1">
                          Syif: {row.shift}
                        </div>
                      )}
                      {row.section && (
                        <div className="text-[10px] text-slate-500 font-medium ml-1 truncate">
                          Zon: {row.section}
                        </div>
                      )}
                    </td>

                    {/* Frequency column */}
                    <td className="p-2 text-center text-[10px] font-bold text-slate-500 border-r border-slate-100">
                      {row.frequency === "PER_SHIFT"
                        ? "Syif"
                        : row.frequency === "DAILY"
                        ? "Harian"
                        : row.frequency === "MONTHLY"
                        ? "Bulanan"
                        : row.frequency === "SCHEDULED_PM"
                        ? "Jadual PM"
                        : row.frequency === "EVENT_BASED"
                        ? "Kejadian"
                        : "Tiada"}
                    </td>

                    {/* Date cells */}
                    {days.map(d => {
                      const cellKey = `${d.date}:${row.id}`
                      const ob = obligationIndex.get(cellKey)

                      return (
                        <td
                          key={d.date}
                          onClick={() => onSelectDate(d)}
                          className={`p-1 text-center cursor-pointer transition-colors hover:bg-blue-50/80 border-r border-slate-100/60 ${
                            d.isToday ? "bg-blue-50/30" : ""
                          }`}
                          title={
                            ob
                              ? `${ob.formTitle} (${d.date}): ${ob.actionLabel} [Status: ${ob.submissionStatus}]`
                              : `${d.date}: Tiada keperluan borang ini`
                          }
                        >
                          <MatrixCellContent ob={ob} day={d} row={row} />
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrix Legend */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
        <span className="font-bold text-slate-700">Petunjuk Sel Matriks:</span>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] border border-emerald-300">
              ✓
            </span>
            <span>Tepat Masa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-[10px] border border-orange-300">
              LW
            </span>
            <span>Lewat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-red-100 text-red-800 flex items-center justify-center font-bold text-[10px] border border-red-300">
              TL
            </span>
            <span>Terlepas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] border border-amber-300">
              SM
            </span>
            <span>Menunggu Semakan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px] border border-indigo-300">
              DF
            </span>
            <span>Draf</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">
              -
            </span>
            <span>Tiada Jadual / Bukan Tarikh</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MatrixCellContent({
  ob,
  day,
  row,
}: {
  ob?: GMPObligation
  day: ComplianceDaySummary
  row: MatrixRowItem
}) {
  if (!ob) {
    if (row.frequency === "MONTHLY") {
      // Monthly form only occurs at month-end; show empty or faint dash on other days
      return <span className="text-slate-200 text-[10px]">-</span>
    }
    return <span className="text-slate-200 text-[10px]">·</span>
  }

  if (ob.submissionStatus === "SUBMITTED_ON_TIME") {
    if (ob.verificationStatus === "PENDING") {
      return (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-800 font-black text-[9px] border border-amber-300 shadow-2xs"
          title="Dihantar tepat masa, menunggu pengesahan"
        >
          SM
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-black text-[9px] border border-emerald-300 shadow-2xs"
        title="Dihantar dan disahkan"
      >
        ✓
      </span>
    )
  }

  if (ob.submissionStatus === "SUBMITTED_LATE") {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-orange-100 text-orange-800 font-black text-[9px] border border-orange-300 shadow-2xs"
        title="Dihantar lewat"
      >
        LW
      </span>
    )
  }

  if (ob.submissionStatus === "MISSING_OVERDUE") {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-100 text-red-800 font-black text-[9px] border border-red-300 animate-pulse shadow-2xs"
        title="Terlepas tarikh akhir!"
      >
        TL
      </span>
    )
  }

  if (ob.submissionStatus === "DRAFT") {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-indigo-100 text-indigo-800 font-black text-[9px] border border-indigo-300 shadow-2xs"
        title="Draf disimpan belum diserah"
      >
        DF
      </span>
    )
  }

  if (ob.submissionStatus === "NOT_SUBMITTED") {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-50 text-blue-700 font-black text-[9px] border border-blue-200"
        title="Belum dihantar (hari ini)"
      >
        BL
      </span>
    )
  }

  if (ob.submissionStatus === "UNCONFIGURED") {
    return (
      <span className="text-slate-300 text-[10px]" title="Jadual belum ditetapkan">
        -
      </span>
    )
  }

  return <span className="text-slate-300 text-[10px]">·</span>
}

import React from "react"
import type {
  BatchTraceabilityReport,
  MaterialToFgTraceRow,
} from "@/lib/analytics/batchTraceability"

interface BatchTracePrintViewProps {
  report: BatchTraceabilityReport
  generatedAt: string
  preparedBy: string
}

export function BatchTracePrintView({
  report,
  generatedAt,
  preparedBy,
}: BatchTracePrintViewProps) {
  const rows = report.materialToFgRows || []

  // Group rows by shiftKey so Material Usage per shift is displayed once (with rowSpan)
  const shiftGroups: MaterialToFgTraceRow[][] = []
  const shiftGroupMap = new Map<string, MaterialToFgTraceRow[]>()
  for (const r of rows) {
    let grp = shiftGroupMap.get(r.shiftKey)
    if (!grp) {
      grp = []
      shiftGroupMap.set(r.shiftKey, grp)
      shiftGroups.push(grp)
    }
    grp.push(r)
  }

  const uniqueMaterialBatches = new Set<string>()
  const uniqueFgBatches = new Set<string>()
  const unitSet = new Set<string>()
  let totalMaterialQty = 0
  let totalFgBoxes = 0

  for (const grp of shiftGroups) {
    const head = grp[0]
    head.matchedMaterialBatches
      .split(",")
      .map(s => s.trim())
      .filter(s => s && s !== "-")
      .forEach(b => uniqueMaterialBatches.add(b))
    totalMaterialQty += head.totalUsageQty
    unitSet.add(head.usageUnit)
    for (const fg of grp) {
      if (fg.fgBatchNo && fg.fgBatchNo !== "N/A") {
        uniqueFgBatches.add(fg.fgBatchNo)
      }
      totalFgBoxes += fg.fgBoxesProduced
    }
  }

  const primaryUnitLabel =
    unitSet.size === 1 ? Array.from(unitSet)[0] : "units"

  return (
    <div className="bg-white border-2 border-black shadow-md print:shadow-none w-full max-w-[297mm] mx-auto p-5 print:p-3 text-slate-900">
      {/* Official Header */}
      <div className="border-b-2 border-black pb-3 mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800 print:text-black">
            Bubbles O2 Sdn Bhd — Production Traceability
          </p>
          <h1 className="text-lg print:text-base font-black uppercase tracking-tight text-black mt-0.5">
            Material Usage to Finished Goods Traceability Summary
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-700 print:text-black mt-1">
            <span>
              Range: <strong>{report.dateRange.shortRange}</strong>
            </span>
            <span>•</span>
            <span>
              Line: <strong>{report.filterLine}</strong>
            </span>
            <span>•</span>
            <span>
              Prepared By: <strong>{preparedBy}</strong>
            </span>
            <span>•</span>
            <span>
              Generated: <strong>{generatedAt}</strong>
            </span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.ico"
          alt="Bubbles O2 Logo"
          className="w-12 h-12 object-contain shrink-0"
        />
      </div>

      {/* Searched Batch Chips */}
      {report.batchFilters && report.batchFilters.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-black uppercase text-slate-600 print:text-black mr-1">
            Traced Batches (Usage Only):
          </span>
          {report.batchFilters.map((f, idx) => (
            <span
              key={`${f.category}-${f.batchNo}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 border border-black rounded bg-emerald-50 print:bg-transparent font-bold"
            >
              <span className="text-[9px] font-black uppercase">[{f.category}]</span>
              <span>{f.batchNo}</span>
            </span>
          ))}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="border border-black p-2 bg-slate-50 print:bg-transparent">
          <div className="text-[9px] font-black uppercase text-slate-500 print:text-black">
            Shifts Matched (Usage)
          </div>
          <div className="text-base font-black text-black">{shiftGroups.length}</div>
        </div>
        <div className="border border-black p-2 bg-slate-50 print:bg-transparent">
          <div className="text-[9px] font-black uppercase text-slate-500 print:text-black">
            Unique Material Batches
          </div>
          <div className="text-base font-black text-black">{uniqueMaterialBatches.size}</div>
        </div>
        <div className="border border-black p-2 bg-slate-50 print:bg-transparent">
          <div className="text-[9px] font-black uppercase text-slate-500 print:text-black">
            Total Material Used ({primaryUnitLabel})
          </div>
          <div className="text-base font-black text-emerald-800 print:text-black">
            {totalMaterialQty.toLocaleString()}
          </div>
        </div>
        <div className="border border-black p-2 bg-slate-50 print:bg-transparent">
          <div className="text-[9px] font-black uppercase text-slate-500 print:text-black">
            FG Output ({uniqueFgBatches.size} Batches)
          </div>
          <div className="text-base font-black text-blue-800 print:text-black">
            {totalFgBoxes.toLocaleString()} Box
          </div>
        </div>
      </div>

      {/* Main Compact Trace Table */}
      <table className="w-full border-collapse border-2 border-black text-[11px] print:text-[9pt]">
        <thead>
          <tr className="bg-emerald-900 text-white print:bg-slate-200 print:text-black font-black uppercase text-[10px] print:text-[8.5pt]">
            <th className="border border-black p-1.5 text-center w-8">No.</th>
            <th className="border border-black p-1.5 text-left w-[15%]">Material Batch (Usage)</th>
            <th className="border border-black p-1.5 text-center w-[13%]">Date / Shift / Line</th>
            <th className="border border-black p-1.5 text-left w-[24%]">Usage Detail (Before / After / Total)</th>
            <th className="border border-black p-1.5 text-left w-[12%]">FG SKU</th>
            <th className="border border-black p-1.5 text-center w-[12%]">FG Batch No</th>
            <th className="border border-black p-1.5 text-right w-[8%]">FG Qty (Box)</th>
            <th className="border border-black p-1.5 text-left w-[16%]">DO Distribution</th>
          </tr>
        </thead>
        <tbody>
          {shiftGroups.map((grp, sIdx) => {
            const head = grp[0]
            const span = grp.length

            return grp.map((fgRow, fgIdx) => {
              const distLines = (fgRow.distributions || []).filter(
                d => d.destination && d.destination !== "-"
              )

              return (
                <tr
                  key={fgRow.id}
                  className={`break-inside-avoid ${
                    sIdx % 2 === 0 ? "bg-white" : "bg-slate-50/70 print:bg-transparent"
                  }`}
                >
                  {fgIdx === 0 && (
                    <>
                      <td
                        rowSpan={span}
                        className="border border-black p-1.5 text-center font-bold align-top"
                      >
                        {sIdx + 1}
                      </td>
                      <td
                        rowSpan={span}
                        className="border border-black p-1.5 align-top"
                      >
                        <div className="text-[9px] font-black uppercase text-emerald-700 print:text-black">
                          [{head.materialSection}] Search: {head.searchedBatch}
                        </div>
                        <div className="font-black text-black mt-0.5 break-all">
                          {head.matchedMaterialBatches}
                        </div>
                        <div className="text-[9px] text-slate-500 print:text-black mt-0.5">
                          {head.preparedBy} ({head.reportStatus})
                        </div>
                      </td>
                      <td
                        rowSpan={span}
                        className="border border-black p-1.5 text-center align-top"
                      >
                        <div className="font-bold text-black">{head.reportDateFormatted}</div>
                        <div className="font-black text-[10px] mt-0.5">
                          Shift {head.shift}
                        </div>
                        <div className="text-[10px] text-slate-600 print:text-black">
                          {head.line}
                        </div>
                      </td>
                      <td
                        rowSpan={span}
                        className="border border-black p-1.5 align-top space-y-0.5"
                      >
                        <div>
                          <span className="font-bold text-slate-500 print:text-black">Before: </span>
                          <span className="font-semibold">{head.usageBeforeDisplay}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-500 print:text-black">After: </span>
                          <span className="font-semibold">{head.usageAfterDisplay}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-300 pt-0.5 font-black text-emerald-800 print:text-black">
                          Total: {head.totalUsageDisplay}
                        </div>
                      </td>
                    </>
                  )}

                  <td className="border border-black p-1.5 font-bold align-top">
                    {fgRow.fgSkuLabel}
                  </td>
                  <td className="border border-black p-1.5 text-center font-black text-blue-800 print:text-black align-top">
                    {fgRow.fgBatchNo}
                  </td>
                  <td className="border border-black p-1.5 text-right font-black align-top">
                    {fgRow.fgBoxesProduced.toLocaleString()}
                  </td>
                  <td className="border border-black p-1.5 align-top text-[10px] print:text-[8pt]">
                    {distLines.length === 0 ? (
                      <span className="text-slate-400 italic print:text-black">Nil</span>
                    ) : (
                      <div className="space-y-0.5">
                        {distLines.map((d, dIdx) => (
                          <div key={dIdx} className="leading-tight">
                            {d.quantity !== null && d.quantity !== undefined ? (
                              <span>
                                <strong>{d.distributionDate}</strong> • {d.destination} (
                                <strong>{d.quantity.toLocaleString()}</strong>)
                              </span>
                            ) : (
                              <span className="text-slate-500 print:text-black">{d.destination}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })
          })}
        </tbody>
        {shiftGroups.length > 0 && (
          <tfoot>
            <tr className="bg-slate-200 print:bg-slate-100 font-black">
              <td colSpan={3} className="border border-black p-1.5 text-center uppercase">
                Grand Total ({shiftGroups.length} Shifts)
              </td>
              <td className="border border-black p-1.5 text-left text-emerald-900 print:text-black">
                {totalMaterialQty.toLocaleString()} {primaryUnitLabel}
              </td>
              <td colSpan={2} className="border border-black p-1.5 text-right uppercase">
                {uniqueFgBatches.size} FG Batches
              </td>
              <td className="border border-black p-1.5 text-right text-blue-900 print:text-black">
                {totalFgBoxes.toLocaleString()}
              </td>
              <td className="border border-black p-1.5"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

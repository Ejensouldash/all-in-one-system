"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft, Droplets } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { getHazardProcessRecords } from "../../fuv/actions"
import {
  type MergedDailyFUVRecord,
  isPG02Breach,
  isPG05Breach,
  isUVIntensityBreach,
} from "../../fuv/types"

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return ""
  const [y, m, d] = dateStr.split("-")
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

function renderCellContent(val?: string, isOff?: boolean) {
  if (isOff) return <span className="text-gray-400 font-medium">OFF</span>
  if (!val || val.trim() === "") return <span className="text-gray-300">-</span>
  return val
}

export function MaintenanceFUVReportClient() {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [records, setRecords] = useState<MergedDailyFUVRecord[]>([])
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true)
      const res = await getHazardProcessRecords(month, year)
      if (res.success && res.data) {
        setRecords(res.data)
      } else {
        setRecords([])
      }
      setLoading(false)
    }
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const originalTitle = document.title
    document.title = `SGMP-19-FUV HAZARD AND PROCESS CONTROL - ${monthNames[month - 1].toUpperCase()} ${year}`
    window.print()
    document.title = originalTitle
  }

  return (
    <div className="w-full">
      {/* Screen Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/forms/maintenance/reports"
            className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black uppercase tracking-tight text-xl text-gray-900">
                  Hazard and Process Control Reports
                </h1>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black uppercase">
                  Rev 4
                </span>
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                SGMP/19/FUV • Monthly 24-Hour Consolidated Audit View
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500 ml-2 mr-3" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-gray-300 mx-2">|</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer pr-2"
            >
              {[year - 2, year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            disabled={records.length === 0}
            className="flex items-center px-5 py-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 mr-2" /> Cetak PDF (A4 Landscape)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-bold animate-pulse uppercase tracking-widest print:hidden">
          Memuatkan Rekod SGMP-19/FUV...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm print:hidden max-w-xl mx-auto">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
            Tiada Rekod Dijumpai
          </h3>
          <p className="text-gray-500 text-sm mb-6">
            Tiada rekod Hazard and Process Control bagi bulan {monthNames[month - 1]} {year}.
          </p>
          <Link
            href="/forms/maintenance/fuv"
            className="inline-flex items-center px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-md"
          >
            Isi Borang Baru
          </Link>
        </div>
      ) : (
        <div ref={printRef} className="print-layout space-y-12 print:space-y-0">
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 4mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: white !important;
                color: black !important;
                font-family: Arial, Helvetica, sans-serif !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-page {
                page-break-after: always !important;
                break-after: page !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .print-page .mb-6 {
                margin-bottom: 2mm !important;
              }
              .print-page .my-6 {
                margin-top: 1.5mm !important;
                margin-bottom: 1.5mm !important;
              }
              .print-page .mb-3 {
                margin-bottom: 1.5mm !important;
              }
              .print-page .mt-4 {
                margin-top: 2mm !important;
              }
              .print-page .mt-3 {
                margin-top: 1.5mm !important;
              }
              table.fuv-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                font-size: 7pt !important;
              }
              table.fuv-table th, table.fuv-table td {
                border: 0.5pt solid black !important;
                padding: 1.5pt 1pt !important;
                text-align: center !important;
                line-height: 1.1 !important;
              }
              table.fuv-table th {
                word-break: keep-all !important;
                overflow-wrap: normal !important;
                hyphens: none !important;
                white-space: normal !important;
                font-size: 6.5pt !important;
                line-height: 1.05 !important;
              }
              table.fuv-table td {
                word-wrap: break-word !important;
                font-size: 7pt !important;
              }
            }
          `}</style>

          {records.map((dailyRec) => {
            const dateDisplay = formatDisplayDate(dailyRec.date)

            return (
              <div
                key={dailyRec.date}
                className="print-page bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none overflow-x-auto print:overflow-visible"
              >
                {/* Official Maintenance Header */}
                <MaintenanceHeader
                  title="HAZARD AND PROCESS CONTROL RECORDS"
                  recNo="SGMP/19/FUV"
                  issueNo="1/10/2022"
                  revNo="4"
                  effectiveDate="1/9/2026"
                />

                {/* Sub-header Date, Month & Year */}
                <div className="flex justify-between items-center mb-3 text-[11px] font-bold text-black font-sans uppercase">
                  <div>
                    TARIKH: <span className="underline ml-1 font-black px-2">{dateDisplay}</span>
                  </div>
                  <div>
                    BULAN: <span className="underline ml-1 px-3">{monthNames[month - 1]}</span>
                  </div>
                  <div>
                    TAHUN: <span className="underline ml-1 px-3">{year}</span>
                  </div>
                </div>

                {/* 25-Column Full Matriks Table */}
                <table className="fuv-table w-full text-center text-[10px] border-collapse border border-black min-w-[1200px] print:min-w-full">
                  <colgroup>
                    <col style={{ width: "4.6%" }} /> {/* Date */}
                    <col style={{ width: "4.5%" }} /> {/* Time */}
                    <col style={{ width: "3.3%" }} /> {/* VFD01 */}
                    <col style={{ width: "3.3%" }} /> {/* VFD02 */}
                    <col style={{ width: "4.5%" }} /> {/* SP01 */}
                    <col style={{ width: "3.5%" }} /> {/* CS02 */}
                    <col style={{ width: "3.2%" }} /> {/* PG01 */}
                    <col style={{ width: "3.2%" }} /> {/* PT01 */}
                    <col style={{ width: "4.5%" }} /> {/* SP02 */}
                    <col style={{ width: "4.5%" }} /> {/* SP03 */}
                    <col style={{ width: "3.6%" }} /> {/* PG02 (CCP1) */}
                    <col style={{ width: "3.2%" }} /> {/* PG03 */}
                    <col style={{ width: "3.2%" }} /> {/* PT02 */}
                    <col style={{ width: "3.2%" }} /> {/* PT03 */}
                    <col style={{ width: "3.2%" }} /> {/* PG04 */}
                    <col style={{ width: "3.6%" }} /> {/* PG05 (CCP1) */}
                    <col style={{ width: "3.6%" }} /> {/* CS01 */}
                    <col style={{ width: "3.2%" }} /> {/* FM01 */}
                    <col style={{ width: "3.2%" }} /> {/* PG06 */}
                    <col style={{ width: "3.5%" }} /> {/* FM02 */}
                    <col style={{ width: "5.2%" }} /> {/* UV INTENSITY (CCP2) */}
                    <col style={{ width: "4.8%" }} /> {/* OPERATING HOUR */}
                    <col style={{ width: "4.6%" }} /> {/* TOTAL RUNNING DAYS */}
                    <col style={{ width: "6.4%" }} /> {/* Checked By */}
                    <col style={{ width: "6.4%" }} /> {/* Verified By */}
                  </colgroup>
                  <thead>
                    {/* TIER 1: Bahagian / Peralatan */}
                    <tr className="bg-gray-200 font-bold border border-black text-[10px]">
                      <th rowSpan={4} className="border border-black p-1">Date</th>
                      <th rowSpan={4} className="border border-black p-1">Time</th>
                      <th className="border border-black p-0.5">Source Water Pump</th>
                      <th className="border border-black p-0.5">Booster Pump</th>
                      <th colSpan={4} className="border border-black p-0.5">Source Water Line</th>
                      <th className="border border-black p-0.5">Sand Filter</th>
                      <th className="border border-black p-0.5">Activated Carbon Filter</th>
                      <th className="border border-black p-0.5 bg-amber-100 font-black">Sand Filter + Activated Carbon Filter (CCP1)</th>
                      <th className="border border-black p-0.5">10µm Precision Filter</th>
                      <th className="border border-black p-0.5">5µm Precision Filter</th>
                      <th colSpan={2} className="border border-black p-0.5">Inlet UF Membrane</th>
                      <th colSpan={3} className="border border-black p-0.5 bg-amber-100 font-black">Outlet UF Membrane (CCP1)</th>
                      <th colSpan={2} className="border border-black p-0.5">UF Membrane Reject Line</th>
                      <th colSpan={3} className="border border-black p-0.5 bg-rose-100 font-black">UV SYSTEM (CCP2)</th>
                      <th rowSpan={4} className="border border-black p-1">Checked By</th>
                      <th rowSpan={4} className="border border-black p-1">Verified By</th>
                    </tr>

                    {/* TIER 2: Had Julat & Kawalan */}
                    <tr className="bg-gray-100 text-[9px] border border-black">
                      <th className="border border-black p-0.5">Max 25Hz</th>
                      <th className="border border-black p-0.5">Max 25Hz</th>
                      <th className="border border-black p-0.5">PH 6.5-7.5</th>
                      <th className="border border-black p-0.5">(50-270)</th>
                      <th className="border border-black p-0.5">Max 1.1 Bar</th>
                      <th className="border border-black p-0.5">Max 1.1 Bar</th>
                      <th className="border border-black p-0.5">PH 6.5-7.5</th>
                      <th className="border border-black p-0.5">PH 6.5-7.5</th>
                      <th className="border border-black p-0.5 font-bold bg-amber-100">Max 3 Bar (CCP1)</th>
                      <th className="border border-black p-0.5">Min 0.9 Bar</th>
                      <th className="border border-black p-0.5">Min 0.9 Bar</th>
                      <th className="border border-black p-0.5">Max 9 Bar</th>
                      <th className="border border-black p-0.5">Max 9 Bar</th>
                      <th className="border border-black p-0.5 font-bold bg-amber-100">Max 2 Bar (CCP1)</th>
                      <th className="border border-black p-0.5">&le; CS02 (50-270)</th>
                      <th className="border border-black p-0.5">Flow Range</th>
                      <th className="border border-black p-0.5">Nil</th>
                      <th className="border border-black p-0.5">1.2-1.8 m3/Hr</th>
                      <th className="border border-black p-0.5 font-bold bg-rose-100 text-[8.5px] print:text-[6.5pt] leading-tight">
                        <span>80 - 99%</span>
                        <span className="block text-[7.5px] print:text-[5.5pt]">(CCP2)</span>
                      </th>
                      <th className="border border-black p-0.5 text-[8.5px] print:text-[6.5pt] leading-tight">9000 Hr</th>
                      <th className="border border-black p-0.5 text-[8.5px] print:text-[6.5pt] leading-tight">
                        <span>Running</span>
                        <span className="block">Days</span>
                      </th>
                    </tr>

                    {/* TIER 3: Unit */}
                    <tr className="bg-gray-100 text-[9px] border border-black">
                      <th className="border border-black p-0.5">Hz</th>
                      <th className="border border-black p-0.5">Hz</th>
                      <th className="border border-black p-0.5">PH / TURB / COL</th>
                      <th className="border border-black p-0.5">µS/cm</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5">PH / TURB / COL</th>
                      <th className="border border-black p-0.5">PH / TURB / COL</th>
                      <th className="border border-black p-0.5 bg-amber-100">Bar</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5 bg-amber-100">Bar</th>
                      <th className="border border-black p-0.5">µS/cm</th>
                      <th className="border border-black p-0.5">m3/Hr</th>
                      <th className="border border-black p-0.5">Bar</th>
                      <th className="border border-black p-0.5">m3/Hr</th>
                      <th className="border border-black p-0.5 bg-rose-100">%</th>
                      <th className="border border-black p-0.5">Hr</th>
                      <th className="border border-black p-0.5">Days</th>
                    </tr>

                    {/* TIER 4: Tag */}
                    <tr className="bg-gray-200 text-[10px] font-black border-b-2 border-black">
                      <th className="border border-black p-0.5">VFD01</th>
                      <th className="border border-black p-0.5">VFD02</th>
                      <th className="border border-black p-0.5">SP01</th>
                      <th className="border border-black p-0.5">CS02</th>
                      <th className="border border-black p-0.5">PG01</th>
                      <th className="border border-black p-0.5">PT01</th>
                      <th className="border border-black p-0.5">SP02</th>
                      <th className="border border-black p-0.5">SP03</th>
                      <th className="border border-black p-0.5 bg-amber-200">PG02</th>
                      <th className="border border-black p-0.5">PG03</th>
                      <th className="border border-black p-0.5">PT02</th>
                      <th className="border border-black p-0.5">PT03</th>
                      <th className="border border-black p-0.5">PG04</th>
                      <th className="border border-black p-0.5 bg-amber-200">PG05</th>
                      <th className="border border-black p-0.5">CS01</th>
                      <th className="border border-black p-0.5">FM01</th>
                      <th className="border border-black p-0.5">PG06</th>
                      <th className="border border-black p-0.5">FM02</th>
                      <th className="border border-black p-0.5 bg-rose-200 text-[9px] print:text-[6.5pt] leading-tight">
                        <span>UV</span>
                        <span className="block">INTENSITY</span>
                      </th>
                      <th className="border border-black p-0.5 text-[9px] print:text-[6.5pt] leading-tight">
                        <span>OPERATING</span>
                        <span className="block">HR</span>
                      </th>
                      <th className="border border-black p-0.5 text-[9px] print:text-[6.5pt] leading-tight">
                        <span>RUNNING</span>
                        <span className="block">DAYS</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyRec.rows.map((row, idx) => {
                      const isOff = Boolean(row.isOff)
                      return (
                        <tr key={row.time} className="h-6">
                          {/* Col B: Date (rowSpan 12) */}
                          {idx === 0 && (
                            <td
                              rowSpan={12}
                              className="border border-black p-1 font-bold align-middle bg-white"
                            >
                              {dateDisplay}
                            </td>
                          )}

                          {/* Col C: Time */}
                          <td className="border border-black p-0.5 font-bold whitespace-nowrap bg-gray-50">
                            {row.time}
                          </td>

                          {/* Col D: VFD01 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.vfd01, isOff)}
                          </td>

                          {/* Col E: VFD02 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.vfd02, isOff)}
                          </td>

                          {/* Col F: SP01 */}
                          <td className="border border-black p-0.5 whitespace-nowrap">
                            {isOff ? (
                              renderCellContent("", true)
                            ) : row.sp01Ph ? (
                              <span>
                                {row.sp01Ph}
                                {row.sp01Status && row.sp01Status !== "Clear / No Colour" && (
                                  <span className="block text-[8px] text-red-600 font-bold">
                                    {row.sp01Status}
                                  </span>
                                )}
                              </span>
                            ) : (
                              renderCellContent("", false)
                            )}
                          </td>

                          {/* Col G: CS02 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.cs02, isOff)}
                          </td>

                          {/* Col H: PG01 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pg01, isOff)}
                          </td>

                          {/* Col I: PT01 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pt01, isOff)}
                          </td>

                          {/* Col J: SP02 */}
                          <td className="border border-black p-0.5 whitespace-nowrap">
                            {isOff ? (
                              renderCellContent("", true)
                            ) : row.sp02Ph ? (
                              <span>
                                {row.sp02Ph}
                                {row.sp02Status && row.sp02Status !== "Clear / No Colour" && (
                                  <span className="block text-[8px] text-red-600 font-bold">
                                    {row.sp02Status}
                                  </span>
                                )}
                              </span>
                            ) : (
                              renderCellContent("", false)
                            )}
                          </td>

                          {/* Col K: SP03 */}
                          <td className="border border-black p-0.5 whitespace-nowrap">
                            {isOff ? (
                              renderCellContent("", true)
                            ) : row.sp03Ph ? (
                              <span>
                                {row.sp03Ph}
                                {row.sp03Status && row.sp03Status !== "Clear / No Colour" && (
                                  <span className="block text-[8px] text-red-600 font-bold">
                                    {row.sp03Status}
                                  </span>
                                )}
                              </span>
                            ) : (
                              renderCellContent("", false)
                            )}
                          </td>

                          {/* Col L: PG02 (CCP1) */}
                          <td
                            className={`border border-black p-0.5 font-bold ${
                              isPG02Breach(row.pg02, isOff) ? "bg-red-200 text-red-800" : ""
                            }`}
                          >
                            {renderCellContent(row.pg02, isOff)}
                          </td>

                          {/* Col M: PG03 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pg03, isOff)}
                          </td>

                          {/* Col N: PT02 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pt02, isOff)}
                          </td>

                          {/* Col O: PT03 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pt03, isOff)}
                          </td>

                          {/* Col P: PG04 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pg04, isOff)}
                          </td>

                          {/* Col Q: PG05 (CCP1) */}
                          <td
                            className={`border border-black p-0.5 font-bold ${
                              isPG05Breach(row.pg05, isOff) ? "bg-red-200 text-red-800" : ""
                            }`}
                          >
                            {renderCellContent(row.pg05, isOff)}
                          </td>

                          {/* Col R: CS01 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.cs01, isOff)}
                          </td>

                          {/* Col S: FM01 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.fm01, isOff)}
                          </td>

                          {/* Col T: PG06 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.pg06, isOff)}
                          </td>

                          {/* Col U: FM02 */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.fm02, isOff)}
                          </td>

                          {/* Col V: UV INTENSITY (CCP2) */}
                          <td
                            className={`border border-black p-0.5 font-bold ${
                              isUVIntensityBreach(row.uvIntensity, isOff)
                                ? "bg-red-200 text-red-800"
                                : ""
                            }`}
                          >
                            {renderCellContent(row.uvIntensity, isOff)}
                          </td>

                          {/* Col W: OPERATING HOUR */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.operatingHour, isOff)}
                          </td>

                          {/* Col X: TOTAL RUNNING DAYS */}
                          <td className="border border-black p-0.5">
                            {renderCellContent(row.totalRunningDays, isOff)}
                          </td>

                          {/* Col Y: Checked By */}
                          <td className="border border-black p-0.5 text-[9px]">
                            {row.checkedBy || (idx < 6 ? dailyRec.checkedByDay : dailyRec.checkedByNight) || ""}
                          </td>

                          {/* Col Z: Verified By */}
                          <td className="border border-black p-0.5 text-[9px]">
                            {row.verifiedBy || (idx < 6 ? dailyRec.dayRecord?.verifiedBy : dailyRec.nightRecord?.verifiedBy) || dailyRec.verifiedBy || ""}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

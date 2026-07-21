"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { getQCDRRecords, type QCDRRow } from "../../qcdr/actions"

function formatSignatureDate(d: string | Date | null) {
  if (!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("en-GB")
}

export function MaintenanceQCDRReportClient() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true)
      const res = await getQCDRRecords(month, year)
      if (res.success) {
        setRecords(res.data || [])
      }
      setLoading(false)
    }
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const title = `QC DAILY REPORT ${monthNames[month - 1].toUpperCase()} ${year}`
    document.title = title
    window.print()
    document.title = "All in One System"
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/forms/maintenance/reports" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl">QC Daily Report</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SGMP/18/QCDR</p>
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
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <span className="text-gray-300 mx-2">|</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer pr-2"
            >
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            disabled={records.length === 0}
            className="flex items-center px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-bold animate-pulse uppercase tracking-widest print:hidden">
          Loading Records...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm print:hidden">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">No Records Found</h3>
          <p className="text-gray-500 font-medium">There are no QC daily reports submitted for {monthNames[month - 1]} {year}.</p>
        </div>
      ) : (
        <div ref={printRef} className="print-layout">
          {records.map((record, index) => {
            const rows: QCDRRow[] = Array.isArray(record.rows) ? record.rows : []
            return (
              <div key={record.id} className="print-page bg-white p-8 sm:p-12 shadow-sm border border-gray-100 mb-8 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none overflow-x-auto print:overflow-visible">

                {/* Header */}
                <MaintenanceHeader
                  title="QUALITY CONTROL DAILY REPORTS"
                  recNo="SGMP/18/QCDR"
                  issueNo="1/10/2022"
                  revNo="1"
                  effectiveDate="1/7/2026"
                />

                <div className="flex justify-start items-center mb-4 text-xs font-bold text-black font-sans uppercase">
                  <div>DATE: <span className="underline ml-1 px-4">{formatSignatureDate(record.date)}</span></div>
                </div>

                {/* Data Table */}
                <table className="w-full text-xs border-collapse border border-black text-left print-compact-table">
                  <thead>
                    <tr className="bg-gray-200 print:bg-gray-200">
                      <th colSpan={4} className="border border-black p-1 text-center">QUALITY CONTROL DAILY REPORTS</th>
                    </tr>
                    <tr className="bg-gray-200 print:bg-gray-200 text-center">
                      <th className="border border-black p-1 w-1/4">DESCRIPTION QUALITY CONTROL ACTIVITIES</th>
                      <th className="border border-black p-1 w-1/4">RESULTS</th>
                      <th className="border border-black p-1 w-1/4">CONCLUSION</th>
                      <th className="border border-black p-1 w-1/4">CORRECTIVE ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? rows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">{row.description || ""}</td>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">{row.results || ""}</td>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">{row.conclusion || ""}</td>
                        <td className="border border-black p-2 align-top whitespace-pre-wrap">{row.correctiveAction || ""}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="border border-black p-4 text-center">No activities recorded</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Signature Block */}
                <div className="mt-10 grid grid-cols-2 gap-10 text-black font-sans">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1">Prepared By (Signature & Name)</p>
                    <div className="h-16 border-b-2 border-black flex items-end pb-1">
                      {record.performedSignature && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={record.performedSignature} alt="Prepared by signature" className="h-14 object-contain" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase mt-1">{record.checkedBy || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1">Verified By (Signature & Name)</p>
                    <div className="h-16 border-b-2 border-black flex items-end pb-1">
                      {record.verifiedSignature && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={record.verifiedSignature} alt="Verified by signature" className="h-14 object-contain" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase mt-1">{record.verifiedBy || "-"}</p>
                  </div>
                </div>

                {/* Page break after each record except the last one */}
                {index < records.length - 1 && <div className="page-break"></div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

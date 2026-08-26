"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { getMaintenanceEquipmentRecords } from "../../maintenance-record/actions"

function formatSignatureDate(d: string | Date | null) {
  if (!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("en-GB")
}

export function MaintenanceRecordReportClient() {
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
      const res = await getMaintenanceEquipmentRecords(month, year)
      if (res.success) {
        setRecords(res.data || [])
      }
      setLoading(false)
    }
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const title = `MAINTENANCE RECORD ${monthNames[month-1].toUpperCase()} ${year}`
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
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl">Maintenance Record</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SGMP/04/MR</p>
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
            className="flex items-center px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-gray-500 font-medium">There are no maintenance records submitted for {monthNames[month-1]} {year}.</p>
        </div>
      ) : (
        <div ref={printRef} className="print-layout">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 8mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
              .print-page {
                page-break-after: always;
                break-after: page;
              }
              table.print-compact-table {
                border-collapse: collapse !important;
                border: 1.5px solid #000000 !important;
                width: 100% !important;
                table-layout: fixed !important;
              }
              table.print-compact-table th,
              table.print-compact-table td {
                border: 1px solid #000000 !important;
                border-top: 1px solid #000000 !important;
                border-bottom: 1px solid #000000 !important;
                border-left: 1px solid #000000 !important;
                border-right: 1px solid #000000 !important;
              }
              tr.verification-row,
              tr.verification-row td {
                height: 56px !important;
                min-height: 56px !important;
                border: 1px solid #000000 !important;
              }
            }
          `}</style>
          {records.map((record, index) => (
            <div key={record.id} className="print-page bg-white p-8 sm:p-12 shadow-sm border border-gray-100 mb-8 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none overflow-x-auto print:overflow-visible">
              
              {/* Header */}
              <MaintenanceHeader
                title="MAINTENANCE RECORDS"
                recNo="SGMP/04/MR"
                issueNo="1/10/2022"
                revNo="3"
                effectiveDate="1/7/2026"
              />

              <div className="flex justify-between items-center mb-4 text-xs font-bold text-black font-sans uppercase">
                <div>MONTH: <span className="underline ml-1 px-4">{monthNames[new Date(record.date).getMonth()]}</span></div>
                <div>DATE: <span className="underline ml-1 px-4">{formatSignatureDate(record.date)}</span></div>
              </div>

              {/* Data Table */}
              <table className="w-full text-xs border-collapse border-2 border-black text-center print-compact-table table-fixed">
                <thead>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th rowSpan={2} className="border border-black p-1 w-[24%] align-middle font-bold">MAINTENANCE ACTIVITY</th>
                    <th colSpan={4} className="border border-black p-1 font-bold">PRODUCTION LINE</th>
                  </tr>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th colSpan={2} className="border border-black p-1 w-[38%] font-bold">800ML</th>
                    <th colSpan={2} className="border border-black p-1 w-[38%] font-bold">425ML</th>
                  </tr>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th className="border border-black p-1 w-[24%]"></th>
                    <th className="border border-black p-1 w-[19%] font-bold">MORNING SHIFT</th>
                    <th className="border border-black p-1 w-[19%] font-bold">NIGHT SHIFT</th>
                    <th className="border border-black p-1 w-[19%] font-bold">MORNING SHIFT</th>
                    <th className="border border-black p-1 w-[19%] font-bold">NIGHT SHIFT</th>
                  </tr>
                </thead>
                <tbody>
                  {record.activities && Array.isArray(record.activities) ? (
                    record.activities.map((act: any, idx: number) => (
                      <tr key={idx}>
                        <td className="border border-black p-1.5 text-left font-bold">{act.activity}</td>
                        <td className="border border-black p-1.5">{act.ml800Morning || ""}</td>
                        <td className="border border-black p-1.5">{act.ml800Night || ""}</td>
                        <td className="border border-black p-1.5">{act.ml425Morning || ""}</td>
                        <td className="border border-black p-1.5">{act.ml425Night || ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-black p-4">Invalid data structure</td>
                    </tr>
                  )}
                  
                  {/* Verification Section - 4 Shift Supervisor & Verifier Columns */}
                  <tr className="verification-row h-16">
                    <td className="border border-black p-2 font-bold bg-gray-200 print:bg-gray-200 text-left align-middle w-[24%]">
                      CHECKED BY
                    </td>
                    {/* 800ML Morning */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {(record.signature800M || (!record.signature800N && !record.signature425M && !record.signature425N && record.performedSignature)) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.signature800M || record.performedSignature} 
                            alt="Checked By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.checkedBy800M || (!record.checkedBy800N && !record.checkedBy425M && !record.checkedBy425N ? record.checkedBy : "") || "\u00A0"}
                      </span>
                    </td>
                    {/* 800ML Night */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {record.signature800N ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.signature800N} 
                            alt="Checked By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.checkedBy800N || "\u00A0"}
                      </span>
                    </td>
                    {/* 425ML Morning */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {record.signature425M ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.signature425M} 
                            alt="Checked By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.checkedBy425M || "\u00A0"}
                      </span>
                    </td>
                    {/* 425ML Night */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {record.signature425N ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.signature425N} 
                            alt="Checked By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.checkedBy425N || "\u00A0"}
                      </span>
                    </td>
                  </tr>
                  <tr className="verification-row h-16">
                    <td className="border border-black p-2 font-bold bg-gray-200 print:bg-gray-200 text-left align-middle w-[24%]">
                      VERIFIED BY
                    </td>
                    {/* 800ML Morning Verifier */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {(record.verifiedSig800M || (!record.verifiedSig800N && !record.verifiedSig425M && !record.verifiedSig425N && record.verifiedSignature)) ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.verifiedSig800M || record.verifiedSignature} 
                            alt="Verified By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.verifiedBy800M || (!record.verifiedBy800N && !record.verifiedBy425M && !record.verifiedBy425N ? (record.verifiedBy || "") : "") || "\u00A0"}
                      </span>
                    </td>
                    {/* 800ML Night Verifier */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {record.verifiedSig800N ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.verifiedSig800N} 
                            alt="Verified By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.verifiedBy800N || "\u00A0"}
                      </span>
                    </td>
                    {/* 425ML Morning Verifier */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {record.verifiedSig425M ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.verifiedSig425M} 
                            alt="Verified By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.verifiedBy425M || "\u00A0"}
                      </span>
                    </td>
                    {/* 425ML Night Verifier */}
                    <td className="border border-black p-1 text-center align-bottom relative h-16 w-[19%]">
                      <div className="h-9 flex items-center justify-center mb-0.5">
                        {record.verifiedSig425N ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={record.verifiedSig425N} 
                            alt="Verified By Signature" 
                            className="max-h-9 max-w-full object-contain" 
                          />
                        ) : (
                          <span className="text-transparent select-none">&nbsp;</span>
                        )}
                      </div>
                      <span className="block text-[9px] font-bold text-gray-800 leading-tight uppercase truncate">
                        {record.verifiedBy425N || "\u00A0"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 font-bold text-xs flex gap-2">
                <span>REMARKS:</span>
                <div className="border-b border-black w-full min-h-4 pb-1">
                  {record.remarks || ""}
                </div>
              </div>
              <div className="border-b border-black w-full min-h-4 mt-4 pb-1"></div>

              {/* Page break after each record except the last one */}
              {index < records.length - 1 && <div className="page-break"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

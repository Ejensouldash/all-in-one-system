"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
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
          {records.map((record, index) => (
            <div key={record.id} className="print-page bg-white p-8 sm:p-12 shadow-sm border border-gray-100 mb-8 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
              
              {/* Header - Matches SGMP-04 exactly */}
              <table className="w-full text-xs font-bold border-collapse border border-black mb-6">
                <tbody>
                  <tr>
                    <td rowSpan={4} className="border border-black p-4 w-1/3 text-center align-middle">
                      <Image 
                        src="/assets/BubblesO2_Logo.png" 
                        alt="BubblesO2 Logo" 
                        width={150} 
                        height={50} 
                        className="mx-auto" 
                      />
                    </td>
                    <td colSpan={2} className="border border-black p-1 px-2 font-black">BUBBLES O2 SDN BHD</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1 px-2">KOMPLEKS AL AMMAR<br/>KG KANCHONG<br/>71200, RANTAU<br/>NEGERI SEMBILAN</td>
                    <td className="border border-black p-0 align-top">
                      <table className="w-full h-full">
                        <tbody>
                          <tr><td className="p-1 px-2 border-b border-black w-32">Rec. No</td><td className="p-1 px-2 border-b border-l border-black">: SGMP/04/MR</td></tr>
                          <tr><td className="p-1 px-2 border-b border-black">Issue No</td><td className="p-1 px-2 border-b border-l border-black">: 1/10/2022</td></tr>
                          <tr><td className="p-1 px-2 border-b border-black">Rev No</td><td className="p-1 px-2 border-b border-l border-black">: 3</td></tr>
                          <tr><td className="p-1 px-2">Effective date</td><td className="p-1 px-2 border-l border-black">: 09/09/2025</td></tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-center mb-2 font-bold text-sm">
                <div>MONTH: <span className="border-b border-black px-4">{monthNames[new Date(record.date).getMonth()].toUpperCase()}</span></div>
                <div>DATE: <span className="border-b border-black px-4">{formatSignatureDate(record.date)}</span></div>
              </div>

              {/* Data Table */}
              <table className="w-full text-xs border-collapse border border-black text-center print-compact-table">
                <thead>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th colSpan={5} className="border border-black p-1">MAINTENANCE RECORDS</th>
                  </tr>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th rowSpan={2} className="border border-black p-1 w-1/4 align-middle">MAINTENANCE ACTIVITY</th>
                    <th colSpan={4} className="border border-black p-1">PRODUCTION LINE</th>
                  </tr>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th colSpan={2} className="border border-black p-1 w-3/8">800ML</th>
                    <th colSpan={2} className="border border-black p-1 w-3/8">425ML</th>
                  </tr>
                  <tr className="bg-gray-200 print:bg-gray-200">
                    <th className="border border-black p-1 bg-white print:bg-white"></th>
                    <th className="border border-black p-1">MORNING SHIFT</th>
                    <th className="border border-black p-1">NIGHT SHIFT</th>
                    <th className="border border-black p-1">MORNING SHIFT</th>
                    <th className="border border-black p-1">NIGHT SHIFT</th>
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
                  
                  {/* Verification Section */}
                  <tr>
                    <td rowSpan={2} className="border border-black p-2 font-bold bg-gray-200 print:bg-gray-200 text-left align-middle w-32">
                      <div className="flex flex-col justify-between h-full">
                        <div className="mb-4">CHECKED BY</div>
                        <div>VERIFIED BY</div>
                      </div>
                    </td>
                    <td colSpan={4} className="border border-black p-2 text-left relative align-top h-12">
                      {record.performedSignature && (
                        <div className="absolute top-1 left-2 w-16 h-8">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={record.performedSignature} alt="Checked By Signature" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="absolute bottom-1 left-2 text-[10px] text-gray-500">{record.checkedBy}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="border border-black p-2 text-left relative align-top h-12">
                      {record.verifiedSignature && (
                        <div className="absolute top-1 left-2 w-16 h-8">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={record.verifiedSignature} alt="Verified By Signature" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="absolute bottom-1 left-2 text-[10px] text-gray-500">{record.verifiedBy || ""}</span>
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

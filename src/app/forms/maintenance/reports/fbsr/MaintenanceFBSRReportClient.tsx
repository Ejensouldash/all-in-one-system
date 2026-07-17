"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getFiltrationBackwashRecords } from "../../fbsr/actions"

function formatSignatureDate(d: string | Date | null) {
  if (!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("en-GB")
}

export function MaintenanceFBSRReportClient() {
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
      const res = await getFiltrationBackwashRecords(month, year)
      if (res.success) {
        setRecords(res.data || [])
      }
      setLoading(false)
    }
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const title = `FILTRATION BACKWASH SYSTEM RECORDS ${monthNames[month-1].toUpperCase()} ${year}`
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
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-cyan-700" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl">Filtration Backwash</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SGMP/19/FBSR</p>
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
            className="flex items-center px-5 py-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-gray-500 font-medium">There are no filtration backwash records for {monthNames[month-1]} {year}.</p>
        </div>
      ) : (
        <div ref={printRef} className="print-layout">
          <div className="print-page bg-white p-8 sm:p-12 shadow-sm border border-gray-100 mb-8 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
            
            {/* Header - Matches SGMP-19 exactly */}
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
                        <tr><td className="p-1 px-2 border-b border-black w-32">Rec. No</td><td className="p-1 px-2 border-b border-l border-black">: SGMP/19/FBSR</td></tr>
                        <tr><td className="p-1 px-2 border-b border-black">Issue No</td><td className="p-1 px-2 border-b border-l border-black">: 1/10/2022</td></tr>
                        <tr><td className="p-1 px-2 border-b border-black">Rev No</td><td className="p-1 px-2 border-b border-l border-black">: 1</td></tr>
                        <tr><td className="p-1 px-2">Effective date</td><td className="p-1 px-2 border-l border-black">: 15/7/2024</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-center mb-4 font-bold text-sm">
              <div>Month: <span className="border-b border-black px-12">{monthNames[month-1].toUpperCase()}</span></div>
              <div>Year: <span className="border-b border-black px-12">{year}</span></div>
            </div>

            {/* Data Table */}
            <table className="w-full text-[11px] border-collapse border border-black text-center">
              <thead>
                <tr className="bg-gray-200 print:bg-gray-200">
                  <th colSpan={10} className="border border-black p-2 font-black">FILTRATION BACKWASH SYSTEM RECORDS</th>
                </tr>
                <tr className="bg-gray-200 print:bg-gray-200">
                  <th rowSpan={2} className="border border-black p-2 w-16 align-middle">DATE</th>
                  <th colSpan={2} className="border border-black p-1">QUARTZ SAND FILTER</th>
                  <th colSpan={2} className="border border-black p-1">ACTIVATED CARBON FILTER</th>
                  <th colSpan={2} className="border border-black p-1">HOLLOW MEMBRANE FILTER</th>
                  <th rowSpan={2} className="border border-black p-1 w-20 align-middle">DONE BY</th>
                  <th rowSpan={2} className="border border-black p-1 w-20 align-middle">VERIFIED BY</th>
                </tr>
                <tr className="bg-gray-200 print:bg-gray-200">
                  <th className="border border-black p-1">START TIME</th>
                  <th className="border border-black p-1">STOP TIME</th>
                  <th className="border border-black p-1">START TIME</th>
                  <th className="border border-black p-1">STOP TIME</th>
                  <th className="border border-black p-1">START TIME</th>
                  <th className="border border-black p-1">STOP TIME</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id} className="h-12">
                    <td className="border border-black p-1 font-bold">{formatSignatureDate(record.date)}</td>
                    
                    <td className="border border-black p-1 font-bold">{record.quartzStart || "-"}</td>
                    <td className="border border-black p-1 font-bold">{record.quartzStop || "-"}</td>
                    
                    <td className="border border-black p-1 font-bold">{record.carbonStart || "-"}</td>
                    <td className="border border-black p-1 font-bold">{record.carbonStop || "-"}</td>
                    
                    <td className="border border-black p-1 font-bold">{record.membraneStart || "-"}</td>
                    <td className="border border-black p-1 font-bold">{record.membraneStop || "-"}</td>
                    
                    <td className="border border-black p-0 relative">
                      {record.performedSignature && (
                        <div className="absolute top-1 left-2 w-12 h-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={record.performedSignature} alt="Sig" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="absolute bottom-1 left-2 text-[8px] text-gray-500 w-full truncate pr-1 text-left">{record.doneBy}</span>
                    </td>
                    <td className="border border-black p-0 relative">
                      {record.verifiedSignature && (
                        <div className="absolute top-1 left-2 w-12 h-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={record.verifiedSignature} alt="Sig" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="absolute bottom-1 left-2 text-[8px] text-gray-500 w-full truncate pr-1 text-left">{record.verifiedBy || ""}</span>
                    </td>
                  </tr>
                ))}
                
                {/* Fill empty rows to make it look like a full page if there are few records */}
                {Array.from({ length: Math.max(0, 15 - records.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`} className="h-12">
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

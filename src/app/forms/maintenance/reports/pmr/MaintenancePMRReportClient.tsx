"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { getPreventiveMaintenanceRecords } from "../../pmr/actions"

function formatSignatureDate(d: string | Date | null) {
  if (!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("en-GB")
}

const MACHINE_KEYS = [
  { key: "autoScrambler", label: "AUTOSCRAMBLER" },
  { key: "threeInOne", label: "3 IN 1 MACHINE" },
  { key: "blower", label: "BLOWER MACHINE" },
  { key: "label", label: "LABEL MACHINE" },
  { key: "laserPrinting", label: "LASER PRINTING" },
  { key: "weighing", label: "WEIGHING MACHINE" },
  { key: "sealer", label: "SEALER MACHINE" },
  { key: "roboticArm", label: "ROBOTIC ARM MACHINE" },
  { key: "wrapping", label: "WRAPPING MACHINE" },
  { key: "sandFilter", label: "SAND FILTER" },
  { key: "carbonFilter", label: "ACTIVATED CARBON FILTER" },
  { key: "hollowMembrane", label: "HOLLOW MEMBRANE FILTER" },
  { key: "uvMachine", label: "UV MACHINE" },
  { key: "airCompressor", label: "AIR COMPRESSOR" },
  { key: "rawWaterPump", label: "RAW WATER TANK PUMP" },
  { key: "rawTank", label: "RAW TANK" },
  { key: "filteredTank", label: "FILTERED TANK" },
]

export function MaintenancePMRReportClient() {
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
      const res = await getPreventiveMaintenanceRecords(month, year)
      if (res.success) {
        setRecords(res.data || [])
      }
      setLoading(false)
    }
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const title = `PREVENTIVE MAINTENANCE RECORDS ${monthNames[month-1].toUpperCase()} ${year}`
    document.title = title
    window.print()
    document.title = "All in One System"
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/forms/maintenance/reports" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-violet-700" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl">Preventive Maintenance</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SGMP/03/PMR</p>
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
            className="flex items-center px-5 py-3 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-gray-500 font-medium">There are no preventive maintenance records for {monthNames[month-1]} {year}.</p>
        </div>
      ) : (
        <div ref={printRef} className="print-layout landscape">
          <style>{`@page { size: A4 landscape; margin: 8mm 10mm; }`}</style>
          <div className="print-page bg-white p-8 shadow-sm border border-gray-100 mb-8 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
            
            {/* Header */}
            <MaintenanceHeader
              title="PREVENTIVE MAINTENANCE RECORDS"
              recNo="SGMP/03/PMR"
              issueNo="1/10/2022"
              revNo="3"
              effectiveDate="1/7/2026"
            />

            <div className="flex justify-between items-center mb-4 text-xs font-bold text-black font-sans uppercase">
              <div>MONTH: <span className="underline ml-1 px-4">{monthNames[month - 1]}</span></div>
              <div>YEAR: <span className="underline ml-1 px-4">{year}</span></div>
            </div>

            {/* Data Table */}
            <table className="w-full text-[9px] border-collapse border border-black text-center print-compact-table">
              <thead>
                <tr className="bg-gray-200 print:bg-gray-200">
                  <th rowSpan={2} className="border border-black p-1 w-12 align-middle">DATE</th>
                  <th rowSpan={2} className="border border-black p-1 w-12 align-middle">LINE</th>
                  <th colSpan={MACHINE_KEYS.length} className="border border-black p-1">MAINTENANCE ACTIVITY</th>
                  <th colSpan={2} className="border border-black p-1">VERIFICATION</th>
                </tr>
                <tr className="bg-gray-200 print:bg-gray-200 h-36">
                  {MACHINE_KEYS.map((m, i) => (
                    <th key={i} className="border border-black p-1 font-bold align-middle w-12">
                      <div className="mx-auto max-h-28 leading-tight" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                        {m.label}
                      </div>
                    </th>
                  ))}
                  <th className="border border-black p-1 font-bold align-middle w-12">
                      <div className="mx-auto max-h-28 leading-tight" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                        CHECKED BY
                      </div>
                  </th>
                  <th className="border border-black p-1 font-bold align-middle w-12">
                      <div className="mx-auto max-h-28 leading-tight" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                        VERIFIED BY
                      </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.id} className="h-10">
                    <td className="border border-black p-1 font-bold">{formatSignatureDate(record.date)}</td>
                    <td className="border border-black p-1 font-bold">{record.line}</td>
                    
                    {MACHINE_KEYS.map((m, i) => (
                      <td key={i} className="border border-black p-1 font-black text-gray-800 text-[10px]">
                        {record[m.key] ? "✓" : ""}
                      </td>
                    ))}

                    <td className="border border-black p-0 relative min-w-[60px]">
                      {record.performedSignature && (
                        <div className="absolute top-0.5 left-1 w-12 h-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={record.performedSignature} alt="Sig" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 left-1 text-[7px] text-gray-500 w-full truncate pr-1">{record.checkedBy}</span>
                    </td>
                    <td className="border border-black p-0 relative min-w-[60px]">
                      {record.verifiedSignature && (
                        <div className="absolute top-0.5 left-1 w-12 h-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={record.verifiedSignature} alt="Sig" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 left-1 text-[7px] text-gray-500 w-full truncate pr-1">{record.verifiedBy || ""}</span>
                    </td>
                  </tr>
                ))}
                
                {/* Fill empty rows to make it look like a full page if there are few records */}
                {Array.from({ length: Math.max(0, 15 - records.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`} className="h-10">
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    {MACHINE_KEYS.map((_, i) => <td key={i} className="border border-black p-1"></td>)}
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

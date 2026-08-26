"use client"

import React, { useState, useRef, useMemo } from "react"
import { ChevronLeft, Search, FileText, CheckCircle2, XCircle, Printer, Eye, Calendar, X, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"

const CHECKLIST_ITEMS = [
  { key: "extClean", label: "1. Exterior of vehicle clean" },
  { key: "intClean", label: "2. Interior of vehicle area clean & hygienic" },
  { key: "noTrash", label: "3. No trash, waste or foreign materials inside vehicle" },
  { key: "seatsClean", label: "4. Seats clean and hygienic" },
  { key: "floorClean", label: "5. Floor / cargo compartment clean and dry" },
  { key: "noOdor", label: "6. No unpleasant odor detected" },
  { key: "windowsClean", label: "7. Windows and mirrors clean" },
  { key: "noSpills", label: "8. No food or liquid spills" },
  { key: "wasteBinEmpty", label: "9. Waste bin empty" },
  { key: "noPests", label: "10. No evidence of pests, insects, rodents or droppings" },
  { key: "noChemicals", label: "11. No chemical residue or contamination observed" },
  { key: "suitableCondition", label: "12. Vehicle condition suitable for transporting materials" },
  { key: "noHazardous", label: "13. No harmful chemical or hazardous substances found" },
  { key: "noIllegal", label: "14. No illegal or prohibited items (drugs, alcohol, etc.) present" },
] as const

export function VCHIFReportClient({ data, userRole }: { data: any[], userRole: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<number | "ALL">("ALL")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [printMode, setPrintMode] = useState<"SINGLE" | "SUMMARY" | "ALL_SHEETS">("SUMMARY")

  const summaryPrintRef = useRef<HTMLDivElement>(null)

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ]

  const availableYears = useMemo(() => {
    const set = new Set<number>()
    set.add(new Date().getFullYear())
    data.forEach(r => {
      if (r.date) set.add(new Date(r.date).getFullYear())
    })
    return Array.from(set).sort((a, b) => b - a)
  }, [data])

  const filteredRecords = useMemo(() => {
    return data.filter((record) => {
      const recDate = new Date(record.date)
      const matchesSearch =
        record.vehicleNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.inspectorName?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesYear = recDate.getFullYear() === selectedYear
      const matchesMonth = selectedMonth === "ALL" || recDate.getMonth() + 1 === selectedMonth

      return matchesSearch && matchesYear && matchesMonth
    })
  }, [data, searchTerm, selectedMonth, selectedYear])

  const getPassFailCount = (record: any) => {
    const checks = CHECKLIST_ITEMS.map(item => Boolean(record[item.key]))
    const passed = checks.filter(Boolean).length
    return { passed, failed: checks.length - passed, total: checks.length }
  }

  function handlePrintSummary() {
    setPrintMode("SUMMARY")
    const title = `VEHICLE CLEANING & HYGIENE INSPECTION SUMMARY ${selectedMonth === "ALL" ? "" : monthNames[(selectedMonth as number) - 1].toUpperCase()} ${selectedYear}`
    document.title = title
    setTimeout(() => {
      window.print()
      document.title = "All in One System"
    }, 150)
  }

  function handlePrintSingle(record: any) {
    setSelectedRecord(record)
    setPrintMode("SINGLE")
    const title = `VCHIF INSPECTION SHEET - ${record.vehicleNo} - ${format(new Date(record.date), "dd-MM-yyyy")}`
    document.title = title
    setTimeout(() => {
      window.print()
      document.title = "All in One System"
    }, 150)
  }

  function handlePrintAllSheets() {
    setPrintMode("ALL_SHEETS")
    const title = `VCHIF INSPECTION SHEETS ${selectedMonth === "ALL" ? "" : monthNames[(selectedMonth as number) - 1].toUpperCase()} ${selectedYear}`
    document.title = title
    setTimeout(() => {
      window.print()
      document.title = "All in One System"
    }, 150)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Screen Header - Hidden on Print */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Link href="/forms/maintenance/reports" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 mr-2" /> SGMP-14 VCHIF
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">Vehicle Cleaning & Hygiene Inspection</h1>
            <p className="text-slate-500 font-medium">View, search, and print official vehicle hygiene inspection reports.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handlePrintSummary}
              disabled={filteredRecords.length === 0}
              className="flex items-center px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 mr-2" /> Print Summary Log
            </button>
            <button
              onClick={handlePrintAllSheets}
              disabled={filteredRecords.length === 0}
              className="flex items-center px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 mr-2" /> Print All Inspection Sheets
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters - Hidden on Print */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 print:hidden">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle no, driver, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-500 ml-2 mr-2" />
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                className="bg-transparent font-bold text-sm outline-none cursor-pointer pr-2"
              >
                <option value="ALL">All Months</option>
                {monthNames.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <span className="text-slate-300 mx-2">|</span>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent font-bold text-sm outline-none cursor-pointer pr-2"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Data Grid - Hidden on Print */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Date</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Vehicle No</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Company Name</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Vehicle Type</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Driver</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Checklist Score</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Inspector</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="font-medium">No vehicle inspection records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const score = getPassFailCount(record)
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-sm font-bold text-slate-900">
                        {format(new Date(record.date), "dd/MM/yyyy")}
                      </td>
                      <td className="p-4 text-sm text-slate-700 font-bold uppercase">{record.vehicleNo}</td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{record.companyName}</td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{record.vehicleType}</td>
                      <td className="p-4 text-sm text-slate-600 font-medium">{record.driverName}</td>
                      <td className="p-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {score.passed} / 14 Pass
                          </span>
                          {score.failed > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              <XCircle className="w-3.5 h-3.5 text-red-600" /> {score.failed} Fail
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 font-bold">{record.inspectorName}</td>
                      <td className="p-4 text-sm text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedRecord(record)
                            setPrintMode("SINGLE")
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View / Print Sheet
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: View Single Inspection Sheet (On Screen) */}
      {/* ========================================================================= */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 sm:p-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block">Inspection Sheet Preview</span>
                <h2 className="text-xl font-black uppercase text-slate-900">SGMP/14/VCHIF - {selectedRecord.vehicleNo}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePrintSingle(selectedRecord)}
                  className="flex items-center px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold uppercase text-xs transition-all shadow"
                >
                  <Printer className="w-4 h-4 mr-1.5" /> Print Sheet
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Inspection Sheet Card */}
            <div className="p-6 border border-gray-200 rounded-2xl bg-slate-50/50">
              <MaintenanceHeader
                title="VEHICLE CLEANING & HYGIENE INSPECTION RECORD"
                recNo="SGMP/14/VCHIF"
                issueNo="1/10/2022"
                revNo="1"
                effectiveDate="1/7/2026"
              />

              {/* Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold uppercase bg-white p-4 border border-gray-300 rounded-xl mb-4">
                <div>DATE: <span className="underline ml-1 font-semibold">{format(new Date(selectedRecord.date), "dd/MM/yyyy")}</span></div>
                <div>VEHICLE NO: <span className="underline ml-1 font-semibold">{selectedRecord.vehicleNo}</span></div>
                <div>COMPANY: <span className="underline ml-1 font-semibold">{selectedRecord.companyName}</span></div>
                <div>VEHICLE TYPE: <span className="underline ml-1 font-semibold">{selectedRecord.vehicleType}</span></div>
                <div>DRIVER: <span className="underline ml-1 font-semibold">{selectedRecord.driverName}</span></div>
                <div>INSPECTOR: <span className="underline ml-1 font-semibold">{selectedRecord.inspectorName}</span></div>
              </div>

              {/* Checklist Table */}
              <table className="w-full text-xs border-collapse border border-black text-left mb-4 bg-white">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-black p-2 w-12 text-center">NO</th>
                    <th className="border border-black p-2">INSPECTION CRITERIA / CHECKLIST</th>
                    <th className="border border-black p-2 w-28 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {CHECKLIST_ITEMS.map((item, idx) => {
                    const isChecked = Boolean(selectedRecord[item.key])
                    return (
                      <tr key={item.key} className="hover:bg-slate-50">
                        <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                        <td className="border border-black p-1.5 font-medium">{item.label.replace(/^\d+\.\s*/, "")}</td>
                        <td className="border border-black p-1.5 text-center font-bold">
                          {isChecked ? (
                            <span className="text-emerald-700 font-black">✔ YES</span>
                          ) : (
                            <span className="text-red-600 font-black">✘ NO</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Issues & Corrective Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold mb-4">
                <div className="border border-black p-3 bg-white rounded">
                  <span className="text-gray-500 block mb-1">ISSUES / NON-CONFORMANCE:</span>
                  <div className="min-h-[30px] font-medium">{selectedRecord.issues || "NONE"}</div>
                </div>
                <div className="border border-black p-3 bg-white rounded">
                  <span className="text-gray-500 block mb-1">CORRECTIVE ACTION TAKEN:</span>
                  <div className="min-h-[30px] font-medium">{selectedRecord.correctiveAction || "NONE"}</div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div className="border border-black p-3 bg-white relative h-28 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 uppercase">DRIVER SIGNATURE:</span>
                  {selectedRecord.driverSignature && (
                    <div className="h-12 w-32 mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedRecord.driverSignature} alt="Driver Signature" className="max-h-12 max-w-full object-contain mx-auto" />
                    </div>
                  )}
                  <span className="text-[11px] font-black uppercase text-center border-t border-gray-300 pt-1">{selectedRecord.driverName}</span>
                </div>

                <div className="border border-black p-3 bg-white relative h-28 flex flex-col justify-between">
                  <span className="text-[10px] text-gray-500 uppercase">INSPECTOR SIGNATURE:</span>
                  {selectedRecord.inspectorSignature && (
                    <div className="h-12 w-32 mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedRecord.inspectorSignature} alt="Inspector Signature" className="max-h-12 max-w-full object-contain mx-auto" />
                    </div>
                  )}
                  <span className="text-[11px] font-black uppercase text-center border-t border-gray-300 pt-1">{selectedRecord.inspectorName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT-ONLY LAYOUTS */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .print-clean-table th, .print-clean-table td {
            border: 1px solid black !important;
          }
        }
      `}</style>

      {/* 1. PRINT: Summary Log Table */}
      {printMode === "SUMMARY" && (
        <div className="hidden print:block bg-white text-black p-0 m-0">
          <MaintenanceHeader
            title="VEHICLE CLEANING & HYGIENE INSPECTION RECORD"
            recNo="SGMP/14/VCHIF"
            issueNo="1/10/2022"
            revNo="1"
            effectiveDate="1/7/2026"
          />

          <div className="flex justify-between items-center mb-3 text-xs font-bold uppercase">
            <div>MONTH: <span className="underline ml-1 px-3">{selectedMonth === "ALL" ? "ALL MONTHS" : monthNames[(selectedMonth as number) - 1]}</span></div>
            <div>YEAR: <span className="underline ml-1 px-3">{selectedYear}</span></div>
          </div>

          <table className="w-full text-[10px] border-collapse border border-black text-left print-clean-table">
            <thead>
              <tr className="bg-gray-200 print:bg-gray-200 text-center font-bold">
                <th className="border border-black p-1.5 w-16">DATE</th>
                <th className="border border-black p-1.5 w-24">VEHICLE NO</th>
                <th className="border border-black p-1.5">COMPANY NAME</th>
                <th className="border border-black p-1.5 w-24">VEHICLE TYPE</th>
                <th className="border border-black p-1.5 w-28">DRIVER</th>
                <th className="border border-black p-1.5 w-24 text-center">CHECKLIST SCORE</th>
                <th className="border border-black p-1.5 w-28">INSPECTOR</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const score = getPassFailCount(record)
                return (
                  <tr key={record.id} className="h-8">
                    <td className="border border-black p-1 text-center font-bold">
                      {format(new Date(record.date), "dd/MM/yyyy")}
                    </td>
                    <td className="border border-black p-1 font-bold uppercase">{record.vehicleNo}</td>
                    <td className="border border-black p-1">{record.companyName}</td>
                    <td className="border border-black p-1">{record.vehicleType}</td>
                    <td className="border border-black p-1 font-medium">{record.driverName}</td>
                    <td className="border border-black p-1 text-center font-bold">
                      {score.passed} / 14 {score.failed === 0 ? "PASS" : `(${score.failed} FAIL)`}
                    </td>
                    <td className="border border-black p-1 font-bold">{record.inspectorName}</td>
                  </tr>
                )
              })}
              {/* Padding rows for empty printable sheet */}
              {Array.from({ length: Math.max(0, 12 - filteredRecords.length) }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-8">
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
      )}

      {/* 2. PRINT: Single Inspection Sheet */}
      {printMode === "SINGLE" && selectedRecord && (
        <div className="hidden print:block bg-white text-black p-0 m-0">
          <MaintenanceHeader
            title="VEHICLE CLEANING & HYGIENE INSPECTION RECORD"
            recNo="SGMP/14/VCHIF"
            issueNo="1/10/2022"
            revNo="1"
            effectiveDate="1/7/2026"
          />

          <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase border border-black p-2 mb-3 leading-tight">
            <div>DATE: <span className="font-semibold underline ml-1">{format(new Date(selectedRecord.date), "dd/MM/yyyy")}</span></div>
            <div>VEHICLE NO: <span className="font-semibold underline ml-1">{selectedRecord.vehicleNo}</span></div>
            <div>COMPANY: <span className="font-semibold underline ml-1">{selectedRecord.companyName}</span></div>
            <div>VEHICLE TYPE: <span className="font-semibold underline ml-1">{selectedRecord.vehicleType}</span></div>
            <div>DRIVER: <span className="font-semibold underline ml-1">{selectedRecord.driverName}</span></div>
            <div>INSPECTOR: <span className="font-semibold underline ml-1">{selectedRecord.inspectorName}</span></div>
          </div>

          <table className="w-full text-[10px] border-collapse border border-black text-left mb-3 print-clean-table">
            <thead>
              <tr className="bg-gray-200 print:bg-gray-200 font-bold">
                <th className="border border-black p-1 w-10 text-center">NO</th>
                <th className="border border-black p-1">INSPECTION CRITERIA / CHECKLIST</th>
                <th className="border border-black p-1 w-24 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {CHECKLIST_ITEMS.map((item, idx) => {
                const isChecked = Boolean(selectedRecord[item.key])
                return (
                  <tr key={item.key} className="h-6">
                    <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-1">{item.label.replace(/^\d+\.\s*/, "")}</td>
                    <td className="border border-black p-1 text-center font-bold">
                      {isChecked ? "✔ YES" : "✘ NO"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold mb-3">
            <div className="border border-black p-2 min-h-[45px]">
              <span className="text-gray-600 block text-[9px] mb-0.5">ISSUES / NON-CONFORMANCE:</span>
              <div className="font-normal">{selectedRecord.issues || "NONE"}</div>
            </div>
            <div className="border border-black p-2 min-h-[45px]">
              <span className="text-gray-600 block text-[9px] mb-0.5">CORRECTIVE ACTION TAKEN:</span>
              <div className="font-normal">{selectedRecord.correctiveAction || "NONE"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
            <div className="border border-black p-2 h-24 flex flex-col justify-between">
              <span className="text-[9px] text-gray-600 uppercase">DRIVER SIGNATURE:</span>
              {selectedRecord.driverSignature && (
                <div className="h-10 w-28 mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedRecord.driverSignature} alt="Driver Signature" className="max-h-10 max-w-full object-contain mx-auto" />
                </div>
              )}
              <span className="text-[10px] font-black uppercase text-center border-t border-black pt-0.5">{selectedRecord.driverName}</span>
            </div>

            <div className="border border-black p-2 h-24 flex flex-col justify-between">
              <span className="text-[9px] text-gray-600 uppercase">INSPECTOR SIGNATURE:</span>
              {selectedRecord.inspectorSignature && (
                <div className="h-10 w-28 mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedRecord.inspectorSignature} alt="Inspector Signature" className="max-h-10 max-w-full object-contain mx-auto" />
                </div>
              )}
              <span className="text-[10px] font-black uppercase text-center border-t border-black pt-0.5">{selectedRecord.inspectorName}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRINT: All Inspection Sheets (Batch) */}
      {printMode === "ALL_SHEETS" && (
        <div className="hidden print:block bg-white text-black p-0 m-0">
          {filteredRecords.map((record, index) => (
            <div key={record.id} className="print-page mb-6">
              <MaintenanceHeader
                title="VEHICLE CLEANING & HYGIENE INSPECTION RECORD"
                recNo="SGMP/14/VCHIF"
                issueNo="1/10/2022"
                revNo="1"
                effectiveDate="1/7/2026"
              />

              <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase border border-black p-2 mb-3 leading-tight">
                <div>DATE: <span className="font-semibold underline ml-1">{format(new Date(record.date), "dd/MM/yyyy")}</span></div>
                <div>VEHICLE NO: <span className="font-semibold underline ml-1">{record.vehicleNo}</span></div>
                <div>COMPANY: <span className="font-semibold underline ml-1">{record.companyName}</span></div>
                <div>VEHICLE TYPE: <span className="font-semibold underline ml-1">{record.vehicleType}</span></div>
                <div>DRIVER: <span className="font-semibold underline ml-1">{record.driverName}</span></div>
                <div>INSPECTOR: <span className="font-semibold underline ml-1">{record.inspectorName}</span></div>
              </div>

              <table className="w-full text-[10px] border-collapse border border-black text-left mb-3 print-clean-table">
                <thead>
                  <tr className="bg-gray-200 print:bg-gray-200 font-bold">
                    <th className="border border-black p-1 w-10 text-center">NO</th>
                    <th className="border border-black p-1">INSPECTION CRITERIA / CHECKLIST</th>
                    <th className="border border-black p-1 w-24 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {CHECKLIST_ITEMS.map((item, idx) => {
                    const isChecked = Boolean(record[item.key])
                    return (
                      <tr key={item.key} className="h-6">
                        <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-black p-1">{item.label.replace(/^\d+\.\s*/, "")}</td>
                        <td className="border border-black p-1 text-center font-bold">
                          {isChecked ? "✔ YES" : "✘ NO"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold mb-3">
                <div className="border border-black p-2 min-h-[45px]">
                  <span className="text-gray-600 block text-[9px] mb-0.5">ISSUES / NON-CONFORMANCE:</span>
                  <div className="font-normal">{record.issues || "NONE"}</div>
                </div>
                <div className="border border-black p-2 min-h-[45px]">
                  <span className="text-gray-600 block text-[9px] mb-0.5">CORRECTIVE ACTION TAKEN:</span>
                  <div className="font-normal">{record.correctiveAction || "NONE"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                <div className="border border-black p-2 h-24 flex flex-col justify-between">
                  <span className="text-[9px] text-gray-600 uppercase">DRIVER SIGNATURE:</span>
                  {record.driverSignature && (
                    <div className="h-10 w-28 mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={record.driverSignature} alt="Driver Signature" className="max-h-10 max-w-full object-contain mx-auto" />
                    </div>
                  )}
                  <span className="text-[10px] font-black uppercase text-center border-t border-black pt-0.5">{record.driverName}</span>
                </div>

                <div className="border border-black p-2 h-24 flex flex-col justify-between">
                  <span className="text-[9px] text-gray-600 uppercase">INSPECTOR SIGNATURE:</span>
                  {record.inspectorSignature && (
                    <div className="h-10 w-28 mx-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={record.inspectorSignature} alt="Inspector Signature" className="max-h-10 max-w-full object-contain mx-auto" />
                    </div>
                  )}
                  <span className="text-[10px] font-black uppercase text-center border-t border-black pt-0.5">{record.inspectorName}</span>
                </div>
              </div>

              {index < filteredRecords.length - 1 && <div className="page-break"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

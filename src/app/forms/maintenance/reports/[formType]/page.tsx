"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getMonthlyMaintenanceReport } from "@/app/actions/maintenance-reports"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { ArrowLeft, Printer, RefreshCw } from "lucide-react"
import { SECTION_TASKS } from "../../cleaning/CleaningForm"

const getCleaningMetadata = (sec: string) => {
  switch (sec) {
    case "meeting-changing":
      return { recNo: "SGMP/05/CMCA", revNo: "3", effectiveDate: "1/8/2024" }
    case "filtration-uv":
      return { recNo: "SGMP/05/FUVS", revNo: "3", effectiveDate: "1/8/2024" }
    case "labelling":
      return { recNo: "SGMP/05/CIL", revNo: "4", effectiveDate: "09/09/2025" }
    case "raw-material":
      return { recNo: "SGMP/05/CIRMA", revNo: "0", effectiveDate: "1/8/2024" }
    case "packing":
      return { recNo: "SGMP/05/CIP", revNo: "3", effectiveDate: "1/8/2024" }
    case "machine-3in1":
      return { recNo: "SGMP/05/CIM", revNo: "3", effectiveDate: "1/8/2024" }
    case "finishing":
      return { recNo: "SGMP/05/CIFA", revNo: "3", effectiveDate: "1/8/2024" }
    case "blower-buffer":
      return { recNo: "SGMP/05/CIBBA", revNo: "0", effectiveDate: "1/8/2024" }
    case "auto-scrambler":
      return { recNo: "SGMP/05/CIAS", revNo: "3", effectiveDate: "1/8/2024" }
    default:
      return { recNo: "SGMP/05/CMCA", revNo: "3", effectiveDate: "1/8/2024" }
  }
}

export default function MaintenanceMonthlyReportPage() {
  const params = useParams()
  const router = useRouter()
  const formType = params?.formType as string

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [selectedSection, setSelectedSection] = useState("meeting-changing")
  const [selectedLine, setSelectedLine] = useState("Line 1")

  useEffect(() => {
    if (formType) {
      fetchData()
    }
  }, [formType, month, year])

  async function fetchData() {
    setLoading(true)
    const res = await getMonthlyMaintenanceReport(formType, month, year)
    if (res.success && res.data) {
      setReportData(res.data)
    }
    setLoading(false)
  }

  // Get metadata based on form type
  const getFormMetadata = () => {
    switch (formType) {
      case "cleaning": {
        const cleaningMeta = getCleaningMetadata(selectedSection)
        return {
          title: "CLEANING INSPECTION RECORD",
          recNo: cleaningMeta.recNo,
          issueNo: "1/10/2022",
          revNo: cleaningMeta.revNo,
          effectiveDate: cleaningMeta.effectiveDate
        }
      }
      case "lighting":
        return {
          title: "LIGHTING INSPECTION RECORD",
          recNo: "SGMP/02/LIR",
          issueNo: "1/10/2022",
          revNo: "2",
          effectiveDate: "20/7/2026"
        }
      case "finished-goods":
        return {
          title: "FINISHED GOODS INSPECTION RECORD",
          recNo: "SGMP/21/FIR",
          issueNo: "1/10/2022",
          revNo: "2",
          effectiveDate: "20/7/2026"
        }
      case "waste-management":
        return {
          title: "WASTE MANAGEMENT DISPOSAL RECORDS",
          recNo: "SGMP/07/WMDR",
          issueNo: "1/10/2022",
          revNo: "3",
          effectiveDate: "20/7/2026"
        }
      case "waste-disposal":
        return {
          title: "WASTE DISPOSAL INSPECTION RECORDS",
          recNo: "SGMP/07/WDIR",
          issueNo: "1/10/2022",
          revNo: "2",
          effectiveDate: "20/7/2026"
        }
      case "food-handler":
        return {
          title: "FOOD HANDLER DAILY INSPECTION RECORDS",
          recNo: "SGMP/09/FHDIR",
          issueNo: "1/10/2022",
          revNo: "4",
          effectiveDate: "20/7/2026"
        }
      case "chemical-control":
        return {
          title: "CHEMICAL CONTROL RECORDS",
          recNo: "SGMP/17/CCR",
          issueNo: "1/10/2022",
          revNo: "4",
          effectiveDate: "20/7/2026"
        }
      default:
        return {
          title: "MAINTENANCE RECORD",
          recNo: "SGMP/XX/MR",
          issueNo: "1/10/2022",
          revNo: "1",
          effectiveDate: "15/2/2023"
        }
    }
  }

  const meta = getFormMetadata()

  // Generate 31 days list
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const yearsArray = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const getDayLabel = (dayNum: number) => {
    return `${String(dayNum).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }

  const handlePrint = () => {
    const originalTitle = document.title
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    const formattedDate = `${dd}-${mm}-${yyyy}`
    document.title = `${meta.title} ${formattedDate}`
    window.print()
    document.title = originalTitle
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:py-0 print:bg-white print:min-h-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
        
        {/* Controls - Hidden in print */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <Link href="/forms/maintenance/reports" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Reports Dashboard
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {formType === "cleaning" && (
              <>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none"
                >
                  <option value="meeting-changing">Meeting & Changing Area</option>
                  <option value="filtration-uv">Filtration & UV System Area</option>
                  <option value="labelling">Labelling Area</option>
                  <option value="raw-material">Raw Material Area</option>
                  <option value="packing">Packing Area</option>
                  <option value="machine-3in1">3 In 1 Machine Area</option>
                  <option value="finishing">Finishing Area</option>
                  <option value="blower-buffer">Blower & Buffer Area</option>
                  <option value="auto-scrambler">Auto Scrambler Area</option>
                </select>

                {selectedSection !== "meeting-changing" && selectedSection !== "filtration-uv" && (
                  <select
                    value={selectedLine}
                    onChange={(e) => setSelectedLine(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none"
                  >
                    <option value="Line 1">Line 1</option>
                    <option value="Line 2">Line 2</option>
                  </select>
                )}
              </>
            )}

            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-bold outline-none"
            >
              {yearsArray.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-black uppercase tracking-wider transition-colors shadow-md disabled:opacity-50"
            >
              <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Paper Sheet */}
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100 print:shadow-none print:border-none print:p-0 print:rounded-none print:overflow-visible overflow-x-auto">
          
          {/* Header Component */}
          <MaintenanceHeader 
            title={meta.title}
            recNo={meta.recNo}
            issueNo={meta.issueNo}
            revNo={meta.revNo}
            effectiveDate={meta.effectiveDate}
          />

          <div className="flex justify-between items-center mb-4 text-xs font-bold text-black font-sans uppercase">
            <div>
              MONTH: <span className="underline ml-1 px-4">{monthNames[month - 1]}</span>
              {formType === "cleaning" && (
                <span className="ml-6">
                  KAWASAN / AREA: <span className="underline ml-1 px-4">{selectedSection.replace('-', ' ').toUpperCase()} {selectedSection !== "meeting-changing" && selectedSection !== "filtration-uv" ? `(${selectedLine.toUpperCase()})` : ""}</span>
                </span>
              )}
            </div>
            <div>YEAR: <span className="underline ml-1 px-4">{year}</span></div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-4 text-blue-700" />
              <p className="font-bold">Loading report data...</p>
            </div>
          ) : (
            <div className="w-full">
              {/* Conditional Table based on Form Type */}
              <table className="w-full border-collapse border-2 border-black text-[10px] text-black font-sans bg-white leading-normal print-compact-table rounded-none">
                
                {/* 1. LIGHTING INSPECTION */}
                {formType === "lighting" && (
                  <>
                    <thead>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[8%]">DATE</th>
                        <th className="border-2 border-black p-1 w-[25%]">COVERAGE AREA</th>
                        <th className="border-2 border-black p-1 w-[25%]">RESULTS</th>
                        <th className="border-2 border-black p-1 w-[22%]">ACTION TAKEN</th>
                        <th className="border-2 border-black p-1 w-[10%]">PERFORMED BY</th>
                        <th className="border-2 border-black p-1 w-[10%]">VERIFIED BY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArray.map((day) => {
                        const dayRecords = reportData.filter(r => new Date(r.date).getDate() === day)
                        
                        if (dayRecords.length === 0) {
                          return (
                            <tr key={day} className="text-center h-6">
                              <td className="border-2 border-black p-1 font-bold">{getDayLabel(day)}</td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                            </tr>
                          )
                        }

                        return dayRecords.map((rec, idx) => (
                          <tr key={`${day}-${idx}`} className="text-center">
                            {idx === 0 && (
                              <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={dayRecords.length}>{getDayLabel(day)}</td>
                            )}
                            <td className="border-2 border-black p-1 text-left">{rec.coverageArea}</td>
                            <td className="border-2 border-black p-1 text-left">{rec.results}</td>
                            <td className="border-2 border-black p-1 text-left">{rec.action || "-"}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.performedBy}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.verifiedBy || "-"}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </>
                )}

                {/* 2. FINISHED GOODS INSPECTION */}
                {formType === "finished-goods" && (
                  <>
                    <thead>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[8%] align-middle" rowSpan={2}>DATE</th>
                        <th className="border-2 border-black p-1 w-[20%]" colSpan={2}>QUANTITY OF DAMAGE (425ML)</th>
                        <th className="border-2 border-black p-1 w-[20%]" colSpan={2}>QUANTITY OF DAMAGE (800ML)</th>
                        <th className="border-2 border-black p-1 w-[22%] align-middle" rowSpan={2}>ACTION TAKEN</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={2}>PERFORMED BY</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={2}>VERIFIED BY</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={2}>REMARKS</th>
                      </tr>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-0.5 text-[9px]">425ML X 24</th>
                        <th className="border-2 border-black p-0.5 text-[9px]">425ML X 6</th>
                        <th className="border-2 border-black p-0.5 text-[9px]">800ML X 12</th>
                        <th className="border-2 border-black p-0.5 text-[9px]">800ML X 20</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArray.map((day) => {
                        const dayRecords = reportData.filter(r => new Date(r.date).getDate() === day)
                        
                        if (dayRecords.length === 0) {
                          return (
                            <tr key={day} className="text-center h-6">
                              <td className="border-2 border-black p-1 font-bold">{getDayLabel(day)}</td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                            </tr>
                          )
                        }

                        return dayRecords.map((rec, idx) => (
                          <tr key={`${day}-${idx}`} className="text-center">
                            {idx === 0 && (
                              <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={dayRecords.length}>{getDayLabel(day)}</td>
                            )}
                            <td className="border-2 border-black p-1 font-bold text-red-700">{rec.qtyDamage425x24 || "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-red-700">{rec.qtyDamage425x6 || "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-red-700">{rec.qtyDamage800x12 || "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-red-700">{rec.qtyDamage800x20 || "-"}</td>
                            <td className="border-2 border-black p-1 text-left">{rec.actionTaken || "-"}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.performedBy}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.verifiedBy || "-"}</td>
                            <td className="border-2 border-black p-1 text-left">{rec.remarks || "-"}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </>
                )}

                {/* 3. WASTE MANAGEMENT */}
                {formType === "waste-management" && (
                  <>
                    <thead>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[8%] align-middle" rowSpan={3}>DATE</th>
                        <th className="border-2 border-black p-1 w-[72%]" colSpan={10}>METHOD OF DISPOSAL</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={3}>CHECKED BY</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={3}>VERIFIED BY</th>
                      </tr>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[36%]" colSpan={5}>RECYCLE</th>
                        <th className="border-2 border-black p-1 w-[36%]" colSpan={5}>DISPOSAL</th>
                      </tr>
                      <tr className="bg-gray-100 font-bold text-center text-[8px] border-b-2 border-black">
                        <th className="border-2 border-black p-0.5">PLASTIC BOTTLE</th>
                        <th className="border-2 border-black p-0.5">CAP</th>
                        <th className="border-2 border-black p-0.5">CARTON BOX</th>
                        <th className="border-2 border-black p-0.5">LABEL</th>
                        <th className="border-2 border-black p-0.5">OTHERS</th>
                        <th className="border-2 border-black p-0.5">PLASTIC BOTTLE</th>
                        <th className="border-2 border-black p-0.5">CAP</th>
                        <th className="border-2 border-black p-0.5">CARTON BOX</th>
                        <th className="border-2 border-black p-0.5">LABEL</th>
                        <th className="border-2 border-black p-0.5">OTHERS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArray.map((day) => {
                        const dayRecords = reportData.filter(r => new Date(r.date).getDate() === day)
                        
                        if (dayRecords.length === 0) {
                          return (
                            <tr key={day} className="text-center h-6">
                              <td className="border-2 border-black p-1 font-bold">{getDayLabel(day)}</td>
                              <td className="border-2 border-black p-1" colSpan={10}></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                            </tr>
                          )
                        }

                        return dayRecords.map((rec, idx) => (
                          <tr key={`${day}-${idx}`} className="text-center text-[9px]">
                            {idx === 0 && (
                              <td className="border-2 border-black p-1 font-bold align-middle text-[10px]" rowSpan={dayRecords.length}>{getDayLabel(day)}</td>
                            )}
                            <td className="border-2 border-black p-0.5">{rec.recyclePlasticBottle || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.recycleCap || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.recycleCartonBox || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.recycleLabel || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.recycleOthers || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.disposalPlasticBottle || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.disposalCap || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.disposalCartonBox || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.disposalLabel || "-"}</td>
                            <td className="border-2 border-black p-0.5">{rec.disposalOthers || "-"}</td>
                            <td className="border-2 border-black p-1 uppercase text-[10px]">{rec.checkedBy}</td>
                            <td className="border-2 border-black p-1 uppercase text-[10px]">{rec.verifiedBy || "-"}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </>
                )}

                {/* 4. WASTE DISPOSAL INSPECTION */}
                {formType === "waste-disposal" && (
                  <>
                    <thead>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[8%] align-middle" rowSpan={2}>DATE</th>
                        <th className="border-2 border-black p-1 w-[12%] align-middle" rowSpan={2}>INSPECTION TIME</th>
                        <th className="border-2 border-black p-1 w-[60%]" colSpan={5}>WASTE DISPOSAL AREA</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={2}>CHECKED BY</th>
                        <th className="border-2 border-black p-1 w-[10%] align-middle" rowSpan={2}>VERIFIED BY</th>
                      </tr>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1">FEEDER AREA</th>
                        <th className="border-2 border-black p-1">LABEL AREA</th>
                        <th className="border-2 border-black p-1">FILLING AREA</th>
                        <th className="border-2 border-black p-1">PACKAGING AREA</th>
                        <th className="border-2 border-black p-1">CHANGING ROOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArray.map((day) => {
                        const dayRecords = reportData.filter(r => new Date(r.date).getDate() === day)
                        
                        if (dayRecords.length === 0) {
                          return (
                            <tr key={day} className="text-center h-6">
                              <td className="border-2 border-black p-1 font-bold">{getDayLabel(day)}</td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                            </tr>
                          )
                        }

                        return dayRecords.map((rec, idx) => (
                          <tr key={`${day}-${idx}`} className="text-center">
                            {idx === 0 && (
                              <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={dayRecords.length}>{getDayLabel(day)}</td>
                            )}
                            <td className="border-2 border-black p-1 font-mono">{rec.inspectionTime}</td>
                            <td className="border-2 border-black p-1 font-bold text-[12px] text-teal-800">{rec.feederArea ? "✓" : "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-[12px] text-teal-800">{rec.labelArea ? "✓" : "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-[12px] text-teal-800">{rec.fillingArea ? "✓" : "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-[12px] text-teal-800">{rec.packagingArea ? "✓" : "-"}</td>
                            <td className="border-2 border-black p-1 font-bold text-[12px] text-teal-800">{rec.changingRoom ? "✓" : "-"}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.checkedBy}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.verifiedBy || "-"}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </>
                )}

                {/* 5. FOOD HANDLER DAILY INSPECTION */}
                {formType === "food-handler" && (
                  <>
                    <thead>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[5%]">DATE</th>
                        <th className="border-2 border-black p-1 w-[20%]">NAME OF EMPLOYEE</th>
                        <th className="border-2 border-black p-1">HAIRNET</th>
                        <th className="border-2 border-black p-1">FACEMASK</th>
                        <th className="border-2 border-black p-1">CLEAN UNIFORM</th>
                        <th className="border-2 border-black p-1">SHOES</th>
                        <th className="border-2 border-black p-1">GLOVE</th>
                        <th className="border-2 border-black p-1">FINGERNAILS</th>
                        <th className="border-2 border-black p-1">NO JEWELLERY</th>
                        <th className="border-2 border-black p-1 w-[12%]">CHECKED BY</th>
                        <th className="border-2 border-black p-1 w-[12%]">VERIFIED BY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArray.map((day) => {
                        const dayRecords = reportData.filter(r => new Date(r.date).getDate() === day)
                        
                        if (dayRecords.length === 0) {
                          return (
                            <tr key={day} className="text-center h-6">
                              <td className="border-2 border-black p-1 font-bold">{getDayLabel(day)}</td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                            </tr>
                          )
                        }

                        return dayRecords.map((rec, idx) => (
                          <tr key={`${day}-${idx}`} className="text-center">
                            {idx === 0 && (
                              <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={dayRecords.length}>{getDayLabel(day)}</td>
                            )}
                            <td className="border-2 border-black p-1 text-left font-bold">{rec.employeeName}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.hairnet ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.facemask ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.cleanUniform ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.shoes ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.glove ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.fingernails ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 text-orange-700 font-bold">{rec.noJewellery ? "✓" : "✗"}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.checkedBy}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.verifiedBy || "-"}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </>
                )}

                {/* 6. CHEMICAL CONTROL RECORDS */}
                {formType === "chemical-control" && (
                  <>
                    <thead>
                      <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                        <th className="border-2 border-black p-1 w-[8%]">DATE</th>
                        <th className="border-2 border-black p-1 w-[12%]">CHEMICAL CODE</th>
                        <th className="border-2 border-black p-1 w-[15%]">TIME TAKEN</th>
                        <th className="border-2 border-black p-1 w-[15%]">TAKEN BY</th>
                        <th className="border-2 border-black p-1 w-[15%]">TIME RETURN</th>
                        <th className="border-2 border-black p-1 w-[15%]">RETURN BY</th>
                        <th className="border-2 border-black p-1 w-[15%]">VERIFIED BY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daysArray.map((day) => {
                        const dayRecords = reportData.filter(r => new Date(r.date).getDate() === day)
                        
                        if (dayRecords.length === 0) {
                          return (
                            <tr key={day} className="text-center h-6">
                              <td className="border-2 border-black p-1 font-bold">{getDayLabel(day)}</td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                              <td className="border-2 border-black p-1"></td>
                            </tr>
                          )
                        }

                        return dayRecords.map((rec, idx) => (
                          <tr key={`${day}-${idx}`} className="text-center">
                            {idx === 0 && (
                              <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={dayRecords.length}>{getDayLabel(day)}</td>
                            )}
                            <td className="border-2 border-black p-1 font-mono font-bold text-purple-700">{rec.chemicalCode}</td>
                            <td className="border-2 border-black p-1 font-mono">{rec.timeTaken}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.takenBy}</td>
                            <td className="border-2 border-black p-1 font-mono">{rec.timeReturn || "-"}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.returnBy || "-"}</td>
                            <td className="border-2 border-black p-1 uppercase">{rec.verifiedBy || "-"}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </>
                )}

                {/* 7. CLEANING INSPECTION RECORDS */}
                {formType === "cleaning" && (() => {
                  const tasks = SECTION_TASKS[selectedSection] || []
                  const isLineApplicable = selectedSection !== "meeting-changing" && selectedSection !== "filtration-uv"
                  const filteredData = reportData.filter(r => r.section === selectedSection && (!isLineApplicable || r.line === selectedLine))

                  return (
                    <>
                      <thead>
                        <tr className="bg-gray-100 font-bold text-center border-b-2 border-black">
                          <th className="border-2 border-black p-1 w-[8%]" rowSpan={2}>DATE</th>
                          <th className="border-2 border-black p-1 w-[6%]" rowSpan={2}>SHIFT</th>
                          {tasks.map(task => (
                            <th key={task.key} className="border-2 border-black p-1 text-[8px]" colSpan={2}>
                              {task.label}<br />
                              <span className="text-[7px] font-normal font-sans">
                                {task.taskName} ({task.equipment})
                              </span>
                            </th>
                          ))}
                          <th className="border-2 border-black p-1 w-[12%]" rowSpan={2}>CHECKED BY</th>
                          <th className="border-2 border-black p-1 w-[12%]" rowSpan={2}>VERIFIED BY</th>
                        </tr>
                        <tr className="bg-gray-100 font-bold text-center border-b-2 border-black text-[7px]">
                          {tasks.map(task => (
                            <React.Fragment key={`${task.key}-sub`}>
                              <th className="border-2 border-black p-0.5">STATUS</th>
                              <th className="border-2 border-black p-0.5">CLEANER & QTY</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {daysArray.map((day) => {
                          const dayLabel = getDayLabel(day)
                          const morningRec = filteredData.find(r => new Date(r.date).getDate() === day && r.shift === "AM")
                          const eveningRec = filteredData.find(r => new Date(r.date).getDate() === day && r.shift === "PM")

                          const hasAnyRec = morningRec || eveningRec

                          if (!hasAnyRec) {
                            return (
                              <React.Fragment key={day}>
                                <tr className="text-center h-5">
                                  <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={2}>{dayLabel}</td>
                                  <td className="border-2 border-black p-0.5 font-bold">Pagi</td>
                                  {tasks.map(task => (
                                    <React.Fragment key={task.key}>
                                      <td className="border-2 border-black p-0.5"></td>
                                      <td className="border-2 border-black p-0.5"></td>
                                    </React.Fragment>
                                  ))}
                                  <td className="border-2 border-black p-0.5"></td>
                                  <td className="border-2 border-black p-0.5"></td>
                                </tr>
                                <tr className="text-center h-5">
                                  <td className="border-2 border-black p-0.5 font-bold">Petang</td>
                                  {tasks.map(task => (
                                    <React.Fragment key={task.key}>
                                      <td className="border-2 border-black p-0.5"></td>
                                      <td className="border-2 border-black p-0.5"></td>
                                    </React.Fragment>
                                  ))}
                                  <td className="border-2 border-black p-0.5"></td>
                                  <td className="border-2 border-black p-0.5"></td>
                                </tr>
                              </React.Fragment>
                            )
                          }

                          return (
                            <React.Fragment key={day}>
                              <tr className="text-center h-5">
                                <td className="border-2 border-black p-1 font-bold align-middle" rowSpan={2}>{dayLabel}</td>
                                <td className="border-2 border-black p-0.5 font-bold">Pagi</td>
                                {tasks.map(task => {
                                  const isOk = morningRec ? morningRec[`${task.key}Ok`] : null
                                  const cleaner = morningRec ? morningRec[`${task.key}Cleaner`] : null
                                  return (
                                    <React.Fragment key={task.key}>
                                      <td className={`border-2 border-black p-0.5 font-bold text-[9px] ${isOk ? "text-green-700" : isOk === false ? "text-red-700" : ""}`}>
                                        {isOk ? "✓" : isOk === false ? "✗" : ""}
                                      </td>
                                      <td className="border-2 border-black p-0.5 text-[8px] font-sans truncate max-w-[80px]" title={cleaner || ""}>
                                        {cleaner || "-"}
                                      </td>
                                    </React.Fragment>
                                  )
                                })}
                                <td className="border-2 border-black p-0.5 uppercase text-[8px]">{morningRec?.checkedBy || "-"}</td>
                                <td className="border-2 border-black p-0.5 uppercase text-[8px]">{morningRec?.verifiedBy || "-"}</td>
                              </tr>
                              <tr className="text-center h-5">
                                <td className="border-2 border-black p-0.5 font-bold">Petang</td>
                                {tasks.map(task => {
                                  const isOk = eveningRec ? eveningRec[`${task.key}Ok`] : null
                                  const cleaner = eveningRec ? eveningRec[`${task.key}Cleaner`] : null
                                  return (
                                    <React.Fragment key={task.key}>
                                      <td className={`border-2 border-black p-0.5 font-bold text-[9px] ${isOk ? "text-green-700" : isOk === false ? "text-red-700" : ""}`}>
                                        {isOk ? "✓" : isOk === false ? "✗" : ""}
                                      </td>
                                      <td className="border-2 border-black p-0.5 text-[8px] font-sans truncate max-w-[80px]" title={cleaner || ""}>
                                        {cleaner || "-"}
                                      </td>
                                    </React.Fragment>
                                  )
                                })}
                                <td className="border-2 border-black p-0.5 uppercase text-[8px]">{eveningRec?.checkedBy || "-"}</td>
                                <td className="border-2 border-black p-0.5 uppercase text-[8px]">{eveningRec?.verifiedBy || "-"}</td>
                              </tr>
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </>
                  )
                })()}

              </table>

              {/* Footer notes for food handler checklist */}
              {formType === "food-handler" && (
                <div className="mt-4 text-[9px] font-sans text-black leading-tight">
                  <p className="font-bold">/ : Satisfactory – Food handler wearing proper protective clothing i.e. face mask, glove, hairnet etc.</p>
                  <p className="font-bold">X : Unsatisfactory – Food handler does not use proper protective clothing required</p>
                  <p className="mt-2 font-bold uppercase">* Examples of Jewellery/Accessories: Rings, Necklaces, Bracelets, Watch, Hijab pin, Safety pin.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

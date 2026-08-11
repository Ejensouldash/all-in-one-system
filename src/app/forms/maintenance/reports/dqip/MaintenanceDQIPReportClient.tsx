"use client"

import { Fragment, useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { getDQIPRecords, type DQIPEntries, type DQIPMaterialRow, type DQIPSensoryRow } from "../../dqip/actions"

function formatSignatureDate(d: string | Date | null) {
  if (!d) return ""
  const date = new Date(d)
  return date.toLocaleDateString("en-GB")
}

function conditionMark(c: string) {
  if (c === "OKAY") return "/"
  if (c === "NOT_OKAY") return "X"
  return c || "-" // legacy free-text records
}

function availabilityMark(a: string) {
  if (a === "AVAILABLE") return "/"
  if (a === "NOT_AVAILABLE") return "X"
  return a || "-"
}

const MATERIAL_SECTIONS: { key: keyof Pick<DQIPEntries, "cap1881" | "emptyBottle425" | "emptyBottle800" | "filledBottle425" | "filledBottle800">, label: string }[] = [
  { key: "cap1881", label: "CAP 1881" },
  { key: "emptyBottle425", label: "EMPTY BOTTLE 425ML (18.5G)" },
  { key: "emptyBottle800", label: "EMPTY BOTTLE 800ML (31.0G)" },
  { key: "filledBottle425", label: "FILLED BOTTLE 425ML" },
  { key: "filledBottle800", label: "FILLED BOTTLE 800ML" },
]

const SENSORY_SECTIONS: { key: keyof Pick<DQIPEntries, "taste" | "smell" | "particle">, label: string }[] = [
  { key: "taste", label: "TASTE" },
  { key: "smell", label: "SMELL" },
  { key: "particle", label: "PARTICLE" },
]

const MATERIAL_ITEM_TO_KEY: Record<string, keyof Pick<DQIPEntries, "cap1881" | "emptyBottle425" | "emptyBottle800" | "filledBottle425" | "filledBottle800">> = {
  "Cap 1881": "cap1881",
  "Empty Bottle 425ML (18.5G)": "emptyBottle425",
  "Empty Bottle 800ML (31.0G)": "emptyBottle800",
  "Filled Bottle 425ML": "filledBottle425",
  "Filled Bottle 800ML": "filledBottle800",
}

const SENSORY_ITEM_TO_KEY: Record<string, keyof Pick<DQIPEntries, "taste" | "smell" | "particle">> = {
  Taste: "taste",
  Smell: "smell",
  Particle: "particle",
}

// Normalizes a raw DB record into the current per-section shape. Handles both
// the restored per-section format and the brief flat `rows` format some
// records may have been saved under during the Aug 10 2026 regression.
function extractDQIPEntries(record: any): DQIPEntries {
  const raw = record.entries || {}

  const hasSectionData = MATERIAL_SECTIONS.some(s => Array.isArray(raw[s.key])) ||
    SENSORY_SECTIONS.some(s => Array.isArray(raw[s.key]))

  if (hasSectionData) {
    return {
      cap1881: raw.cap1881 || [],
      emptyBottle425: raw.emptyBottle425 || [],
      emptyBottle800: raw.emptyBottle800 || [],
      filledBottle425: raw.filledBottle425 || [],
      filledBottle800: raw.filledBottle800 || [],
      taste: raw.taste || [],
      smell: raw.smell || [],
      particle: raw.particle || [],
      remarks: raw.remarks || "",
    }
  }

  const empty: DQIPEntries = {
    cap1881: [], emptyBottle425: [], emptyBottle800: [], filledBottle425: [], filledBottle800: [],
    taste: [], smell: [], particle: [], remarks: raw.remarks || "",
  }

  if (!Array.isArray(raw.rows)) return empty

  raw.rows.forEach((row: any) => {
    const materialKey = MATERIAL_ITEM_TO_KEY[row.item]
    if (materialKey) {
      empty[materialKey].push({
        time: row.time || "",
        quantity: row.weightQty || "",
        batchNumber: row.batchNumber === "NOT_AVAILABLE" ? "NOT_AVAILABLE" : "AVAILABLE",
        samples: [{ weight: row.weightQty || "", condition: row.condition === "NOT_OKAY" ? "NOT_OKAY" : "OKAY" }],
      })
      return
    }
    const sensoryKey = SENSORY_ITEM_TO_KEY[row.item]
    if (sensoryKey) {
      empty[sensoryKey].push({
        sku: "425ML",
        quantity: row.weightQty || "",
        samples: [{ time: row.time || "", condition: row.condition === "NOT_OKAY" ? "NOT_OKAY" : "OKAY" }],
      })
    }
  })

  return empty
}

function MaterialTable({ label, rows }: { label: string, rows: DQIPMaterialRow[] }) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="mb-3">
      <p className="text-[10px] font-black uppercase mb-1">{label}</p>
      <table className="w-full text-[8px] border-collapse border border-black text-center print-compact-table">
        <thead>
          <tr className="bg-gray-200 print:bg-gray-200">
            <th rowSpan={2} className="border border-black p-1 align-middle">Time</th>
            <th rowSpan={2} className="border border-black p-1 align-middle">Qty</th>
            <th rowSpan={2} className="border border-black p-1 align-middle">Batch</th>
            {[1, 2, 3, 4, 5].map(n => (
              <th key={n} colSpan={2} className="border border-black p-1">Sample {n}</th>
            ))}
          </tr>
          <tr className="bg-gray-200 print:bg-gray-200">
            {[1, 2, 3, 4, 5].map(n => (
              <Fragment key={n}>
                <th className="border border-black p-0.5">Weight</th>
                <th className="border border-black p-0.5">Cond.</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="border border-black p-1 font-mono">{row.time || "-"}</td>
              <td className="border border-black p-1">{row.quantity || "-"}</td>
              <td className="border border-black p-1 font-black">{availabilityMark(row.batchNumber)}</td>
              {row.samples.map((s, si) => (
                <Fragment key={si}>
                  <td className="border border-black p-1">{s.weight || "-"}</td>
                  <td className="border border-black p-1 font-black">{conditionMark(s.condition)}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SensoryTable({ label, rows }: { label: string, rows: DQIPSensoryRow[] }) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="mb-3">
      <p className="text-[10px] font-black uppercase mb-1">{label}</p>
      <table className="w-full text-[8px] border-collapse border border-black text-center print-compact-table">
        <thead>
          <tr className="bg-gray-200 print:bg-gray-200">
            <th rowSpan={2} className="border border-black p-1 align-middle">SKU</th>
            <th rowSpan={2} className="border border-black p-1 align-middle">Qty</th>
            {[1, 2, 3, 4, 5].map(n => (
              <th key={n} colSpan={2} className="border border-black p-1">Sample {n}</th>
            ))}
          </tr>
          <tr className="bg-gray-200 print:bg-gray-200">
            {[1, 2, 3, 4, 5].map(n => (
              <Fragment key={n}>
                <th className="border border-black p-0.5">Time</th>
                <th className="border border-black p-0.5">Cond.</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td className="border border-black p-1 font-bold">{row.sku}</td>
              <td className="border border-black p-1">{row.quantity || "-"}</td>
              {row.samples.map((s, si) => (
                <Fragment key={si}>
                  <td className="border border-black p-1 font-mono">{s.time || "-"}</td>
                  <td className="border border-black p-1 font-black">{conditionMark(s.condition)}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MaintenanceDQIPReportClient() {
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
      const res = await getDQIPRecords(month, year)
      if (res.success) {
        setRecords(res.data || [])
      }
      setLoading(false)
    }
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const title = `DAILY QUALITY IN-PROCESS RECORDS ${monthNames[month - 1].toUpperCase()} ${year}`
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
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl">Daily Quality In-Process</h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">SGMP/18/DQIP</p>
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
            className="flex items-center px-5 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
          <p className="text-gray-500 font-medium">There are no daily quality in-process records submitted for {monthNames[month - 1]} {year}.</p>
        </div>
      ) : (
        <div ref={printRef} className="print-layout landscape">
          <style>{`@page { size: A4 landscape; margin: 8mm 10mm; }`}</style>
          {records.map((record, index) => {
            const entries = extractDQIPEntries(record)
            return (
              <div key={record.id} className="print-page bg-white p-8 sm:p-12 shadow-sm border border-gray-100 mb-8 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none overflow-x-auto print:overflow-visible">

                {/* Header */}
                <MaintenanceHeader
                  title="DAILY QUALITY IN-PROCESS RECORDS"
                  recNo="SGMP/18/DQIP"
                  issueNo="1/10/2022"
                  revNo="2"
                  effectiveDate="1/7/2026"
                />

                <div className="flex justify-start items-center mb-4 text-xs font-bold text-black font-sans uppercase">
                  <div>DATE: <span className="underline ml-1 px-4">{formatSignatureDate(record.date)}</span></div>
                </div>

                {MATERIAL_SECTIONS.map(section => (
                  <MaterialTable key={section.key} label={section.label} rows={entries[section.key]} />
                ))}

                {SENSORY_SECTIONS.map(section => (
                  <SensoryTable key={section.key} label={section.label} rows={entries[section.key]} />
                ))}

                {entries.remarks && (
                  <div className="mt-4 text-xs text-black font-sans">
                    <p className="font-black uppercase">Remarks:</p>
                    <p className="border-b border-black min-h-[1.5rem] whitespace-pre-wrap">{entries.remarks}</p>
                  </div>
                )}

                {/* Signature Block */}
                <div className="mt-8 grid grid-cols-2 gap-10 text-black font-sans">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1">Checked By (Signature & Name)</p>
                    <div className="h-16 border-b-2 border-black flex items-end pb-1">
                      {record.performedSignature && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={record.performedSignature} alt="Checked by signature" className="h-14 object-contain" />
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

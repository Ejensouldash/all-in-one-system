"use client"

import { useState, useEffect, useRef } from "react"
import { Printer, Calendar, FileSpreadsheet, ChevronLeft, ShieldCheck, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"
import { GenericSignatureModal } from "@/components/forms/GenericSignatureModal"
import { getSEFRecords, verifySEFRecord } from "../../sef/actions"
import type { BatchEvaluation, SampleEvaluation } from "../../sef/types"

function formatSignatureDate(d: string | Date | null | undefined) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-GB")
}

export function MaintenanceSEFReportClient({ currentUserName }: { currentUserName: string }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [verifyingRecordId, setVerifyingRecordId] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  async function fetchRecords() {
    setLoading(true)
    const res = await getSEFRecords(month, year)
    if (res.success) setRecords(res.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRecords()
  }, [month, year])

  function handlePrint() {
    const title = `SENSORY EVALUATION FORM ${monthNames[month - 1].toUpperCase()} ${year}`
    document.title = title
    window.print()
    document.title = "All in One System"
  }

  async function handleVerify(signature: string) {
    if (!verifyingRecordId) return
    const res = await verifySEFRecord(verifyingRecordId, currentUserName, signature)
    if (res.success) {
      setVerifyingRecordId(null)
      fetchRecords()
    } else {
      alert(res.error || "Failed to verify record")
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Controls (Screen only) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 mb-8 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/forms/maintenance/reports"
            className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h1 className="font-black uppercase tracking-tight text-xl text-slate-900">
                Sensory Evaluation Form
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                SGMP/06/SEF • Quality Control
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 ml-2 mr-3" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer text-slate-800"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-300 mx-2">|</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer pr-2 text-slate-800"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            disabled={records.length === 0}
            className="flex items-center px-5 py-3 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </button>
        </div>
      </div>

      {/* Loading / Empty States */}
      {loading ? (
        <div className="text-center py-20 text-slate-500 font-bold animate-pulse uppercase tracking-widest print:hidden">
          Loading Sensory Evaluation Records...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm print:hidden">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
            No Records Found
          </h3>
          <p className="text-slate-500 font-medium">
            There are no Sensory Evaluation records submitted for {monthNames[month - 1]} {year}.
          </p>
        </div>
      ) : (
        <div ref={printRef} className="print-layout space-y-10">
          {records.map((record) => {
            const batches: BatchEvaluation[] = Array.isArray(record.batches) ? record.batches : []
            const isVerified = Boolean(record.verifiedBy || record.verifiedSignature)

            return (
              <div
                key={record.id}
                className="print-page bg-white p-8 sm:p-12 shadow-sm border border-slate-200 rounded-2xl print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none overflow-x-auto print:overflow-visible"
              >
                {/* Official Document Header */}
                <MaintenanceHeader
                  title="SENSORY EVALUATION FORM"
                  recNo="SGMP/06/SEF"
                  issueNo="2/10/2026"
                  revNo="1"
                  effectiveDate="2/10/2026"
                />

                {/* Sub-header row */}
                <div className="flex justify-between items-center mb-4 text-xs font-bold text-black font-sans uppercase">
                  <div>
                    EVALUATION DATE:{" "}
                    <span className="underline ml-1 px-4">{formatSignatureDate(record.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    {isVerified ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> QA Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Pending QA Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Table 1: Batch Information & 72-Hour Hold */}
                <div className="mb-6">
                  <table className="w-full text-xs border-collapse border border-black text-left print-compact-table">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-100 text-center font-bold">
                        <th className="border border-black p-2">Batch No.</th>
                        <th className="border border-black p-2">Product / Size</th>
                        <th className="border border-black p-2">Sample Quantity</th>
                        <th className="border border-black p-2">Production Date</th>
                        <th className="border border-black p-2">Evaluation Date</th>
                        <th className="border border-black p-2">72-hour hold completed?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.length > 0 ? (
                        batches.map((b, idx) => (
                          <tr key={idx} className="text-center font-medium">
                            <td className="border border-black p-2 font-bold uppercase">{b.batchNo || "-"}</td>
                            <td className="border border-black p-2 uppercase">{b.productSize || "-"}</td>
                            <td className="border border-black p-2 uppercase">{b.sampleQuantity || "-"}</td>
                            <td className="border border-black p-2">{b.productionDate || "-"}</td>
                            <td className="border border-black p-2">{b.evaluationDate || "-"}</td>
                            <td className="border border-black p-2 font-bold">
                              {b.hold72HoursCompleted ? "☑ Yes   ☐ No" : "☐ Yes   ☑ No"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="border border-black p-4 text-center">
                            No batches recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section Title & Instruction */}
                <div className="mb-3">
                  <h3 className="font-bold text-xs uppercase text-black font-sans">
                    Sensory Evaluation
                  </h3>
                  <p className="text-[10px] text-gray-700 italic font-sans">
                    Tick one result for each attribute. Taste only if appearance and odour are normal and there is no suspected safety concern.
                  </p>
                </div>

                {/* Table 2: Sensory Evaluation Breakdown */}
                <div className="mb-6">
                  <table className="w-full text-xs border-collapse border border-black text-left print-compact-table">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-100 text-center font-bold">
                        <th className="border border-black p-2 w-32">Batch No</th>
                        <th className="border border-black p-2 w-24">Sample No.</th>
                        <th className="border border-black p-2">Appearance</th>
                        <th className="border border-black p-2">Odour</th>
                        <th className="border border-black p-2">Taste</th>
                        <th className="border border-black p-2 w-44">Overall Result</th>
                        <th className="border border-black p-2 w-52">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch, bIdx) => {
                        const samples = Array.isArray(batch.samples) ? batch.samples : []

                        return samples.map((sample, sIdx) => {
                          const isFirst = sIdx === 0
                          const appearanceText = sample.appearance === "NORMAL" ? "☑ Normal   ☐ Abnormal" : "☐ Normal   ☑ Abnormal"
                          const odourText = sample.odour === "NORMAL" ? "☑ Normal   ☐ Abnormal" : "☐ Normal   ☑ Abnormal"
                          const tasteText = sample.appearance === "ABNORMAL" || sample.odour === "ABNORMAL"
                            ? "[ Locked - Unsafe ]"
                            : sample.taste === "NORMAL"
                            ? "☑ Normal   ☐ Abnormal"
                            : "☐ Normal   ☑ Abnormal"

                          const overallText = batch.overallResult === "PASS" ? "☑ PASS   ☐ FAIL / SUSPECT" : "☐ PASS   ☑ FAIL / SUSPECT"
                          const actionText = batch.action === "RECOMMEND_QA_RELEASE"
                            ? "☑ Recommend QA release   ☐ Continue QC HOLD"
                            : "☐ Recommend QA release   ☑ Continue QC HOLD"

                          return (
                            <tr key={`${bIdx}-${sIdx}`} className="text-center font-medium">
                              {isFirst && (
                                <td
                                  rowSpan={samples.length || 1}
                                  className="border border-black p-2 font-bold uppercase align-middle bg-gray-50/50"
                                >
                                  {batch.batchNo || `Batch #${bIdx + 1}`}
                                </td>
                              )}
                              <td className="border border-black p-2">{sample.sampleNo}</td>
                              <td className="border border-black p-2 text-xs">{appearanceText}</td>
                              <td className="border border-black p-2 text-xs">{odourText}</td>
                              <td className="border border-black p-2 text-xs">{tasteText}</td>
                              {isFirst && (
                                <td
                                  rowSpan={samples.length || 1}
                                  className="border border-black p-2 font-bold align-middle bg-gray-50/50 text-xs"
                                >
                                  {overallText}
                                </td>
                              )}
                              {isFirst && (
                                <td
                                  rowSpan={samples.length || 1}
                                  className="border border-black p-2 font-bold align-middle bg-gray-50/50 text-[11px]"
                                >
                                  {actionText}
                                </td>
                              )}
                            </tr>
                          )
                        })
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Abnormal finding / remarks */}
                <div className="mb-6 text-xs text-black font-sans">
                  <p className="font-bold">Abnormal finding / remarks:</p>
                  <p className="border-b border-black min-h-[1.75rem] py-1 whitespace-pre-wrap">
                    {record.remarks || "None"}
                  </p>
                </div>

                {/* Sign-off Table */}
                <div className="mb-6">
                  <table className="w-full text-xs border-collapse border border-black text-left">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-100">
                        <th className="border border-black p-2 font-bold w-1/2">Evaluated by (QC)</th>
                        <th className="border border-black p-2 font-bold w-1/2">Reviewed / Approved by (QA)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {/* QC Sign-off */}
                        <td className="border border-black p-3 align-top space-y-2">
                          <p>
                            <span className="font-bold">Name:</span> {record.checkedBy || "__________________________"}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">Signature:</span>
                            {record.performedSignature ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={record.performedSignature}
                                alt="QC Signature"
                                className="h-10 object-contain inline-block"
                              />
                            ) : (
                              <span>______________________</span>
                            )}
                          </div>
                          <p>
                            <span className="font-bold">Date/Time:</span> {formatSignatureDate(record.date)}
                          </p>
                        </td>

                        {/* QA Sign-off */}
                        <td className="border border-black p-3 align-top space-y-2">
                          {record.verifiedSignature ? (
                            <>
                              <p>
                                <span className="font-bold">Name:</span> {record.verifiedBy || "__________________________"}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">Signature:</span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={record.verifiedSignature}
                                  alt="QA Signature"
                                  className="h-10 object-contain inline-block"
                                />
                              </div>
                              <p>
                                <span className="font-bold">Date/Time:</span> {formatSignatureDate(record.verifiedAt)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p>
                                <span className="font-bold">Name:</span> __________________________
                              </p>
                              <div className="flex items-center justify-between">
                                <p>
                                  <span className="font-bold">Signature:</span> ______________________
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setVerifyingRecordId(record.id)}
                                  className="print:hidden px-3 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                                >
                                  Sign &amp; Approve
                                </button>
                              </div>
                              <p>
                                <span className="font-bold">Date/Time:</span> _____________________
                              </p>
                            </>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Compliance Footer Note */}
                <div className="text-[10px] text-gray-800 font-sans leading-tight border-t border-gray-300 pt-2">
                  <span className="font-bold">Note:</span> Any abnormal or conflicting result must remain on QC HOLD pending QA investigation. Do not taste samples with unusual odour, visible contamination, damaged packaging or suspected safety concerns. Opened samples must not be returned to saleable stock.
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* QA Signature Modal */}
      <GenericSignatureModal
        isOpen={Boolean(verifyingRecordId)}
        onClose={() => setVerifyingRecordId(null)}
        onConfirm={handleVerify}
        userName={currentUserName}
        role="Quality Assurance (QA) Supervisor"
        title="Approve Sensory Evaluation Record"
        description="By signing, you confirm that you have reviewed the sensory test attributes, 72-hour hold status, and approve the product release or hold action according to GMP standards."
      />
    </div>
  )
}

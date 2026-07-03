"use client"

import { useState, useEffect } from "react"
import { getMonthlyDistributionReport } from "@/app/actions/warehouse-reports"
import { GMPHeader } from "@/components/GMPHeader"
import { GenericSignatureModal } from "@/components/forms/GenericSignatureModal"
import * as XLSX from "xlsx"

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'print' | 'excel' | null>(null)

  useEffect(() => {
    fetchData()
  }, [month, year])

  async function fetchData() {
    setLoading(true)
    const res = await getMonthlyDistributionReport(month, year)
    if (res.success && res.data) {
      setReportData(res.data)
    }
    setLoading(false)
  }

  const skuLabels: Record<string, string> = {
    "p425_24": "425ml x 24",
    "p425_6": "425ml x 6",
    "p800_12": "800ml x 12",
    "p800_20": "800ml x 20",
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const handleAction = (action: 'print' | 'excel') => {
    if (signature) {
      executeAction(action)
    } else {
      setPendingAction(action)
      setIsSignModalOpen(true)
    }
  }

  const handleSignatureConfirm = async (sigData: string) => {
    setSignature(sigData)
    setIsSignModalOpen(false)
    if (pendingAction) {
      executeAction(pendingAction)
      setPendingAction(null)
    }
  }

  const executeAction = (action: 'print' | 'excel') => {
    if (action === 'print') {
      setTimeout(() => window.print(), 100)
    } else if (action === 'excel') {
      exportToExcel()
    }
  }

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData.map((r, i) => ({
      "NO": i + 1,
      "DATE": r.date,
      "PRODUCT TYPE": skuLabels[r.sku] || r.sku,
      "BATCH NO": r.batchNumber,
      "PRODUCTION DATE": r.productionDate,
      "BALANCE IN WAREHOUSE": r.balanceOpening,
      "TRANSFER IN": r.transferIn,
      "TRANSFER OUT": r.transferOut,
      "BALANCE CARRY FORWARD": r.balanceCarryForward,
      "PREPARED BY": r.preparedBy
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report")
    XLSX.writeFile(wb, `Monthly_Finished_Goods_Report_${month}_${year}.xlsx`)
  }

  return (
    <div className="bg-white min-h-screen text-black p-4 sm:p-8 font-sans print:p-0 print:bg-white max-w-7xl mx-auto">
      <div className="print:hidden mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">Monthly Finished Goods</h2>
          <p className="text-sm text-gray-500 font-bold">Auto-calculated monthly summary based on DOs and Transfers.</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border-2 border-gray-300 p-2 font-bold focus:border-purple-500 outline-none"
          >
            {monthNames.map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
          <input 
            type="number" 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="border-2 border-gray-300 p-2 font-bold focus:border-purple-500 outline-none w-24"
          />
          <button 
            onClick={() => handleAction('excel')}
            className="bg-green-600 text-white px-6 py-2 font-bold uppercase hover:bg-green-800 transition-colors"
          >
            Export Excel
          </button>
          <button 
            onClick={() => handleAction('print')}
            className="bg-black text-white px-6 py-2 font-bold uppercase hover:bg-gray-800 transition-colors"
          >
            Print PDF
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .print-wrapper { width: 100%; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid black; padding: 4px; text-align: center; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="print-wrapper">
        <GMPHeader 
          documentTitle="MONTHLY FINISHED GOOD REPORT"
          documentNumber="BOMSB-LNW-850-001-QR02"
          issue="04"
          date="01/07/2026"
        />

        <div className="text-center mb-6">
          <h1 className="font-black text-xl uppercase underline">Monthly Finished Good Report</h1>
          <p className="font-bold text-sm mt-1 uppercase">MONTH: {monthNames[month-1]} {year}</p>
        </div>

        {loading ? (
          <div className="text-center p-10 font-bold text-gray-500">Calculating data...</div>
        ) : (
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 font-bold w-12">NO</th>
                <th className="border border-black p-2 font-bold w-20">DATE</th>
                <th className="border border-black p-2 font-bold">PRODUCT TYPE</th>
                <th className="border border-black p-2 font-bold">BATCH NO</th>
                <th className="border border-black p-2 font-bold">PRODUCTION DATE</th>
                <th className="border border-black p-2 font-bold">BALANCE IN WAREHOUSE</th>
                <th className="border border-black p-2 font-bold">TRANSFER IN</th>
                <th className="border border-black p-2 font-bold">TRANSFER OUT</th>
                <th className="border border-black p-2 font-bold">BALANCE CARRY FORWARD</th>
                <th className="border border-black p-2 font-bold">PREPARED BY</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td className="border border-black p-2 text-center">{index + 1}</td>
                  <td className="border border-black p-2 text-center font-bold">{row.date}</td>
                  <td className="border border-black p-2 text-center font-bold uppercase">{skuLabels[row.sku] || row.sku}</td>
                  <td className="border border-black p-2 text-center font-bold uppercase">{row.batchNumber}</td>
                  <td className="border border-black p-2 text-center">{row.productionDate}</td>
                  <td className="border border-black p-2 text-center font-bold">{row.balanceOpening}</td>
                  <td className="border border-black p-2 text-center font-bold text-emerald-600">+{row.transferIn}</td>
                  <td className="border border-black p-2 text-center font-bold text-red-600">-{row.transferOut}</td>
                  <td className="border border-black p-2 text-center font-bold text-lg">{row.balanceCarryForward}</td>
                  <td className="border border-black p-2 text-center">{row.preparedBy}</td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={10} className="border border-black p-6 text-center italic text-gray-500">
                    No data for this month. Set opening stock if this is the first month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {signature && (
          <div className="hidden print:block mt-20 pt-8 border-t-2 border-black w-64 text-center">
            <img src={signature} alt="Signature" className="h-16 mx-auto mb-2 object-contain" />
            <div className="font-bold uppercase">Approved By</div>
            <div className="text-xs mt-1 text-gray-600">Authorized Personnel</div>
          </div>
        )}
      </div>

      <GenericSignatureModal
        isOpen={isSignModalOpen}
        onClose={() => {
          setIsSignModalOpen(false)
          setPendingAction(null)
        }}
        onConfirm={handleSignatureConfirm}
        userName="Authorized Personnel"
        role="Warehouse Approver"
        title="Approve Monthly Report"
      />
    </div>
  )
}

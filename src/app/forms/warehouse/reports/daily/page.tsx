"use client"

import { useState, useEffect } from "react"
import { getDailyDistributionReport } from "@/app/actions/warehouse-reports"
import { GMPHeader } from "@/components/GMPHeader"
import { GenericSignatureModal } from "@/components/forms/GenericSignatureModal"
import * as XLSX from "xlsx"

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'print' | 'excel' | null>(null)

  useEffect(() => {
    fetchData()
  }, [date])

  async function fetchData() {
    setLoading(true)
    const res = await getDailyDistributionReport(date)
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

  // Aggregate by Batch per Destination/Method for the table
  const rows: any[] = []
  reportData.forEach((doOrder: any) => {
    doOrder.items.forEach((item: any) => {
      rows.push({
        doNumber: doOrder.doNumber,
        destination: doOrder.destination,
        method: doOrder.distributionMethod,
        vehicleNo: doOrder.vehicleNo,
        batchNumber: item.batchNumber,
        qty: item.qtySent,
        sku: skuLabels[item.sku] || item.sku,
        preparedBy: doOrder.createdBy?.name || 'Unknown'
      })
    })
  })

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
    const ws = XLSX.utils.json_to_sheet(rows.map((r, i) => ({
      "NO": i + 1,
      "DO NUMBER": r.doNumber,
      "DESTINATION": r.destination,
      "METHOD": r.method,
      "VEHICLE NO": r.vehicleNo || "-",
      "BATCH NO": r.batchNumber,
      "QUANTITY (PCS)": r.qty,
      "SKU": r.sku,
      "PREPARED BY": r.preparedBy
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report")
    XLSX.writeFile(wb, `Daily_Distribution_Report_${date}.xlsx`)
  }

  return (
    <div className="bg-white min-h-screen text-black p-4 sm:p-8 font-sans print:p-0 print:bg-white max-w-7xl mx-auto">
      <div className="print:hidden mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">Daily Distribution Report</h2>
          <p className="text-sm text-gray-500 font-bold">Select a date to view all outgoing shipments.</p>
        </div>
        <div className="flex gap-4">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="border-2 border-gray-300 p-2 font-bold focus:border-blue-500 outline-none"
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
          .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }
        }
      `}</style>

      <div className="print-wrapper">
        <GMPHeader 
          documentTitle="DAILY FINISHED GOODS DISTRIBUTION RECORDS"
          documentNumber="BOMSB-LNW-850-001-QR01"
          issue="04"
          date="01/07/2026"
        />

        <div className="text-center mb-6">
          <h1 className="font-black text-xl uppercase underline">Daily Finished Goods Distribution Records</h1>
          <p className="font-bold text-sm mt-1">DISTRIBUTION DATE: {new Date(date).toLocaleDateString('en-GB')}</p>
        </div>

        {loading ? (
          <div className="text-center p-10 font-bold text-gray-500">Loading data...</div>
        ) : (
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-2 font-bold w-12">NO</th>
                <th rowSpan={2} className="border border-black p-2 font-bold">TYPE OF FINISHED GOODS</th>
                <th rowSpan={2} className="border border-black p-2 font-bold">QTY (BOX)</th>
                <th rowSpan={2} className="border border-black p-2 font-bold">BATCH NUMBER</th>
                <th rowSpan={2} className="border border-black p-2 font-bold">DESTINATION</th>
                <th colSpan={2} className="border border-black p-2 font-bold">METHOD DISTRIBUTION</th>
                <th rowSpan={2} className="border border-black p-2 font-bold">PREPARED BY</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 font-bold">METHOD</th>
                <th className="border border-black p-2 font-bold">VEHICLE NO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="border border-black p-2 text-center">{i + 1}</td>
                  <td className="border border-black p-2 text-center uppercase font-bold">{r.sku}</td>
                  <td className="border border-black p-2 text-center font-bold text-lg">{r.qty}</td>
                  <td className="border border-black p-2 text-center">{r.batchNumber}</td>
                  <td className="border border-black p-2 text-center uppercase">{r.destination}</td>
                  <td className="border border-black p-2 text-center uppercase">{r.method}</td>
                  <td className="border border-black p-2 text-center uppercase">{r.vehicleNo || '-'}</td>
                  <td className="border border-black p-2 text-center">{r.preparedBy}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-black p-6 text-center italic text-gray-500">
                    No distributions recorded for this date.
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
        title="Approve Daily Report"
      />
    </div>
  )
}

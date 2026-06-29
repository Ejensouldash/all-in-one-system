"use client"

import { useState, useEffect } from "react"
import { getMonthlyDistributionReport } from "@/app/actions/warehouse-reports"
import { GMPHeader } from "@/components/GMPHeader"

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

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
            onClick={() => window.print()}
            className="bg-black text-white px-6 py-2 font-bold uppercase hover:bg-gray-800 transition-colors"
          >
            Print
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
                <th className="border border-black p-2 font-bold">TYPE OF FINISHED GOODS</th>
                <th className="border border-black p-2 font-bold">BATCH NO</th>
                <th className="border border-black p-2 font-bold bg-blue-50">BALANCE OPENING</th>
                <th className="border border-black p-2 font-bold bg-green-50">TRANSFER IN (Production)</th>
                <th className="border border-black p-2 font-bold bg-orange-50">TRANSFER OUT (DO)</th>
                <th className="border border-black p-2 font-bold bg-purple-50">BALANCE CARRY FORWARD</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((r, i) => (
                <tr key={i}>
                  <td className="border border-black p-2 text-center">{i + 1}</td>
                  <td className="border border-black p-2 text-center font-bold uppercase">{skuLabels[r.sku] || r.sku}</td>
                  <td className="border border-black p-2 text-center font-bold">{r.batchNumber}</td>
                  <td className="border border-black p-2 text-center font-bold bg-blue-50/50">{r.balanceOpening}</td>
                  <td className="border border-black p-2 text-center font-bold text-green-700 bg-green-50/50">+{r.transferIn}</td>
                  <td className="border border-black p-2 text-center font-bold text-orange-700 bg-orange-50/50">-{r.transferOut}</td>
                  <td className="border border-black p-2 text-center font-black text-lg bg-purple-50/50">{r.balanceCarryForward}</td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-black p-6 text-center italic text-gray-500">
                    No data for this month. Set opening stock if this is the first month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

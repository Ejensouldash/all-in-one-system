"use client"

import { useState } from "react"
import { getApprovedDailyReportsByDateRange } from "@/app/actions/dailyReport"
import { exportSageX3Data } from "@/lib/exportUtils"
import { Download, Search, FileSpreadsheet, Loader2 } from "lucide-react"

export default function ExportPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!startDate || !endDate) return alert("Please select both Start Date and End Date.")
    
    setLoading(true)
    const result = await getApprovedDailyReportsByDateRange(startDate, endDate)
    if (result.success) {
      setReports(result.data || [])
      setHasSearched(true)
    } else {
      alert("Failed to fetch reports: " + result.error)
    }
    setLoading(false)
  }

  const handleExport = () => {
    if (reports.length === 0) return alert("No data to export.")
    exportSageX3Data(reports)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 flex items-center">
              <FileSpreadsheet className="w-6 h-6 mr-3 text-emerald-600" />
              Admin Data Export Module
            </h1>
            <p className="text-gray-500 mt-1">Export Verified & Approved production data for Sage X3 Integration.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={reports.length === 0}
            className="flex items-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Export to Excel/CSV
          </button>
        </div>

        <div className="flex items-end space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
            Fetch Data
          </button>
        </div>

        {/* Preview Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-black uppercase text-gray-700">Data Preview ({reports.length} Reports Found)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-24 px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="w-24 px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Shift</th>
                  <th scope="col" className="w-48 px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Operator</th>
                  <th scope="col" className="w-32 px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Machine/Line</th>
                  <th scope="col" className="w-32 px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Approval Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!hasSearched ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      Select a date range and click Fetch Data to preview records.
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      No approved records found in this date range.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 truncate">
                        {new Date(report.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                        {report.shift}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate">
                        {report.preparedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                        {report.line}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-black uppercase rounded bg-green-100 text-green-800">
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

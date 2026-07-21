"use client"

import React, { useState } from "react"
import { ChevronLeft, Search, Filter, FileText } from "lucide-react"
import Link from "next/link"

export default function MWLReportClient({ records }: { records: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredRecords = records.filter(
    (record) =>
      record.inspectionMonth.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.inspectionArea.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link href="/forms/maintenance/reports" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold uppercase tracking-widest">
                  <Search className="w-3.5 h-3.5 mr-2" /> SGMP-13 MWL
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-2">Monthly Wood Log Records</h1>
              <p className="text-gray-500 font-medium">View and manage wood inspection history.</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search month or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Inspection Month</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Inspection Area</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Condition of Wood</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Remarks</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Checked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="font-medium">No records found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-sm font-bold text-gray-900">{record.inspectionMonth}</td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{record.inspectionArea}</td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{record.conditionOfWood}</td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{record.remarks || "-"}</td>
                      <td className="p-4 text-sm text-gray-600 font-bold">{record.checkedBy}</td>
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

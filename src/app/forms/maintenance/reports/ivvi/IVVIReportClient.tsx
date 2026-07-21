"use client"

import React, { useState } from "react"
import { ChevronLeft, Search, FileText } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export function IVVIReportClient({ data, userRole }: { data: any[], userRole: string }) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredRecords = data.filter(
    (record) =>
      record.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Link href="/forms/maintenance/reports" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest">
                <Search className="w-3.5 h-3.5 mr-2" /> SGMP-14 IVVI
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">Incoming Vehicle Visual Inspection</h1>
            <p className="text-slate-500 font-medium">View and manage vehicle inspection logs.</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vehicle no or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Date</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Vehicle No</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Company Name</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Purpose</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Product</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Visual Inspection</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-slate-500">Checked By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="font-medium">No records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-sm font-bold text-slate-900">
                      {format(new Date(record.date), "dd/MM/yyyy")}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-bold uppercase">{record.vehicleNo}</td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{record.companyName}</td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{record.purpose}</td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{record.product}</td>
                    <td className="p-4 text-sm font-medium">
                      {record.visualInspection ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            NOT OK
                          </span>
                          <span className="text-xs text-red-600 truncate max-w-[150px]" title={record.reason}>
                            {record.reason}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-bold">{record.checkedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

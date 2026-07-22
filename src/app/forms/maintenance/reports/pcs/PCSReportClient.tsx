"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, Search, FileText, Printer } from "lucide-react"
import Link from "next/link"
import { MaintenanceHeader } from "@/components/forms/MaintenanceHeader"

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB")
}

export default function PCSReportClient({ records }: { records: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [year, setYear] = useState<string>("all")

  const years = useMemo(() => {
    const set = new Set<number>()
    records.forEach(r => set.add(new Date(r.date).getFullYear()))
    return Array.from(set).sort((a, b) => b - a)
  }, [records])

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.servicedBy.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesYear = year === "all" || new Date(record.date).getFullYear() === Number(year)
    return matchesSearch && matchesYear
  })

  function handlePrint() {
    document.title = `PEST CONTROL SCHEDULE ${year === "all" ? "" : year}`.trim()
    window.print()
    document.title = "All in One System"
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 print:py-0 print:bg-white">
      <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lime-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Link href="/forms/maintenance/reports" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-lime-100 text-lime-700 text-xs font-bold uppercase tracking-widest">
                  <Search className="w-3.5 h-3.5 mr-2" /> SGMP-06 PCS
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-2">Pest Control Schedule</h1>
              <p className="text-gray-500 font-medium">View and print 3rd-party pest control service visits.</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search company or serviced by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="all">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              disabled={filteredRecords.length === 0}
              className="flex items-center px-5 py-2.5 bg-lime-700 hover:bg-lime-800 text-white rounded-xl font-black uppercase tracking-wider text-sm transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Date of Service</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Company</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Serviced By</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Verified By</th>
                  <th className="p-4 text-xs font-black uppercase tracking-wider text-gray-500">Remark</th>
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
                      <td className="p-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatDate(record.date)}</td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{record.companyName}</td>
                      <td className="p-4 text-sm text-gray-600 font-bold">{record.servicedBy}</td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{record.verifiedBy || "-"}</td>
                      <td className="p-4 text-sm text-gray-600 font-medium">{record.remark || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Printable block */}
      <div className="hidden print:block">
        <MaintenanceHeader
          title="PEST CONTROL SCHEDULE"
          recNo="SGMP/06/PCS"
          issueNo="1/10/2022"
          revNo="1"
          effectiveDate="1/7/2026"
        />
        <div className="text-xs font-bold text-black font-sans uppercase mb-4">
          YEAR: <span className="underline ml-1 px-4">{year === "all" ? "ALL" : year}</span>
        </div>
        <table className="w-full text-[10px] border-collapse border border-black text-left print-compact-table">
          <thead>
            <tr className="bg-gray-200 print:bg-gray-200 text-center">
              <th className="border border-black p-1 w-[12%]">DATE OF SERVICE</th>
              <th className="border border-black p-1 w-[28%]">NAME OF THIRD PARTY COMPANY</th>
              <th className="border border-black p-1 w-[20%]">SERVICED BY</th>
              <th className="border border-black p-1 w-[20%]">VERIFIED BY</th>
              <th className="border border-black p-1 w-[20%]">REMARK</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td className="border border-black p-1 text-center font-bold">{formatDate(record.date)}</td>
                <td className="border border-black p-1">{record.companyName}</td>
                <td className="border border-black p-1 uppercase">{record.servicedBy}</td>
                <td className="border border-black p-1 uppercase">{record.verifiedBy || "-"}</td>
                <td className="border border-black p-1">{record.remark || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

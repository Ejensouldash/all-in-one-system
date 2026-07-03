"use client"

import { useState, useMemo } from "react"
import { Search, ArrowUpDown, Download, PackageOpen } from "lucide-react"
import * as XLSX from "xlsx"

type StockItem = {
  batchNo: string
  bags: number
  mult: number
  category: string
  doNumber?: string
  labelType?: string
}

export function ProductionStockClient({ initialData }: { initialData: StockItem[] }) {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<keyof StockItem>("category")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Filter out zero/negative balances and apply search
  const filteredData = useMemo(() => {
    return initialData.filter(item => {
      // Must have > 0 stock
      if (item.bags <= 0) return false
      
      const searchLower = search.toLowerCase()
      return (
        item.batchNo.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      )
    })
  }, [initialData, search])

  // Sort
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (sortField === "bags") {
        aVal = (aVal as number) * a.mult
        bVal = (bVal as number) * b.mult
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filteredData, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (field: keyof StockItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  const handleExport = () => {
    const exportData = sortedData.map(item => ({
      Category: item.category,
      "Batch Number": item.batchNo,
      "Balance (Bags/Box)": Number(item.bags.toFixed(3)),
      Multiplier: item.mult,
      "Total PCS": Math.round(item.bags * item.mult),
      "DO Number": item.doNumber || "-"
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Production Stock")
    XLSX.writeFile(wb, `Production_Stock_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 font-medium"
            placeholder="Search SKU or Batch..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        <button
          onClick={handleExport}
          className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-black uppercase tracking-wider rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center">
                  SKU / Category
                  <ArrowUpDown className="ml-1 w-3 h-3" />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("batchNo")}
              >
                <div className="flex items-center">
                  Batch Number
                  <ArrowUpDown className="ml-1 w-3 h-3" />
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                DO Number
              </th>
              <th 
                scope="col" 
                className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort("bags")}
              >
                <div className="flex items-center justify-end">
                  Total PCS (Balance)
                  <ArrowUpDown className="ml-1 w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <PackageOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-base font-medium">No active stock found</p>
                  <p className="text-sm mt-1">All batches are fully used or nothing matches your search.</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr key={`${item.batchNo}-${item.category}-${idx}`} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {item.batchNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                    {item.doNumber ? (
                      <span className="text-indigo-600">{item.doNumber}</span>
                    ) : (
                      <span className="text-gray-400">Carry Forward</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <div className="font-black text-emerald-600 text-base">
                      {Math.round(item.bags * item.mult).toLocaleString()}
                    </div>
                    <div className="text-xs font-medium text-gray-500">
                      {Number(item.bags.toFixed(3))} {item.mult > 1000 ? "bags" : "box"} × {item.mult}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">
                Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="font-bold">{sortedData.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-black text-gray-700">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
          <div className="flex items-center justify-between w-full sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

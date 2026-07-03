"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Printer, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react"

export function DistributionClient({ distributionOrders }: { distributionOrders: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [sortField, setSortField] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const filteredAndSortedDOs = useMemo(() => {
    let result = [...distributionOrders]

    // Filter by status
    if (statusFilter !== "ALL") {
      result = result.filter(doOrder => doOrder.status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(doOrder => 
        (doOrder.doNumber && doOrder.doNumber.toLowerCase().includes(lowerSearch)) ||
        (doOrder.destination && doOrder.destination.toLowerCase().includes(lowerSearch))
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField] ?? ""
      let bVal = b[sortField] ?? ""

      // Handle specific fields
      if (sortField === 'distributionDate' || sortField === 'createdAt') {
        aVal = new Date(a[sortField]).getTime()
        bVal = new Date(b[sortField]).getTime()
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [distributionOrders, searchTerm, statusFilter, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDOs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDOs = filteredAndSortedDOs.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-black focus:border-black font-bold outline-none"
            placeholder="Search by DO Number or Destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 border-2 border-gray-200 rounded-lg p-2 font-bold outline-none focus:border-black bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="PREPARING">Preparing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("doNumber")}
                >
                  <div className="flex items-center">
                    DO Number <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("distributionDate")}
                >
                  <div className="flex items-center">
                    Date <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("destination")}
                >
                  <div className="flex items-center">
                    Destination <ArrowUpDown className="w-3 h-3 ml-1" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Method</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedDOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                    No Distribution Orders found.
                  </td>
                </tr>
              ) : (
                paginatedDOs.map((doOrder) => (
                  <tr key={doOrder.id} className="hover:bg-blue-50/50">
                    <td className="px-6 py-4 whitespace-nowrap font-black text-blue-700">{doOrder.doNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">
                      {new Date(doOrder.distributionDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{doOrder.destination}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600">{doOrder.distributionMethod}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 py-1 inline-flex text-[10px] leading-5 font-black uppercase rounded ${
                        doOrder.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        doOrder.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                        doOrder.status === 'RETURNED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {doOrder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <Link href={`/forms/warehouse/distribution/${doOrder.id}/pod`} className="text-gray-500 hover:text-indigo-600 font-bold flex items-center bg-gray-100 hover:bg-indigo-50 px-3 py-1 rounded border border-gray-200">
                          <Printer className="w-4 h-4 mr-2" /> Print POD
                        </Link>
                        
                        <Link href={`/forms/warehouse/quarantine/new?doId=${doOrder.id}`} className="text-gray-500 hover:text-red-600 font-bold flex items-center bg-gray-100 hover:bg-red-50 px-3 py-1 rounded border border-gray-200" title="Log Return / Damage">
                          <AlertTriangle className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  Showing <span className="font-black">{startIndex + 1}</span> to <span className="font-black">{Math.min(startIndex + itemsPerPage, filteredAndSortedDOs.length)}</span> of <span className="font-black">{filteredAndSortedDOs.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers could go here, but simple next/prev is often enough for simple tables */}
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-black text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

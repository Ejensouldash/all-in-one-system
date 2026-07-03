"use client"
import Link from "next/link"
import { useState } from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

function formatSKU(sku: string) {
  if (!sku) return sku;
  return sku.replace('p800_', '800ml x ').replace('p425_', '425ml x ').toUpperCase();
}

export function LiveInventoryTable({ inventoryBatches }: { inventoryBatches: any[] }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const itemsPerPage = 6

  const filtered = inventoryBatches.filter(b => 
    b.batchNumber.toLowerCase().includes(search.toLowerCase()) || 
    formatSKU(b.sku).toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div>
        <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Batch No or SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1 border-2 border-gray-200 rounded disabled:opacity-50"
              ><ChevronLeft className="w-5 h-5"/></button>
              <span className="text-sm font-bold text-gray-600">Page {page} of {totalPages}</span>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1 border-2 border-gray-200 rounded disabled:opacity-50"
              ><ChevronRight className="w-5 h-5"/></button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Batch No</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Total In</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Total Out</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-black text-emerald-700 uppercase tracking-wider bg-emerald-50">Available</th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm font-medium text-gray-500">
                    No active inventory found for the search criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatSKU(batch.sku)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{batch.batchNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500 text-center">{batch.totalQtyIn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600 text-center">{batch.totalQtyOut}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg font-black text-emerald-700 text-right bg-emerald-50/30">{batch.availableBalance}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link 
                        href={`/forms/warehouse/inventory/qr?batch=${batch.batchNumber}&sku=${batch.sku}`}
                        className="inline-block bg-black text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded hover:bg-gray-800 transition-colors border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]"
                      >
                        Print QR
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  )
}

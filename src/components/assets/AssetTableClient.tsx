"use client"

import { useState } from "react"
import { MonitorSmartphone, Search, Filter, Eye, ChevronLeft, ChevronRight, Edit3, QrCode } from "lucide-react"
import Link from "next/link"
import { AssetEditModal } from "./AssetEditModal"
import { QRCodeModal } from "./QRCodeModal"

export function AssetTableClient({ assets, units }: { assets: any[], units: any[] }) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [qrAsset, setQrAsset] = useState<any>(null)

  // Filter
  const filteredAssets = assets.filter(a => 
    a.brand.toLowerCase().includes(search.toLowerCase()) || 
    a.model.toLowerCase().includes(search.toLowerCase()) || 
    (a.serialNumber && a.serialNumber.toLowerCase().includes(search.toLowerCase())) ||
    (a.barcode && a.barcode.toLowerCase().includes(search.toLowerCase()))
  )

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentAssets = filteredAssets.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <MonitorSmartphone className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">Company Assets Directory</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{filteredAssets.length}</span>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[300px]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Info</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">No assets found.</td>
              </tr>
            ) : currentAssets.map(asset => (
              <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-semibold text-gray-900">{asset.brand} {asset.model}</div>
                  <div className="text-xs text-gray-500 mt-0.5">SN: {asset.serialNumber || 'N/A'} • Barcode: {asset.barcode || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{asset.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{asset.unit?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {asset.assigneeName ? (
                    <div className="flex items-center font-medium">
                      <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2">
                        {asset.assigneeName.charAt(0).toUpperCase()}
                      </div>
                      {asset.assigneeName}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                    asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    asset.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-2">
                    <button 
                      onClick={() => setQrAsset(asset)}
                      className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 p-2 rounded-lg transition-colors group relative inline-flex" 
                      title="Generate QR Code Sticker"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setEditingAsset(asset)}
                      className="text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 p-2 rounded-lg transition-colors group relative inline-flex" 
                      title="Edit Asset"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors group relative inline-flex" title="View Asset History">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-bold">{startIndex + 1}</span> to <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredAssets.length)}</span> of <span className="font-bold">{filteredAssets.length}</span> assets
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {editingAsset && (
        <AssetEditModal asset={editingAsset} units={units} onClose={() => setEditingAsset(null)} />
      )}

      {qrAsset && (
        <QRCodeModal asset={qrAsset} onClose={() => setQrAsset(null)} />
      )}
    </div>
  )
}

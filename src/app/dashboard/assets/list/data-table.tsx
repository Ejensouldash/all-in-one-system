"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  QrCode,
  Printer,
  Upload,
  Loader2
} from "lucide-react"
import { SmartImportModal } from "@/components/forms/SmartImportModal"

function getPaginationItems(currentPage: number, totalPages: number) {
  const items = [];
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else {
    if (currentPage <= 4) {
      items.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      items.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      items.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }
  return items;
}

export function DataTable({ initialAssets }: { initialAssets: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const itemsPerPage = 15

  // Filtering
  const filteredAssets = initialAssets.filter(asset => {
    const matchesSearch = 
      (asset.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (asset.assetTag?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (asset.serialNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (asset.department?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter
    const matchesType = typeFilter === "ALL" || asset.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExport = () => {
    alert("Export to Excel functionality to be implemented")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setIsSmartImportOpen(true)
    setIsAiProcessing(true)
    setPreviewData([])
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import-upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (res.ok) {
        setPreviewData(data.previewData || [])
      } else {
        alert(`AI Processing failed: ${data.error}`)
        setIsSmartImportOpen(false)
      }
    } catch (err) {
      alert(`Upload failed: ${err}`)
      setIsSmartImportOpen(false)
    } finally {
      setIsAiProcessing(false)
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleConfirmImport = async () => {
    setIsConfirming(true)
    try {
      const res = await fetch('/api/import-upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: previewData })
      })
      const data = await res.json()
      
      if (res.ok) {
        alert(`Successfully imported ${data.count} assets!`)
        window.location.reload()
      } else {
        alert(`Import failed: ${data.error}`)
      }
    } catch (err) {
      alert(`Import failed: ${err}`)
    } finally {
      setIsConfirming(false)
      setIsSmartImportOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-teal-500 focus:border-teal-500 transition-shadow"
            placeholder="Search by name, tag, serial, or assignee..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            className="border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:ring-teal-500 focus:border-teal-500 font-medium px-4 py-2"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="ICT_EQUIPMENT">ICT Equipment</option>
            <option value="OFFICE_EQUIPMENT">Office Equipment</option>
            <option value="EVENT_EQUIPMENT">Event Equipment</option>
            <option value="TOOLS">Tools</option>
            <option value="SAFETY_EQUIPMENT">Safety</option>
            <option value="MACHINE">Machine</option>
            <option value="ELECTRICAL_EQUIPMENT">Electrical</option>
            <option value="FURNITURE">Furniture</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="OTHER">Other</option>
          </select>
          
          <select 
            className="border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:ring-teal-500 focus:border-teal-500 font-medium px-4 py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>

          <label className="flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm cursor-pointer">
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {isUploading ? 'Importing...' : 'Import'}
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isUploading}
            />
          </label>

          <button 
            onClick={handleExport}
            className="flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          
          {selectedIds.length > 0 && (
            <button 
              onClick={() => {
                sessionStorage.setItem('printQrIds', JSON.stringify(selectedIds));
                window.open('/dashboard/assets/print-qr', '_blank');
              }}
              className="flex items-center justify-center px-4 py-2 text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print QRs ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={filteredAssets.length > 0 && filteredAssets.every(a => selectedIds.includes(a.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newIds = new Set([...selectedIds, ...filteredAssets.map(a => a.id)])
                      setSelectedIds(Array.from(newIds))
                    } else {
                      setSelectedIds(selectedIds.filter(id => !filteredAssets.find(a => a.id === id)))
                    }
                  }}
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100">
                <div className="flex items-center">Asset Tag <ArrowUpDown className="ml-1 w-3 h-3"/></div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Name / Brand
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                  No assets found matching your criteria.
                </td>
              </tr>
            ) : paginatedAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.includes(asset.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, asset.id])
                      } else {
                        setSelectedIds(selectedIds.filter(id => id !== asset.id))
                      }
                    }}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-indigo-600">{asset.assetTag}</div>
                  <div className="text-xs text-slate-500 font-medium">SN: {asset.serialNumber || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-slate-900">{asset.name}</div>
                  <div className="text-xs text-slate-500 font-medium">{asset.brand} {asset.model}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {asset.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{asset.department?.name || 'Unassigned Dept'}</div>
                  <div className="text-xs text-slate-500">{asset.location?.name || 'No Location Set'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {asset.status === 'AVAILABLE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Available</span>}
                  {asset.status === 'ASSIGNED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Assigned</span>}
                  {asset.status === 'MAINTENANCE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">Maintenance</span>}
                  {asset.status === 'RETIRED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">Retired</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/assets/${asset.id}`} className="text-slate-400 hover:text-indigo-600 transition bg-slate-50 hover:bg-indigo-50 p-1.5 rounded-md" title="View details">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link href={`/public/asset/${asset.id}`} target="_blank" className="text-slate-400 hover:text-slate-800 transition bg-slate-50 hover:bg-slate-200 p-1.5 rounded-md" title="View public QR page">
                      <QrCode className="w-4 h-4" />
                    </Link>
                    <button className="text-slate-400 hover:text-teal-600 transition bg-slate-50 hover:bg-teal-50 p-1.5 rounded-md" title="Edit asset">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-700 font-medium">
              Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + (filteredAssets.length > 0 ? 1 : 0)}</span> to <span className="font-bold">{Math.min(currentPage * itemsPerPage, filteredAssets.length)}</span> of <span className="font-bold">{filteredAssets.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              
              <div className="hidden md:flex">
                {getPaginationItems(currentPage, totalPages).map((item, index) => {
                  if (item === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                        ...
                      </span>
                    )
                  }
                  const i = item as number;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold ${
                        currentPage === i
                          ? "z-10 bg-teal-50 border-teal-500 text-teal-600"
                          : "bg-white border-slate-300 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {i}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      <SmartImportModal 
        isOpen={isSmartImportOpen}
        isProcessing={isAiProcessing}
        isConfirming={isConfirming}
        previewData={previewData}
        onConfirm={handleConfirmImport}
        onCancel={() => setIsSmartImportOpen(false)}
      />
    </div>
  )
}
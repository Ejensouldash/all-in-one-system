"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  QrCode,
  Printer,
  Upload,
  Loader2,
  Image as ImageIcon,
  Building2,
  X,
  Sparkles
} from "lucide-react"
import { SmartImportModal } from "@/components/forms/SmartImportModal"
import { deleteAsset } from "@/app/actions/asset"
import * as XLSX from "xlsx"

function getPaginationItems(currentPage: number, totalPages: number) {
  const items = []
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i)
  } else {
    if (currentPage <= 4) {
      items.push(1, 2, 3, 4, 5, '...', totalPages)
    } else if (currentPage >= totalPages - 3) {
      items.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      items.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
  }
  return items
}

export function DataTable({ initialAssets }: { initialAssets: any[] }) {
  const [assets, setAssets] = useState<any[]>(initialAssets)
  const [searchTerm, setSearchTerm] = useState("")
  const [deptFilter, setDeptFilter] = useState("ALL")
  const [conditionFilter, setConditionFilter] = useState("ALL")
  const [sortField, setSortField] = useState<"no" | "department" | "name" | "brand">("no")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isPrintDeptModalOpen, setIsPrintDeptModalOpen] = useState(false)
  const [selectedPrintDept, setSelectedPrintDept] = useState("")
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  
  const itemsPerPage = 20

  // Extract unique departments and conditions
  const departments = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>()
    assets.forEach(a => {
      if (a.department?.name) {
        const key = a.department.code || a.department.name
        if (!map.has(key)) {
          map.set(key, {
            id: a.department.id,
            name: a.department.name,
            code: a.department.code || "",
          })
        }
      }
    })
    return Array.from(map.values()).sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name))
  }, [assets])

  const conditions = useMemo(() => {
    const conds = new Set<string>()
    assets.forEach(a => { if (a.condition) conds.add(a.condition) })
    return Array.from(conds).sort()
  }, [assets])

  // Sort handler
  const handleSort = (field: "no" | "department" | "name" | "brand") => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
    setCurrentPage(1)
  }

  // Filtering
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const q = searchTerm.toLowerCase()
      const matchesSearch = 
        !q ||
        (asset.name?.toLowerCase() || "").includes(q) ||
        (asset.brand?.toLowerCase() || "").includes(q) ||
        (asset.serialNumber?.toLowerCase() || "").includes(q) ||
        (asset.department?.name?.toLowerCase() || "").includes(q) ||
        (asset.department?.code?.toLowerCase() || "").includes(q) ||
        (asset.location?.name?.toLowerCase() || "").includes(q)

      const matchesDept = 
        deptFilter === "ALL" || 
        asset.department?.name === deptFilter ||
        asset.department?.code === deptFilter
      const matchesCondition = conditionFilter === "ALL" || asset.condition === conditionFilter

      return matchesSearch && matchesDept && matchesCondition
    })
  }, [assets, searchTerm, deptFilter, conditionFilter])

  // Sorting
  const sortedAssets = useMemo(() => {
    return [...filteredAssets].sort((a, b) => {
      let comparison = 0
      if (sortField === "department") {
        const deptA = a.department?.name || ""
        const deptB = b.department?.name || ""
        comparison = deptA.localeCompare(deptB)
      } else if (sortField === "name") {
        comparison = (a.name || "").localeCompare(b.name || "")
      } else if (sortField === "brand") {
        comparison = (a.brand || "").localeCompare(b.brand || "")
      } else {
        // "no": parse AST-0001 running number
        const numA = parseInt(a.assetTag?.replace("AST-", "") || "0", 10)
        const numB = parseInt(b.assetTag?.replace("AST-", "") || "0", 10)
        comparison = numA - numB
      }
      return sortOrder === "asc" ? comparison : -comparison
    })
  }, [filteredAssets, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage)
  const paginatedAssets = sortedAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Export to Excel with headers matching Excel
  const handleExport = () => {
    const exportRows = sortedAssets.map((asset, idx) => ({
      "No": parseInt(asset.assetTag?.replace("AST-", "") || String(idx + 1), 10),
      "Department": asset.department?.name || "-",
      "Item": asset.name,
      "Brand": asset.brand || "-",
      "Barcode / Serial Number": asset.serialNumber || "-",
      "Location": asset.location?.name || "-",
      "Condition": asset.condition || "-"
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets")
    XLSX.writeFile(workbook, `Assets_Export_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // Handle Delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return

    setIsDeletingId(id)
    const res = await deleteAsset(id)
    if (res.success) {
      setAssets(prev => prev.filter(a => a.id !== id))
      setSelectedIds(prev => prev.filter(i => i !== id))
    } else {
      alert(res.error || "Failed to delete asset.")
    }
    setIsDeletingId(null)
  }

  // Print selected QR stickers
  const handlePrintSelected = () => {
    if (selectedIds.length === 0) return
    sessionStorage.setItem('printQrIds', JSON.stringify(selectedIds))
    window.open('/dashboard/assets/print-qr', '_blank')
  }

  // Print QR by Department
  const handlePrintByDepartment = (deptIdentifier: string) => {
    const deptAssets = assets.filter(
      a => a.department?.code === deptIdentifier || a.department?.name === deptIdentifier
    )
    if (deptAssets.length === 0) {
      alert(`No assets found for department: ${deptIdentifier}`)
      return
    }
    const deptIds = deptAssets.map(a => a.id)
    sessionStorage.setItem('printQrIds', JSON.stringify(deptIds))
    window.open('/dashboard/assets/print-qr', '_blank')
    setIsPrintDeptModalOpen(false)
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
        alert(`Processing failed: ${data.error}`)
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
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-teal-500 focus:border-teal-500 transition-shadow"
            placeholder="Search by item, brand, barcode, department..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Department Filter */}
          <select 
            className="border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:ring-teal-500 focus:border-teal-500 font-medium px-3 py-2"
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="ALL">All Departments ({assets.length})</option>
            {departments.map(d => (
              <option key={d.code || d.name} value={d.code || d.name}>
                {d.code ? `[${d.code}] ${d.name}` : d.name}
              </option>
            ))}
          </select>
          
          {/* Condition Filter */}
          <select 
            className="border border-slate-300 rounded-lg text-sm text-slate-700 bg-white focus:ring-teal-500 focus:border-teal-500 font-medium px-3 py-2"
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="ALL">All Conditions</option>
            {conditions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Print by Department Button */}
          <button
            type="button"
            onClick={() => setIsPrintDeptModalOpen(true)}
            className="flex items-center justify-center px-3.5 py-2 border border-teal-200 text-sm font-bold rounded-lg text-teal-800 bg-teal-50 hover:bg-teal-100 transition shadow-xs"
            title="Print QR stickers for a specific department"
          >
            <Building2 className="h-4 w-4 mr-1.5 text-teal-600" />
            Print by Dept
          </button>

          {/* Import Button */}
          <label className="flex items-center justify-center px-3 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs cursor-pointer">
            {isUploading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5 text-slate-500" />}
            {isUploading ? 'Importing...' : 'Import'}
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isUploading}
            />
          </label>

          {/* Export to Excel */}
          <button 
            onClick={handleExport}
            className="flex items-center justify-center px-3 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="h-4 w-4 mr-1.5 text-slate-500" />
            Export
          </button>
          
          {/* Bulk Print Selection */}
          {selectedIds.length > 0 && (
            <button 
              onClick={handlePrintSelected}
              className="flex items-center justify-center px-4 py-2 text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs animate-in zoom-in-95 duration-150"
            >
              <Printer className="h-4 w-4 mr-1.5" />
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
              <th scope="col" className="px-4 py-3.5 text-left w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={paginatedAssets.length > 0 && paginatedAssets.every(a => selectedIds.includes(a.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newIds = new Set([...selectedIds, ...paginatedAssets.map(a => a.id)])
                      setSelectedIds(Array.from(newIds))
                    } else {
                      setSelectedIds(selectedIds.filter(id => !paginatedAssets.find(a => a.id === id)))
                    }
                  }}
                />
              </th>
              
              {/* Header 1: No */}
              <th 
                scope="col" 
                onClick={() => handleSort("no")}
                className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-16"
              >
                <div className="flex items-center gap-1">
                  <span>No</span>
                  {sortField === "no" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Header 2: Department (Sortable) */}
              <th 
                scope="col" 
                onClick={() => handleSort("department")}
                className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Department</span>
                  {sortField === "department" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Header 3: Item */}
              <th 
                scope="col" 
                onClick={() => handleSort("name")}
                className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Item</span>
                  {sortField === "name" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Header 4: Brand */}
              <th 
                scope="col" 
                onClick={() => handleSort("brand")}
                className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Brand</span>
                  {sortField === "brand" ? (
                    sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Header 5: Barcode / Serial Number */}
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                Barcode / Serial Number
              </th>

              {/* Header 6: Location */}
              <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                Location
              </th>

              {/* Header 7: Condition */}
              <th scope="col" className="px-4 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                Condition
              </th>

              {/* Actions */}
              <th scope="col" className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-slate-100 font-medium">
            {paginatedAssets.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                  No assets found matching your criteria.
                </td>
              </tr>
            ) : paginatedAssets.map((asset, index) => {
              const rowNo = parseInt(asset.assetTag?.replace("AST-", "") || String((currentPage - 1) * itemsPerPage + index + 1), 10)
              
              return (
                <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Select Checkbox */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
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

                  {/* No */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-500">
                    {rowNo}
                  </td>

                  {/* Department */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {asset.department?.code && (
                        <span className="text-[10px] font-mono font-black text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                          {asset.department.code}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-800">
                        {asset.department?.name || "Unassigned"}
                      </span>
                    </div>
                  </td>

                  {/* Item (Name + optional thumbnail) */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {asset.imageUrl ? (
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.name} 
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div>
                        {asset.name === "[Blank QR - Ready to Register]" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-300/80 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3 text-amber-600" /> Blank QR (Ready to Register)
                          </span>
                        ) : (
                          <div className="text-sm font-bold text-slate-900 leading-snug">{asset.name}</div>
                        )}
                        {asset.model && <div className="text-[11px] text-slate-500">{asset.model}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Brand */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-700 font-semibold">
                    {asset.brand || "—"}
                  </td>

                  {/* Barcode / Serial Number */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {asset.serialNumber ? (
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                        {asset.serialNumber}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs font-bold">—</span>
                    )}
                  </td>

                  {/* Location */}
                  <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate" title={asset.location?.name || "No location set"}>
                    {asset.location?.name || "—"}
                  </td>

                  {/* Condition */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {asset.condition === 'Good' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Good</span>
                    )}
                    {asset.condition === 'Usable' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Usable</span>
                    )}
                    {asset.condition === 'Bad' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Bad</span>
                    )}
                    {asset.condition === 'Unused' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Unused</span>
                    )}
                    {!asset.condition && (
                      <span className="text-slate-300 text-xs font-bold">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end items-center gap-1.5">
                      <Link 
                        href={`/dashboard/assets/${asset.id}`} 
                        className="text-slate-500 hover:text-indigo-600 transition bg-slate-50 hover:bg-indigo-50 p-1.5 rounded-lg border border-slate-200" 
                        title="View / Edit details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <Link 
                        href={`/public/asset/${asset.id}`} 
                        target="_blank" 
                        className="text-slate-500 hover:text-slate-800 transition bg-slate-50 hover:bg-slate-200 p-1.5 rounded-lg border border-slate-200" 
                        title="View public QR page"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </Link>
                      <button 
                        type="button"
                        disabled={isDeletingId === asset.id}
                        onClick={() => handleDelete(asset.id, asset.name)}
                        className="text-slate-400 hover:text-red-600 transition bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg border border-slate-200 disabled:opacity-50" 
                        title="Delete asset"
                      >
                        {isDeletingId === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 py-3.5 border-t border-slate-200 flex items-center justify-between sm:px-6">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + (sortedAssets.length > 0 ? 1 : 0)}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, sortedAssets.length)}</span> of <span className="font-bold text-slate-900">{sortedAssets.length}</span> assets
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-lg shadow-2xs -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2.5 py-1.5 rounded-l-lg border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              
              <div className="hidden md:flex">
                {getPaginationItems(currentPage, totalPages).map((item, index) => {
                  if (item === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="relative inline-flex items-center px-3 py-1.5 border border-slate-300 bg-white text-xs font-medium text-slate-500">
                        ...
                      </span>
                    )
                  }
                  const i = item as number
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`relative inline-flex items-center px-3 py-1.5 border text-xs font-bold transition-colors ${
                        currentPage === i
                          ? "z-10 bg-teal-50 border-teal-500 text-teal-700"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
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
                className="relative inline-flex items-center px-2.5 py-1.5 rounded-r-lg border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Print by Department Modal */}
      {isPrintDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-teal-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-700" />
                <h3 className="font-bold text-base text-slate-900">Print QR by Department</h3>
              </div>
              <button 
                onClick={() => setIsPrintDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Select a department to generate and print batch QR stickers for all assets assigned to it.
              </p>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {departments.map((dept) => {
                  const count = assets.filter(
                    a => a.department?.code === dept.code || a.department?.name === dept.name
                  ).length
                  const blankCount = assets.filter(
                    a => (a.department?.code === dept.code || a.department?.name === dept.name) && a.name === "[Blank QR - Ready to Register]"
                  ).length
                  return (
                    <button
                      key={dept.code || dept.name}
                      onClick={() => handlePrintByDepartment(dept.code || dept.name)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition group"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          {dept.code && (
                            <span className="font-mono text-xs font-black text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                              {dept.code}
                            </span>
                          )}
                          <p className="text-sm font-bold text-slate-800 group-hover:text-teal-900">{dept.name}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {count} sticker{count !== 1 ? 's' : ''} ({count - blankCount} registered + {blankCount} blank)
                        </p>
                      </div>
                      <Printer className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrintDeptModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Import Modal */}
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
"use client"

import { useState, useMemo, useRef } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { ArrowLeft, Printer, Search, CheckSquare, Square, Filter, X, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface Asset {
  id: string
  assetTag: string
  name: string
  type: string
  status: string
  department?: { id: string; name: string } | null
  location?: { id: string; name: string } | null
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : ""

export function QRStickerPrintClient({ assets }: { assets: Asset[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [page, setPage] = useState(1)
  const printRef = useRef<HTMLDivElement>(null)
  const perPage = 20

  const departments = useMemo(() => {
    const depts = new Set<string>()
    assets.forEach(a => { if (a.department?.name) depts.add(a.department.name) })
    return Array.from(depts).sort()
  }, [assets])

  const types = useMemo(() => {
    const t = new Set<string>()
    assets.forEach(a => t.add(a.type))
    return Array.from(t).sort()
  }, [assets])

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const q = search.toLowerCase()
      const matchSearch = !q || a.assetTag.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || (a.department?.name || "").toLowerCase().includes(q)
      const matchType = !typeFilter || a.type === typeFilter
      const matchDept = !deptFilter || a.department?.name === deptFilter
      return matchSearch && matchType && matchDept
    })
  }, [assets, search, typeFilter, deptFilter])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (filtered.every(a => selectedIds.has(a.id))) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(a => next.delete(a.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(a => next.add(a.id))
        return next
      })
    }
  }

  const selectedAssets = assets.filter(a => selectedIds.has(a.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id))

  const handlePrint = () => {
    setShowPreview(true)
    setTimeout(() => window.print(), 300)
  }

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  if (showPreview) {
    return (
      <>
        {/* Print-only styles */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .qr-print-area, .qr-print-area * { visibility: visible !important; }
            .qr-print-area { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print { display: none !important; }
            @page { 
              size: A4; 
              margin: 5mm; 
            }
          }
        `}</style>

        {/* Screen controls */}
        <div className="no-print p-4 bg-gray-900 text-white flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => setShowPreview(false)} className="flex items-center gap-2 text-sm hover:text-teal-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Selection
          </button>
          <div className="text-sm text-gray-400">{selectedAssets.length} sticker(s) ready</div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
            <Printer className="w-4 h-4" /> Print Now
          </button>
        </div>

        {/* Preview + Print area */}
        <div className="qr-print-area bg-white min-h-screen p-4">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "3mm",
              justifyContent: "flex-start",
              alignContent: "flex-start",
            }}
          >
            {selectedAssets.map(asset => (
              <AssetQRSticker
                key={asset.id}
                assetTag={asset.assetTag}
                qrValue={`${BASE_URL}/dashboard/assets/${asset.id}`}
              />
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/assets" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black tracking-tight">QR Sticker Print</h1>
                <p className="text-sm text-gray-400">Select assets and print QR code stickers for labelling</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">
                <span className="text-teal-400 font-bold">{selectedIds.size}</span> selected
              </div>
              <button
                onClick={handlePrint}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
              >
                <Printer className="w-4 h-4" />
                Batch Print ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by asset tag, name, or department..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
          <select
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(search || typeFilter || deptFilter) && (
            <button
              onClick={() => { setSearch(""); setTypeFilter(""); setDeptFilter(""); setPage(1) }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-teal-400" /> : <Square className="w-4 h-4" />}
            Select All ({filtered.length})
          </button>
          <div className="text-xs text-gray-500">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
          </div>
        </div>

        {/* Asset Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-3 text-left w-12"></th>
                <th className="p-3 text-left">Asset Tag</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(asset => {
                const isSelected = selectedIds.has(asset.id)
                return (
                  <tr
                    key={asset.id}
                    onClick={() => toggleSelect(asset.id)}
                    className={`border-b border-gray-800/50 cursor-pointer transition-colors ${isSelected ? "bg-teal-950/30" : "hover:bg-gray-800/50"}`}
                  >
                    <td className="p-3">
                      {isSelected 
                        ? <CheckSquare className="w-4 h-4 text-teal-400" /> 
                        : <Square className="w-4 h-4 text-gray-600" />
                      }
                    </td>
                    <td className="p-3 font-mono font-bold text-teal-400">{asset.assetTag}</td>
                    <td className="p-3 font-medium text-white">{asset.name}</td>
                    <td className="p-3 text-gray-400">{typeLabel(asset.type)}</td>
                    <td className="p-3 text-gray-400">{asset.department?.name || "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        asset.status === "AVAILABLE" ? "bg-emerald-900/50 text-emerald-400" :
                        asset.status === "ASSIGNED" ? "bg-blue-900/50 text-blue-400" :
                        asset.status === "MAINTENANCE" ? "bg-amber-900/50 text-amber-400" :
                        "bg-gray-800 text-gray-400"
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    No assets found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Preview of selected stickers */}
        {selectedIds.size > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4 text-gray-300">Preview ({selectedAssets.length} stickers)</h2>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 overflow-auto">
              <div className="flex flex-wrap gap-4">
                {selectedAssets.slice(0, 6).map(asset => (
                  <AssetQRSticker
                    key={asset.id}
                    assetTag={asset.assetTag}
                    qrValue={`${BASE_URL}/dashboard/assets/${asset.id}`}
                  />
                ))}
                {selectedAssets.length > 6 && (
                  <div className="flex items-center justify-center w-[70mm] h-[30mm] border-2 border-dashed border-gray-600 rounded-lg text-gray-500 text-sm font-medium">
                    +{selectedAssets.length - 6} more stickers
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

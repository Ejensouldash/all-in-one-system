"use client"

import { useState, useMemo, useRef } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { ArrowLeft, Printer, Search, CheckSquare, Square, X, ChevronLeft, ChevronRight, Building2, Sparkles, Filter } from "lucide-react"
import Link from "next/link"

interface Asset {
  id: string
  assetTag: string
  name: string
  brand?: string | null
  serialNumber?: string | null
  condition?: string | null
  department?: { id: string; name: string; code?: string | null } | null
  location?: { id: string; name: string } | null
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : ""

export function QRStickerPrintClient({ assets }: { assets: Asset[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BLANK" | "REAL">("ALL")
  const [showPreview, setShowPreview] = useState(false)
  const [page, setPage] = useState(1)
  const printRef = useRef<HTMLDivElement>(null)
  const perPage = 25

  // Collect unique departments with codes
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

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const q = search.toLowerCase()
      const isBlank = a.name === "[Blank QR - Ready to Register]"

      const matchType =
        typeFilter === "ALL" ||
        (typeFilter === "BLANK" && isBlank) ||
        (typeFilter === "REAL" && !isBlank)

      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.brand || "").toLowerCase().includes(q) ||
        (a.serialNumber || "").toLowerCase().includes(q) ||
        (a.department?.name || "").toLowerCase().includes(q) ||
        (a.department?.code || "").toLowerCase().includes(q) ||
        (a.location?.name || "").toLowerCase().includes(q)

      const matchDept =
        !deptFilter ||
        a.department?.name === deptFilter ||
        a.department?.code === deptFilter

      return matchType && matchSearch && matchDept
    })
  }, [assets, search, deptFilter, typeFilter])

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

  // Quick select all in a specific department
  const handleSelectDepartment = (deptCodeOrName: string) => {
    setDeptFilter(deptCodeOrName)
    const deptAssetIds = assets
      .filter(a => a.department?.code === deptCodeOrName || a.department?.name === deptCodeOrName)
      .map(a => a.id)
    setSelectedIds(new Set(deptAssetIds))
    setPage(1)
  }

  // Quick select all Blank QRs for current department or overall
  const handleSelectBlankQRs = () => {
    setTypeFilter("BLANK")
    const blankIds = assets
      .filter(a => {
        const isBlank = a.name === "[Blank QR - Ready to Register]"
        const matchDept = !deptFilter || a.department?.code === deptFilter || a.department?.name === deptFilter
        return isBlank && matchDept
      })
      .map(a => a.id)
    setSelectedIds(new Set(blankIds))
    setPage(1)
  }

  const selectedAssets = assets.filter(a => selectedIds.has(a.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id))

  const handlePrint = () => {
    setShowPreview(true)
    setTimeout(() => window.print(), 300)
  }

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
          <button onClick={() => setShowPreview(false)} className="flex items-center gap-2 text-sm hover:text-teal-400 transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Selection
          </button>
          <div className="text-sm text-gray-300 font-semibold">{selectedAssets.length} sticker(s) ready to print</div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 px-5 py-2 rounded-xl text-sm font-black transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Print Now
          </button>
        </div>

        {/* Preview + Print area */}
        <div className="qr-print-area bg-white min-h-screen p-4">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6mm",
              justifyContent: "center",
              alignContent: "flex-start",
            }}
          >
            {selectedAssets.map(asset => (
              <AssetQRSticker
                key={asset.id}
                assetTag={asset.assetTag}
                departmentCode={asset.department?.code}
                isBlank={asset.name === "[Blank QR - Ready to Register]"}
                qrValue={`${BASE_URL}/public/asset/${asset.id}`}
                bleed
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
      <div className="border-b border-gray-800 bg-gray-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/assets/list" className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black tracking-tight">QR Sticker Batch Print</h1>
                <p className="text-xs text-gray-400 mt-0.5">Select assets or choose by department to print official 70x30mm QR stickers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-400 bg-gray-800/80 px-3 py-2 rounded-xl border border-gray-700 font-medium">
                <span className="text-teal-400 font-bold">{selectedIds.size}</span> selected
              </div>
              <button
                onClick={handlePrint}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Batch Print ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Quick Select by Department */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Quick Select by Department</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectBlankQRs}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Select Blank QRs ({assets.filter(a => a.name === "[Blank QR - Ready to Register]" && (!deptFilter || a.department?.code === deptFilter)).length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => {
              const count = assets.filter(a => a.department?.code === dept.code || a.department?.name === dept.name).length
              const blankCount = assets.filter(a => (a.department?.code === dept.code || a.department?.name === dept.name) && a.name === "[Blank QR - Ready to Register]").length
              const isCurrent = deptFilter === dept.code || deptFilter === dept.name

              return (
                <button
                  key={dept.code || dept.name}
                  type="button"
                  onClick={() => handleSelectDepartment(dept.code || dept.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isCurrent
                      ? "bg-teal-600 text-white border-teal-500 shadow-sm"
                      : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-teal-300 font-black">{dept.code || dept.name}</span>
                  <span className="text-[11px] opacity-80">{dept.name}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">{count}</span>
                  {blankCount > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-[9px] font-mono" title={`${blankCount} Blank QRs`}>
                      +{blankCount} blk
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type Toggle */}
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setTypeFilter("ALL"); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "ALL" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              All Assets ({assets.length})
            </button>
            <button
              onClick={() => { setTypeFilter("REAL"); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "REAL" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Registered Only ({assets.filter(a => a.name !== "[Blank QR - Ready to Register]").length})
            </button>
            <button
              onClick={() => { setTypeFilter("BLANK"); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "BLANK" ? "bg-amber-600 text-white" : "text-amber-400 hover:text-amber-300"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Blank QRs Only ({assets.filter(a => a.name === "[Blank QR - Ready to Register]").length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search item, brand, barcode, location, department..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
            className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.code || d.name} value={d.code || d.name}>
                {d.code ? `[${d.code}] ${d.name}` : d.name}
              </option>
            ))}
          </select>

          {(search || deptFilter || typeFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setDeptFilter(""); setTypeFilter("ALL"); setPage(1) }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Select All Row */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-teal-400" /> : <Square className="w-4 h-4 text-gray-600" />}
            Select All Filtered ({filtered.length})
          </button>
          <div className="text-xs text-gray-500 font-medium">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} assets
          </div>
        </div>

        {/* Asset Table matching Excel Headers */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-[11px] uppercase tracking-wider bg-gray-900/80">
                <th className="p-3.5 text-left w-12"></th>
                <th className="p-3.5 text-left w-14">No</th>
                <th className="p-3.5 text-left">Department</th>
                <th className="p-3.5 text-left">Item</th>
                <th className="p-3.5 text-left">Brand</th>
                <th className="p-3.5 text-left">Barcode / Serial</th>
                <th className="p-3.5 text-left">Location</th>
                <th className="p-3.5 text-left">Condition</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((asset, idx) => {
                const isSelected = selectedIds.has(asset.id)
                const isBlank = asset.name === "[Blank QR - Ready to Register]"
                const rowNo = parseInt(asset.assetTag?.replace("AST-", "") || String((page - 1) * perPage + idx + 1), 10)

                return (
                  <tr
                    key={asset.id}
                    onClick={() => toggleSelect(asset.id)}
                    className={`border-b border-gray-800/40 cursor-pointer transition-colors ${isSelected ? "bg-teal-950/40" : "hover:bg-gray-800/40"}`}
                  >
                    <td className="p-3.5">
                      {isSelected 
                        ? <CheckSquare className="w-4 h-4 text-teal-400" /> 
                        : <Square className="w-4 h-4 text-gray-600" />
                      }
                    </td>
                    <td className="p-3.5 font-bold text-gray-400">{rowNo}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 border border-teal-800/60 font-mono font-bold text-[10px]">
                          {asset.department?.code || "DEPT"}
                        </span>
                        <span className="text-gray-300 font-semibold">{asset.department?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      {isBlank ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-400" /> Blank QR (Ready to Register)
                        </span>
                      ) : (
                        asset.name
                      )}
                    </td>
                    <td className="p-3.5 text-gray-400">{asset.brand || "—"}</td>
                    <td className="p-3.5 font-mono text-gray-300">{asset.serialNumber || "—"}</td>
                    <td className="p-3.5 text-gray-400">{asset.location?.name || "—"}</td>
                    <td className="p-3.5">
                      {isBlank ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          Unregistered
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.condition === "Good" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                          asset.condition === "Usable" ? "bg-blue-950 text-blue-400 border border-blue-800" :
                          asset.condition === "Bad" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                          "text-gray-500"
                        }`}>
                          {asset.condition || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500 font-medium">
                    No assets found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  page === p ? "bg-teal-600 text-white" : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

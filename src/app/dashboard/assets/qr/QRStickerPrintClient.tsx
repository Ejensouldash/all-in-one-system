"use client"

import { useState, useMemo } from "react"
import { AssetQRSticker } from "@/components/assets/AssetQRSticker"
import { createBlankAssetQrs } from "@/app/actions/asset"
import { MAX_BLANK_QR_BATCH_SIZE } from "@/lib/asset-constants"
import { ArrowLeft, Printer, Search, CheckSquare, Square, X, ChevronLeft, ChevronRight, Building2, Sparkles } from "lucide-react"
import Link from "next/link"

const STANDARDIZED_DEPARTMENT_CODES = [
  "BDD",
  "PRD-R",
  "PRD-P",
  "OSD",
  "MKT-A",
  "MKT-S",
  "MNT",
  "LNW",
  "KBP",
  "KAR",
  "ITD",
  "HRD",
  "HSE",
  "FIN",
  "SOD",
  "LGL",
  "PME",
  "SEC",
  "CORP",
]

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

interface DepartmentOption {
  id: string
  name: string
  code: string | null
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : ""

export function QRStickerPrintClient({ assets: initialAssets, departments: departmentOptions }: {
  assets: Asset[]
  departments: DepartmentOption[]
}) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BLANK" | "REAL">("ALL")
  const [showPreview, setShowPreview] = useState(false)
  const [blankDepartmentId, setBlankDepartmentId] = useState(
    () => departmentOptions.find(department =>
      STANDARDIZED_DEPARTMENT_CODES.includes(department.code || "")
    )?.id ?? ""
  )
  const [blankQuantity, setBlankQuantity] = useState("10")
  const [isCreatingBlanks, setIsCreatingBlanks] = useState(false)
  const [creationMessage, setCreationMessage] = useState("")
  const [creationError, setCreationError] = useState("")
  const [page, setPage] = useState(1)
  const perPage = 25

  // Collect unique departments with codes
  const departments = useMemo(() => {
    return departmentOptions.map(department => ({
      ...department,
      code: department.code || "",
    })).sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name))
  }, [departmentOptions])

  const quickSelectDepartments = useMemo(() => {
    return departments
      .filter(department => STANDARDIZED_DEPARTMENT_CODES.includes(department.code))
      .sort((a, b) =>
        STANDARDIZED_DEPARTMENT_CODES.indexOf(a.code) - STANDARDIZED_DEPARTMENT_CODES.indexOf(b.code)
      )
  }, [departments])

  const handleCreateBlankQrs = async () => {
    const quantity = Number(blankQuantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BLANK_QR_BATCH_SIZE) {
      setCreationError(`Enter a quantity between 1 and ${MAX_BLANK_QR_BATCH_SIZE}.`)
      setCreationMessage("")
      return
    }

    setIsCreatingBlanks(true)
    setCreationError("")
    setCreationMessage("")
    try {
      const result = await createBlankAssetQrs(blankDepartmentId, quantity)
      if (!result.success) {
        setCreationError(result.error)
        return
      }

      setAssets(current => [...result.assets, ...current])
      setSelectedIds(new Set(result.assets.map(asset => asset.id)))
      setTypeFilter("BLANK")
      setSearch("")
      const createdDepartment = result.assets[0]?.department
      setDeptFilter(createdDepartment?.code || createdDepartment?.name || "")
      setPage(1)
      setCreationMessage(`${result.assets.length} blank QR sticker(s) created and selected for printing.`)
    } catch (error) {
      setCreationError(error instanceof Error ? error.message : "Failed to create blank QR codes.")
    } finally {
      setIsCreatingBlanks(false)
    }
  }

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
        <div className="no-print p-4 bg-white text-slate-800 border-b border-slate-200 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <button onClick={() => setShowPreview(false)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-teal-700 transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Selection
          </button>
          <div className="text-sm text-slate-600 font-semibold">{selectedAssets.length} sticker(s) ready to print</div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-sm font-black transition-colors shadow-sm">
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/assets/list" className="text-slate-500 hover:text-teal-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">QR Sticker Batch Print</h1>
                <p className="text-xs text-slate-500 mt-0.5">Select assets or choose by department to print official 70x30mm QR stickers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 font-medium">
                <span className="text-teal-700 font-bold">{selectedIds.size}</span> selected
              </div>
              <button
                onClick={handlePrint}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Batch Print ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Create additional blank QR assets */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="mr-auto">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" /> Create Blank QR Stickers
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Generate more whenever needed. There is no overall limit; each batch can contain up to {MAX_BLANK_QR_BATCH_SIZE}.
              </p>
            </div>
            <label className="text-xs font-bold text-slate-700">
              Department
              <select
                value={blankDepartmentId}
                onChange={event => setBlankDepartmentId(event.target.value)}
                className="block mt-1 min-w-56 bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isCreatingBlanks || departments.length === 0}
              >
                <option value="">Select a department</option>
                {quickSelectDepartments.map(department => (
                  <option key={department.id} value={department.id}>
                    {department.code ? `[${department.code}] ` : ""}{department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">
              Quantity (1–{MAX_BLANK_QR_BATCH_SIZE})
              <input
                type="number"
                min={1}
                max={MAX_BLANK_QR_BATCH_SIZE}
                step={1}
                value={blankQuantity}
                onChange={event => setBlankQuantity(event.target.value)}
                className="block mt-1 w-28 bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isCreatingBlanks}
              />
            </label>
            <button
              type="button"
              onClick={handleCreateBlankQrs}
              disabled={isCreatingBlanks || !blankDepartmentId || departments.length === 0}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black transition-colors"
            >
              {isCreatingBlanks ? "Creating..." : "Create & Select"}
            </button>
          </div>
          {creationError && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{creationError}</p>}
          {creationMessage && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{creationMessage}</p>}
        </div>

        {/* Quick Select by Department */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Quick Select by Department</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectBlankQRs}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Select Blank QRs ({assets.filter(a => a.name === "[Blank QR - Ready to Register]" && (!deptFilter || a.department?.code === deptFilter)).length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickSelectDepartments.map((dept) => {
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
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={`font-mono font-black ${isCurrent ? "text-white" : "text-teal-700"}`}>{dept.code || dept.name}</span>
                  <span className="text-[11px] opacity-80">{dept.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isCurrent ? "bg-white/20" : "bg-slate-100"}`}>{count}</span>
                  {blankCount > 0 && (
                    <span className={`px-1 py-0.2 rounded-full text-[9px] font-mono ${isCurrent ? "bg-amber-400/30 text-amber-100" : "bg-amber-50 text-amber-700"}`} title={`${blankCount} Blank QRs`}>
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
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
            <button
              onClick={() => { setTypeFilter("ALL"); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "ALL" ? "bg-teal-600 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All Assets ({assets.length})
            </button>
            <button
              onClick={() => { setTypeFilter("REAL"); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                typeFilter === "REAL" ? "bg-teal-600 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Registered Only ({assets.filter(a => a.name !== "[Blank QR - Ready to Register]").length})
            </button>
            <button
              onClick={() => { setTypeFilter("BLANK"); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                typeFilter === "BLANK" ? "bg-amber-600 text-white" : "text-amber-700 hover:text-amber-800"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Blank QRs Only ({assets.filter(a => a.name === "[Blank QR - Ready to Register]").length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search item, brand, barcode, location, department..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
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
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          )}
        </div>

        {/* Select All Row */}
        <div className="flex items-center justify-between">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4 text-slate-400" />}
            Select All Filtered ({filtered.length})
          </button>
          <div className="text-xs text-slate-500 font-medium">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length} assets
          </div>
        </div>

        {/* Asset Table matching Excel Headers */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50">
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
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? "bg-teal-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="p-3.5">
                      {isSelected 
                        ? <CheckSquare className="w-4 h-4 text-teal-600" />
                        : <Square className="w-4 h-4 text-slate-300" />
                      }
                    </td>
                    <td className="p-3.5 font-bold text-slate-500">{rowNo}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100 font-mono font-bold text-[10px]">
                          {asset.department?.code || "DEPT"}
                        </span>
                        <span className="text-slate-700 font-semibold">{asset.department?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {isBlank ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-600" /> Blank QR (Ready to Register)
                        </span>
                      ) : (
                        asset.name
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600">{asset.brand || "—"}</td>
                    <td className="p-3.5 font-mono text-slate-600">{asset.serialNumber || "—"}</td>
                    <td className="p-3.5 text-slate-600">{asset.location?.name || "—"}</td>
                    <td className="p-3.5">
                      {isBlank ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Unregistered
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.condition === "Good" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          asset.condition === "Usable" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          asset.condition === "Bad" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "text-slate-500"
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
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-medium">
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
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  page === p ? "bg-teal-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

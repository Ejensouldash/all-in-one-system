"use client"

import React, { useState, useMemo } from "react"
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Save,
  CheckCircle2,
  Building,
  Award,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Phone,
} from "lucide-react"
import {
  ComparisonSupplier,
  ComparisonItemGroup,
  ComparisonQuoteCell,
  COMPARISON_STATUS_CONFIG,
} from "./comparison-constants"
import { exportPriceComparisonToExcel } from "@/lib/procurement-comparison-excel"

function generateRandomId(prefix: string = "id"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`
}

export interface RegisteredSupplierItem {
  id: string
  name: string
  terms?: string | null
  phone?: string | null
}

export interface ComparisonInitialData {
  id?: string
  title?: string
  referenceNo?: string
  company?: string
  department?: string
  status?: string
  awardedSupplier?: string | null
  justification?: string | null
  notes?: string | null
  suppliersData?: ComparisonSupplier[]
  itemsData?: ComparisonItemGroup[]
}

interface ComparisonMatrixTableProps {
  initialComparison: ComparisonInitialData
  allRegisteredSuppliers: RegisteredSupplierItem[]
  onSave: (updatedData: Record<string, unknown>) => Promise<boolean>
  readOnly?: boolean
}

export function ComparisonMatrixTable({
  initialComparison,
  allRegisteredSuppliers,
  onSave,
  readOnly = false,
}: ComparisonMatrixTableProps) {
  const [title, setTitle] = useState(initialComparison.title || "")
  const referenceNo = initialComparison.referenceNo || ""
  const [company, setCompany] = useState(initialComparison.company || "BOSB")
  const [department, setDepartment] = useState(initialComparison.department || "Purchasing")
  const [status, setStatus] = useState(initialComparison.status || "DRAFT")
  const [awardedSupplier, setAwardedSupplier] = useState<string | null>(
    initialComparison.awardedSupplier || null
  )
  const [justification, setJustification] = useState(initialComparison.justification || "")
  const [notes, setNotes] = useState(initialComparison.notes || "")

  const [suppliers, setSuppliers] = useState<ComparisonSupplier[]>(
    Array.isArray(initialComparison.suppliersData) && initialComparison.suppliersData.length > 0
      ? initialComparison.suppliersData
      : []
  )

  const [items, setItems] = useState<ComparisonItemGroup[]>(
    Array.isArray(initialComparison.itemsData) && initialComparison.itemsData.length > 0
      ? initialComparison.itemsData
      : []
  )

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  // Modal / Dropdown state for adding supplier
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)
  const [newSupName, setNewSupName] = useState("")
  const [newSupTerms, setNewSupTerms] = useState("30 Days")
  const [newSupLeadTime, setNewSupLeadTime] = useState("Ex-stock")
  const [newSupPhone, setNewSupPhone] = useState("")

  // Calculate Grand Totals per Supplier
  const supplierGrandTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    suppliers.forEach((s) => {
      totals[s.id] = 0
    })

    items.forEach((group) => {
      group.rows.forEach((row) => {
        suppliers.forEach((sup) => {
          const q = row.quotes?.[sup.id]
          if (q && q.unitPrice !== null && q.unitPrice !== undefined && !q.isIncluded) {
            totals[sup.id] += Number(q.unitPrice)
          }
        })
      })
    })

    return totals
  }, [suppliers, items])

  // Find lowest total supplier (for best price indicator)
  const bestPriceSupplierId = useMemo(() => {
    let minId: string | null = null
    let minTotal = Infinity
    Object.entries(supplierGrandTotals).forEach(([supId, total]) => {
      if (total > 0 && total < minTotal) {
        minTotal = total
        minId = supId
      }
    })
    return minId
  }, [supplierGrandTotals])

  // Calculate Item Group Subtotals
  const getItemSubtotal = (group: ComparisonItemGroup, supplierId: string) => {
    let subtotal = 0
    let hasQuote = false
    let allIncluded = true

    group.rows.forEach((r) => {
      const q = r.quotes?.[supplierId]
      if (q) {
        hasQuote = true
        if (q.unitPrice !== null && q.unitPrice !== undefined && !q.isIncluded) {
          subtotal += Number(q.unitPrice)
          allIncluded = false
        }
      }
    })

    if (!hasQuote) return null
    if (subtotal === 0 && allIncluded) return "INCLUDE"
    return subtotal
  }

  // --- Handlers: Suppliers ---
  const handleAddSupplier = () => {
    if (!newSupName.trim()) return
    const id = generateRandomId("sup")
    const newSup: ComparisonSupplier = {
      id,
      name: newSupName.trim(),
      paymentTerms: newSupTerms.trim() || "30 Days",
      leadTime: newSupLeadTime.trim() || "Ex-stock",
      phone: newSupPhone.trim() || undefined,
    }

    setSuppliers([...suppliers, newSup])
    setNewSupName("")
    setNewSupTerms("30 Days")
    setNewSupLeadTime("Ex-stock")
    setNewSupPhone("")
    setIsAddSupplierOpen(false)
  }

  const handleSelectExistingSupplier = (sup: RegisteredSupplierItem) => {
    const id = generateRandomId("sup")
    const newSup: ComparisonSupplier = {
      id,
      name: sup.name,
      supplierId: sup.id,
      paymentTerms: sup.terms ? sup.terms.replace(/_/g, " ") : "30 Days",
      leadTime: "Ex-stock",
      phone: sup.phone || undefined,
    }
    setSuppliers([...suppliers, newSup])
    setIsAddSupplierOpen(false)
  }

  const handleRemoveSupplier = (id: string) => {
    if (confirm("Remove this supplier column from comparison?")) {
      setSuppliers(suppliers.filter((s) => s.id !== id))
      if (awardedSupplier === id) setAwardedSupplier(null)
    }
  }

  const handleUpdateSupplierField = (
    id: string,
    field: "name" | "paymentTerms" | "leadTime" | "phone",
    val: string
  ) => {
    setSuppliers(
      suppliers.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    )
  }

  // --- Handlers: Items & Rows ---
  const handleAddItemGroup = () => {
    const newIndex = items.length + 1
    const newRowId = "row_" + newIndex + "_1"

    const initialQuotes: Record<string, ComparisonQuoteCell> = {}
    suppliers.forEach((s) => {
      initialQuotes[s.id] = { description: "", unitPrice: null, isIncluded: false }
    })

    const newGroup: ComparisonItemGroup = {
      itemIndex: newIndex,
      groupTitle: `Item ${newIndex}`,
      rows: [{ rowId: newRowId, quotes: initialQuotes }],
    }

    setItems([...items, newGroup])
  }

  const handleAddRowToGroup = (groupIndex: number) => {
    const updated = [...items]
    const group = updated[groupIndex]
    const newRowId = `row_${group.itemIndex}_${group.rows.length + 1}`

    const initialQuotes: Record<string, ComparisonQuoteCell> = {}
    suppliers.forEach((s) => {
      initialQuotes[s.id] = { description: "", unitPrice: null, isIncluded: false }
    })

    group.rows.push({ rowId: newRowId, quotes: initialQuotes })
    setItems(updated)
  }

  const handleRemoveRowFromGroup = (groupIndex: number, rowIndex: number) => {
    const updated = [...items]
    const group = updated[groupIndex]
    if (group.rows.length === 1) {
      // If last row, remove entire item group
      updated.splice(groupIndex, 1)
      // Re-index
      updated.forEach((g, idx) => {
        g.itemIndex = idx + 1
      })
    } else {
      group.rows.splice(rowIndex, 1)
    }
    setItems(updated)
  }

  const handleRemoveItemGroup = (groupIndex: number) => {
    if (confirm(`Remove Item ${items[groupIndex].itemIndex}?`)) {
      const updated = items.filter((_, idx) => idx !== groupIndex)
      updated.forEach((g, idx) => {
        g.itemIndex = idx + 1
      })
      setItems(updated)
    }
  }

  const handleUpdateQuoteCell = (
    groupIndex: number,
    rowIndex: number,
    supplierId: string,
    field: "description" | "unitPrice" | "isIncluded",
    val: string | number | boolean | null
  ) => {
    const updated = [...items]
    const row = updated[groupIndex].rows[rowIndex]
    if (!row.quotes) row.quotes = {}
    if (!row.quotes[supplierId]) {
      row.quotes[supplierId] = { description: "", unitPrice: null, isIncluded: false }
    }

    if (field === "isIncluded") {
      const isInc = Boolean(val)
      row.quotes[supplierId].isIncluded = isInc
      if (isInc) {
        row.quotes[supplierId].unitPrice = null
      }
    } else if (field === "unitPrice") {
      row.quotes[supplierId].unitPrice = val !== "" && !isNaN(Number(val)) ? Number(val) : null
      if (val !== "") {
        row.quotes[supplierId].isIncluded = false
      }
    } else {
      row.quotes[supplierId].description = String(val ?? "")
    }

    setItems(updated)
  }

  // --- Handlers: Save & Export ---
  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)
    try {
      const ok = await onSave({
        title,
        referenceNo,
        company,
        department,
        status,
        suppliersData: suppliers,
        itemsData: items,
        awardedSupplier,
        justification,
        notes,
      })
      if (ok) {
        setSaveMessage({ type: "success", text: "Price comparison saved successfully!" })
        setTimeout(() => setSaveMessage(null), 3500)
      } else {
        setSaveMessage({ type: "error", text: "Failed to save price comparison." })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save."
      setSaveMessage({ type: "error", text: msg })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = () => {
    exportPriceComparisonToExcel({
      title,
      referenceNo,
      company,
      department,
      suppliersData: suppliers,
      itemsData: items,
    })
  }

  const statusConfig = COMPARISON_STATUS_CONFIG[status] || COMPARISON_STATUS_CONFIG.DRAFT

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                {referenceNo || "PC-XXXX"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusConfig.dotClass}`} />
                {statusConfig.label}
              </span>
            </div>
            <input
              type="text"
              value={title}
              disabled={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Safety Valves & Pressure Gauges Price Comparison"
              className="text-xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-all w-full max-w-xl py-0.5"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!readOnly && (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none transition-all"
              >
                {Object.entries(COMPARISON_STATUS_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    Status: {cfg.label}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleExport}
              disabled={suppliers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
              title="Download Excel spreadsheet matching template"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>

            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Comparison"}
              </button>
            )}
          </div>
        </div>

        {/* Status Message */}
        {saveMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              saveMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        {/* Metadata Fields: Company & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Company</label>
            <input
              type="text"
              value={company}
              disabled={readOnly}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Department</label>
            <input
              type="text"
              value={department}
              disabled={readOnly}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full mt-1 px-3 py-1.5 font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Awarded Supplier</label>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={awardedSupplier || ""}
                disabled={readOnly}
                onChange={(e) => setAwardedSupplier(e.target.value || null)}
                className="w-full px-3 py-1.5 font-medium bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs"
              >
                <option value="">-- No Supplier Awarded Yet --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (RM {(supplierGrandTotals[s.id] || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* If awarded supplier is not in directory, show helper card */}
            {(() => {
              const awardedSup = suppliers.find((s) => s.id === awardedSupplier)
              const isAwardedNewVendor = Boolean(
                awardedSup &&
                (!awardedSup.supplierId ||
                  !allRegisteredSuppliers.some(
                    (s) => s.id === awardedSup.supplierId || s.name.toLowerCase() === awardedSup.name.toLowerCase()
                  ))
              )

              if (!isAwardedNewVendor || !awardedSup) return null

              return (
                <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between text-blue-900 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      New Vendor: &ldquo;{awardedSup.name}&rdquo;
                    </span>
                    <span className="text-[10px] text-blue-600 font-medium">Will be added to Supplier Directory upon save</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Payment Terms
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={awardedSup.paymentTerms || ""}
                        onChange={(e) => handleUpdateSupplierField(awardedSup.id, "paymentTerms", e.target.value)}
                        placeholder="e.g. 30 Days / COD / Cash"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={awardedSup.phone || ""}
                        onChange={(e) => handleUpdateSupplierField(awardedSup.id, "phone", e.target.value)}
                        placeholder="e.g. 012-3456789"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Spreadsheet Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Comparison Matrix
          </span>
          <span className="text-xs text-slate-400">
            ({suppliers.length} Suppliers, {items.length} Item Groups)
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Supplier Column
            </button>

            <button
              onClick={handleAddItemGroup}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item Group
            </button>
          </div>
        )}
      </div>

      {/* Add Supplier Modal / Drawer */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Add Supplier to Comparison
              </h3>
              <button
                onClick={() => setIsAddSupplierOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Pick from Registered Suppliers */}
            {allRegisteredSuppliers.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-600">Pick From Registered Suppliers</label>
                <div className="mt-1.5 max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {allRegisteredSuppliers.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectExistingSupplier(s)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex items-center justify-between group transition-colors"
                    >
                      <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {s.terms ? s.terms.replace(/_/g, " ") : "Standard"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
                Or Custom Company
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Company / Supplier Name</label>
                <input
                  type="text"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. VD VALVE SDN BHD"
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Payment Terms</label>
                  <input
                    type="text"
                    value={newSupTerms}
                    onChange={(e) => setNewSupTerms(e.target.value)}
                    placeholder="e.g. As Usual / Cash"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Lead Time</label>
                  <input
                    type="text"
                    value={newSupLeadTime}
                    onChange={(e) => setNewSupLeadTime(e.target.value)}
                    placeholder="e.g. Ex-stock / 2 Weeks"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  placeholder="e.g. +6012-345 6789"
                  className="w-full mt-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  If this supplier is selected as the <strong>Awarded Vendor</strong>, they will be automatically registered into the <strong>Supplier Directory</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddSupplierOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSupplier}
                disabled={!newSupName.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet / Matrix Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="table-fixed border-collapse text-xs"
            style={{ width: `${48 + suppliers.length * (180 + 112 + 96)}px` }}
          >
            <colgroup>
              <col style={{ width: 48 }} />
              {suppliers.map((sup) => (
                <React.Fragment key={sup.id}>
                  <col style={{ width: 180 }} />
                  <col style={{ width: 112 }} />
                  <col style={{ width: 96 }} />
                </React.Fragment>
              ))}
            </colgroup>
            {/* Super Header: "SUPPLIER" */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                <th className="p-2.5 w-12 text-center font-bold border-r border-slate-200">#</th>
                <th
                  colSpan={suppliers.length * 3}
                  className="p-2 text-center font-extrabold uppercase tracking-widest text-slate-700 bg-slate-100"
                >
                  SUPPLIER
                </th>
              </tr>

              {/* Supplier Names Header Row */}
              <tr className="bg-sky-50/60 border-b border-slate-200">
                <th className="p-2 text-center text-slate-400 font-bold border-r border-slate-200">
                  ITEM
                </th>
                {suppliers.map((sup) => {
                  const isAwarded = awardedSupplier === sup.id
                  const isBest = bestPriceSupplierId === sup.id
                  return (
                    <th
                      key={sup.id}
                      colSpan={3}
                      className={`p-2.5 text-center border-r border-slate-200 transition-colors ${
                        isAwarded
                          ? "bg-emerald-100/70 border-emerald-300"
                          : "bg-sky-50/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 px-1">
                        <div className="text-left">
                          <input
                            type="text"
                            value={sup.name}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateSupplierField(sup.id, "name", e.target.value)
                            }
                            className="font-extrabold text-slate-900 bg-transparent hover:bg-white/80 focus:bg-white px-1.5 py-0.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase tracking-wide"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {isAwarded && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                              <Award className="w-3 h-3" /> Awarded
                            </span>
                          )}
                          {isBest && !isAwarded && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                              Lowest
                            </span>
                          )}
                          {!readOnly && (
                            <button
                              onClick={() => handleRemoveSupplier(sup.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Delete supplier column"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>

              {/* Sub-headers: DESCRIPTION | UNIT PRICE | TOTAL */}
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                <th className="p-2 border-r border-slate-200"></th>
                {suppliers.map((sup) => (
                  <React.Fragment key={sup.id}>
                    <th className="p-2 border-r border-slate-200 text-left min-w-[180px]">
                      DESCRIPTION
                    </th>
                    <th className="p-2 border-r border-slate-200 text-center w-28">
                      UNIT PRICE
                    </th>
                    <th className="p-2 border-r border-slate-200 text-right w-24 bg-slate-100/50">
                      TOTAL
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Table Body: Items and Sub-rows */}
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + suppliers.length * 3}
                    className="p-8 text-center text-slate-400 italic"
                  >
                    No items added yet. Click &quot;Add Item Group&quot; to begin price comparison.
                  </td>
                </tr>
              ) : (
                items.map((group, groupIdx) => {
                  const numRows = group.rows.length
                  return (
                    <React.Fragment key={group.itemIndex}>
                      {group.rows.map((row, rowIdx) => {
                        return (
                          <tr
                            key={row.rowId}
                            className={`border-b border-slate-200 hover:bg-slate-50/50 transition-colors ${
                              rowIdx === numRows - 1 ? "border-b-2 border-slate-300" : ""
                            }`}
                          >
                            {/* Col 1: Item Index (Merged vertically across all rows in the group) */}
                            {rowIdx === 0 && (
                              <td
                                rowSpan={numRows}
                                className="p-2 text-center font-bold text-slate-700 bg-slate-50/70 border-r border-slate-200 align-middle"
                              >
                                <div className="flex flex-col items-center gap-1.5">
                                  <span className="text-sm font-extrabold">{group.itemIndex}</span>
                                  {!readOnly && (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        onClick={() => handleAddRowToGroup(groupIdx)}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                                        title="Add sub-row (e.g. Calibration Cert)"
                                      >
                                        + Sub
                                      </button>
                                      {numRows > 1 && (
                                        <button
                                          onClick={() => handleRemoveRowFromGroup(groupIdx, numRows - 1)}
                                          className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold"
                                          title="Remove last sub-row"
                                        >
                                          - Sub
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleRemoveItemGroup(groupIdx)}
                                        className="text-[10px] p-0.5 text-slate-300 hover:text-rose-600"
                                        title="Delete this entire item group"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Supplier Cells */}
                            {suppliers.map((sup) => {
                              const quote = row.quotes?.[sup.id] || {
                                description: "",
                                unitPrice: null,
                                isIncluded: false,
                              }

                              const isInc = Boolean(quote.isIncluded)
                              const itemSubtotal = getItemSubtotal(group, sup.id)

                              return (
                                <React.Fragment key={sup.id}>
                                  {/* Description Cell */}
                                  <td className="p-1.5 border-r border-slate-200 align-middle">
                                    <input
                                      type="text"
                                      value={quote.description || ""}
                                      disabled={readOnly}
                                      onChange={(e) =>
                                        handleUpdateQuoteCell(
                                          groupIdx,
                                          rowIdx,
                                          sup.id,
                                          "description",
                                          e.target.value
                                        )
                                      }
                                      placeholder="e.g. PRESSURE GAUGE..."
                                      className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800 text-xs uppercase"
                                    />
                                  </td>

                                  {/* Unit Price Cell with 'INCLUDE' Toggle */}
                                  <td className="p-1.5 border-r border-slate-200 align-middle text-center">
                                    <div className="flex items-center gap-1">
                                      {isInc ? (
                                        <div
                                          onClick={() =>
                                            !readOnly &&
                                            handleUpdateQuoteCell(
                                              groupIdx,
                                              rowIdx,
                                              sup.id,
                                              "isIncluded",
                                              false
                                            )
                                          }
                                          className={`w-full py-1 px-2 text-center text-xs font-black uppercase tracking-wider bg-yellow-300 text-yellow-950 rounded border border-yellow-400 cursor-pointer shadow-xs ${
                                            readOnly ? "cursor-default" : "hover:bg-yellow-400"
                                          }`}
                                          title="Click to switch back to numeric price"
                                        >
                                          INCLUDE
                                        </div>
                                      ) : (
                                        <div className="relative flex-1">
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={
                                              quote.unitPrice !== null && quote.unitPrice !== undefined
                                                ? quote.unitPrice
                                                : ""
                                            }
                                            disabled={readOnly}
                                            onChange={(e) =>
                                              handleUpdateQuoteCell(
                                                groupIdx,
                                                rowIdx,
                                                sup.id,
                                                "unitPrice",
                                                e.target.value
                                              )
                                            }
                                            placeholder="0.00"
                                            className="w-full text-right pr-1.5 pl-1 py-1 bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none text-slate-800 font-mono text-xs"
                                          />
                                        </div>
                                      )}

                                      {!readOnly && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleUpdateQuoteCell(
                                              groupIdx,
                                              rowIdx,
                                              sup.id,
                                              "isIncluded",
                                              !isInc
                                            )
                                          }
                                          className={`px-1 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                                            isInc
                                              ? "bg-slate-100 text-slate-600 border-slate-300"
                                              : "bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border-yellow-300"
                                          }`}
                                          title={isInc ? "Switch to numeric" : "Mark as Included"}
                                        >
                                          {isInc ? "RM" : "Inc"}
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  {/* TOTAL Cell (Merged vertically across all rows in the group for this supplier) */}
                                  {rowIdx === 0 && (
                                    <td
                                      rowSpan={numRows}
                                      className="p-2 border-r border-slate-200 text-right font-bold text-slate-800 bg-slate-50/40 align-middle font-mono text-xs"
                                    >
                                      {itemSubtotal === "INCLUDE" ? (
                                        <span className="text-[10px] bg-yellow-200 text-yellow-900 px-1.5 py-0.5 rounded font-bold">
                                          INCLUDE
                                        </span>
                                      ) : itemSubtotal !== null ? (
                                        `RM ${Number(itemSubtotal).toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                        })}`
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  )}
                                </React.Fragment>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })
              )}

              {/* Grand Total Row */}
              <tr className="bg-slate-100/80 border-t-2 border-b-2 border-slate-300 font-bold">
                <td className="p-3 text-center text-slate-600 font-extrabold border-r border-slate-300">
                  TOTAL
                </td>
                {suppliers.map((sup) => {
                  const grandTotal = supplierGrandTotals[sup.id] || 0
                  const isAwarded = awardedSupplier === sup.id
                  const isBest = bestPriceSupplierId === sup.id

                  return (
                    <React.Fragment key={sup.id}>
                      <td
                        colSpan={2}
                        className="p-3 text-right text-slate-600 uppercase text-[11px] font-extrabold border-r border-slate-200"
                      >
                        Grand Total:
                      </td>
                      <td
                        className={`p-3 text-right font-black font-mono text-sm border-r border-slate-300 ${
                          isAwarded
                            ? "bg-emerald-100 text-emerald-900"
                            : isBest
                            ? "bg-blue-100 text-blue-900"
                            : "bg-slate-200/60 text-slate-900"
                        }`}
                      >
                        RM {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </React.Fragment>
                  )
                })}
              </tr>

              {/* Spacer Row */}
              <tr className="bg-slate-50/50">
                <td colSpan={1 + suppliers.length * 3} className="h-4 border-b border-slate-200"></td>
              </tr>

              {/* Payment Terms Row */}
              <tr className="border-b border-slate-200 bg-white">
                <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200 text-[10px]">
                  TERMS
                </td>
                {suppliers.map((sup) => (
                  <td
                    key={sup.id}
                    colSpan={3}
                    className="p-2.5 border-r border-slate-200 align-middle"
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-bold text-slate-500 whitespace-nowrap">Payment Terms:</span>
                      <input
                        type="text"
                        value={sup.paymentTerms || ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          handleUpdateSupplierField(sup.id, "paymentTerms", e.target.value)
                        }
                        placeholder="e.g. As Usual / Cash / 30 Days"
                        className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 text-xs focus:bg-white"
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Lead Time / Delivery Row */}
              <tr className="border-b border-slate-200 bg-white">
                <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200 text-[10px]">
                  LEAD TIME
                </td>
                {suppliers.map((sup) => (
                  <td
                    key={sup.id}
                    colSpan={3}
                    className="p-2.5 border-r border-slate-200 align-middle"
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-bold text-slate-500 whitespace-nowrap">Lead Time:</span>
                      <input
                        type="text"
                        value={sup.leadTime || ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          handleUpdateSupplierField(sup.id, "leadTime", e.target.value)
                        }
                        placeholder="e.g. Ex-stock / 2 Weeks"
                        className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 text-xs focus:bg-white"
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Phone Number Row */}
              <tr className="border-b border-slate-200 bg-white">
                <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200 text-[10px]">
                  PHONE
                </td>
                {suppliers.map((sup) => (
                  <td
                    key={sup.id}
                    colSpan={3}
                    className="p-2.5 border-r border-slate-200 align-middle"
                  >
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-bold text-slate-500 whitespace-nowrap">Phone:</span>
                      <input
                        type="tel"
                        value={sup.phone || ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          handleUpdateSupplierField(sup.id, "phone", e.target.value)
                        }
                        placeholder="e.g. +6012-345 6789 (Optional)"
                        className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 text-xs focus:bg-white"
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Award Action Row */}
              {!readOnly && (
                <tr className="bg-slate-50 border-b border-slate-200">
                  <td className="p-2 text-center text-slate-400 font-bold border-r border-slate-200">
                    AWARD
                  </td>
                  {suppliers.map((sup) => {
                    const isAwarded = awardedSupplier === sup.id
                    return (
                      <td
                        key={sup.id}
                        colSpan={3}
                        className="p-2 text-center border-r border-slate-200"
                      >
                        <button
                          type="button"
                          onClick={() => setAwardedSupplier(isAwarded ? null : sup.id)}
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            isAwarded
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          {isAwarded ? "Selected Vendor" : "Award to This Vendor"}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Justification & Notes Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          Decision Justification & Remarks
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Selection Justification (Why this supplier was chosen)
            </label>
            <textarea
              rows={3}
              value={justification}
              disabled={readOnly}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Selected VD Valve due to fastest lead time (Ex-stock) and lowest bundled price for safety valves..."
              className="w-full mt-1.5 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Internal Remarks / Notes</label>
            <textarea
              rows={3}
              value={notes}
              disabled={readOnly}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Price valid until end of month. Calibration certificates required upon delivery..."
              className="w-full mt-1.5 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

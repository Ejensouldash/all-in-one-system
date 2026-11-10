"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Building,
  Calendar,
  X,
  SlidersHorizontal,
  ChevronDown,
  DollarSign,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Briefcase,
} from "lucide-react"
import { ProcurementNavTabs } from "@/components/procurement/ProcurementNavTabs"
import { PurchaseTable } from "@/components/procurement/PurchaseTable"
import { PurchaseModal } from "@/components/procurement/PurchaseModal"
import {
  getPurchases,
  getPurchaseSummary,
  getSuppliers,
  deletePurchase,
} from "@/app/actions/procurement"
import {
  COMPANY_OPTIONS,
  DEPARTMENT_OPTIONS,
} from "@/components/procurement/procurement-constants"
import * as XLSX from "xlsx"

export default function ProcurementPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL")
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("ALL")
  const [datePreset, setDatePreset] = useState("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Load registered suppliers for dropdown
  useEffect(() => {
    getSuppliers({ activeOnly: true })
      .then((data) => setSuppliers(data))
      .catch((err) => console.error("Error loading suppliers:", err))
  }, [])

  // Load summary metrics
  const loadSummary = useCallback(async () => {
    try {
      const sum = await getPurchaseSummary()
      setSummary(sum)
    } catch (err) {
      console.error("Error loading purchase summary:", err)
    }
  }, [])

  // Load purchases list
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPurchases({
        search: search.trim() || undefined,
        company: selectedCompany !== "ALL" ? selectedCompany : undefined,
        department: selectedDepartment !== "ALL" ? selectedDepartment : undefined,
        supplierId: selectedSupplierId !== "ALL" ? selectedSupplierId : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      setPurchases(data)
      loadSummary()
    } catch (err: any) {
      console.error("Error loading purchases:", err)
      setFeedback({ type: "error", text: err.message || "Failed to load purchases." })
    } finally {
      setLoading(false)
    }
  }, [search, selectedCompany, selectedDepartment, selectedSupplierId, startDate, endDate, loadSummary])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(t)
    }
  }, [feedback])

  // Handle Quick Date Presets
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset)
    const now = new Date()

    if (preset === "ALL") {
      setStartDate("")
      setEndDate("")
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      setStartDate(firstDay.toISOString().split("T")[0])
      setEndDate(lastDay.toISOString().split("T")[0])
    } else if (preset === "LAST_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
      setStartDate(firstDay.toISOString().split("T")[0])
      setEndDate(lastDay.toISOString().split("T")[0])
    } else if (preset === "THIS_YEAR") {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      setStartDate(firstDay.toISOString().split("T")[0])
      setEndDate(lastDay.toISOString().split("T")[0])
    }
  }

  const handleOpenAdd = () => {
    setEditingPurchase(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (record: any) => {
    setEditingPurchase(record)
    setIsModalOpen(true)
  }

  const handleDeleteRequest = (id: string, name: string) => {
    setDeleteConfirmation({ id, name })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return
    const { id, name } = deleteConfirmation
    setDeletingId(id)
    setDeleteConfirmation(null)

    try {
      const res = await deletePurchase(id)
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Purchase item "${name}" was successfully deleted.`,
        })
        loadData()
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to delete purchase." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to delete purchase." })
    } finally {
      setDeletingId(null)
    }
  }

  // Live filtered sum
  const filteredTotalSpend = useMemo(() => {
    return purchases.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  }, [purchases])

  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (purchases.length === 0) {
      alert("No purchases to export.")
      return
    }

    const dataToExport = purchases.map((p, idx) => ({
      No: idx + 1,
      "Date of Purchase": p.purchaseDate ? new Date(p.purchaseDate).toISOString().split("T")[0] : "",
      Company: (p.company || "").toUpperCase(),
      Department: p.department || "",
      "Description of Item": p.itemDescription || "",
      Supplier: p.supplierName || "",
      Quantity: Number(p.quantity) || 0,
      UOM: p.uom || "PCS",
      "Unit Price (RM)": Number(p.unitPrice) || 0,
      "Total (RM)": Number(p.total) || 0,
      Remarks: p.remarks || "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases")

    // Auto-fit column widths
    const maxCols = Object.keys(dataToExport[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14),
    }))
    worksheet["!cols"] = maxCols

    const dateStr = new Date().toISOString().split("T")[0]
    const compTag = selectedCompany !== "ALL" ? `_${selectedCompany}` : ""
    XLSX.writeFile(workbook, `Purchases_Report${compTag}_${dateStr}.xlsx`)
  }

  const activeFiltersCount =
    (selectedCompany !== "ALL" ? 1 : 0) +
    (selectedDepartment !== "ALL" ? 1 : 0) +
    (selectedSupplierId !== "ALL" ? 1 : 0) +
    (datePreset !== "ALL" || startDate || endDate ? 1 : 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Procurement Navigation Tabs */}
      <ProcurementNavTabs />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Purchases
            </h1>
            <p className="text-xs text-slate-500">
              Procurement purchase records & tracking across companies (BOSB, BOMSB, NRHO, BODG) and departments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 rounded-xl transition-colors flex items-center gap-1.5"
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Purchase</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI Cards (Clean 2-card layout without the removed KBP/KAR cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Purchases */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Purchases
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              RM {formatCurrency(summary?.totalAmount ?? 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {summary?.totalCount ?? 0} total purchase items recorded
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>

        {/* Filtered Total */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Filtered Total
            </span>
            <div className="text-3xl font-black text-white tracking-tight">
              RM {formatCurrency(filteredTotalSpend)}
            </div>
            <div className="text-xs text-slate-300 font-medium">
              {purchases.length} matching purchase records
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/10">
            <Layers className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, supplier, department, or remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Company Buttons: All, BOSB, BOMSB, NRHO, BODG */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCompany("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCompany === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Companies
            </button>
            {COMPANY_OPTIONS.map((comp) => (
              <button
                key={comp}
                type="button"
                onClick={() => setSelectedCompany(comp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCompany === comp
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {comp}
              </button>
            ))}
          </div>

          {/* Advanced Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors shrink-0 ${
              isFilterOpen || activeFiltersCount > 0
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Expandable Filters Panel */}
        {isFilterOpen && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 animate-fade-in">
            {/* Department Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Filter */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                Supplier
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Presets & Inputs */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Date Range Presets
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: "All Dates" },
                  { id: "THIS_MONTH", label: "This Month" },
                  { id: "LAST_MONTH", label: "Last Month" },
                  { id: "THIS_YEAR", label: "This Year" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePresetChange(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      datePreset === p.id
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setDatePreset("CUSTOM")
                  }}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setDatePreset("CUSTOM")
                  }}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("")
                      setEndDate("")
                      setDatePreset("ALL")
                    }}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <PurchaseTable
        purchases={purchases}
        loading={loading}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteRequest}
        deletingId={deletingId}
      />

      {/* Add / Edit Modal */}
      <PurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setFeedback({
            type: "success",
            text: editingPurchase
              ? "Purchase record updated successfully!"
              : "New purchase record created successfully!",
          })
          loadData()
        }}
        purchase={editingPurchase}
        suppliers={suppliers}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Purchase Record
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the purchase for{" "}
              <strong className="text-slate-900">&quot;{deleteConfirmation.name}&quot;</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 transition-all"
              >
                Delete Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

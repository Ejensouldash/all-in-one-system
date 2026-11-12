"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Building,
  Calendar,
  Layers,
  Send,
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react"
import {
  ProcurementInvoiceCategory,
  ProcurementInvoiceStatus,
} from "@prisma/client"
import {
  getInvoices,
  getProcurementSummary,
  getProcurementUserRole,
  getSuppliers,
  deleteInvoice,
} from "@/app/actions/procurement"

import { InvoiceTable } from "@/components/procurement/InvoiceTable"
import { ProcurementNavTabs } from "@/components/procurement/ProcurementNavTabs"
import { NewInvoiceModal } from "@/components/procurement/NewInvoiceModal"
import { InvoiceDetailModal } from "@/components/procurement/InvoiceDetailModal"
import {
  COMPANY_OPTIONS,
  DEPARTMENT_OPTIONS,
  INVOICE_STATUS_CONFIG,
  INVOICE_CATEGORY_CONFIG,
  PAYMENT_TERMS_CONFIG,
} from "@/components/procurement/procurement-constants"
import { exportProcurementInvoicesToExcel } from "@/lib/procurement-excel"

type TabType = "ALL" | ProcurementInvoiceCategory

export default function ProcurementInvoicesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("ALL")
  const [invoices, setInvoices] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [userRole, setUserRole] = useState<any>(null)

  // Filter Drawer / Advanced Toggle
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Filter States
  const [search, setSearch] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const [selectedDepartment, setSelectedDepartment] = useState("ALL")
  const [selectedSupplierId, setSelectedSupplierId] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [dateType, setDateType] = useState<"submitDate" | "invoiceDate" | "dueDate" | "paidAt">("submitDate")
  const [datePreset, setDatePreset] = useState("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [doFilter, setDoFilter] = useState("ALL")
  const [originalInvFilter, setOriginalInvFilter] = useState("ALL")

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // Load suppliers for dropdown filter
  useEffect(() => {
    getSuppliers({ activeOnly: true })
      .then((data) => setSuppliers(data))
      .catch((err) => console.error("Error loading suppliers for filter:", err))
  }, [])

  // Handle Date Presets
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
    } else if (preset === "THIS_QUARTER") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3
      const firstDay = new Date(now.getFullYear(), qMonth, 1)
      const lastDay = new Date(now.getFullYear(), qMonth + 3, 0)
      setStartDate(firstDay.toISOString().split("T")[0])
      setEndDate(lastDay.toISOString().split("T")[0])
    } else if (preset === "THIS_YEAR") {
      const firstDay = new Date(now.getFullYear(), 0, 1)
      const lastDay = new Date(now.getFullYear(), 11, 31)
      setStartDate(firstDay.toISOString().split("T")[0])
      setEndDate(lastDay.toISOString().split("T")[0])
    }
  }

  const handleResetFilters = () => {
    setSearch("")
    setSelectedCompany("ALL")
    setSelectedDepartment("ALL")
    setSelectedSupplierId("ALL")
    setSelectedStatus("ALL")
    setDateType("submitDate")
    setDatePreset("ALL")
    setStartDate("")
    setEndDate("")
    setDoFilter("ALL")
    setOriginalInvFilter("ALL")
  }

  // Count active filters (excluding tab)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (selectedCompany !== "ALL") count++
    if (selectedDepartment !== "ALL") count++
    if (selectedSupplierId !== "ALL") count++
    if (selectedStatus !== "ALL") count++
    if (startDate || endDate) count++
    if (doFilter !== "ALL") count++
    if (originalInvFilter !== "ALL") count++
    return count
  }, [
    search,
    selectedCompany,
    selectedDepartment,
    selectedSupplierId,
    selectedStatus,
    startDate,
    endDate,
    doFilter,
    originalInvFilter,
  ])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [invData, sumData, roleData] = await Promise.all([
        getInvoices({
          category: activeTab !== "ALL" ? (activeTab as ProcurementInvoiceCategory) : undefined,
          status: selectedStatus !== "ALL" ? (selectedStatus as ProcurementInvoiceStatus) : undefined,
          company: selectedCompany !== "ALL" ? selectedCompany : undefined,
          department: selectedDepartment !== "ALL" ? selectedDepartment : undefined,
          supplierId: selectedSupplierId !== "ALL" ? selectedSupplierId : undefined,
          dateType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          doReceived: doFilter !== "ALL" ? doFilter === "YES" : undefined,
          originalInvoiceReceived: originalInvFilter !== "ALL" ? originalInvFilter === "YES" : undefined,
          search: search.trim() || undefined,
        }),
        getProcurementSummary(),
        getProcurementUserRole(),
      ])

      setInvoices(invData)
      setSummary(sumData)
      setUserRole(roleData)
    } catch (err) {
      console.error("Failed to load procurement invoices:", err)
    } finally {
      setLoading(false)
    }
  }, [
    activeTab,
    selectedStatus,
    selectedCompany,
    selectedDepartment,
    selectedSupplierId,
    dateType,
    startDate,
    endDate,
    doFilter,
    originalInvFilter,
    search,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenDetail = (inv: any) => {
    setSelectedInvoice(inv)
    setIsDetailModalOpen(true)
  }

  const handleEditInvoice = (inv: any) => {
    setEditingInvoice(inv)
    setIsNewModalOpen(true)
  }

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!confirm(`Are you sure you want to delete submission "${invoiceNumber}"? This action cannot be undone.`)) {
      return
    }
    try {
      const res = await deleteInvoice(id)
      if (res.success) {
        loadData()
      } else {
        alert(res.error || "Failed to delete submission.")
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete submission.")
    }
  }

  // Compute live totals for filtered records
  const filteredTotalAmount = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)
  }, [invoices])

  const handleExport = () => {
    let prefix = "Procurement_Report"
    if (selectedCompany !== "ALL") prefix += `_${selectedCompany}`
    if (selectedStatus !== "ALL") prefix += `_${selectedStatus}`
    if (datePreset !== "ALL") prefix += `_${datePreset}`

    exportProcurementInvoicesToExcel(
      invoices,
      prefix,
      {
        company: selectedCompany !== "ALL" ? selectedCompany : undefined,
        department: selectedDepartment !== "ALL" ? selectedDepartment : undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        category: activeTab !== "ALL" ? activeTab : undefined,
        dateRange: startDate || endDate ? `${startDate || "Any"} to ${endDate || "Any"}` : undefined,
      }
    )
  }

  const isFinanceOrAdmin = userRole?.isSuperAdmin || userRole?.isFinance

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <ProcurementNavTabs />


      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              DOCUMENT SUBMISSION
            </h1>
            <p className="text-xs text-slate-500">
              Purchasing ➔ Finance document submission, payment settlement, and verification tracking
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
            onClick={handleExport}
            disabled={invoices.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Filtered Excel ({invoices.length})
          </button>

          <button
            onClick={() => {
              setEditingInvoice(null)
              setIsNewModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Submission
          </button>
        </div>
      </div>

      {/* Category Tabs: View All first! */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          View All
        </button>

        <button
          onClick={() => setActiveTab(ProcurementInvoiceCategory.STANDARD_TERMS)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === ProcurementInvoiceCategory.STANDARD_TERMS
              ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <span>Document for Payment (Standard)</span>
        </button>

        <button
          onClick={() => setActiveTab(ProcurementInvoiceCategory.DEPOSIT_PAYMENT || "DEPOSIT_PAYMENT")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "DEPOSIT_PAYMENT" || activeTab === ProcurementInvoiceCategory.MONTHLY_SUBSCRIPTION
              ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <span>Deposit Payment</span>
        </button>

        <button
          onClick={() => setActiveTab(ProcurementInvoiceCategory.CASH_PREPAYMENT)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === ProcurementInvoiceCategory.CASH_PREPAYMENT
              ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <span>Cash Payment (Pay Before Delivery)</span>
        </button>
      </div>

      {/* Primary Toolbar: Search, Quick Filters & Advanced Report Filter Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number, supplier, PO..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>

          {/* Quick Selectors & Filter Toggle Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Company Selector */}
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="ALL">All Companies</option>
              {COMPANY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(INVOICE_STATUS_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>

            {/* Advanced Filters Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all ${
                isFilterOpen || activeFiltersCount > 0
                  ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center ml-0.5">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  isFilterOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expandable Advanced Report Filters Panel */}
        {isFilterOpen && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in text-xs bg-slate-50/60 p-4 rounded-xl border border-slate-200/60">
            {/* 1. Date Range & Presets */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Date Filter & Reporting Period
                </label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as any)}
                  className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="submitDate">Filter by Submit Date</option>
                  <option value="invoiceDate">Filter by Invoice Date</option>
                  <option value="dueDate">Filter by Due Date</option>
                  <option value="paidAt">Filter by Payment Date</option>
                </select>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                {[
                  { id: "ALL", label: "All Dates" },
                  { id: "THIS_MONTH", label: "This Month" },
                  { id: "LAST_MONTH", label: "Last Month" },
                  { id: "THIS_QUARTER", label: "This Quarter" },
                  { id: "THIS_YEAR", label: "This Year" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePresetChange(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      datePreset === p.id
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setDatePreset("CUSTOM")
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setDatePreset("CUSTOM")
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 2. Specific Supplier */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Vendor / Supplier</label>
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

            {/* 3. Department */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20 truncate"
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Physical Document Checks */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">DO Received:</span>
                  <select
                    value={doFilter}
                    onChange={(e) => setDoFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">DO Received (Yes)</option>
                    <option value="NO">DO Pending (No)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Original Invoice:</span>
                  <select
                    value={originalInvFilter}
                    onChange={(e) => setOriginalInvFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Received (Yes)</option>
                    <option value="NO">Pending (No)</option>
                  </select>
                </div>
              </div>

              {/* Reset Filters Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Filter Report Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-900">
              Showing {invoices.length} invoices
            </span>
            <span>•</span>
            <span>
              Total Filtered Amount:{" "}
              <strong className="text-slate-900 font-bold font-mono">
                RM {filteredTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Applied:</span>
              {selectedCompany !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  Company: {selectedCompany}
                  <button onClick={() => setSelectedCompany("ALL")}><X className="w-3 h-3 hover:text-rose-500" /></button>
                </span>
              )}
              {selectedStatus !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  Status: {INVOICE_STATUS_CONFIG[selectedStatus]?.label || selectedStatus}
                  <button onClick={() => setSelectedStatus("ALL")}><X className="w-3 h-3 hover:text-rose-500" /></button>
                </span>
              )}
              {selectedSupplierId !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  Vendor: {suppliers.find((s) => s.id === selectedSupplierId)?.name || "Vendor"}
                  <button onClick={() => setSelectedSupplierId("ALL")}><X className="w-3 h-3 hover:text-rose-500" /></button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                  {dateType.replace(/([A-Z])/g, " $1")}: {startDate || "Start"} ➔ {endDate || "End"}
                  <button onClick={() => { setStartDate(""); setEndDate(""); setDatePreset("ALL"); }}><X className="w-3 h-3 hover:text-rose-500" /></button>
                </span>
              )}
              {doFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  DO: {doFilter}
                  <button onClick={() => setDoFilter("ALL")}><X className="w-3 h-3 hover:text-rose-500" /></button>
                </span>
              )}
              {originalInvFilter !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  Original Inv: {originalInvFilter}
                  <button onClick={() => setOriginalInvFilter("ALL")}><X className="w-3 h-3 hover:text-rose-500" /></button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invoice Table Component */}
      <InvoiceTable
        invoices={invoices}
        loading={loading}
        onSelectInvoice={handleOpenDetail}
        onEditInvoice={handleEditInvoice}
        onDeleteInvoice={handleDeleteInvoice}
        onOpenNewModal={() => {
          setEditingInvoice(null)
          setIsNewModalOpen(true)
        }}
      />

      {/* Modals */}
      <NewInvoiceModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false)
          setEditingInvoice(null)
        }}
        onSaved={loadData}
        invoiceToEdit={editingInvoice}
        defaultCategory={
          activeTab !== "ALL" ? activeTab : ProcurementInvoiceCategory.STANDARD_TERMS
        }
      />

      <InvoiceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedInvoice(null)
        }}
        invoice={selectedInvoice}
        onUpdated={loadData}
        isFinanceOrAdmin={isFinanceOrAdmin}
      />
    </div>
  )
}

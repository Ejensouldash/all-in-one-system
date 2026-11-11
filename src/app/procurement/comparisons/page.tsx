"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Scale,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Building2,
  Calendar,
  Layers,
  Award,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  FolderOpen,
} from "lucide-react"
import {
  getPriceComparisons,
  createPriceComparison,
  deletePriceComparison,
  getSuppliers,
} from "@/app/actions/procurement"
import { ProcurementNavTabs } from "@/components/procurement/ProcurementNavTabs"
import {
  COMPARISON_STATUS_CONFIG,
  createDefaultComparisonData,
} from "@/components/procurement/comparison-constants"
import { COMPANY_OPTIONS, DEPARTMENT_OPTIONS } from "@/components/procurement/procurement-constants"

export default function PriceComparisonsListPage() {
  const router = useRouter()
  const [comparisons, setComparisons] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const [selectedDepartment, setSelectedDepartment] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")

  // Modal State for New Comparison
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCompany, setNewCompany] = useState("BOSB")
  const [newDepartment, setNewDepartment] = useState("MAIN & FACI (MAINTENANCE & FACILITIES)")
  const [useSampleData, setUseSampleData] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [comps, sups] = await Promise.all([
        getPriceComparisons({
          search: search.trim() || undefined,
          company: selectedCompany !== "ALL" ? selectedCompany : undefined,
          department: selectedDepartment !== "ALL" ? selectedDepartment : undefined,
          status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        }),
        getSuppliers({ activeOnly: true }),
      ])
      setComparisons(comps || [])
      setSuppliers(sups || [])
    } catch (err) {
      console.error("Failed to load comparisons:", err)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCompany, selectedDepartment, selectedStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Create handler
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setIsCreating(true)
    try {
      let initialData
      if (useSampleData) {
        // Sample data inspired by the user's excel screenshot:
        // Pressure Gauges and Safety Valves with 4 suppliers
        const s1 = "sup_vd_valve"
        const s2 = "sup_unimech"
        const s3 = "sup_vast_victory"
        const s4 = "sup_oridiant"

        initialData = {
          suppliers: [
            {
              id: s1,
              name: "VD VALVE SDN BHD",
              paymentTerms: "As Usual",
              leadTime: "Ex-stock",
            },
            {
              id: s2,
              name: "UNIMECH EQUIPMENT SUPPLIERS",
              paymentTerms: "Cash",
              leadTime: "2 Weeks",
            },
            {
              id: s3,
              name: "VAST VICTORY SERVICE & TRADING",
              paymentTerms: "30 Days",
              leadTime: "3-4 Weeks",
            },
            {
              id: s4,
              name: "ORIDIANT SDN BHD",
              paymentTerms: "Cash (50% upon PO & 50% before delivery)",
              leadTime: "8-10 weeks",
            },
          ],
          items: [
            {
              itemIndex: 1,
              groupTitle: "Pressure Gauges",
              rows: [
                {
                  rowId: "row_1_1",
                  quotes: {
                    [s1]: { description: "PRESSURE GAUGE 0-14 BAR 1/2\"", unitPrice: 33.0, isIncluded: false },
                    [s2]: { description: "PRESSURE GAUGE 0-14 BAR 1/2\"", unitPrice: 245.0, isIncluded: false },
                    [s3]: { description: "PRESSURE GAUGE 0-14 BAR 1/2\"", unitPrice: null, isIncluded: false },
                    [s4]: { description: "PRESSURE GAUGE 0-14 BAR 1/2\"", unitPrice: null, isIncluded: false },
                  },
                },
                {
                  rowId: "row_1_2",
                  quotes: {
                    [s1]: { description: "CALIBRATION CERT", unitPrice: 80.0, isIncluded: false },
                    [s2]: { description: "CALIBRATION CERT", unitPrice: null, isIncluded: true },
                    [s3]: { description: "CALIBRATION CERT", unitPrice: null, isIncluded: false },
                    [s4]: { description: "CALIBRATION CERT", unitPrice: null, isIncluded: false },
                  },
                },
                {
                  rowId: "row_1_3",
                  quotes: {
                    [s1]: { description: "PRESSURE GAUGE 0-70 BAR 1/2\"", unitPrice: 190.0, isIncluded: false },
                    [s2]: { description: "PRESSURE GAUGE 0-70 BAR 1/2\"", unitPrice: 472.5, isIncluded: false },
                    [s3]: { description: "PRESSURE GAUGE 0-70 BAR 1/2\"", unitPrice: null, isIncluded: false },
                    [s4]: { description: "PRESSURE GAUGE 0-70 BAR 1/2\"", unitPrice: null, isIncluded: false },
                  },
                },
                {
                  rowId: "row_1_4",
                  quotes: {
                    [s1]: { description: "CALIBRATION CERT", unitPrice: 80.0, isIncluded: false },
                    [s2]: { description: "CALIBRATION CERT", unitPrice: null, isIncluded: true },
                    [s3]: { description: "CALIBRATION CERT", unitPrice: null, isIncluded: false },
                    [s4]: { description: "CALIBRATION CERT", unitPrice: null, isIncluded: false },
                  },
                },
              ],
            },
            {
              itemIndex: 2,
              groupTitle: "Safety Valves",
              rows: [
                {
                  rowId: "row_2_1",
                  quotes: {
                    [s1]: { description: "SAFETY VALVE 40 BAR 3/4\"", unitPrice: 450.0, isIncluded: false },
                    [s2]: { description: "SAFETY VALVE 40 BAR 3/8\"", unitPrice: 399.0, isIncluded: false },
                    [s3]: { description: "SAFETY VALVE 40 BAR 3/8\"", unitPrice: 780.0, isIncluded: false },
                    [s4]: { description: "SAFETY VALVE 40 BAR 3/8\"", unitPrice: 460.0, isIncluded: false },
                  },
                },
                {
                  rowId: "row_2_2",
                  quotes: {
                    [s1]: { description: "THIRD PART CALIBRATION CERT", unitPrice: 120.0, isIncluded: false },
                    [s2]: { description: "THIRD PART CALIBRATION CERT", unitPrice: null, isIncluded: true },
                    [s3]: { description: "THIRD PART CALIBRATION CERT", unitPrice: null, isIncluded: true },
                    [s4]: { description: "THIRD PART CALIBRATION CERT", unitPrice: null, isIncluded: true },
                  },
                },
                {
                  rowId: "row_2_3",
                  quotes: {
                    [s1]: { description: "SAFETY VALVE 10 BAR 3/4\"", unitPrice: 140.0, isIncluded: false },
                    [s2]: { description: "SAFETY VALVE 10 BAR 3/8\"", unitPrice: 245.0, isIncluded: false },
                    [s3]: { description: "SAFETY VALVE 10 BAR 3/8\"", unitPrice: 680.0, isIncluded: false },
                    [s4]: { description: "SAFETY VALVE 10 BAR 3/8\"", unitPrice: 280.0, isIncluded: false },
                  },
                },
                {
                  rowId: "row_2_4",
                  quotes: {
                    [s1]: { description: "THIRD PART CALIBRATION CERT", unitPrice: 120.0, isIncluded: false },
                    [s2]: { description: "THIRD PART CALIBRATION CERT", unitPrice: null, isIncluded: true },
                    [s3]: { description: "THIRD PART CALIBRATION CERT", unitPrice: null, isIncluded: true },
                    [s4]: { description: "THIRD PART CALIBRATION CERT", unitPrice: null, isIncluded: true },
                  },
                },
              ],
            },
          ],
        }
      } else {
        initialData = createDefaultComparisonData()
      }

      const res = await createPriceComparison({
        title: newTitle.trim(),
        company: newCompany,
        department: newDepartment,
        suppliersData: initialData.suppliers,
        itemsData: initialData.items,
      })

      if (res.success && res.comparison) {
        setIsNewModalOpen(false)
        router.push(`/procurement/comparisons/${res.comparison.id}`)
      } else {
        alert(res.error || "Failed to create comparison")
      }
    } catch (err: any) {
      alert(err.message || "Error creating comparison")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (confirm("Are you sure you want to delete this price comparison?")) {
      const res = await deletePriceComparison(id)
      if (res.success) {
        setComparisons(comparisons.filter((c) => c.id !== id))
      } else {
        alert(res.error || "Failed to delete comparison")
      }
    }
  }

  // Summary counts
  const summary = {
    total: comparisons.length,
    draft: comparisons.filter((c) => c.status === "DRAFT").length,
    review: comparisons.filter((c) => c.status === "UNDER_REVIEW").length,
    completed: comparisons.filter((c) => c.status === "COMPLETED" || c.status === "APPROVED").length,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Navigation Tabs */}
      <ProcurementNavTabs />

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Supplier Price Comparison
            </h1>
            <p className="text-xs text-slate-500">
              Multi-supplier quotation matrix, bundled pricing, payment terms, and lead time evaluation
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
            onClick={() => {
              setNewTitle("")
              setIsNewModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Price Comparison
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Comparisons
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.total}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Evaluation Records</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Drafts
            </p>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-900 mt-1">{summary.draft}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5">In Progress</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-sky-200/80 bg-sky-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
              Under Review
            </p>
            <Layers className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <p className="text-xl font-bold text-sky-900 mt-1">{summary.review}</p>
          <p className="text-[11px] text-sky-700 font-semibold mt-0.5">Management Review</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Awarded
            </p>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-900 mt-1">{summary.completed}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Vendor Awarded</p>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
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
              placeholder="Search title, reference no, or supplier..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white transition-all"
            >
              <option value="ALL">All Companies</option>
              {COMPANY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white transition-all"
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(COMPARISON_STATUS_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparisons List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading comparison sheets...</p>
        </div>
      ) : comparisons.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm space-y-3">
          <Scale className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Price Comparisons Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by creating a new price comparison sheet to evaluate quotations across multiple suppliers.
          </p>
          <button
            onClick={() => {
              setNewTitle("")
              setIsNewModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Price Comparison
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((comp) => {
            const statusCfg = COMPARISON_STATUS_CONFIG[comp.status] || COMPARISON_STATUS_CONFIG.DRAFT
            const suppliersList: any[] = Array.isArray(comp.suppliersData) ? comp.suppliersData : []
            const itemsList: any[] = Array.isArray(comp.itemsData) ? comp.itemsData : []

            const awardedSup = suppliersList.find((s) => s.id === comp.awardedSupplier)

            return (
              <Link
                key={comp.id}
                href={`/procurement/comparisons/${comp.id}`}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all p-5 flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {comp.referenceNo}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {comp.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">{comp.company}</span>
                    <span>•</span>
                    <span className="truncate">{comp.department}</span>
                  </div>
                </div>

                {/* Suppliers Summary */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Suppliers Compared:</span>
                    <span className="font-bold text-slate-800">{suppliersList.length}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {suppliersList.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 font-medium text-slate-700 truncate max-w-[140px]"
                      >
                        {s.name}
                      </span>
                    ))}
                    {suppliersList.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                        +{suppliersList.length - 3} more
                      </span>
                    )}
                  </div>

                  {awardedSup && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                      <span className="flex items-center gap-1 font-bold">
                        <Award className="w-3.5 h-3.5 text-emerald-600" /> Awarded:
                      </span>
                      <span className="font-extrabold truncate max-w-[150px]">{awardedSup.name}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(comp.createdAt).toLocaleDateString("en-GB")}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(comp.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete Comparison"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal: New Price Comparison */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">New Price Comparison</h3>
                  <p className="text-xs text-slate-500">Create a quotation comparison sheet</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Comparison Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Safety Valves & Pressure Gauges Comparison"
                  className="w-full mt-1.5 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Company</label>
                  <select
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {COMPANY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Department</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Option */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSampleData}
                    onChange={(e) => setUseSampleData(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Pre-fill with Sample Quotation Data (Pressure Gauges & Valves)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Loads the sample 4-supplier layout (VD Valve, Unimech, Vast Victory, Oridiant) shown in your Excel template. You can easily edit or replace any items.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Comparison"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

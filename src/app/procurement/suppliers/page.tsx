"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  RefreshCw,
  MapPin,
  User,
  Briefcase,
  Building,
} from "lucide-react"
import { getSuppliers, deleteSupplier } from "@/app/actions/procurement"

import { SupplierModal } from "@/components/procurement/SupplierModal"
import { ProcurementNavTabs } from "@/components/procurement/ProcurementNavTabs"
import { PAYMENT_TERMS_CONFIG, BRANCH_OPTIONS, COMPANY_OPTIONS } from "@/components/procurement/procurement-constants"

export default function ProcurementSuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("ALL")
  const [selectedBranch, setSelectedBranch] = useState("ALL")
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSuppliers({
        search: search.trim() || undefined,
        terms: selectedTerm !== "ALL" ? selectedTerm : undefined,
        branch: selectedBranch !== "ALL" ? selectedBranch : undefined,
        company: selectedCompany !== "ALL" ? selectedCompany : undefined,
      })
      setSuppliers(data)
    } catch (err: any) {
      console.error("Error loading suppliers:", err)
      setActionMessage({ type: "error", text: err.message || "Failed to load suppliers" })
    } finally {
      setLoading(false)
    }
  }, [search, selectedTerm, selectedBranch, selectedCompany])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenAdd = () => {
    setEditingSupplier(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (sup: any) => {
    setEditingSupplier(sup)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove or deactivate supplier "${name}"?`)) {
      return
    }

    setDeletingId(id)
    try {
      const res = await deleteSupplier(id)
      if (res.success) {
        setActionMessage({
          type: "success",
          text: res.message || `Supplier "${name}" was successfully removed.`,
        })
        loadData()
      } else {
        setActionMessage({ type: "error", text: res.error || "Failed to delete supplier." })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to delete supplier." })
    } finally {
      setDeletingId(null)
    }
  }

  // Summary Metrics
  const totalCount = suppliers.length
  const creditTermsCount = suppliers.filter((s) =>
    ["TERM_7_DAYS", "TERM_30_DAYS", "TERM_60_DAYS"].includes(s.terms)
  ).length
  const cashTermsCount = suppliers.filter((s) =>
    ["CASH", "CASH_BEFORE_DELIVERY", "COD"].includes(s.terms)
  ).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      <ProcurementNavTabs />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Supplier Directory
            </h1>
            <p className="text-xs text-slate-500">
              Procurement vendor catalog, payment terms, and contact records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Supplier
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Suppliers
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Credit Terms (7 / 30 / 60 Days)
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{creditTermsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Cash / Advance / COD
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{cashTermsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name, phone, email, remark..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Company Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Company:</span>
          </div>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="ALL">All Companies</option>
            {COMPANY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Branch / Location Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Branch:</span>
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="ALL">All Branches / Locations</option>
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Payment Terms Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Terms:</span>
          </div>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="ALL">All Payment Terms</option>
            {Object.entries(PAYMENT_TERMS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Loading suppliers catalog...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">No suppliers found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {search || selectedTerm !== "ALL" || selectedBranch !== "ALL"
                ? "Try adjusting your search criteria or filters."
                : "Get started by adding your first vendor into the Procurement catalog."}
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Supplier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Supplier & Department</th>
                  <th className="py-3.5 px-4">Contact Person & Info</th>
                  <th className="py-3.5 px-4">Branch / Location</th>
                  <th className="py-3.5 px-4">Payment Terms</th>
                  <th className="py-3.5 px-4">Remark / Lead Time</th>
                  <th className="py-3.5 px-4 text-center">Invoices</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {suppliers.map((sup) => {
                  const termConfig = PAYMENT_TERMS_CONFIG[sup.terms] || {
                    label: sup.terms,
                    days: 0,
                  }
                  const isCash = ["CASH", "CASH_BEFORE_DELIVERY", "COD"].includes(sup.terms)

                  return (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Department */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 mt-0.5">
                            {sup.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{sup.name}</span>
                              {!sup.isActive && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {sup.department && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-normal mt-0.5">
                                <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[200px]" title={sup.department}>{sup.department}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Person & Info */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="space-y-1">
                          {sup.contactPerson && (
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{sup.contactPerson}</span>
                            </div>
                          )}
                          {sup.phone ? (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{sup.phone}</span>
                            </div>
                          ) : !sup.contactPerson ? (
                            <span className="text-slate-400 italic">No phone</span>
                          ) : null}
                          {sup.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{sup.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Branch & Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {sup.branch || "All Branches"}
                          </span>
                          {sup.company && sup.company !== "All Companies" && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                              <Building className="w-2.5 h-2.5 text-blue-500" />
                              {sup.company}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Terms */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                            isCash
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {termConfig.label}
                        </span>
                      </td>

                      {/* Remark */}
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {sup.remark ? (
                          <span title={sup.remark}>{sup.remark}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Invoices Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                          {sup._count?.invoices || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(sup)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sup.id, sup.name)}
                            disabled={deletingId === sup.id}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete / Deactivate"
                          >
                            {deletingId === sup.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplierToEdit={editingSupplier}
        onSaved={loadData}
      />
    </div>
  )
}
